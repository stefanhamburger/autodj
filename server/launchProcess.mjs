import childProcess from 'child_process';
import getInputHandler from './launchProcessInputHandler.mjs';

/**
 * Launches a new Node process to analyse the given audio file
 * @param audioFile Path to the audio file as string
 */
export default function launchProcess(audioFile, isFirstSong, onInputCallback, onErrorCallback) {
  const spawnedProcess = childProcess.spawn('node', [
    '--experimental-modules',
    'server/child-process/index.mjs',
    audioFile,
    (isFirstSong === true) ? 'true' : 'false',
  ]);

  //Register event handler for messages received from child process
  spawnedProcess.stdout.on('data', getInputHandler(onInputCallback));

  //Handle error messages in main thread, instead of ignoring them
  spawnedProcess.stderr.setEncoding('utf8');
  spawnedProcess.stderr.on('data', (error) => {
    //don't halt on warning message that we are using experimental features
    if (!String(error).includes('ExperimentalWarning: The ESM module loader is experimental.')) {
      onErrorCallback(error);
    }
  });

  //Set up functions to send JSON messages to child process
  spawnedProcess.stdin.setEncoding('utf8');
  const sendObject = (obj) => {
    //create string from JSON object
    const objAsString = JSON.stringify(obj);
    spawnedProcess.stdin.write(objAsString);
  };

  const destroy = () => {
    spawnedProcess.kill();
  };

  //Return a function to send a JSON, and a function to kill the process
  return { sendObject, destroy };
}
