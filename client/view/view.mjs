import React from 'react';
import ReactDOM from 'react-dom';
import spectrogram from './spectrogram.mjs';
import model from '../model.mjs';
import PlaybackContainer from '../../components/PlaybackContainer.mjs';

let container;

const state = {};

const rerender = () => {
  ReactDOM.render(
    <PlaybackContainer totalTime={state.totalTime} onPause={state.onPause} onVolumeChange={state.onVolumeChange} songName={state.songName} bpm={state.bpm} />,
    container,
  );
};

//Initializes the view
const init = (onVolumeChange, onPause) => {
  const rootEle = document.getElementById('view');

  state.onVolumeChange = onVolumeChange;
  state.onPause = onPause;

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
  state.bpm = model.getTempo(songName);
  rerender();
  curSongName = songName;
};

const updateTime = (newTime) => {
  state.totalTime = newTime;
  rerender();
};

export default {
  init,
  setSong,
  updateTime,
};
