import initAudio from './mediaSegments.mjs';
import model from './model.mjs';
import view from './view/view.mjs';
import spectrogram from './view/spectrogram.mjs';
import fftDataManager from './fftDataManager.mjs';

/** Due to Opus codec, we use a 48,000 Hz sample rate. */
const SAMPLE_RATE = 48000;

document.addEventListener('DOMContentLoaded', () => {
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
    const response = await fetch(`init?collection=${encodeURIComponent(collection)}&numChannels=${encodeURIComponent(channels)}`, { cache: 'no-store' });
    const json = await response.json();
    const { sid } = json;
    model.init(sid);

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
        view.setIsPaused(false);
      } else {
        audioEle.pause();
        view.setIsPaused(true);
      }
    };
    document.addEventListener('keydown', (event) => {
      switch (event.key) {
        case 'MediaPlayPause': //pause playback
          onPause();
          //try to not send the pause keypress to other audio players running on the user's device
          event.preventDefault();
          break;
        case 'MediaTrackNext': //skip to end of current song
          view.skipSong();
          break;
        default: //do nothing
      }
    });

    //Set up Web Audio API to create volume slider and generate FFT data
    const audioCtx = new AudioContext();

    //Microsoft Edge does not support the constructors, so we need to call the factory methods instead
    const audioSourceNode = audioCtx.createMediaElementSource(audioEle);

    const analyserNodeHi = audioCtx.createAnalyser();
    analyserNodeHi.fftSize = 4096;
    analyserNodeHi.maxDecibels = -25;
    analyserNodeHi.minDecibels = -55;
    analyserNodeHi.smoothingTimeConstant = 0;

    const analyserNodeLo = audioCtx.createAnalyser();
    analyserNodeLo.fftSize = 16384;
    analyserNodeLo.maxDecibels = -25;
    analyserNodeLo.minDecibels = -55;
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

    //Update model (which itself will update view)
    //The onprogress handler is called once per second, while requestAnimationFrame() is called up to 60 HZ as long as tab is open
    const updateModelView = () => {
      model.heartbeat(audioEle.currentTime);
    };
    audioEle.addEventListener('progress', updateModelView);
    updateModelView();

    //Perform a FFT on the input stream, returns 1024 bins
    //Bin at index i corresponds to frequency i / 2048 * 44100
    const binSizeHi = audioCtx.sampleRate / analyserNodeHi.fftSize;
    const fftManagerHi = fftDataManager(analyserNodeHi.frequencyBinCount);
    const binSizeLo = audioCtx.sampleRate / analyserNodeLo.fftSize;
    const fftManagerLo = fftDataManager(analyserNodeLo.frequencyBinCount);
    const redrawSpectrogram = () => {
      requestAnimationFrame(redrawSpectrogram);

      updateModelView();

      const bufferHi = fftManagerHi.getNewBuffer(audioEle.currentTime * SAMPLE_RATE);
      analyserNodeHi.getByteFrequencyData(bufferHi);//TODO: need to use getFloatFrequencyData

      const bufferLo = fftManagerLo.getNewBuffer(audioEle.currentTime * SAMPLE_RATE);
      analyserNodeLo.getByteFrequencyData(bufferLo);

      spectrogram.addData({
        fftManagerHi,
        binSizeHi,
        fftManagerLo,
        binSizeLo,
        newTime: audioEle.currentTime * SAMPLE_RATE,
        sampleRate: SAMPLE_RATE,
      });

      fftManagerHi.garbageCollection(audioEle.currentTime * SAMPLE_RATE, SAMPLE_RATE);
      fftManagerLo.garbageCollection(audioEle.currentTime * SAMPLE_RATE, SAMPLE_RATE);
    };
    requestAnimationFrame(redrawSpectrogram);
  });
  startLink.innerHTML = 'Start playback';
  startLink.disabled = false;
});
