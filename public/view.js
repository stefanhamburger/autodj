const initView = () => {
  const rootEle = document.getElementById('view');

  //show metadata, e.g. currently playing song
  const metadataEle = document.createElement('div');
  rootEle.appendChild(metadataEle);

  //show spectrogram as canvas
  const spectrogram = document.createElement('canvas');
  spectrogram.style.position = 'absolute';
  spectrogram.style.top = '30px';
  spectrogram.style.right = '0';
  spectrogram.style.bottom = '0';
  spectrogram.style.left = '0';
  const ctx = spectrogram.getContext('2d');
  rootEle.appendChild(spectrogram);

  //...
  return {
    updateMetadata: ({ song }) => {
      metadataEle.innerHTML = '<b>Currently playing:</b> ' + song.replace(/&/, '&amp;').replace(/</, '&lt;').replace(/>/, '&gt;');
    },
  };
};
