//import MusicTempo from 'music-tempo';
const MusicTempo = require('music-tempo');//tiny-worker does not yet support ES modules?

//The bpm range that should be detected (60-180 bpm)
const MIN_BPM = 60;
const MAX_BPM = 180;
const HOP_SIZE = 480;
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
      //start tempo recognition
      const mt = new MusicTempo(waveform, {
        hopSize: HOP_SIZE,
        timeStep: SAMPLE_RATE / HOP_SIZE,
        maxBeatInterval: 60 / MIN_BPM,
        minBeatInterval: 60 / MAX_BPM,
      });

      //MusicTempo expects a PCM with a 44,100 sample rate. So we need to convert the tempo since we have a 48,000 sample rate
      const bpm = mt.tempo;//Math.round(mt.tempo * 48000 / 44100 * 1000) / 1000;

      //send recognized tempo to main thread
      postMessage(bpm);//TODO: need to send more data than just tempo
    }
  }
};
