export default function songFindNearestBeatIndex(song, time) {
  const upcomingBeats = song.beatsAbs.map(([beat], index) => [beat, index]).filter(([beat]) => beat >= time * 48000).map(([, index]) => index);

  if (upcomingBeats.length === 0) {
    song.beatsPos = song.beatsAbs.length;
  } else {
    const [firstUpcomingBeat] = upcomingBeats;
    song.beatsPos = firstUpcomingBeat;
  }
}
