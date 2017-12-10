import initAudio from './mediaSegments.mjs';
import model from './model.mjs';
import view from './view/view.mjs';
import spectrogram from './view/spectrogram.mjs';
import fftDataManager from './fftDataManager.mjs';

{
  const startLink = document.getElementById('startLink');
  startLink.addEventListener('click', async () => {
    //Get form input
    const selectCollection = document.getElementById('collection');
    const collection = selectCollection.options[selectCollection.selectedIndex].value;

    const channelsCollection = document.getElementById('channels');
    const channels = channelsCollection.options[channelsCollection.selectedIndex].value;

    //Remove form from UI
    const formEle = document.getElementById('form');
    formEle.parentElement.removeChild(formEle);

    //start new session
    const response = await fetch(`init?collection=${encodeURIComponent(collection)}&numChannels=${encodeURIComponent(channels)}`);
    const json = await response.json();
    const { sid } = json;

    const audioEle = new Audio();

    //create Audio Source
    const mediaSource = new MediaSource();
    mediaSource.addEventListener('sourceopen', () => {
      //if we already added a source buffer, do not initialize a second time
      if (mediaSource.sourceBuffers.length > 0) return;

      const sourceBuffer = mediaSource.addSourceBuffer('audio/webm; codecs="opus"');
      //we split the stream into arbitrarily-sized blocks that may not match codec windows, so they must be read in sequence
      sourceBuffer.mode = 'sequence';

      setTimeout(() => {
        initAudio({
          sid,
          audioEle,
          mediaSource,
          sourceBuffer,
        });
      }, 2000);
    });

    try {
      audioEle.srcObject = mediaSource;//not yet supported by major browsers
    } catch (error) {
      audioEle.src = URL.createObjectURL(mediaSource);
    }
    audioEle.autoplay = true;
    audioEle.controls = true;
    audioEle.preload = 'auto';//otherwise, the file will not autoplay
    audioEle.volume = 1;
    const onPause = () => {
      if (audioEle.paused) {
        audioEle.play();
      } else {
        audioEle.pause();
      }
    };
    document.addEventListener('keydown', (event) => {
      //TODO: we can also add the volume change buttons
      if (event.key === 'MediaPlayPause') {
        onPause();
      }
    });

    const setSong = (songName) => {
      view.setSong(songName);
    };
    model.init(setSong);

    //Set up Web Audio API to create volume slider and generate FFT data
    const audioCtx = new AudioContext({
      sampleRate: 44100, //ideally, we'd use a 48,000 sample rate but this is not yet supported by browsers
    });

    //Microsoft Edge does not support the constructors, so we need to call the factory methods instead
    const audioSourceNode = audioCtx.createMediaElementSource(audioEle);

    const analyserNodeHi = audioCtx.createAnalyser();
    analyserNodeHi.fftSize = 4096;
    analyserNodeHi.maxDecibels = -25;
    analyserNodeHi.minDecibels = -60;
    analyserNodeHi.smoothingTimeConstant = 0;

    const analyserNodeLo = audioCtx.createAnalyser();
    analyserNodeLo.fftSize = 16384;
    analyserNodeLo.maxDecibels = -25;
    analyserNodeLo.minDecibels = -60;
    analyserNodeLo.smoothingTimeConstant = 0;

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.1;
    const onVolumeChange = (newVolume) => {
      //Smooth interpolation to target volume within 50-100ms
      gainNode.gain.setTargetAtTime(newVolume, audioCtx.currentTime, 0.03);
    };

    audioSourceNode.connect(analyserNodeHi).connect(analyserNodeLo).connect(gainNode).connect(audioCtx.destination);

    //Create view
    view.init(onVolumeChange, onPause);
    /*audioEle.addEventListener('progress', () => {
      model.heartbeat(audioEle.currentTime);
      view.updateTime(audioEle.currentTime);
    });*/

    //Perform a FFT on the input stream, returns 1024 bins
    //Bin at index i corresponds to frequency i / 2048 * 44100
    const binSizeHi = audioCtx.sampleRate / analyserNodeHi.fftSize;
    const fftManagerHi = fftDataManager(analyserNodeHi.frequencyBinCount);
    const binSizeLo = audioCtx.sampleRate / analyserNodeLo.fftSize;
    const fftManagerLo = fftDataManager(analyserNodeLo.frequencyBinCount);
    const redrawSpectrogram = () => {
      requestAnimationFrame(redrawSpectrogram);
      //TODO: model+view should be updated with setTimeout, otherwise e.g. curSong is never updated if user tabbed out
      model.heartbeat(audioEle.currentTime);
      view.updateTime(audioEle.currentTime);

      const bufferHi = fftManagerHi.getNewBuffer(audioEle.currentTime * 44100 + 4096);
      analyserNodeHi.getByteFrequencyData(bufferHi);//TODO: need to use getFloatFrequencyData

      const bufferLo = fftManagerLo.getNewBuffer(audioEle.currentTime * 44100);
      analyserNodeLo.getByteFrequencyData(bufferLo);

      spectrogram.addData(fftManagerHi, binSizeHi, fftManagerLo, binSizeLo, audioEle.currentTime * 44100);

      fftManagerHi.garbageCollection(audioEle.currentTime * 44100);
      fftManagerLo.garbageCollection(audioEle.currentTime * 44100);
    };
    requestAnimationFrame(redrawSpectrogram);
  });
}
