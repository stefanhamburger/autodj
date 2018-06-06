import MusicTempo from 'music-tempo';
import calculateBpm from './calculateBpm.mjs';

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
    beats: mt.beats,
  };
}


export default function tempoDetection(waveformArray, isFirstSong) {
  const out = {};

  //if song is too short, we detect tempo across the whole song
  if (waveformArray.length < SONG_MIN_LENGTH) {
    const { beats } = detectTempo(waveformArray);
    if (beats.length < 82) {
      throw new Error('Not enough beats for mixing.');
    }
    out.bpmStart = calculateBpm(beats, 0, 41);
    out.bpmEnd = calculateBpm(beats, beats.length - 41, 41);
    //  console.error('short song', bpm, out.bpmStart, out.bpmEnd);
    out.beats = beats;
  } else { //otherwise, we only detect the beginning and end of the song
    //if this is the first song we are playing, tempo at beginning doesn't matter
    if (!isFirstSong) {
      //tempo at beginning of song
      const { beats: beatsStart } = detectTempo(waveformArray.slice(0, SONG_START_LENGTH));
      if (beatsStart.length < 41) {
        throw new Error('Not enough beats for mixing.');
      }
      out.bpmStart = calculateBpm(beatsStart, 0, 41);
      //console.error('start', bpmStart, out.bpmStart);
      out.beats = beatsStart;
    }

    //tempo at end of song
    {
      const endPos = waveformArray.length - SONG_END_LENGTH;
      const { beats: beatsResult } = detectTempo(waveformArray.slice(endPos));
      if (beatsResult.length < 41) {
        throw new Error('Not enough beats for mixing.');
      }
      out.bpmEnd = calculateBpm(beatsResult, beatsResult.length - 41, 41);
      //console.error('end', bpmEnd, out.bpmEnd);
      //the beat times are relative to the last minute, so add offset to get correct time
      const beatsEnd = beatsResult.map(time => endPos / SAMPLE_RATE + time);
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
