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
  state.songStart = 0;
  state.songElapsed = 0;
  state.songDuration = 0;
  state.bpmStart = undefined;
  state.bpmEnd = undefined;
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

let curSongId;
const setSong = (songId = curSongId) => {
  if (songId !== undefined) {
    curSongId = songId;
    const songInfo = model.getSongInfo(songId);

    state.songName = songInfo.name;
    state.songStart = songInfo.start;
    state.songDuration = songInfo.duration;
    state.songElapsed = (state.totalTime - state.songStart) * 48000;

    state.bpmStart = songInfo.bpmStart;
    state.bpmEnd = songInfo.bpmEnd;

    state.thumbnailMin = songInfo.thumbnailMin;
    state.thumbnailMax = songInfo.thumbnailMax;

    rerender();
  }
};

const setIsPaused = (isPaused) => {
  state.isPaused = isPaused;
  rerender();
};

const updateTime = (newTime) => {
  state.totalTime = newTime;
  state.songElapsed = (state.totalTime - state.songStart) * 48000;
  rerender();
};

export default {
  init,
  setSong,
  setIsPaused,
  updateTime,
};
