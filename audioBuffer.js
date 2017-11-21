const fileManager = require('./fileManager.js');
const ffmpeg = require('./ffmpeg.js');
const audioManager = require('./audioManager.js');

//number of samples to preload - this controls how fast the server can react to input from the client, so should be kept as small as possible
const PRELOAD_BUFFER_LENGTH = 5 * 48000;
//byte length is 8 bytes per sample (2 channels, Float32 format)
const BYTES_PER_SAMPLE = 8;
//we never initiate encoding of more than 1 second of samples at once to prevent the app from blocking too long
const MAX_SAMPLES_PER_LOOP = 2 * 48000;

const addFileToStream = (session) => {
  //wait until list of files was loaded
  const files = fileManager.getFiles(session.collection);

  const randomFile = files[Math.floor(Math.random() * files.length)];
  session.songs.push(randomFile);
  audioManager.addReference(randomFile, session);
  console.log('[' + session.sid + '] Adding to playlist: ' + randomFile.name + '...');
};

//writes some samples to the FFmpeg input stream to start encoding
const addToBuffer = async (session) => {
  //if we need to write bytes to buffer, write as many samples as possible from the current song
  //if end of song is reached, we will add samples from follow-up song in the next function call
  if (session.samplesToAdd > 0) {
    const waveform = await audioManager.getWaveform(session.songs[session.curSong]);

    const remainingSongLength = waveform.byteLength / BYTES_PER_SAMPLE - session.curSongPosition;
    const numSamplesToWrite = Math.min(session.samplesToAdd, remainingSongLength, MAX_SAMPLES_PER_LOOP);

    //emit warning when inputStream.write() takes longer than 2000ms
    const time1 = Date.now();
    session.inputStream.write(Buffer.from(waveform, session.curSongPosition * BYTES_PER_SAMPLE, numSamplesToWrite * BYTES_PER_SAMPLE));
    const time2 = Date.now();
    if (time2 - time1 > 1000) console.log('WARNING: inputStream.write() took ' + (time2 - time1) + 'ms!');
    session.curSongPosition += numSamplesToWrite;
    session.samplesToAdd -= numSamplesToWrite;

    if (session.curSongPosition >= waveform.byteLength / BYTES_PER_SAMPLE) {
      //delete previous song from memory
      audioManager.removeReference(session.songs[session.curSong], session);
      //start encoding next song
      session.curSong++;
      session.curSongPosition = 0;
    }
  }

  //if we need more waveform data, add another song (by starting to decoding it into waveform data)
  if (session.curSong >= session.songs.length - 1) {
    addFileToStream(session);
  }

  //Only add more waveform data if it's still needed, otherwise pause until we receive message from client
  if (session.samplesToAdd <= 0) {
    session.pauseEncoding();
  } else {
    setTimeout(addToBuffer.bind(null, session), 1000);
  }
};

//initializes audio buffer
module.exports.init = async (session) => {
  //create new FFmpeg process
  const { inputStream, getOutputBuffer, killCommand } = ffmpeg.createNewInstance();
  session.inputStream = inputStream;
  session.getOutputBuffer = getOutputBuffer;
  session.killCommand = killCommand;

  //initialize session data
  session.clientBufferLength = 0;//the playback position of the client (in seconds)
  session.songs = [];//the list of songs, given by their waveform data
  session.curSong = 0;//which song from the list is currently playing
  session.curSongPosition = 0;//the current position in the current song (given as sample index)
  session.samplesToAdd = PRELOAD_BUFFER_LENGTH;//how many samples we need to feed to FFmpeg

  //Encoder
  {
    let isPaused = false;
    session.pauseEncoding = () => {
      isPaused = true;
    };
    session.resumeEncoding = () => {
      if (isPaused) {
        isPaused = false;
        setTimeout(addToBuffer.bind(null, session));
      } else {
        //do nothing
      }
    };
  }

  addFileToStream(session);
  setTimeout(addToBuffer.bind(null, session));
};

//Start converting the given amount of audio
module.exports.scheduleNewAudio = (session, newBufferLength) => {
  //Provide new input to FFmpeg
  if (newBufferLength > 0) {
    const prevLength = session.clientBufferLength;
    session.clientBufferLength = newBufferLength;
    //schedule function call so that we can immediately send the HTTP response
    session.samplesToAdd += Math.ceil((newBufferLength - prevLength) * 48000);
    session.resumeEncoding();
  }
};
