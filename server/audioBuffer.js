const fileManager = require('./fileManager.js');
const ffmpeg = require('./ffmpegEncoder.js');
const audioManager = require('./audioManager.js');

/** number of samples to preload - this controls how fast the server can react to input from the client, so should be kept as small as possible */
const PRELOAD_BUFFER_LENGTH = 5 * 48000;
/** byte length is 8 bytes per sample (2 channels, Float32 format) */
const BYTES_PER_SAMPLE = 8;
/** we never initiate encoding of more than 2 seconds of samples at once to prevent the app from blocking too long */
const MAX_SAMPLES_PER_LOOP = 2 * 48000;

/**
 * @param {module:session.Session} session
*/
const addFileToStream = (session) => {
  //wait until list of files was loaded
  const files = fileManager.getFiles(session.collection);

  const randomFile = files[Math.floor(Math.random() * files.length)];
  const songWrapper = { songRef: randomFile };
  session.songs.push(songWrapper);
  audioManager.addReference(randomFile, { sid: session.sid, index: (session.songs.length - 1) });
  console.log(`[${session.sid}] Adding to playlist: ${randomFile.name}...`);

  //If this is the first song in the stream, start playing immediately without worrying about mixing
  if (session.songs.length === 1) {
    songWrapper.startTime = 0;
    songWrapper.offset = 0;
    songWrapper.totalLength = 30 * 48000;//we assume the song is at least 30 seconds long, this will be overwritten as soon as we have the correct duration
    session.emitEvent({ type: 'SONG_START', songName: songWrapper.songRef.name, time: 0 });
    songWrapper.ready = new Promise(async (resolve) => {
      songWrapper.totalLength = await audioManager.getDuration(songWrapper.songRef);
      resolve();
    });
  } else {
    //append new song at the end of the previous song
    const prevSongWrapper = session.songs[session.songs.length - 2];
    songWrapper.ready = new Promise(async (resolve) => {
      //wait until previous song has finished processing
      await prevSongWrapper.ready;

      //TODO: we need to implement mixing and cross-fade between songs
      const startTime = (session.songs.length === 1)
        ? 0
        : prevSongWrapper.startTime + prevSongWrapper.totalLength;
      songWrapper.startTime = startTime;//the time in samples at which to start adding this song to the stream
      songWrapper.offset = 0;//the offset into the song at which to start mixing, e.g. to skip silence at the beginning
      session.emitEvent({ type: 'SONG_START', songName: songWrapper.songRef.name, time: startTime / 48000 });
      songWrapper.totalLength = await audioManager.getDuration(songWrapper.songRef);//how long we want to play this song, e.g. to skip the ending
      resolve();
    });
  }
};

//writes some samples to the FFmpeg input stream to start encoding
const addToBuffer = async (session) => {
  //if we need to write bytes to buffer, write as many samples as possible from the current song
  //if end of song is reached, we will add samples from follow-up song in the next function call
  if (session.samplesToAdd > 0) {
    const curSong = session.songs[session.curSong];
    const waveform = await audioManager.getWaveform(curSong.songRef);

    const remainingSongLength = curSong.totalLength - session.curSongPosition;
    const numSamplesToWrite = Math.min(session.samplesToAdd, remainingSongLength, MAX_SAMPLES_PER_LOOP);

    session.inputStream.write(Buffer.from(waveform, (curSong.offset + session.curSongPosition) * BYTES_PER_SAMPLE, numSamplesToWrite * BYTES_PER_SAMPLE));
    session.curSongPosition += numSamplesToWrite;
    session.samplesToAdd -= numSamplesToWrite;

    if (session.curSongPosition >= curSong.totalLength) {
      //delete previous song from memory
      audioManager.removeReference(curSong.songRef, { sid: session.sid, index: session.curSong });
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
  const { inputStream, getOutputBuffer, killCommand } = ffmpeg.createEncoder(session.numChannels);
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
