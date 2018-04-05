import Kali from './kali.mjs';

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
  const completed = new Float32Array(Math.floor((numInputFrames / stretchFactor) * NUM_CHANNELS + 1));

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

export default function startProcessing(waveform, stretchFactor) {
  const dataLength = waveform.length;
  const leftChannel = new Float32Array(dataLength / 2);
  const rightChannel = new Float32Array(dataLength / 2);

  //We need to convert stereo audio to two mono channels because Kali is bugged with multi-channel audio
  for (let i = 0; i < waveform.length; i += 1) {
    if (i % 2 === 0) {
      leftChannel[i >>> 1] = waveform[i];
    } else {
      rightChannel[i >>> 1] = waveform[i];
    }
  }

  //do tempo adjustment
  const leftChannelOut = timeStretch(leftChannel, stretchFactor);
  const rightChannelOut = timeStretch(rightChannel, stretchFactor);

  //merge both channels into one stereo audio
  const out = new Float32Array(leftChannelOut.length * 2);
  for (let i = 0; i < out.length; i += 1) {
    if (i % 2 === 0) {
      out[i] = leftChannelOut[i >>> 1];
    } else {
      out[i] = rightChannelOut[i >>> 1];
    }
  }

  return out;
}
