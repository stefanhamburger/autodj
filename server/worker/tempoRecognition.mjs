//import MusicTempo from 'music-tempo';
const MusicTempo = require('music-tempo');//tiny-worker does not yet support ES modules?

//The bpm range that should be detected (60-180 bpm)
const MIN_BPM = 60;
const MAX_BPM = 180;
//By how many samples to move when generating the next FFT window
const HOP_SIZE = 480;
//The sample rate of the audio in Hertz
const SAMPLE_RATE = 48000;

let waveform;
let hasReceivedLength = false;
let pos = 0;

onmessage = function messageHandler(ev) {
  if (!hasReceivedLength) {
    //create array of the given length
    waveform = new Float32Array(Number(ev.data));
    hasReceivedLength = true;
  } else {
    waveform.set(ev.data, pos);
    pos += ev.data.length;

    //if we are done
    if (pos === waveform.length) {
      try {
        //start tempo recognition
        const mt = new MusicTempo(waveform, {
          hopSize: HOP_SIZE,
          timeStep: HOP_SIZE / SAMPLE_RATE,
          maxBeatInterval: 60 / MIN_BPM,
          minBeatInterval: 60 / MAX_BPM,
        });

        //send recognized tempo to main thread
        postMessage(mt.tempo);//TODO: need to send more data than just tempo
      } catch (error) {
        console.error('Tempo detection failed', error);
        postMessage(0);
      }
    }
  }
};
