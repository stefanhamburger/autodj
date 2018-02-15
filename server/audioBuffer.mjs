import * as fileManager from './fileManager.mjs';
import createEncoder from './ffmpegEncoder.mjs';
import * as audioManager from './audioManager.mjs';
import startTempoRecognition from './startTempoRecognition.mjs';
//import { setTimeout } from 'timers';

/** number of samples to preload - this controls how fast the server can react to input from the client, so should be kept as small as possible */
const PRELOAD_BUFFER_LENGTH = 5 * 48000;
/** we never initiate encoding of more than 2 seconds of samples at once to prevent the app from blocking too long */
const MAX_SAMPLES_PER_LOOP = 2 * 48000;

/**
 * Pick a random song, start decoding it and add it to the playlist.
 * @param {module:session.Session} session
*/
const addFileToStream = (session) => {
  //wait until list of files was loaded
  const files = fileManager.getFiles(session.collection);

  const randomFile = files[Math.floor(Math.random() * files.length)];
  const id = String(Math.random());//TODO: use a better id format than Math.random(), similar to session id
  const songWrapper = { id, songRef: randomFile };
  session.currentSongs.push(songWrapper);
  audioManager.addReference(randomFile, { sid: session.sid, id });
  console.log(`[${session.sid}] Adding to playlist: ${randomFile.name}...`);
  audioManager.createThumbnail(session, songWrapper);

  //If this is the first song in the stream, start playing immediately without worrying about mixing
  if (session.currentSongs.length === 1 && session.finishedSongs.length === 0) {
    songWrapper.startTime = 0;
    songWrapper.offset = 0;
    songWrapper.totalLength = 30 * 48000;//we assume the song is at least 30 seconds long, this will be overwritten as soon as we have the correct duration
    session.emitEvent({
      type: 'SONG_START',
      id: songWrapper.id,
      songName: songWrapper.songRef.name,
      time: 0,
    });
    songWrapper.ready = false;//we need to store ready state separately since we can't get a promise's state natively
    songWrapper.readyPromise = new Promise(async (resolve) => {
      songWrapper.totalLength = await audioManager.getDuration(songWrapper.songRef);
      session.emitEvent({
        type: 'SONG_DURATION',
        id: songWrapper.id,
        duration: songWrapper.totalLength,
      });

      //do tempo recognition
      startTempoRecognition(session, songWrapper, true);

      resolve();
      songWrapper.ready = true;
    });
  } else {
    //append new song at the end of the previous song
    songWrapper.ready = false;
    songWrapper.readyPromise = new Promise(async (resolve) => {
      const previousSongs = session.currentSongs.filter(song => song.id !== songWrapper.id);

      //wait until previous songs have finished processing
      await Promise.all(previousSongs.map(song => song.readyPromise));

      //find the song that is right before this one (= song with the highest starting time)
      const previousSong = previousSongs.reduce((accumulator, curSong) => {
        if (curSong.startTime > accumulator.startTime) {
          return curSong;
        } else {
          return accumulator;
        }
      }, { startTime: Number.NEGATIVE_INFINITY });

      //TODO: we need to implement mixing and cross-fade between songs
      //the time in samples at which to start adding this song to the stream
      songWrapper.startTime = previousSong.startTime + previousSong.totalLength - 15 * 48000;
      //the offset (in samples) into the song at which to start mixing, e.g. to skip silence at the beginning
      songWrapper.offset = 0;

      session.emitEvent({
        type: 'SONG_START',
        id: songWrapper.id,
        songName: songWrapper.songRef.name,
        time: songWrapper.startTime / 48000,
      });

      //how long we want to play this song, e.g. to skip the ending
      songWrapper.totalLength = (await audioManager.getDuration(songWrapper.songRef)) - songWrapper.offset;

      session.emitEvent({
        type: 'SONG_DURATION',
        id: songWrapper.id,
        duration: songWrapper.totalLength,
      });

      //do tempo recognition
      startTempoRecognition(session, songWrapper);

      resolve();
      songWrapper.ready = true;
    });
  }
};


/** Write a certain number of samples to the FFmpeg input stream so that they are encoded */
const addToBuffer = async (session) => {
  if (session.samplesToAdd > 0) {
    //Filter session.currentSongs to only get songs that are ready for processing
    const numSamplesToWrite = Math.min(session.samplesToAdd, MAX_SAMPLES_PER_LOOP);
    const endTime = session.encoderPosition + numSamplesToWrite;
    const songs = session.currentSongs.filter(song => song.ready === true && endTime > song.startTime && session.encoderPosition < song.startTime + song.totalLength);

    //only encode when we have at least one song to encode (at the start of a session, it takes a couple seconds until we can encode a song)
    if (songs.length > 0) {
      //TODO: also ensure that songs don't end prematurely: If there isn't at least one song to cover till endTime, reduce numSamplesToWrite accordingly

      const outBuffer = new Float32Array(numSamplesToWrite * 2);//input is always stereo (two channels)

      //Get an array of songs that should be written to the current stream, and the offset into their waveform
      for (let i = 0; i < songs.length; i += 1) {
        const song = songs[i];
        const waveform = new Float32Array(await audioManager.getWaveform(song.songRef));//TODO: do not await in a loop
        const songPosition = session.encoderPosition - song.startTime;
        const bufferStart = songPosition < 0 ? -songPosition : 0;
        const bufferEnd = (song.startTime + song.totalLength < endTime) ?
          (numSamplesToWrite - (endTime - (song.startTime + song.totalLength))) :
          numSamplesToWrite;
        //Loop through numSamplesToWrite, add both channels to buffer
        for (let j = bufferStart; j < bufferEnd; j += 1) {
          outBuffer[j * 2] += waveform[(songPosition + j) * 2];
          outBuffer[j * 2 + 1] += waveform[(songPosition + j) * 2 + 1];
        }

        if (endTime > song.startTime + song.totalLength) {
          //need to move song from currentSongs into finshedSongs if we reached its end
          session.currentSongs.splice(session.currentSongs.findIndex(ele => ele === song), 1);
          session.finishedSongs.push(song);
          audioManager.removeReference(song.songRef, { sid: session.sid, id: song.id });
          //need to start encoding another song if we don't have any current songs left
          addFileToStream(session);
        }
      }

      session.encoderInput.write(Buffer.from(outBuffer.buffer));
      session.encoderPosition += numSamplesToWrite;
      session.samplesToAdd -= numSamplesToWrite;
    }
  }

  //Only add more waveform data if it's still needed, otherwise pause until we receive message from client
  if (session.samplesToAdd <= 0) {
    session.pauseEncoding();
  } else {
    setTimeout(addToBuffer.bind(null, session), 1000);
  }
};


/** Initializes the audio buffer */
export const init = (session) => {
  //create new FFmpeg process
  const { inputStream, getOutputBuffer, killCommand } = createEncoder(session.numChannels);
  session.encoderInput = inputStream;
  session.getEncoderOutput = getOutputBuffer;
  session.killCommand = () => {
    //remove audio buffer from memory
    for (let i = 0; i < session.currentSongs.length; i += 1) {
      try {
        audioManager.removeReference(session.currentSongs[i].songRef, { sid: session.sid, id: session.currentSongs[i].id });
      } finally {
        //ignore error
      }
    }
    //kill FFmpeg process
    killCommand();
  };

  //initialize session data
  session.clientBufferLength = 0;//the playback position of the client (in seconds)
  session.finishedSongs = [];//songs that we have finished playing. FIXME we can probably remove this completely
  session.currentSongs = [];//the list of current and upcoming songs. We look at this list when getting songs for mixing
  session.encoderPosition = 0;//the current position where we are encoding audio data
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

  //Also add a second song 15 seconds later
  setTimeout(addFileToStream.bind(null, session), 15000);
};


/** Start converting the given amount of audio. */
export const scheduleNewAudio = (session, newBufferLength) => {
  //Provide new input to FFmpeg
  if (newBufferLength > 0) {
    const prevLength = session.clientBufferLength;
    session.clientBufferLength = newBufferLength;
    //schedule function call so that we can immediately send the HTTP response
    session.samplesToAdd += Math.ceil((newBufferLength - prevLength) * 48000);
    session.resumeEncoding();
  }
};
