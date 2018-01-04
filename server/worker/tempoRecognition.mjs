//import MusicTempo from 'music-tempo';
const MusicTempo = require('music-tempo');//tiny-worker does not yet support ES modules?

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
      //console.log('Received audio buffer! Calculating tempo...');
      const mt = new MusicTempo(waveform);
      //MusicTempo expects a PCM with a 44,100 sample rate. So we need to convert the tempo since we have a 48,000 sample rate
      const bpm = mt.tempo * 48000 / 44100;
      postMessage(bpm);//TODO: need to send more data than just tempo
    }
  }
};
