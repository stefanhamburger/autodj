import spectrogram from './spectrogram.mjs';

let metadataEle;
let totalTimeEle;

//Initializes the view

const init = (onVolumeChange, onPause) => {
  const rootEle = document.getElementById('view');

  //show currently playing song
  metadataEle = document.createElement('div');
  rootEle.appendChild(metadataEle);

  //show total time (for long we have been playing audio)
  totalTimeEle = document.createElement('div');
  totalTimeEle.innerHTML = '<b>Total time:</b> 00:00';
  rootEle.appendChild(totalTimeEle);

  //pause button
  const btnPause = document.createElement('button');
  btnPause.innerHTML = 'Pause/Continue';
  btnPause.addEventListener('mousedown', () => {
    onPause();
  });
  rootEle.appendChild(btnPause);

  //volume control
  const volumeLabel = document.createElement('span');
  volumeLabel.innerHTML = 'Volume:&nbsp;';
  rootEle.appendChild(volumeLabel);
  const volumeSlider = document.createElement('input');
  volumeSlider.type = 'range';
  volumeSlider.min = 0;
  volumeSlider.value = 10;
  volumeSlider.max = 100;
  volumeSlider.step = 1;
  volumeSlider.addEventListener('input', () => onVolumeChange(Number(volumeSlider.value) / 100));
  rootEle.appendChild(volumeSlider);

  //show spectrogram as canvas
  const canvas = document.createElement('canvas');
  spectrogram.init(canvas);
  window.addEventListener('resize', spectrogram.resize);
  rootEle.appendChild(canvas);
};

const setSong = (songName) => {
  metadataEle.innerHTML = '<b>Currently playing:</b> ' + songName.replace(/&/g, '&amp;').replace(/ - /g, ' &ndash; ').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

const updateTime = (newTime) => {
  const seconds = Math.floor(newTime) % 60;
  totalTimeEle.innerHTML = '<b>Total time:</b> ' + Math.floor(newTime / 60) + ':' + ((seconds < 10) ? '0' : '') + seconds;
};

export default {
  init,
  setSong,
  updateTime,
};
