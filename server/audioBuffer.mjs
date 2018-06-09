import createEncoder from './ffmpegEncoder.mjs';
import { addFirstSong, addFollowUpSong } from './playlist.mjs';

/** number of samples to preload - this controls how fast the server can react to input from the client, so should be kept as small as possible */
const PRELOAD_BUFFER_LENGTH = 5 * 48000;
/** we never initiate encoding of more than 2 seconds of samples at once to prevent the app from blocking too long */
const MAX_SAMPLES_PER_LOOP = 2 * 48000;


/** A function to calculate the volume of each sample, based on its position in the song */
const genericGetVolume = (offsetIntoPiece, fadeInLength, fadeOutStart, fadeOutLength, position) => {
  const curSample = offsetIntoPiece + position;
  //Calculate volume based on position in song:
  if (curSample < fadeInLength) { //start = linear fade-in from 0 to 1
    return curSample / fadeInLength;
  } else if (curSample > fadeOutStart) { //end = linear fade-out from 1 to 0
    return 1.0 - (curSample - fadeOutStart) / fadeOutLength;
  } else { //middle of the song = always at full volume
    return 1.0;
  }
};


/**
 * Applys a pseudo-sigmoid function to the input parameter in [0, 1] and returns a number in [0, 1].
 * This creates a smoother transition than via lerping.
 * The default sigmoid function only approaches its asymptotes at ±∞, therefore use a fifth-order polynomial
 * (derived using f(0)=0, f(0.5)=0.5, f(1)=1, f'(0)=0, f'(0.5)=0, f'(1)=0), which is also faster to compute.
 * ⚠️ This function does not check that input is within [0, 1]. Input outside of this range will
 *    result in erroneous output.
 * @param x A number in [0, 1].
 */
const applySigmoid = x => (x === 1.0 ? 1.0 : -24 * x ** 5 + 60 * x ** 4 - 50 * x ** 3 + 15 * x ** 2);


/** Write a certain number of samples to the FFmpeg input stream so that they are encoded */
const addToBuffer = async (session) => {
  if (session.samplesToAdd > 0) {
    let numSamplesToWrite = Math.min(session.samplesToAdd, MAX_SAMPLES_PER_LOOP);
    let endTime = session.encoderPosition + numSamplesToWrite;
    //Only use songs that are 1. ready for processing 2. have already started playing 3. have not yet finished playing
    const songs = session.currentSongs.filter(song => endTime > song.startTime && session.encoderPosition < song.endTime);

    //only encode when we have at least one song to encode (at the start of a session, it takes a couple seconds until we can encode a song)
    if (songs.length > 0) {
      //ensure that songs don't end prematurely: If there isn't at least one song to cover till endTime, reduce numSamplesToWrite accordingly
      numSamplesToWrite = Math.min(numSamplesToWrite, ...songs.map(song => song.endTime - session.encoderPosition));
      //If numSamplesToWrite changed, also update endTime
      endTime = session.encoderPosition + numSamplesToWrite;

      const outBuffer = new Float32Array(numSamplesToWrite * 2);//input to our encoder is always stereo (two channels)

      //Get an array of songs that should be written to the current stream, and the offset into their waveform
      await Promise.all(songs.map(async (song) => {
        //Go through playback data, and add relevant entries to output stream
        await Promise.all(song.playbackData
          .filter(entry => entry.realTimeStart < endTime && entry.realTimeStart + entry.realTimeLength > session.encoderPosition)
          .map(async (entry) => {
            //at which sample into the song this piece starts (before tempo adjustment)
            const songPieceStart = entry.sampleOffset;
            //the offset into the piece (after tempo adjustment), given in samples
            const offsetIntoPiece = Math.max(0, session.encoderPosition - entry.realTimeStart);
            //length of the piece (after tempo adjustment), given in samples
            const songPieceLength = Math.min(endTime, entry.realTimeStart + entry.realTimeLength) - Math.max(entry.realTimeStart, session.encoderPosition);

            const waveform = await song.song.getPiece({
              pieceStart: songPieceStart,
              offset: offsetIntoPiece,
              length: songPieceLength,
              tempoChange: entry.tempoAdjustment,
            });

            //If the piece doesn't start with session.encoderPosition but slightly later, calculate the start time
            const outBufferOffset = Math.max(0, entry.realTimeStart - session.encoderPosition);

            //Create new function to calculate volume, with constants already pre-defined for higher performance
            const offsetFromSongStart = (entry.realTimeStart - song.startTime) + offsetIntoPiece;
            const getVolume = genericGetVolume.bind(null, offsetFromSongStart, song.fadeIn, (song.endTime - song.startTime) - song.fadeOut, song.fadeOut);

            //Loop through numSamplesToWrite, add both channels to buffer
            for (let j = 0; j < songPieceLength; j += 1) {
              outBuffer[(outBufferOffset + j) * 2] += applySigmoid(getVolume(j)) * waveform[j * 2];
              outBuffer[(outBufferOffset + j) * 2 + 1] += applySigmoid(getVolume(j)) * waveform[j * 2 + 1];
            }
          }));

        if (endTime >= song.endTime) {
          //need to move song from currentSongs into finshedSongs if we reached its end
          session.currentSongs.splice(session.currentSongs.findIndex(ele => ele === song), 1);
          session.finishedSongs.push(song);
          song.song.destroy();
          //Need to start encoding another song if we don't have any current songs left
          //If first song could not be tempo detected, a follow-up song is automatically added and we don't need to do it here. Otherwise, add follow-up song.
          if (song.hadTempoFailure !== true) {
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
    session.killed = true;
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
  session.prematureSkip = false;//whether to skip to end before an optimal song has been found

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
