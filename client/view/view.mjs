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
  state.songName = songName;
  const tempoResult = model.getTempo(songName);
  state.bpmStart = tempoResult.bpmStart;
  state.bpmEnd = tempoResult.bpmEnd;
  rerender();
  curSongName = songName;
};

const setIsPaused = (isPaused) => {
  state.isPaused = isPaused;
  rerender();
};

const updateTime = (newTime) => {
  state.totalTime = newTime;
  rerender();
};

export default {
  init,
  setSong,
  setIsPaused,
  updateTime,
};
