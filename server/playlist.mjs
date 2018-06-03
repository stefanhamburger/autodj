import * as fileManager from './fileManager.mjs';
import * as consoleColors from './lib/consoleColors.mjs';
import { analyseSong } from './launchProcessWrapper.mjs';
import fixPlaybackData from './lib/fixPlaybackData.mjs';

const SONG_ID_LENGTH = 16;
const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
/** Generates a new random song id */
const generateId = (session) => {
  /** Get a list of previous ids based on current and finished songs */
  const previousIds = new Map([...session.currentSongs, ...session.finishedSongs].map(song => [song.id, true]));

  const innerGenerate = () => {
    let out = '';
    for (let i = 0; i < SONG_ID_LENGTH; i += 1) {
      out += alphabet[Math.floor(Math.random() * alphabet.length)];
    }

    //if song id is already in use, find another one - highly unlikely, that this happens
    if (previousIds.has(out)) return innerGenerate();

    return out;
  };

  return innerGenerate();
};


/**
 * If tempo recognition has failed in first song, immediately revoke it
 */
const revokeSong = (songWrapper, encoderPosition) => {
  //calculate current position in playbackData, then shorten this entry by current pos + 5 seconds, and remove all later entries

  for (let i = 0, il = songWrapper.playbackData.length; i < il; i += 1) {
    const entry = songWrapper.playbackData[i];

    //if we are currently in this entry
    if (encoderPosition >= entry.realTimeStart && encoderPosition < entry.realTimeStart + entry.realTimeLength) {
      //calculate current sample
      const currentSample = Math.round((encoderPosition - entry.realTimeStart) * entry.tempoAdjustment);

      //shorten entry by current position + 5 seconds
      entry.sampleLength = currentSample + Math.round(5 * 48000 * entry.tempoAdjustment);

      //remove all future entries
      songWrapper.playbackData.splice(i + 1);

      fixPlaybackData(songWrapper);

      return;
    }
  }
};


/**
 * Checks a follow-up song for correct tempo detection, and returns the song object with full information.
 * Throws an error if the tempo detection fails.
 * @param session
 */
async function testFollowUpSong(session) {
  //get random audio file
  const files = fileManager.getFiles(session.collection);
  const randomFile = files[Math.floor(Math.random() * files.length)];

  const id = generateId(session);
  const songWrapper = { id, songRef: randomFile };
  songWrapper.song = analyseSong(session, songWrapper, false);
  console.log(`${consoleColors.magenta(`[${session.sid}]`)} Analysing ${consoleColors.green(songWrapper.songRef.name)}...`);
  //inform client that we are considering this follow-up song - subject to successful tempo detection etc.
  session.emitEvent({
    type: 'NEXT_SONG',
    songName: `[TBD] ${songWrapper.songRef.name}`,
  });

  songWrapper.song = await songWrapper.song;
  songWrapper.totalSampleLength = await songWrapper.song.duration;

  //do tempo recognition - and only use song if recognition was successful
  songWrapper.tempo = await songWrapper.song.tempo;

  return songWrapper;
}


/**
 * Adds a follow-up song. The follow-up song must be tempo-detected both at beginning and end.
 * If it fails, a different follow-up song is picked.
 * @param session
 */
export async function addFollowUpSong(session) {
  //find the song that is right before this one (= song with the highest starting time)
  const previousSong = session.currentSongs.reduce((accumulator, curSong) => {
    if (curSong.startTime > accumulator.startTime) {
      return curSong;
    } else {
      return accumulator;
    }
  }, { startTime: Number.NEGATIVE_INFINITY });
  const previousBpm = previousSong.tempo.bpmEnd * previousSong.playbackData[0].tempoAdjustment;

  let bestChoice;
  let bestChoiceTempo = Number.POSITIVE_INFINITY;
  //Continue finding follow-up songs, as long as:
  while (bestChoice === undefined || (
    //- We still haven't found a song within 10 bpm of the current song
    bestChoiceTempo > 10 &&
    //- There is more than 90 seconds left in the current song
    previousSong.endTime - session.encoderPosition > 90 * 48000
  )) {
    try {
      const songWrapper = await testFollowUpSong(session);//eslint-disable-line no-await-in-loop
      const tempo = Math.abs(previousBpm - songWrapper.tempo.bpmStart);
      if (tempo < bestChoiceTempo) {
        //we have found a new best follow-up song, kill previous choice
        if (bestChoice !== undefined) {
          bestChoice.song.destroy();
        }
        //store new best choice
        bestChoice = songWrapper;
        bestChoiceTempo = tempo;
      } else {
        //song is not picked, kill process
        songWrapper.song.destroy();
      }
    } catch (error) {
      //tempo detection failed, ignore this song
    }
  }

  //Pick the song with the least tempo adjustment, and add it to the list
  {
    const songWrapper = bestChoice;

    //by how much to adjust the tempo of this song so it matches the previous song
    const tempoAdjustment = previousBpm / songWrapper.tempo.bpmStart;
    //the time in samples at which to start adding this song to the stream - TODO: need to beatmatch
    songWrapper.startTime = previousSong.endTime - 15 * 48000;

    session.currentSongs.push(songWrapper);
    console.log(`${consoleColors.magenta(`[${session.sid}]`)} Adding to playlist: ${consoleColors.green(songWrapper.songRef.name)}.`);

    //Set playback data based on calculated tempo adjustment
    songWrapper.playbackData = [
      {
        sampleOffset: 0,
        sampleLength: songWrapper.totalSampleLength,
        tempoAdjustment,
      },
    ];
    fixPlaybackData(songWrapper);

    //Inform client that we decided on this follow-up song
    session.emitEvent({
      type: 'NEXT_SONG',
      songName: songWrapper.songRef.name,
    });

    //Send full song information to client
    session.emitEvent({
      type: 'SONG_START',
      id: songWrapper.id,
      songName: songWrapper.songRef.name,
      time: songWrapper.startTime,
    });
    session.emitEvent({
      type: 'SONG_DURATION',
      id: songWrapper.id,
      origDuration: songWrapper.totalSampleLength,
      startTime: songWrapper.startTime,
      endTime: songWrapper.endTime,
      playbackData: songWrapper.playbackData,
    });
    session.emitEvent({
      type: 'TEMPO_INFO',
      id: songWrapper.id,
      bpmStart: songWrapper.tempo.bpmStart,
      bpmEnd: songWrapper.tempo.bpmEnd,
      beats: songWrapper.tempo.beats,
    });

    //Notify client that previous song can now be skipped
    session.emitEvent({
      type: 'CAN_SKIP',
      id: previousSong.id,
    });

    //Notify client that waveform data is ready
    songWrapper.song.thumbnail.then(() => {
      session.emitEvent({ type: 'THUMBNAIL_READY', id: songWrapper.id });
    });
  }
}


/**
 * Adds a first song to the playlist. The first song is only tempo-detected at the end.
 * If tempo detection fails, the first song is quickly stopped and another first song
 * is selected.
 * @param session
 * @param offset
 */
export async function addFirstSong(session, offset = 0) {
  //get random audio file
  const files = fileManager.getFiles(session.collection);
  const randomFile = files[Math.floor(Math.random() * files.length)];

  const id = generateId(session);
  const songWrapper = { id, songRef: randomFile };

  songWrapper.song = analyseSong(session, songWrapper, true);
  console.log(`${consoleColors.magenta(`[${session.sid}]`)} Adding to playlist: ${consoleColors.green(songWrapper.songRef.name)}...`);

  songWrapper.startTime = offset;
  songWrapper.totalSampleLength = 30 * 48000;//we assume the song is at least 30 seconds long, this will be overwritten as soon as we have the correct duration
  songWrapper.playbackData = [
    {
      sampleOffset: 0,
      sampleLength: songWrapper.totalSampleLength,
      tempoAdjustment: 1, //playback at normal speed for now, but speed may change later on
    },
  ];
  fixPlaybackData(songWrapper);

  session.emitEvent({
    type: 'SONG_START',
    id: songWrapper.id,
    songName: songWrapper.songRef.name,
    time: songWrapper.startTime,
  });
  songWrapper.song = await songWrapper.song;
  songWrapper.totalSampleLength = await songWrapper.song.duration;

  songWrapper.playbackData = [
    {
      sampleOffset: 0,
      sampleLength: songWrapper.totalSampleLength,
      tempoAdjustment: 1,
    },
  ];
  fixPlaybackData(songWrapper);

  session.emitEvent({
    type: 'SONG_DURATION',
    id: songWrapper.id,
    origDuration: songWrapper.totalSampleLength,
    startTime: songWrapper.startTime,
    endTime: songWrapper.endTime,
    playbackData: songWrapper.playbackData,
  });

  //we are now ready for playback
  session.currentSongs.push(songWrapper);

  try {
    //do tempo recognition - for first song, we do not need to wait until it is done
    songWrapper.tempo = await songWrapper.song.tempo;
  } catch (error) {
    console.log(`${consoleColors.magenta(`[${session.sid}]`)} Tempo detection failed for ${consoleColors.green(songWrapper.songRef.name)}; finding new first song.`);

    //if tempo detection failed, end this song
    revokeSong(songWrapper, session.encoderPosition);

    //emit event that duration has changed
    session.emitEvent({
      type: 'SONG_DURATION',
      id: songWrapper.id,
      origDuration: songWrapper.totalSampleLength,
      startTime: songWrapper.startTime,
      endTime: songWrapper.endTime,
      playbackData: songWrapper.playbackData,
    });

    //notify audio buffer that we pick a follow-up song ourselves and don't need audio buffer to do it
    songWrapper.hadTempoFailure = true;

    //select another song
    addFirstSong(session, songWrapper.endTime);
    return;
  }

  session.emitEvent({
    type: 'TEMPO_INFO',
    id: songWrapper.id,
    bpmEnd: songWrapper.tempo.bpmEnd,
    beats: songWrapper.tempo.beats,
  });

  //Notify client that waveform data is ready
  await songWrapper.song.thumbnail;
  session.emitEvent({ type: 'THUMBNAIL_READY', id: songWrapper.id });

  //Start analysing follow-up song after 5 seconds
  setTimeout(addFollowUpSong.bind(null, session), 5000);
}
