export default function calculateBpm(beats, startIndex, count) {
  //Transform 25 beat positions to 24 beat distances
  const beatDistances = [];
  for (let i = startIndex + 1; i < startIndex + count; i += 1) {
    beatDistances.push(beats[i] - beats[i - 1]);
  }

  //Sort by distance, then take median 12 values and calculate their average
  beatDistances.sort();
  const medianLength = (count - 1) >>> 1;
  const medianStart = medianLength >>> 1;
  const medianBeatDistances = beatDistances.slice(medianStart, medianStart + medianLength - 1);
  const averageBeatDistance = medianBeatDistances.reduce((accum, value) => accum + value, 0) / medianBeatDistances.length;

  //Calculate bpm
  const bpm = 60 / averageBeatDistance;

  return bpm;
}
