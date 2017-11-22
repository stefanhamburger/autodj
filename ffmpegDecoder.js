//Reads the given audio file, decodes it and returns the waveform data as FLoat32Array

const { execFile } = require('child_process');

module.exports.decodeAudio = async path => new Promise((resolve, reject) => {
  //Create FFmpeg process
  execFile(
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
      maxBuffer: 8 * 48000 * 60 * 20, //up to 20 minutes of audio, or 460.8 MB
    },
    (error, stdout) => {
      if (error) reject(error);
      resolve(stdout.buffer);
    },
  );
});
