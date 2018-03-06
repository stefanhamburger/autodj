//Audio decoder - from any format to 32-bit floating point PCM

import childProcess from 'child_process';

/** How much buffer we read from FFmpeg */
const MAX_FFMPEG_BUFFER = 8 * 48000 * 60 * 20;//up to 20 minutes of audio, or 460.8 MB

/**
 * Reads the given audio file, decodes it and returns the waveform data as Float32Array
 * @param {string} path - The path of the audio file we want to decode
 * @return {Promise<ArrayBuffer>}
 */
export default path => new Promise((resolve, reject) => {
  //Create FFmpeg process
  childProcess.execFile(
    'ffmpeg',
    //Command-line parameters
    [
      //input parameters
      '-i', path,
      //output parameters
      '-f', 'f32le', //32-bit floating point PCM
      '-ar', '48k', //48,000 sample rate
      '-ac', '2', //two channels, stereo audio
      'pipe:1', //output to stdout
    ],
    {
      encoding: 'buffer', //output as Buffer, not as string
      maxBuffer: MAX_FFMPEG_BUFFER, //maximum buffer size, affects the longest audio duration that we accept
    },
    (error, stdout) => {
      if (error) reject(error);
      resolve(new Float32Array(stdout.buffer));
    },
  );
});
