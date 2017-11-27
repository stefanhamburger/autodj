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
    updateMetadata: events => events.forEach((event) => {
      switch (event.type) {
        case 'SONG_START':
          //TODO: only update view when audio playback has gotten to event.time
          metadataEle.innerHTML = '<b>Currently playing:</b> ' + event.songName.replace(/&/, '&amp;').replace(/</, '&lt;').replace(/>/, '&gt;');
          break;
        default:
          console.error('Metadata event not recognized', event);
      }
    }),
    updateSpectrogram: spectrogramFunctions.addData,
  };
};
