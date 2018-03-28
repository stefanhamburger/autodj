import childProcess from 'child_process';

export default function launchProcess(audioFile, callback) {
  const process = childProcess.spawn('node', [
    'server/child-process/index.mjs',
    '--audio-file', audioFile,
  ], {
    //TODO
  });


  //Register event handler for messages received from child process
  process.stdout.on('data', (...args) => {
    callback(...args);
  });


  //Set up functions to send binary messages to child process
  const sendBuffer = (buffer) => {
    const typedArray = new Uint8Array(5 + buffer.byteLength);
    const dv = new DataView(typedArray);
    dv.setUint8(0, 2);//array buffer
    dv.setUint32(1, buffer.byteLength, true);
    for (let i = 0; i < buffer.byteLength; i += 1) {
      typedArray[5 + i] = buffer[i];
    }
    process.stdin.write(typedArray);
  };


  //Set up functions to send JSON messages to child process
  const sendObject = (obj) => {
    //create string from JSON object
    const objAsString = JSON.stringify(obj);

    //construct ArrayBuffer filled with object
    const typedArray = new Uint8Array(5 + objAsString.length);
    const dv = new DataView(typedArray.buffer);
    dv.setUint8(0, 1);//JSON
    dv.setUint32(1, objAsString.length, true);
    for (let i = 0; i < objAsString.length; i += 1) {
      typedArray[5 + i] = objAsString.charCodeAt(i);
    }

    //send ArrayBuffer to child process
    process.stdin.write(typedArray);
  };

  return { sendBuffer, sendObject };
}
