//TODO: Eventually we can rename this file to Audio Manager

import launchProcess from './launchProcess.mjs';
import PromiseStorage from './lib/promiseStorage.mjs';

/** Analyses the given song. We return:
 * a promise that resolves to the duration
 * a promise that resolves to the tempo information
 * a promise that resolves to the waveform thumbnail
 * a callback for getting waveform pieces
 * a function to clean-up everything once the song has finished playing
*/
export default async function analyseSong(audioFile, isFirstSong) {
  const promise = PromiseStorage();
  const isReady = promise.create('isReady');

  const out = {};
  out.duration = promise.create('duration');
  out.tempo = promise.create('tempo');
  out.thumbnail = promise.create('thumbnail');

  const callback = (isJSON, id, contents) => {
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
          break;
        default:
          throw new Error('Received message from child process with unknown id');
      }
    } else {
      if (id === 0) {
        promise.resolve('thumbnail', contents);
      } else {
        promise.resolve(String(id), contents);
      }
    }
  };

  try {
    const { sendObject, destroy } = launchProcess(callback, audioFile, isFirstSong);
    out.destroy = destroy;
    out.getPiece = ({ offset, length, tempoChange }) => {
      //create a random id. -- 0 is reserved for thumbnails and can't be used
      const id = 1 + Math.floor(Math.random() * 0xFFFFFE);
      //send message to child process
      sendObject({
        id,
        offset,
        length,
        tempoChange,
      });

      //return promise that will be resolved once child replies to our message
      return promise.create(String(id));
    };
  } catch (error) {
    //TODO: the error is thrown in a callback, not in the main function, so this try-catch won't work
    //reject all promises
    promise.reject('duration');
    promise.reject('tempo');
    promise.reject('thumbnail');
  }

  //wait for ready message
  await isReady;

  return out;
}
