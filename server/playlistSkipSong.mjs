import * as consoleColors from './lib/consoleColors.mjs';
import fixPlaybackData from './lib/fixPlaybackData.mjs';

const getNextSong = session => session.currentSongs.filter(song => song.startTime > session.encoderPosition)[0];

/**
 * Skips to the end of the song with the given id
 */
export default function skipSong(session, songId) {
  session.currentSongs.filter(song => song.id === songId).forEach(async (songWrapper) => {
    //Ignore skip request if song cannot be skipped or is close to end
    if (songWrapper.skippable === true && songWrapper.endTime - session.encoderPosition < 40 * 48000) {
      console.log(`${consoleColors.magenta(`[${session.sid}]`)} Ignoring skip request since song ${consoleColors.green(songWrapper.songRef.name)} is near the end.`);
      return;
    }

    console.log(`${consoleColors.magenta(`[${session.sid}]`)} Skipping to end of song ${consoleColors.green(songWrapper.songRef.name)}...`);

    //Get next song, or wait until next song is ready if it still needs processing
    let nextSong = getNextSong(session);
    if (nextSong === undefined) {
      session.prematureSkip = true;

      while (nextSong === undefined) {
        //Check every 100ms if follow-up song is ready
        await new Promise((resolve) => { setTimeout(resolve, 100); });//eslint-disable-line no-await-in-loop
        nextSong = getNextSong(session);
      }

      session.prematureSkip = false;
    }

    const oldLength = songWrapper.endTime - songWrapper.startTime;

    //Amount of overlap between current song and follow-up song - used to calculate where to skip to
    const overlap = songWrapper.endTime - nextSong.startTime;

    //Assuming that playbackData has only one entry
    const firstEntry = songWrapper.playbackData[0];
    //reduce first entry to stop immediately
    firstEntry.sampleLength = (session.encoderPosition - firstEntry.realTimeStart) * firstEntry.tempoAdjustment;

    //add another entry to cover the end of the song, where the mixing occurs
    const remainingLength = overlap + 5 * 48000;
    const newEntry = {
      sampleOffset: songWrapper.totalSampleLength - remainingLength,
      sampleLength: remainingLength,
      tempoAdjustment: firstEntry.tempoAdjustment,
    };
    songWrapper.playbackData.push(newEntry);
    //fix realTimeStart and realTimeLength in playbackData, as well as songWrapper.endTime
    fixPlaybackData(songWrapper);

    const newLength = songWrapper.endTime - songWrapper.startTime;
    const skipAmount = oldLength - newLength;

    //Fix start time of follow-up song
    nextSong.startTime -= skipAmount;
    fixPlaybackData(nextSong);

    //Notify client of new timing for current song
    session.emitEvent({
      type: 'SONG_DURATION',
      id: songWrapper.id,
      origDuration: songWrapper.totalSampleLength,
      startTime: songWrapper.startTime,
      endTime: songWrapper.endTime,
      playbackData: songWrapper.playbackData,
    });
    //Notify client of new timing for follow-up song
    session.emitEvent({
      type: 'SONG_DURATION',
      id: nextSong.id,
      origDuration: nextSong.totalSampleLength,
      startTime: nextSong.startTime,
      endTime: nextSong.endTime,
      playbackData: nextSong.playbackData,
    });
  });
}
