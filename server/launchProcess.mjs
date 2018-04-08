import childProcess from 'child_process';

/**
 * Launches a new Node process to analyse the given audio file
 * @param audioFile Path to the audio file as string
 */
export default function launchProcess(callback, audioFile, isFirstSong) {
  const spawnedProcess = childProcess.spawn('node', [
    '--experimental-modules',
    'server/child-process/index.mjs',
    audioFile,
    (isFirstSong === true) ? 'true' : 'false',
  ]);


  //Register event handler for messages received from child process
  spawnedProcess.stdout.on('data', (buffer) => {
    const arrayBuffer = buffer.buffer;
    const dv = new DataView(arrayBuffer);
    //parse header (type + length), perform length integrity check
    const type = dv.getUint8(0);
    const id = dv.getUint32(1, true);
    const length = dv.getUint32(5, true);
    if (arrayBuffer.byteLength !== 9 + length) {
      throw new Error(`Message length check failed, expected message to be ${9 + length} but was ${arrayBuffer.byteLength}`);
    }

    const bufferBody = arrayBuffer.slice(9);

    if (type === 0) { //string
      //convert ArrayBuffer to string
      const text = String.fromCharCode.apply(null, new Uint8Array(bufferBody));
      //parse JSON
      try {
        const obj = JSON.parse(text);
        callback(true, id, obj);
      } catch (err) {
        throw new Error('Could not read JSON message from child');
      }
    } else if (type === 1) { //binary
      callback(false, id, bufferBody);
    } else {
      throw new Error(`Unknown message type ${type} from child`);
    }
  });


  //Handle error messages in main thread, instead of ignoring them
  spawnedProcess.stderr.setEncoding('utf8');
  spawnedProcess.stderr.on('data', (error) => {
    //don't halt on warning message that we are using experimental features
    if (!String(error).includes('ExperimentalWarning: The ESM module loader is experimental.')) {
      throw new Error(error);
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
