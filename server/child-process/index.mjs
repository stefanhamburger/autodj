//Set up event handler and function to send messages to parent

import { setUpReceiver, sendMessage, sendBuffer } from './io.mjs';
import decodeAudio from './ffmpegDecoder.mjs';
import tempoDetection from './tempoDetection.mjs';
import createThumbnail from './createThumbnail.mjs';
import calculateTiming from '../../shared/calculateTiming.mjs';
import startTempoChange from './tempoChange.mjs';

const audioFile = process.argv[2];
const isFirstSong = process.argv[3] === 'true';

/** always stereo audio (2 channels) */
const NUM_CHANNELS = 2;
/** 32-bit floating point on 2 channels = 8 bytes per sample */
const BYTES_PER_SAMPLE = NUM_CHANNELS * 4;

//We store the list of received messages, and later a function to handle the messages in queue
const messages = [];
let processMessages;

(async () => {
  //set up message receiver
  setUpReceiver((msg) => {
    messages.push(msg);
    if (processMessages !== undefined) processMessages();
  });
  sendMessage(0);//child process is ready to receive messages

  //decode audio into interleaved stereo Float32Array
  const audioBuffer = await decodeAudio(audioFile);

  //get duration in samples (each sample is 8 bytes length)
  sendMessage(1, { duration: audioBuffer.byteLength / 8 });

  //do tempo detection
  //first convert stereo audio to mono since the library expects mono audio
  const monoBuffer = new Float32Array(audioBuffer.length / 2);
  let maxLoudness = 0;
  for (let i = 0; i < audioBuffer.length; i += 2) {
    monoBuffer[i >>> 1] = (audioBuffer[i] + audioBuffer[i + 1]) / 2;
    const absValue = Math.abs(monoBuffer[i >>> 1]);
    if (absValue > maxLoudness) maxLoudness = absValue;
  }
  console.error(maxLoudness);
  const invMaxLoudness = 1.0 / maxLoudness;
  try {
    const tempoInfo = tempoDetection(monoBuffer, isFirstSong);
    sendMessage(2, tempoInfo);
  } catch (error) {
    sendMessage(2, { error: true });
  }

  //at this point, we can start responding to messages
  processMessages = () => {
    //remove all messages from array and process them
    messages.splice(0, messages.length).forEach((msg) => {
      //calculate correct timing values based on tempo adjustment
      const convertedTiming = calculateTiming(msg.offset, msg.length, msg.tempoChange);
      //adjust tempo based on msg.tempoChange
      const inputBuffer = audioBuffer.slice((msg.pieceStart + convertedTiming.startingSample) * NUM_CHANNELS, (msg.pieceStart + convertedTiming.endingSample - 1) * NUM_CHANNELS + 1);
      const tempoAdjustedBuffer = startTempoChange(inputBuffer, msg.tempoChange, invMaxLoudness);
      sendBuffer(msg.id, tempoAdjustedBuffer.buffer, convertedTiming.offsetAfterAdj * BYTES_PER_SAMPLE, msg.length * BYTES_PER_SAMPLE);
    });
  };
  //immediately process messages that are already in queue
  if (messages.length > 0) {
    processMessages();
  }

  //generate waveform thumbnail
  const thumbnail = createThumbnail(audioBuffer, invMaxLoudness);
  sendBuffer(0, thumbnail.buffer);
})();
