import React from 'react';
import ReactDOM from 'react-dom';
import spectrogram from './spectrogram.mjs';
import model from '../model.mjs';
import PlaybackContainer from '../components/PlaybackContainer.mjs';

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
  state.totalTime = 0;
  state.currentSong = {};
  state.nextSong = undefined;

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
/**
 * Tells the view to update its state based on the current model.
 * If a song id is given, also update the current song to the given id.
 * @param songId
 */
const setSong = (songId = curSongId) => {
  if (songId !== undefined) {
    curSongId = songId;
    const songInfo = model.getSongInfo(songId);
    document.title = `${songInfo.name.replace(/ - /g, ' – ')} – AutoDJ`;

    state.currentSong = {
      ...songInfo,
      elapsed: (state.totalTime - songInfo.startTime) * 48000,
    };
    if (state.nextSong === songInfo.name) state.nextSong = undefined;

    rerender();
  }
};

const setUpcoming = (name) => {
  state.nextSong = name;
};

const setIsPaused = (isPaused) => {
  state.isPaused = isPaused;
  rerender();
};

const updateTime = (newTime) => {
  state.totalTime = newTime;
  if (state.currentSong.startTime !== undefined) {
    state.currentSong.elapsed = (state.totalTime - state.currentSong.startTime) * 48000;
  } else {
    state.currentSong.elapsed = 0;
  }
  rerender();
};

export default {
  init,
  setSong,
  setUpcoming,
  setIsPaused,
  updateTime,
};
