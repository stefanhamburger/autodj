//Initializes the view

const initView = () => {
  const rootEle = document.getElementById('view');

  //show metadata, e.g. currently playing song
  const metadataEle = document.createElement('div');
  rootEle.appendChild(metadataEle);

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
  };
};
