import React from 'react';
import ReactDOM from 'react-dom';
import spectrogram from './spectrogram.mjs';
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
  state.currentSongs = [];
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

/**
 * Tells the view to update its state based on the current model.
 * If a song id is given, also update the current song to the given id.
 * @param songId
 */
const setSong = (songs = []) => {
  if (songs.length > 0) {
    state.currentSongs = songs.map(song => ({
      ...song,
      elapsed: (state.totalTime - song.startTime) * 48000,
    }));

    const lastSong = state.currentSongs[state.currentSongs.length - 1];
    document.title = `${lastSong.name.replace(/ - /g, ' – ')} – AutoDJ`;
    if (state.nextSong === lastSong.name) state.nextSong = undefined;
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
  state.currentSongs.forEach((song) => {
    song.elapsed = (state.totalTime - song.startTime) * 48000;
  });
  rerender();
};

export default {
  init,
  setSong,
  setUpcoming,
  setIsPaused,
  updateTime,
};
