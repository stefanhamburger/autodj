let view;

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
    document.body.appendChild(audioEle);
    //TODO: don't add <audio> element to DOM but add UI elements to see elapsed time and to change volume

    view = initView();

    //Set up Web Audio API to create volume slider and generate FFT data
    const audioCtx = new AudioContext();
    const audioSourceNode = audioCtx.createMediaElementSource(audioEle);
    const analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 2048;
    analyserNode.minDecibels = -100;
    analyserNode.maxDecibels = -30;
    analyserNode.smoothingTimeConstant = 0;
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.1;

    audioSourceNode.connect(analyserNode);
    analyserNode.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const spectrumData = new Uint8Array(analyserNode.frequencyBinCount);
    const redrawSpectrogram = () => {
      requestAnimationFrame(redrawSpectrogram);
      analyserNode.getByteFrequencyData(spectrumData);
      view.updateSpectrogram(spectrumData, audioCtx.currentTime);
    };
    requestAnimationFrame(redrawSpectrogram);
  });
}
