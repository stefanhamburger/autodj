import Worker from 'tiny-worker';
import * as audioManager from './audioManager.mjs';

export default async function startTempoRecognition(session, song) {
  const waveformBuffer = await audioManager.getWaveform(song.songRef);
  const waveformArray = new Float32Array(waveformBuffer);
  const worker = new Worker('server/worker/tempoRecognition.mjs');

  worker.onmessage = (msg) => {
    console.log(`Song ${song.songRef.name} has ${msg.data} bpm`);
    session.emitEvent({ type: 'TEMPO_INFO', songName: song.songRef.name, bpm: msg.data });
    worker.terminate();
  };

  //send number of samples
  worker.postMessage(waveformArray.length);

  //to prevent Node from blocking and using too much RAM, send waveform in blocks of 48k samples
  let pos = 0;
  const sendNextSamples = () => {
    worker.postMessage(Array.from(waveformArray.slice(pos, pos + 48000)));
    pos += 48000;
    if (pos < waveformArray.length) {
      setTimeout(sendNextSamples);
    }
  };
  sendNextSamples();
  //TODO: add listener to result
}
