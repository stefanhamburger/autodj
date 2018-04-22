//TODO: Eventually we can rename this file to Audio Manager

import launchProcess from './launchProcess.mjs';
import PromiseStorage from './lib/promiseStorage.mjs';
import * as consoleColors from './lib/consoleColors.mjs';

/** Stores thumbnails until they are requested by the client. */
const audioThumbnails = {};

/** Analyses the given song. We return:
 * a promise that resolves to the duration
 * a promise that resolves to the tempo information
 * a promise that resolves to the waveform thumbnail
 * a callback for getting waveform pieces
 * a function to clean-up everything once the song has finished playing
*/
export async function analyseSong(session, songWrapper, isFirstSong) {
  const audioFile = songWrapper.songRef;
  const promise = PromiseStorage();
  const isReady = promise.create('isReady');

  const out = {};
  out.duration = promise.create('duration');
  out.tempo = promise.create('tempo');
  out.thumbnail = promise.create('thumbnail');

  const onInputCallback = (isJSON, id, contents) => {
    if (isJSON) {
      switch (id) {
        case 0:
          promise.resolve('isReady');
          break;
        case 1:
          promise.resolve('duration', contents.duration);
          break;
        case 2:
          promise.resolve('tempo', contents);
          console.log(`${consoleColors.magenta(`[${session.sid}]`)} Song ${consoleColors.green(audioFile.name)} starts with ${contents.bpmStart} bpm`);
          console.log(`${consoleColors.magenta(`[${session.sid}]`)} Song ${consoleColors.green(audioFile.name)} ends with ${contents.bpmEnd} bpm`);
          break;
        default:
          throw new Error('Received message from child process with unknown id');
      }
    } else {
      if (id === 0) {
        //store thumbnail
        audioThumbnails[`${session.sid}#${songWrapper.id}`] = contents;
        //notify client that thumbnail has been generated
        promise.resolve('thumbnail');
      } else {
        promise.resolve(`piece-${id}`, new Float32Array(contents));
      }
    }
  };

  const onErrorCallback = (error) => {
    console.error('Error in child process', String(error).trim());
    //reject promises
    promise.reject('duration', error);
    promise.reject('tempo', error);
    promise.reject('thumbnail', error);
  };

  try {
    const { sendObject, destroy } = launchProcess(audioFile.path, isFirstSong, onInputCallback, onErrorCallback);
    out.destroy = () => {
      //remove thumbnail
      delete audioThumbnails[`${session.sid}#${songWrapper.id}`];
      //kill child process
      destroy();
    };
    out.getPiece = ({ offset, length, tempoChange }) => {
      //create a random id. -- 0 is reserved for thumbnails and can't be used
      const id = 1 + Math.floor(Math.random() * 0xFFFFFE);
      //send message to child process
      sendObject({
        id, //a random id to uniquely identify messages and their replies
        offset, //offset into the file based on final, tempo-adjusted time
        length, //length of the piece we need, based on final, tempo-adjusted time
        tempoChange, //the amount by which the song is tempo adjusted, e.g. 1.1 to increase tempo by +10%
      });

      //return promise that will be resolved once child replies to our message
      return promise.create(`piece-${id}`);
    };
  } catch (error) {
    console.error('error: child process failed', error);
    onErrorCallback(error);
  }

  //wait for ready message
  await isReady;

  return out;
}


/** Gets the thumbnail that was previously generated for sending to the client */
export const getThumbnail = (sid, song) => {
  const key = `${sid}#${song}`;
  const result = audioThumbnails[key];

  if (result === undefined) {
    throw new Error(`Expected thumbnail for ${key} but thumbnail was not found.`);
  }

  return result;
};
