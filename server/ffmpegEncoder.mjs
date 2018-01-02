import childProcess from 'child_process';

/**
 * Launches a new FFmpeg process that can encode from 32-bit floating point PCM to Webm Opus
 */
export default (numChannels) => {
  //Create FFmpeg process
  const process = childProcess.spawn(
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
      '-ac', numChannels.toString(), //either mono or stereo, depending on the session parameter
      '-ar', '48k', //Opus only supports 48,000 sample rate
      '-b:a', '128k', //bitrate: 128k bits per second
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
      console.log('FFmpeg conversion error', errorLog.join(''));
    }
  });

  //Store streams in local variables
  const inputStream = process.stdio[3];
  const outputStream = process.stdio[4];

  //Whenever audio is encoded by FFmpeg, store the output
  let outputBuffer = [];
  let outputBufferLength = 0;
  outputStream.on('data', (chunk) => {
    outputBuffer.push(chunk);
    outputBufferLength += chunk.byteLength;
  });

  return {
    inputStream,
    //Returns a copy of the output buffer contents, then clears it
    getOutputBuffer: () => {
      const out = { buffer: outputBuffer.slice(0), length: outputBufferLength };
      outputBuffer = [];
      outputBufferLength = 0;
      return out;
    },
    //Forcefully kill the FFmpeg process
    //We can safely do this because by this time, the client has disconnected and there's no one left to receive the stream.
    killCommand: process.kill.bind(process, 'SIGKILL'),
  };
};
