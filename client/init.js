import initAudio from './mediaSegments.mjs';
import model from './model.mjs';
import view from './view/view.mjs';
import fftDataManager from './fftDataManager.mjs';

{
  const startLink = document.getElementById('startLink');
  startLink.addEventListener('click', async () => {
    //Get form input
    const selectCollection = document.getElementById('collection');
    const collection = selectCollection.options[selectCollection.selectedIndex].value;

    //Remove form from UI
    const formEle = document.getElementById('form');
    formEle.parentElement.removeChild(formEle);

    //start new session
    const response = await fetch('init?collection=' + encodeURIComponent(collection));
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
    //TODO: don't add <audio> element to DOM but add UI elements to see elapsed time and to change volume

    const setSong = (songName) => {
      view.setSong(songName);
    };
    model.init(setSong);

    //Set up Web Audio API to create volume slider and generate FFT data
    const audioCtx = new AudioContext({
      sampleRate: 44100, //ideally, we'd use a 48,000 sample rate but this is not yet supported by browsers
    });
    const audioSourceNode = new MediaElementAudioSourceNode(audioCtx, { mediaElement: audioEle });
    const analyserNodeHi = new AnalyserNode(audioCtx, {
      fftSize: 4096,
      maxDecibels: -25,
      minDecibels: -60,
      smoothingTimeConstant: 0,
    });
    const analyserNodeLo = new AnalyserNode(audioCtx, {
      fftSize: 16384,
      maxDecibels: -25,
      minDecibels: -60,
      smoothingTimeConstant: 0,
    });
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.1;
    const onVolumChange = (newVolume) => {
      gainNode.gain.value = newVolume;
    };

    audioSourceNode.connect(analyserNodeHi);
    analyserNodeHi.connect(analyserNodeLo);
    analyserNodeLo.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    //Create view
    view.init(onVolumChange, onPause);
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
      model.heartbeat(audioEle.currentTime);
      view.updateTime(audioEle.currentTime);

      const bufferHi = fftManagerHi.getNewBuffer(audioEle.currentTime * 44100 + 4096);
      analyserNodeHi.getByteFrequencyData(bufferHi);//TODO: need to use getFloatFrequencyData

      const bufferLo = fftManagerLo.getNewBuffer(audioEle.currentTime * 44100);
      analyserNodeLo.getByteFrequencyData(bufferLo);

      view.updateSpectrogram(fftManagerHi, binSizeHi, fftManagerLo, binSizeLo, audioEle.currentTime * 44100);

      fftManagerHi.garbageCollection(audioEle.currentTime * 44100);
      fftManagerLo.garbageCollection(audioEle.currentTime * 44100);
    };
    requestAnimationFrame(redrawSpectrogram);
  });
}
