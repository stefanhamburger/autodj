//Initializes the view

const initView = (onVolumeChange, onPause) => {
  const rootEle = document.getElementById('view');

  //show currently playing song
  const metadataEle = document.createElement('div');
  rootEle.appendChild(metadataEle);

  //show total time (for long we have been playing audio)
  const totalTimeEle = document.createElement('div');
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
  const spectrogramFunctions = spectrogram(canvas);
  window.addEventListener('resize', spectrogramFunctions.resize);
  rootEle.appendChild(canvas);

  return {
    setSong: (songName) => {
      metadataEle.innerHTML = '<b>Currently playing:</b> ' + songName.replace(/&/g, '&amp;').replace(/ - /g, ' &ndash; ').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },
    updateSpectrogram: spectrogramFunctions.addData,
    updateTime: (newTime) => {
      const seconds = Math.floor(newTime) % 60;
      totalTimeEle.innerHTML = '<b>Total time:</b> ' + Math.floor(newTime / 60) + ':' + ((seconds < 10) ? '0' : '') + seconds;
    }
  };
};
