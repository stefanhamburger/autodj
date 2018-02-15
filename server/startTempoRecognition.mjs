import Worker from 'tiny-worker';
import * as audioManager from './audioManager.mjs';

/** Sampling rate of the waveform data */
const SAMPLE_RATE = 48000;
/** How many samples a song must at least have before we detect beginning and end separately. Must be ≥60 seconds */
const SONG_MIN_LENGTH = 120 * SAMPLE_RATE;
/** How many samples we use from the beginning of the song to detect tempo */
const SONG_START_LENGTH = 60 * SAMPLE_RATE;
/** How many samples we use from the end of the song to detect tempo */
const SONG_END_LENGTH = 60 * SAMPLE_RATE;


/** Creates a worker to detect the tempo of the given waveform data, and calls the callback function with the bpm */
function createWorker(waveformArray) {
  return new Promise((resolve) => {
    const worker = new Worker('server/worker/tempoRecognition.mjs');

    //add listener to result
    worker.onmessage = (msg) => {
      resolve(msg.data);
      worker.terminate();
    };

    //send number of samples
    worker.postMessage(waveformArray.length);

    //to prevent Node from blocking and using too much RAM, send waveform in blocks of 48k samples (1 second)
    let pos = 0;
    const sendNextSamples = () => {
      worker.postMessage(Array.from(waveformArray.slice(pos, pos + 1 * SAMPLE_RATE)));
      pos += 1 * SAMPLE_RATE;
      if (pos < waveformArray.length) {
        setTimeout(sendNextSamples);
      }
    };
    sendNextSamples();
  });
}


/** Waits for the given amount of milliseconds, without blocking the server process */
const sleep = time => new Promise(resolve => setTimeout(resolve, time));


/** Does a tempo detection on the given song and emits the bpm via session events */
export default async function startTempoRecognition(session, song, isFirstSong = false) {
  const waveformBuffer = await audioManager.getWaveform(song.songRef);
  const waveformArray = new Float32Array(waveformBuffer);

  //if song is too short, we detect tempo across the whole song
  if (waveformArray.length < SONG_MIN_LENGTH) {
    createWorker(waveformArray).then((bpm) => {
      console.log(`[${session.sid}] Song ${song.songRef.name} starts and ends with ${bpm} bpm`);
      session.emitEvent({ type: 'TEMPO_INFO_START', id: song.id, bpm });
      session.emitEvent({ type: 'TEMPO_INFO_END', id: song.id, bpm });
    });
  } else { //otherwise, we only detect the beginning and end of the song
    //if this is the first song we are playing, tempo at beginning doesn't matter
    if (!isFirstSong) {
      //tempo at beginning of song
      createWorker(waveformArray.slice(0, SONG_START_LENGTH)).then((bpm) => {
        console.log(`[${session.sid}] Song ${song.songRef.name} starts with ${bpm} bpm`);
        session.emitEvent({ type: 'TEMPO_INFO_START', id: song.id, bpm });
      });

      //Wait 5 seconds before detection tempo at end of song to avoid overloading the server
      await sleep(5000);
    }

    //tempo at end of song
    createWorker(waveformArray.slice(waveformArray.length - SONG_END_LENGTH)).then((bpm) => {
      console.log(`[${session.sid}] Song ${song.songRef.name} ends with ${bpm} bpm`);
      session.emitEvent({ type: 'TEMPO_INFO_END', id: song.id, bpm });
    });
  }
}
