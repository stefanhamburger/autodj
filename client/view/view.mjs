import React from 'react';
import ReactDOM from 'react-dom';
import spectrogram from './spectrogram.mjs';
import model from '../model.mjs';
import ButtonPause from '../../components/ButtonPause.mjs';
import CurrentSong from '../../components/CurrentSong.mjs';
import TotalDuration from '../../components/TotalDuration.mjs';
import VolumeControl from '../../components/VolumeControl.mjs';

let curSongWrapper;
let totalTimeWrapper;

//Initializes the view

const init = (onVolumeChange, onPause) => {
  const rootEle = document.getElementById('view');

  //show currently playing song
  curSongWrapper = document.createElement('div');
  rootEle.appendChild(curSongWrapper);

  //show total time (for long we have been playing audio)
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

  //show spectrogram as canvas
  const canvas = document.createElement('canvas');
  spectrogram.init(canvas);
  window.addEventListener('resize', spectrogram.resize);
  rootEle.appendChild(canvas);
};

let curSongName;
const setSong = (songName = curSongName) => {
  curSongName = songName;
  ReactDOM.render(
    <CurrentSong name={songName} bpm={model.getTempo(songName)} />,
    curSongWrapper,
  );
};

const updateTime = (newTime) => {
  ReactDOM.render(
    <TotalDuration time={newTime} />,
    totalTimeWrapper,
  );
};

export default {
  init,
  setSong,
  updateTime,
};
