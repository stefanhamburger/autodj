import calculateDuration from '../../shared/calculateDuration.mjs';

/**
 * After duration or tempo adjustment was changed, this function will recalculate various values to simplify calculations in audio buffer
 */
export default function fixPlaybackData(songWrapper) {
  let curTime = songWrapper.startTime;

  //go through entries in playback data
  for (let i = 0, il = songWrapper.playbackData.length; i < il; i += 1) {
    //calculate real-time values of this entry post-tempo adjustment
    const entry = songWrapper.playbackData[i];
    entry.realTimeStart = curTime;
    entry.realTimeLength = calculateDuration(entry.sampleLength, entry.tempoAdjustment);

    //change time to end of this entry
    curTime += entry.realTimeLength;
  }

  //set endTime based on playbackData
  songWrapper.endTime = curTime;
}
