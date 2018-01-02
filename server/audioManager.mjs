//Wrapper around storing waveform data for the audio files
//Ensures waveform data is kept in memory as long as needed, and cleaned up as soon as possible

import decodeAudio from './ffmpegDecoder.mjs';

/** byte length is 8 bytes per sample (2 channels, Float32 format) */
const BYTES_PER_SAMPLE = 8;

const audioWaveforms = {};

/**
 * Mark the given song as being in use by the given session, and load it in memory if needed
 * @param {*} song The song to use
 * @param {*} referenceName How to remember the reference: by session id and song index
 */
export const addReference = async (song, { sid, index }) => {
  audioWaveforms[song.path] = {
    buffer: decodeAudio(song.path),
    references: [`${sid}#${index}`],
  };
};

/**
 * Get the waveform data for the given song
 * @param {*} song The song to use
 */
export const getWaveform = song => audioWaveforms[song.path].buffer;

/**
 * Gets the number of samples of the given song
 * @param {*} song The song to use
 */
export const getDuration = async song => (await audioWaveforms[song.path].buffer).byteLength / BYTES_PER_SAMPLE;

/**
 * Delete waveform data to free up memory
 * @param {*} song The song to use
 * @param {*} referenceName How the reference is remembered: session id and song index
 */
export const removeReference = (song, { sid, index }) => {
  const waveformObj = audioWaveforms[song.path];
  if (!waveformObj) throw new Error('song not found in memeory');
  //Remove reference
  const sessionReference = waveformObj.references.findIndex(ref => ref === `${sid}#${index}`);
  if (sessionReference === -1) throw new Error('session reference not found in song');
  waveformObj.references.splice(sessionReference, 1);

  //Remove from memory if song is no longer used
  if (waveformObj.references.length === 0) {
    delete audioWaveforms[song.path];
  }
};
