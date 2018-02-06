import React from 'react';
import ReactDOM from 'react-dom';
import spectrogram from './spectrogram.mjs';
import model from '../model.mjs';
import PlaybackContainer from '../../components/PlaybackContainer.mjs';

let container;

const state = {};

const rerender = () => {
  ReactDOM.render(
    <PlaybackContainer state={state} />,
    container,
  );
};

//Initializes the view
const init = (onVolumeChange, onPause) => {
  const rootEle = document.getElementById('view');

  state.onVolumeChange = onVolumeChange;
  state.onPause = onPause;
  state.isPaused = false;
  state.songName = '';
  state.bpm = undefined;
  state.songStart = 0;
  state.songElapsed = 0;
  state.songDuration = 0;
  state.thumbnailMin = undefined;
  state.thumbnailMax = undefined;

  container = document.createElement('div');
  rootEle.appendChild(container);
  rerender();

  //show spectrogram as canvas
  const canvas = document.createElement('canvas');
  spectrogram.init(canvas);
  window.addEventListener('resize', spectrogram.resize);
  rootEle.appendChild(canvas);
};

let curSongName;
const setSong = (songName = curSongName) => {
  if (songName !== undefined) {
    state.songName = songName;
    curSongName = songName;

    const tempoResult = model.getTempo(songName);
    state.bpmStart = tempoResult.bpmStart;
    state.bpmEnd = tempoResult.bpmEnd;

    const positionResult = model.getSongPosition(songName);
    state.songDuration = positionResult.duration;
    state.songStart = positionResult.start;
    state.songElapsed = state.totalTime * 48000 - state.songStart;

    const thumbnailResult = model.getThumbnail(songName);
    state.thumbnailMin = thumbnailResult.thumbnailMin;
    state.thumbnailMax = thumbnailResult.thumbnailMax;

    rerender();
  }
};

const setIsPaused = (isPaused) => {
  state.isPaused = isPaused;
  rerender();
};

const updateTime = (newTime) => {
  state.totalTime = newTime;
  state.songElapsed = state.totalTime * 48000 - state.songStart;
  rerender();
};

export default {
  init,
  setSong,
  setIsPaused,
  updateTime,
};
