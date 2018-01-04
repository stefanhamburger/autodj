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
      postMessage(mt.tempo);//TODO: need to send more data than just tempo
    }
  }
};
