/**
 * Given a song's beats and its playback data, calculate the absolute time of all beats.
 */

export default function songCalcAbsoluteBeats(song) {
  //Ignore song if some information is still missing
  if (song.beats === undefined || song.playbackData === undefined) return;

  song.beatsAbs = [];
  song.beats.forEach((beat) => {
    const beatInSamples = beat * 48000;
    //find the entry in playbackData containing the relevant tempo information for this beat
    const entry = song.playbackData.filter(innerEntry => beatInSamples >= innerEntry.sampleOffset && beatInSamples < innerEntry.sampleOffset + innerEntry.sampleLength)[0];
    if (entry === undefined) return;

    const isAtStart = beatInSamples < song.origDuration >>> 1;
    //Calculate absolute position in samples (post-tempo adjustment) for this beat given the original position in seconds
    song.beatsAbs.push([Math.round(entry.realTimeStart * 48000 + (beatInSamples - entry.sampleOffset) / entry.tempoAdjustment), isAtStart]);
  });

  //We cannot calculate the nearest beat index here, since we don't know the current time.
  //Instead, flag this song so that beat index can be calculated as soon as time is known.
  song.beatsPos = -1;
}
