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
async function testFollowUpSong(session, previousSongPath) {
  //Get random audio file
  //Do not pick currently playing audio file, unless there is only one song in the collection
  const files = fileManager.getFiles(session.collection).filter((file, index, arr) => file.path !== previousSongPath || arr.length === 1);
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
  const previousSongPath = previousSong.songRef.path;
  const previousSongTempoAdj = previousSong.playbackData[previousSong.playbackData.length - 1].tempoAdjustment;
  const previousBpm = previousSong.tempo.bpmEnd * previousSongTempoAdj;

  let followUpSong;
  let followUpTempo = Number.POSITIVE_INFINITY;
  //Continue finding follow-up songs, as long as:
  while (session.killed !== true && (followUpSong === undefined || (
    //- We still haven't found a song within 5% bpm of the current song
    followUpTempo > 0.05 &&
    //- There is more than 90 seconds left in the current song
    previousSong.endTime - session.encoderPosition > 90 * 48000
  ))) {
    try {
      const tempSong = await testFollowUpSong(session, previousSongPath);//eslint-disable-line no-await-in-loop
      const tempTempo = Math.abs(previousBpm / tempSong.tempo.bpmStart - 1.0);
      if (tempTempo < followUpTempo) {
        //we have found a new best follow-up song, kill previous choice
        if (followUpSong !== undefined) {
          followUpSong.song.destroy();
        }
        //store new best choice
        followUpSong = tempSong;
        followUpTempo = tempTempo;
      } else {
        //song is not picked, kill process
        tempSong.song.destroy();
      }
    } catch (error) {
      //tempo detection failed, ignore this song
      console.log(error);
    }
  }

  //If session timed out while we were searching for a follow-up song, exit early
  if (session.killed === true) {
    followUpSong.song.destroy();
    return;
  }

  //Pick the song with the least tempo adjustment, and add it to the list
  {
    //by how much to adjust the tempo of this song so it matches the previous song
    const tempoAdjustment = previousBpm / followUpSong.tempo.bpmStart;

    /** We overlap for 41 beats = 10 bars, but we only beatmatch starting at 2nd bar = 9th beat */
    const BEAT_OVERLAP = 41;
    const BEAT_GAP = 8;
    /** We use a 48k Hz sampling rate due to Opus audio codec */
    const SAMPLE_RATE = 48000;

    /**
     * For beat matching, we overlap the last 41 beats of the previous song with the first 41 beats of the follow-up song
     * Frequently, songs will change tempo at the beginning or end, so ignore first/last 2 bars. Perfect beatmatching
     * therefore only happens across 6 beats = 25 beats.
     */

    //Fade-out timing of previous song, in seconds pre-tempo adjustment.
    const fadeOutStartSecPre = previousSong.tempo.beats[previousSong.tempo.beats.length - BEAT_OVERLAP];
    const fadeOutFirstBeatSecPre = previousSong.tempo.beats[previousSong.tempo.beats.length - (BEAT_OVERLAP - BEAT_GAP)];
    const fadeOutLastBeatSecPre = previousSong.tempo.beats[previousSong.tempo.beats.length - 1 - BEAT_GAP];
    //Fade-out timing of previous song, in samples pre-tempo adjustment.
    const fadeOutStartSampPre = Math.round(fadeOutStartSecPre * SAMPLE_RATE);
    const fadeOutFirstBeatSampPre = Math.round(fadeOutFirstBeatSecPre * SAMPLE_RATE);
    const fadeOutLastBeatSampPre = Math.round(fadeOutLastBeatSecPre * SAMPLE_RATE);
    //const fadeOutEndSampPre = previousSong.totalSampleLength;

    //Fade-in timing of follow-up song, in seconds pre-tempo adjustment.
    const fadeInFirstBeatSecPre = followUpSong.tempo.beats[8];
    //const fadeInEndSecPre = followUpSong.tempo.beats[BEAT_OVERLAP - 1];
    //Fade-in timing of follow-up song, in samples pre-tempo adjustment.
    //const fadeInStartSampPre = 0;
    const fadeInFirstBeatSampPre = Math.round(fadeInFirstBeatSecPre * SAMPLE_RATE);
    //const fadeInEndSampPre = Math.round(fadeInEndSecPre * SAMPLE_RATE);

    //Calculate fade-out duration of previous song post-tempo adjustment
    //const fadeOutLengthSampPre = fadeOutEndSampPre - fadeOutStartSampPre;
    //const fadeOutLengthSampPost = Math.round(fadeOutLengthSampPre / previousSongTempoAdj);
    const fadeOutEndSampPost = previousSong.endTime - previousSong.startTime;
    const fadeOutStartSampPost = fadeOutEndSampPost - Math.round((previousSong.totalSampleLength - fadeOutStartSampPre) / previousSongTempoAdj);
    const fadeOutFirstBeatSampPost = fadeOutEndSampPost - Math.round((previousSong.totalSampleLength - fadeOutFirstBeatSampPre) / previousSongTempoAdj);
    const fadeOutLastBeatSampPost = fadeOutEndSampPost - Math.round((previousSong.totalSampleLength - fadeOutLastBeatSampPre) / previousSongTempoAdj);

    //Calculate position where follow-up song starts playing (note: first beat can occur a few seconds later than this)
    const fadeInFirstBeatSampPost = Math.round(fadeInFirstBeatSampPre / tempoAdjustment);
    const followUpStartPosition = previousSong.endTime - (fadeOutEndSampPost - fadeOutFirstBeatSampPost) - fadeInFirstBeatSampPost;
    const fadeInEndSampPost = fadeInFirstBeatSampPost + (fadeOutLastBeatSampPost - fadeOutStartSampPost);


    //the time in samples at which to start adding this song to the stream
    followUpSong.startTime = followUpStartPosition;
    //Add fade-in and fade-out information to allow for volume change
    previousSong.fadeOut = fadeOutEndSampPost - fadeOutStartSampPost;
    followUpSong.fadeIn = fadeInEndSampPost;
    followUpSong.fadeOut = 0;

    session.currentSongs.push(followUpSong);
    console.log(`${consoleColors.magenta(`[${session.sid}]`)} Adding to playlist: ${consoleColors.green(followUpSong.songRef.name)}.`);

    //Set playback data based on calculated tempo adjustment
    followUpSong.playbackData = [
      {
        sampleOffset: 0,
        sampleLength: followUpSong.totalSampleLength,
        tempoAdjustment,
      },
    ];
    fixPlaybackData(followUpSong);

    //Inform client that we decided on this follow-up song
    session.emitEvent({
      type: 'NEXT_SONG',
      songName: followUpSong.songRef.name,
    });

    //Send full song information to client
    session.emitEvent({
      type: 'SONG_START',
      id: followUpSong.id,
      songName: followUpSong.songRef.name,
      time: followUpSong.startTime,
    });
    session.emitEvent({
      type: 'SONG_DURATION',
      id: followUpSong.id,
      origDuration: followUpSong.totalSampleLength,
      startTime: followUpSong.startTime,
      endTime: followUpSong.endTime,
      playbackData: followUpSong.playbackData,
    });
    session.emitEvent({
      type: 'TEMPO_INFO',
      id: followUpSong.id,
      bpmStart: followUpSong.tempo.bpmStart,
      bpmEnd: followUpSong.tempo.bpmEnd,
      beats: followUpSong.tempo.beats,
    });

    //Notify client that previous song can now be skipped
    session.emitEvent({
      type: 'CAN_SKIP',
      id: previousSong.id,
    });

    //Notify client that waveform data is ready
    followUpSong.song.thumbnail.then(() => {
      session.emitEvent({ type: 'THUMBNAIL_READY', id: followUpSong.id });
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
  songWrapper.fadeIn = 0;
  songWrapper.fadeOut = 0;
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
