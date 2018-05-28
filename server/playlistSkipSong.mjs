import * as consoleColors from './lib/consoleColors.mjs';
import fixPlaybackData from './lib/fixPlaybackData.mjs';

/**
 * Skips to the end of the song with the given id
 */
export default function skipSong(session, songId) {
  session.currentSongs.filter(song => song.id === songId).forEach((songWrapper) => {
    console.log(`${consoleColors.magenta(`[${session.sid}]`)} Skipping to end of song ${consoleColors.green(songWrapper.songRef.name)}...`);

    const oldLength = songWrapper.endTime - songWrapper.startTime;
    const nextSong = session.currentSongs.filter(song => song.startTime > session.encoderPosition)[0];
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
