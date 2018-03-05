//import MusicTempo from 'music-tempo';
const MusicTempo = require('music-tempo');//tiny-worker does not yet support ES modules?

//The bpm range that should be detected (60-180 bpm)
const MIN_BPM = 60;
const MAX_BPM = 160;
//By how many samples to move when generating the next FFT window
const HOP_SIZE = 480;
//The sample rate of the audio in Hertz
const SAMPLE_RATE = 48000;

let waveform;
let hasReceivedLength = false;
let pos = 0;

onmessage = function messageHandler(ev) {
  if (!hasReceivedLength) {
    //create array of the given length (divided by 2 since we convert stereo to mono)
    waveform = new Float32Array(Number(ev.data) / 2);
    hasReceivedLength = true;
  } else {
    //add received data to array, converting stereo to mono
    for (let i = 0, il = ev.data.length; i < il; i += 2) {
      waveform[pos + (i >>> 1)] = (ev.data[i] + ev.data[i + 1]) / 2;
    }
    pos += ev.data.length / 2;

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
        postMessage({
          bpm: mt.tempo,
          beats: mt.beats.map(time => Math.round(time * 10000) / 10000),
        });
      } catch (error) {
        postMessage(0);
      }
    }
  }
};
