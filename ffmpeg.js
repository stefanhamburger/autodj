const { Writable } = require('stream');
const { spawn } = require('child_process');

module.exports.createNewInstance = () => {
  //Create FFmpeg process
  const process = spawn(
    'ffmpeg',
    //Command-line parameters
    [
      //input parameters
      '-f', 'f32le', //our waveform data is an Float32Array, so the input is PCM 32-bit IEEE floating point in little endian
      '-ar', '48k', //48,000 sample rate for highest quality
      '-ac', '2', //two channels, stereo input
      '-i', 'pipe:3',
      //output parameters
      '-f', 'webm', //Webm container
      '-codec:a', 'libopus', //Opus codec
      '-ar', '48k', //Opus only supports 48,000 sample rate
      //'-b:a', '128k', //bitrate - TODO: replace this by 'q:a'
      '-vn', //no video stream
      '-map_metadata', '-1', //strip metadata
      'pipe:4',
    ],
    //Process options
    {
      //ignore stdin + stdout, but pipe stderr + audio input + audio output
      stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'],
    },
  );

  //Handle error messages
  const errorLog = [];
  process.stderr.setEncoding('utf8');
  process.stderr.on('data', (data) => {
    //FFmpeg has written an error message to the output
    errorLog.push(data);
  });
  process.on('error', (err) => {
    //There was an error starting/killing the process, or communicating with the process
    console.log('FFmpeg process error', err);
  });
  process.on('exit', (code) => {
    if (code && code !== 255) {
      //FFmpeg has exited with an error code
      console.log('FFmpeg conversion error', errorLog.join());
    }
  });

  //Pipe streams
  const inputStream = process.stdio[3];
  const outputStream = process.stdio[4];

  //create Writable stream that stores the converted data
  let outputBuffer = [];
  const outputWritable = new Writable({
    write(chunk, encoding, callback) {
      outputBuffer.push(chunk);
      callback(null);
    },
  });
  outputStream.pipe(outputWritable);

  return {
    inputStream,
    getOutputBuffer: () => {
      //returns copy of the output buffer contents, then clears it
      const out = outputBuffer.slice(0);
      outputBuffer = [];
      return out;
    },
    killCommand: async () => {
      //Gracefully allow FFmpeg to close the stream
      //We don't really need to do this because by this time, the client has disconnected and there's no one left to receive the stream.
      outputWritable.end();
      await new Promise(resolve => setTimeout(() => resolve(), 10000));
      //Forcefully kill the FFmpeg process
      process.kill('SIGKILL');
    },
  };
};
