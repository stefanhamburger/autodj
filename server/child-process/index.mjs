//Set up event handler and function to send messages to parent

import { setUpReceiver, sendMessage, sendBuffer } from './io.mjs';
import decodeAudio from './ffmpegDecoder.mjs';
import tempoDetection from './tempoDetection.mjs';

const isFirstSong = process.argv[3] === 'true';

//We store the list of received messages, and later a function to handle the messages
const messages = [];
let processMessages;

(async () => {
  //set up message receiver
  setUpReceiver((msg) => {
    messages.push(msg);
    if (processMessages !== undefined) processMessages();
  });
  sendMessage(0, { ready: true });

  //decode audio
  const audioBuffer = await decodeAudio(process.argv[2]);

  //get duration
  sendMessage(1, { duration: audioBuffer.byteLength / 8 });

  //do tempo detection
  const mt = tempoDetection(audioBuffer, isFirstSong);
  sendMessage(2, mt);

  //at this point, we can start responding to messages
  processMessages = () => {
    //remove all messages from array and process them
    messages.splice(0, messages.length).forEach((msg) => {
      const out = new Float32Array(msg.length * 2);
      for (let i = 0; i < msg.length; i += 1) {
        out[i * 2] = audioBuffer[msg.offset * 2 + i * 2];
        out[i * 2 + 1] = audioBuffer[msg.offset * 2 + i * 2 + 1];
      }
      sendBuffer(msg.id, out.buffer);
    });
  };
  //immediately process messages that are already in queue
  if (messages.length > 0) {
    processMessages();
  }

  //generate waveform thumbnail
  //TODO
  //sendBuffer(0, new Float32Array(600).buffer);
})();
