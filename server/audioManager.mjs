//Wrapper around storing waveform data for the audio files.
//Ensures waveform data is kept in memory as long as needed, and cleaned up as soon as possible

import decodeAudio from './ffmpegDecoder.mjs';
import * as consoleColors from './consoleColors.mjs';

/** byte length is 8 bytes per sample (2 channels, Float32 format) */
const BYTES_PER_SAMPLE = 8;

const audioWaveforms = {};


/**
 * Mark the given song as being in use by the given session, and load it in memory if needed
 * @param {*} song The song to use
 * @param {*} referenceName How to remember the reference: by session id and song index
 */
export const addReference = async (song, { sid, id }) => {
  if (audioWaveforms[song.path] === undefined) {
    audioWaveforms[song.path] = {
      buffer: decodeAudio(song.path),
      references: [`${sid}#${id}`],
    };
  } else {
    audioWaveforms[song.path].references.push(`${sid}#${id}`);
  }
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
export const removeReference = (song, { sid, id }) => {
  const waveformObj = audioWaveforms[song.path];
  if (!waveformObj) throw new Error('song not found in memeory');
  //Remove reference
  const sessionReference = waveformObj.references.findIndex(ref => ref === `${sid}#${id}`);
  if (sessionReference === -1) throw new Error('session reference not found in song');
  waveformObj.references.splice(sessionReference, 1);

  //Remove from memory if song is no longer used
  if (waveformObj.references.length === 0) {
    delete audioWaveforms[song.path];
  }
};


/**
 * Starts creating waveform for the given song. Upon completion, emit event to client.
 * We can't send the whole waveform as an event (too large for HTTP headers);
 * Instead we'll just notify the client and offer a separate endpoint for the client to fetch waveform.
*/
const THUMBNAIL_WIDTH = 600;
export const createThumbnail = async (session, song) => {
  const waveformRaw = await getWaveform(song.songRef);

  //If waveform was already generated by a previous session, no need to do it again
  if (audioWaveforms[song.songRef.path].waveformThumbnail === undefined) {
    const startTime = new Date();
    const waveform = new Float32Array(waveformRaw);

    //prepare output arrays, containing minimum and maximum waveform data per pixel
    const outMax = new Float32Array(THUMBNAIL_WIDTH);
    const outMin = new Float32Array(THUMBNAIL_WIDTH);
    for (let i = 0; i < THUMBNAIL_WIDTH; i += 1) {
      outMax[i] = Number.NEGATIVE_INFINITY;
      outMin[i] = Number.POSITIVE_INFINITY;
    }

    //How many samples are contained in one pixel
    const samplesPerPixel = waveform.length / 2 / THUMBNAIL_WIDTH;

    //Go through the waveform data, consuming two frames at once since waveform is always stereo interleaved
    //TODO: we should probably rate-limit this function, to prevent it from blocking the server. But right now, this blocks for 80-120ms, which is acceptable
    for (let i = 0, il = waveform.length; i < il; i += 2) {
      //Calculate which bin this sample belongs into, and insert if needed
      //Ideally, we would blend samples into nearby pixels for anti-aliasing, but for our use case this may be overkill
      const value = (waveform[i] + waveform[i + 1]) / 2;
      const binIndex = Math.floor(i / 2 / samplesPerPixel);
      if (value > outMax[binIndex]) outMax[binIndex] = value;
      if (value < outMin[binIndex]) outMin[binIndex] = value;
    }

    const out = new Float32Array(2 * THUMBNAIL_WIDTH);
    out.set(outMin);
    out.set(outMax, THUMBNAIL_WIDTH);
    audioWaveforms[song.songRef.path].waveformThumbnail = out;

    console.log(`${consoleColors.magenta(`[${session.sid}]`)} Generated thumbnail of ${consoleColors.green(song.songRef.name)} in ${new Date() - startTime}ms`);
  }
};


/** Gets the thumbnail that was previously generated for sending to the client */
export const getThumbnail = (sid, song) => {
  const result = Object.values(audioWaveforms).filter(entry => entry.references.findIndex(ele => ele === `${sid}#${song}`) !== -1);

  //Test for errors
  if (result.length === 0) {
    throw new Error('Could not send thumbnail; song not found.');
  }
  if (result.length > 1) {
    console.warn('Found more than one song matching the id; this should not happen. Silently dropping additional results.');
  }
  if (result[0].waveformThumbnail === undefined) {
    throw new Error('Expected thumbnail but thumbnail was not yet generated.');
  }

  return result[0].waveformThumbnail;
};
