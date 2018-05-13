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
const init = (volumeChangeCallback, onPause) => {
  const rootEle = document.getElementById('view');

  state.muted = false;
  state.volume = 0.1;
  state.onVolumeChange = (newVolume) => {
    volumeChangeCallback(newVolume);
    state.muted = false;
    state.volume = newVolume;
    rerender();
  };
  state.onMuted = () => {
    state.muted = !state.muted;
    volumeChangeCallback(state.muted ? 0 : state.volume);
    rerender();
  };
  state.onPause = onPause;
  state.isPaused = false;
  state.totalTime = 0; //in seconds
  state.currentSongs = [];
  state.nextSong = undefined;
  state.canSkip = false;
  state.skipCallback = () => {};

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
const updateSongs = (newTime, songs = []) => {
  state.totalTime = newTime;
  if (songs.length > 0) {
    state.currentSongs = songs.map((song) => {
      for (let i = 0; i < song.playbackData.length; i += 1) {
        const entry = song.playbackData[i];
        if (state.totalTime >= entry.realTimeStart && state.totalTime < entry.realTimeStart + entry.realTimeLength) {
          return {
            ...song,
            elapsed: (state.totalTime - entry.realTimeStart) * entry.tempoAdjustment * 48000, //given in samples
          };
        }
      }
      return undefined;
    }).filter(song => song !== undefined);

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

export default {
  init,
  updateSongs,
  setUpcoming,
  setIsPaused,
};
