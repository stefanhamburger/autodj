import createEncoder from './ffmpegEncoder.mjs';
//import * as audioManager from './audioManager.mjs';
import { addFirstSong, addFollowUpSong } from './playlist.mjs';

/** number of samples to preload - this controls how fast the server can react to input from the client, so should be kept as small as possible */
const PRELOAD_BUFFER_LENGTH = 5 * 48000;
/** we never initiate encoding of more than 2 seconds of samples at once to prevent the app from blocking too long */
const MAX_SAMPLES_PER_LOOP = 2 * 48000;


/** Write a certain number of samples to the FFmpeg input stream so that they are encoded */
const addToBuffer = async (session) => {
  if (session.samplesToAdd > 0) {
    let numSamplesToWrite = Math.min(session.samplesToAdd, MAX_SAMPLES_PER_LOOP);
    const endTime = session.encoderPosition + numSamplesToWrite;
    //Only use songs that are 1. ready for processing 2. have already started playing 3. have not yet finished playing
    const songs = session.currentSongs.filter(song => song.ready === true && endTime > song.startTime && session.encoderPosition < song.endTime);

    //only encode when we have at least one song to encode (at the start of a session, it takes a couple seconds until we can encode a song)
    if (songs.length > 0) {
      //ensure that songs don't end prematurely: If there isn't at least one song to cover till endTime, reduce numSamplesToWrite accordingly
      numSamplesToWrite = Math.min(numSamplesToWrite, ...songs.map(song => song.endTime - session.encoderPosition));

      const outBuffer = new Float32Array(numSamplesToWrite * 2);//input is always stereo (two channels)

      //Get an array of songs that should be written to the current stream, and the offset into their waveform
      await Promise.all(songs.map(async (song) => {
        //calculate positions, all numbers given in samples
        const songPieceStart = Math.max(0, session.encoderPosition - song.startTime);
        const songPieceEnd = Math.min(song.endTime, session.encoderPosition + numSamplesToWrite) - song.startTime;
        const songPieceLength = songPieceEnd - songPieceStart;
        const outBufferOffset = Math.max(0, song.startTime - session.encoderPosition);

        const waveform = await song.song.getPiece({ offset: songPieceStart, length: songPieceLength, tempoChange: song.tempoAdjustment });

        //Loop through numSamplesToWrite, add both channels to buffer
        for (let j = 0; j < songPieceLength; j += 1) {
          outBuffer[(outBufferOffset + j) * 2] += waveform[j * 2];
          outBuffer[(outBufferOffset + j) * 2 + 1] += waveform[j * 2 + 1];
        }

        if (endTime > song.endTime) {
          //need to move song from currentSongs into finshedSongs if we reached its end
          session.currentSongs.splice(session.currentSongs.findIndex(ele => ele === song), 1);
          session.finishedSongs.push(song);
          //audioManager.removeReference(song.songRef, { sid: session.sid, id: song.id });
          song.song.destroy();
          //need to start encoding another song if we don't have any current songs left
          if (song.hadTempoFailure !== true) {
            //only add follow-up song if this was not the first song, since first songs automatically have a follow-up song
            addFollowUpSong(session);
          }
        }
      }));

      session.encoderInput.write(Buffer.from(outBuffer.buffer));
      session.encoderPosition += numSamplesToWrite;
      session.samplesToAdd -= numSamplesToWrite;
    }
  }

  //Only continue adding waveform data if it's still needed, otherwise pause until we receive message from client
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
        //audioManager.removeReference(session.currentSongs[i].songRef, { sid: session.sid, id: session.currentSongs[i].id });
        session.currentSongs[i].song.destroy();
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

  addFirstSong(session);
  setTimeout(addToBuffer.bind(null, session));
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
