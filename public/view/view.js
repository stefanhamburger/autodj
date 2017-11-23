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
    updateMetadata: ({ song }) => {
      metadataEle.innerHTML = '<b>Currently playing:</b> ' + song.replace(/&/, '&amp;').replace(/</, '&lt;').replace(/>/, '&gt;');
    },
    updateSpectrogram: spectrogramFunctions.addData,
  };
};
