//Reads the given audio file, decodes it and returns the waveform data as FLoat32Array

const fs = require('fs');
const AV = require('av');
require('mp3');
const { getChannel, monoToStereo } = require('./waveformWrapper.js');
const { resample } = require('./audioResampler.js');

//For a given audio file, return duration, sample rate and waveform data
module.exports.decodeAudio = async path => new Promise((resolve, reject) => {
  fs.readFile(path, async (errFileRead, rawBuffer) => {
    //I/O error when trying to read file from disk
    if (errFileRead) {
      reject(errFileRead);
    }

    const asset = AV.Asset.fromBuffer(rawBuffer);

    //error when trying to decode
    asset.on('error', (errDecode) => {
      reject(errDecode);
    });

    asset.decodeToBuffer((waveformBufferIn) => {
      let waveformBuffer = waveformBufferIn;

      //check number of channels, and convert mono to stereo if needed
      //TODO: alternatively, to save memory we could set a flag that this is mono and in the code for mixing two tracks, treat it as a special case
      if (asset.format.channelsPerFrame === 1) {
        //console.log('Input file ' + path + ' was mono, automatically changing to stereo!');
        waveformBuffer = monoToStereo(waveformBuffer);
      } else if (asset.format.channelsPerFrame > 2) {
        console.warn('Expected mono or stereo input but file had ' + asset.format.channelsPerFrame + ' channels. Any channels beyond 0 and 1 will be ignored.');
      }

      //Sampling rate must be 44,100 Hz or 48,000 Hz, those are the two most common sampling rates
      //We use 48,000 Hz waveforms for highest quality, so any audio with 44,100 Hz must be resampled
      if (asset.format.sampleRate === 44100) {
        //console.log('Sample rate in ' + path + ' is not 48k Hz but 44.1k Hz so we must resample!');
        const leftChannel = getChannel({ waveform: waveformBuffer, curChannel: 0 });
        const rightChannel = getChannel({ waveform: waveformBuffer, curChannel: 1 });
        //waveformBuffer = resample(waveformBuffer, leftChannel, rightChannel);
      } else if (asset.format.sampleRate !== 48000) {
        reject(new Error('Sample rate ' + asset.format.sampleRate + ' Hz not supported.'));
      }

      resolve({
        waveform: waveformBuffer,
      });
    });

    //alternatively: use 'data' event and merge packets manually
    /*
    const bufferArray = [];
    let totalLength = 0;

    asset.on('data', (bufferPart) => {
      bufferArray.push(bufferPart);
      totalLength += bufferPart.length;
    });

    asset.on('end', () => {
      //TODO: need to decide how to handle stereo audio
      resolve({
        sampleRate: asset.format.sampleRate,
        numberofChannels: asset.format.channelsPerFrame,
        bitsPerChannel: asset.format.bitsPerChannel,
        waveform: Buffer.concat(bufferArray, totalLength),
      });
    });

    //start decoding
    asset.start();*/
  });
});
