import Worker from 'tiny-worker';
import * as audioManager from './audioManager.mjs';
import * as consoleColors from './consoleColors.mjs';

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


/** Does a tempo detection on the given song and emits the bpm via session events */
export default async function startTempoRecognition(session, song, isFirstSong = false) {
  const waveformBuffer = await audioManager.getWaveform(song.songRef);
  const waveformArray = new Float32Array(waveformBuffer);

  //if song is too short, we detect tempo across the whole song
  if (waveformArray.length < SONG_MIN_LENGTH) {
    const bpm = await createWorker(waveformArray);
    console.log(`${consoleColors.magenta(`[${session.sid}]`)} Song ${consoleColors.green(song.songRef.name)} starts and ends with ${bpm} bpm`);
    if (bpm === 0) throw new Error('Tempo detection failed');
    song.bpmStart = bpm;
    song.bpmEnd = bpm;
  } else { //otherwise, we only detect the beginning and end of the song
    //if this is the first song we are playing, tempo at beginning doesn't matter
    if (!isFirstSong) {
      //tempo at beginning of song
      const bpmStart = await createWorker(waveformArray.slice(0, SONG_START_LENGTH));
      console.log(`${consoleColors.magenta(`[${session.sid}]`)} Song ${consoleColors.green(song.songRef.name)} starts with ${bpmStart} bpm`);
      if (bpmStart === 0) throw new Error('Tempo detection failed');
      song.bpmStart = bpmStart;
    }

    //tempo at end of song
    const bpmEnd = await createWorker(waveformArray.slice(waveformArray.length - SONG_END_LENGTH));
    console.log(`${consoleColors.magenta(`[${session.sid}]`)} Song ${consoleColors.green(song.songRef.name)} ends with ${bpmEnd} bpm`);
    if (bpmEnd === 0) throw new Error('Tempo detection failed');
    song.bpmEnd = bpmEnd;
  }
}
