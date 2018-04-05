//import Kali from './kali.mjs';
//tiny-worker sets the working directory to the tiny-worker folder under node_modules, so we need to do this to switch to current directory
const Kali = require('../../../server/tempo-change/kali.js');//eslint-disable-line import/no-unresolved

const NUM_CHANNELS = 1;//need to use mono since stereo is bugged with Kali
const SAMPLE_RATE = 48000;//Opus always uses 48k Hz
const USE_QUICK_SEARCH = true;//whether to use a faster, less precise algorithm

const timeStretch = (inputData, stretchFactor) => {
  const numInputFrames = inputData.length / NUM_CHANNELS;
  const bufsize = 4096 * NUM_CHANNELS;

  // Create a Kali instance and initialize it
  const kali = new Kali(NUM_CHANNELS);
  kali.setup(SAMPLE_RATE, stretchFactor, USE_QUICK_SEARCH);

  // Create an array for the stretched output
  const completed = new Float32Array(Math.ceil(numInputFrames / stretchFactor) * NUM_CHANNELS);

  let inputOffset = 0;
  let completedOffset = 0;
  let flushed = false;

  while (completedOffset < completed.length) {
    // Read stretched samples into our output array
    completedOffset += kali.output(completed.subarray(completedOffset, Math.min(completedOffset + bufsize, completed.length)));

    if (inputOffset < inputData.length) { // If we have more data to write, write it
      const dataToInput = inputData.subarray(inputOffset, Math.min(inputOffset + bufsize, inputData.length));
      inputOffset += dataToInput.length;

      // Feed Kali samples
      kali.input(dataToInput);
      kali.process();
    } else if (!flushed) { // Flush if we haven't already
      kali.flush();
      flushed = true;
    }
  }

  return completed;
};


const startProcessing = (leftChannel, rightChannel, stretchFactor) => {
  const leftChannelOut = timeStretch(leftChannel, stretchFactor);
  const rightChannelOut = timeStretch(rightChannel, stretchFactor);
  const out = new Array(leftChannelOut.length * 2);
  for (let i = 0; i < out.length; i += 1) {
    if (i % 2 === 0) {
      out[i] = leftChannelOut[i >>> 1];
    } else {
      out[i] = rightChannelOut[i >>> 1];
    }
  }

  //First send array length
  postMessage(out.length);

  //Then send array in parts of 1 second blocks
  let pos = 0;
  const sendMoreData = () => {
    postMessage(out.slice(pos, pos + 48000 * 2));
    pos += 48000 * 2;
    if (pos < out.length) {
      setTimeout(sendMoreData);
    }
  };
  sendMoreData();
};


{
  let hasReceivedHeader = false;
  let dataLength;
  let stretchFactor;
  let leftChannel;
  let rightChannel;
  let pos = 0;
  onmessage = function messageHandler(ev) {
    if (!hasReceivedHeader) {
      hasReceivedHeader = true;
      [dataLength, stretchFactor] = ev.data;
      leftChannel = new Float32Array(dataLength / 2);
      rightChannel = new Float32Array(dataLength / 2);
    } else {
      //We need to convert stereo audio to two mono channels because Kali is bugged with multi-channel audio
      for (let i = 0; i < ev.data.length; i += 1) {
        if (i % 2 === 0) {
          leftChannel[pos + (i >>> 1)] = ev.data[i];
        } else {
          rightChannel[pos + (i >>> 1)] = ev.data[i];
        }
      }
      pos += ev.data.length / 2;

      if (pos === dataLength / 2) {
        startProcessing(leftChannel, rightChannel, stretchFactor);
      }
    }
  };
}
