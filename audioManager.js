//Wrapper around storing waveform data for the audio files
//Ensures waveform data is kept in memory as long as needed, and cleaned up as soon as possible

const { decodeAudio } = require('./audioDecoder.js');

const audioWaveforms = {};

//Mark the given song as being in use by the given session, and load it in memory if needed
module.exports.addReference = async (song, session) => {
  audioWaveforms[song.path] = {
    buffer: decodeAudio(song.path).buffer,
    references: [session.sid],
  };
};

//Get the waveform data for the given song
module.exports.getWaveform = song => audioWaveforms[song.path].buffer;

//Delete waveform data to free up memory
module.exports.removeReference = (song, session) => {
  const waveformObj = audioWaveforms[song.path];
  //Remove reference
  const sessionReference = waveformObj.references.findIndex(ref => ref === session.sid);
  if (sessionReference === -1) throw new Error('song not found');
  waveformObj.references.splice(sessionReference, 1);

  //Remove from memory if song is no longer used
  if (waveformObj.references.length === 0) {
    delete audioWaveforms[song.path];
  }
};
