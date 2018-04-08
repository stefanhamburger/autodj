import MusicTempo from 'music-tempo';

//The bpm range that should be detected (60-180 bpm)
const MIN_BPM = 60;
const MAX_BPM = 160;
//By how many samples to move when generating the next FFT window
const HOP_SIZE = 480;
//The sample rate of the audio in Hertz
const SAMPLE_RATE = 48000;

/** How many samples a song must at least have before we detect beginning and end separately. Must be ≥60 seconds */
const SONG_MIN_LENGTH = 120 * SAMPLE_RATE;
/** How many samples we use from the beginning of the song to detect tempo */
const SONG_START_LENGTH = 60 * SAMPLE_RATE;
/** How many samples we use from the end of the song to detect tempo */
const SONG_END_LENGTH = 60 * SAMPLE_RATE;

function detectTempo(audioBuffer) {
  const mt = new MusicTempo(audioBuffer, {
    hopSize: HOP_SIZE,
    timeStep: HOP_SIZE / SAMPLE_RATE,
    maxBeatInterval: 60 / MIN_BPM,
    minBeatInterval: 60 / MAX_BPM,
  });
  return {
    bpm: 60 / mt.beatInterval,
    beats: mt.beats.map(time => Math.round(time * 10000) / 10000),
  };
}

export default function tempoDetection(waveformArray, isFirstSong) {
  const out = {};

  //if song is too short, we detect tempo across the whole song
  if (waveformArray.length < SONG_MIN_LENGTH) {
    const { bpm, beats } = detectTempo(waveformArray);
    if (bpm === undefined) throw new Error('Tempo detection failed');
    out.bpmStart = bpm;
    out.bpmEnd = bpm;
    out.beats = beats;
  } else { //otherwise, we only detect the beginning and end of the song
    //if this is the first song we are playing, tempo at beginning doesn't matter
    if (!isFirstSong) {
      //tempo at beginning of song
      const { bpm: bpmStart, beats: beatsStart } = detectTempo(waveformArray.slice(0, SONG_START_LENGTH));
      if (bpmStart === undefined) throw new Error('Tempo detection failed');
      out.bpmStart = bpmStart;
      out.beats = beatsStart;
    }

    //tempo at end of song
    {
      const endPos = waveformArray.length - SONG_END_LENGTH;
      const { bpm: bpmEnd, beats: beatsResult } = detectTempo(waveformArray.slice(endPos));
      if (bpmEnd === undefined) throw new Error('Tempo detection failed');
      out.bpmEnd = bpmEnd;
      //the beat times are relative to the last minute, so add offset to get correct time
      const beatsEnd = beatsResult.map(time => Math.round((endPos / SAMPLE_RATE + time) * 10000) / 10000);
      //append to array if beginning was already detected
      if (out.beats !== undefined) {
        out.beats.push(...beatsEnd);
      } else {
        out.beats = beatsEnd;
      }
    }
  }

  return out;
}
