import React from 'react';
import ReactDOM from 'react-dom';
import spectrogram from './spectrogram.mjs';
import model from '../model.mjs';
/*import ButtonPause from '../../components/ButtonPause.mjs';
import CurrentSong from '../../components/CurrentSong.mjs';
import TotalDuration from '../../components/TotalDuration.mjs';
import VolumeControl from '../../components/VolumeControl.mjs';*/
import PlaybackContainer from '../../components/PlaybackContainer.mjs';

let container;
//let curSongWrapper;
//let totalTimeWrapper;


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

  /*//show total time (for long we have been playing audio)
  totalTimeWrapper = document.createElement('div');
  rootEle.appendChild(totalTimeWrapper);
  ReactDOM.render(
    <TotalDuration time={0} />,
    totalTimeWrapper,
  );

  const mediaControls = document.createElement('div');
  rootEle.appendChild(mediaControls);
  ReactDOM.render(
    <React.Fragment>
      <ButtonPause pauseCallback={onPause} />
      <VolumeControl volumeChangeCallback={onVolumeChange} />
    </React.Fragment>,
    mediaControls,
  );

  //show currently playing song
  curSongWrapper = document.createElement('div');
  rootEle.appendChild(curSongWrapper);*/

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
  /*
  ReactDOM.render(
    <CurrentSong name={songName} bpm={model.getTempo(songName)} />,
    curSongWrapper,
  );*/
};

const updateTime = (newTime) => {
  state.totalTime = newTime;
  rerender();
  /*ReactDOM.render(
    <TotalDuration time={newTime} />,
    totalTimeWrapper,
  );*/
};

export default {
  init,
  setSong,
  updateTime,
};
