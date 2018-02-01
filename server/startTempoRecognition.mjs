import Worker from 'tiny-worker';
import * as audioManager from './audioManager.mjs';

const SONG_MIN_LENGTH = 120 * 48000;
const SONG_START_LENGTH = 60 * 48000;
const SONG_END_LENGTH = 60 * 48000;

function createWorker(waveformArray, callback) {
  const worker = new Worker('server/worker/tempoRecognition.mjs');

  //add listener to result
  worker.onmessage = (msg) => {
    callback(msg.data);
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
}

export default async function startTempoRecognition(session, song) {
  const waveformBuffer = await audioManager.getWaveform(song.songRef);
  const waveformArray = new Float32Array(waveformBuffer);

  //if song is too short, we detect tempo across the whole song
  if (waveformArray.length < SONG_MIN_LENGTH) {
    createWorker(waveformArray, (bpm) => {
      console.log(`Song ${song.songRef.name} starts and ends with ${bpm} bpm`);
      session.emitEvent({ type: 'TEMPO_INFO', songName: song.songRef.name, bpm });
    });
  } else { //otherwise, we only detect the beginning and end of the song
    //tempo at beginning of song
    //TODO: if this is the first song we are playing, tempo at beginning doesn't matter
    createWorker(waveformArray.slice(0, SONG_START_LENGTH), (bpm) => {
      console.log(`Song ${song.songRef.name} starts with ${bpm} bpm`);
      session.emitEvent({ type: 'TEMPO_INFO', songName: song.songRef.name, bpm });
    });

    //tempo at end of song
    //TODO: to avoid overloading the server, maybe this worker should only be started after the one above is done
    createWorker(waveformArray.slice(waveformArray.length - SONG_END_LENGTH), (bpm) => {
      console.log(`Song ${song.songRef.name} ends with ${bpm} bpm`);
      //session.emitEvent({ type: 'TEMPO_INFO', songName: song.songRef.name, bpm });
    });
  }
}
