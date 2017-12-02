/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
const upcomingSongs = [];
let setSong;
//...
const init = (setSongIn) => {
  setSong = setSongIn;
};

const processEvents = events => events.forEach((event) => {
  switch (event.type) {
    case 'SONG_START':
      upcomingSongs.push({ name: event.songName, time: event.time });
      break;
    default:
      console.error('Metadata event not recognized', event);
  }
});

const heartbeat = (time) => {
  for (let i = upcomingSongs.length - 1; i >= 0; i--) {
    const song = upcomingSongs[i];
    if (song.time <= time) {
      setSong(song.name);
      upcomingSongs.splice(i, 1);
    }
  }
};

/* harmony default export */ __webpack_exports__["a"] = ({ init, processEvents, heartbeat });


/***/ }),
/* 1 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__mediaSegments_mjs__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__model_mjs__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__view_view_mjs__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__fftDataManager_mjs__ = __webpack_require__(6);





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
        Object(__WEBPACK_IMPORTED_MODULE_0__mediaSegments_mjs__["a" /* default */])({
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
    __WEBPACK_IMPORTED_MODULE_1__model_mjs__["a" /* default */].init(setSong);

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
    view = Object(__WEBPACK_IMPORTED_MODULE_2__view_view_mjs__["a" /* default */])(onVolumChange, onPause);
    /*audioEle.addEventListener('progress', () => {
      model.heartbeat(audioEle.currentTime);
      view.updateTime(audioEle.currentTime);
    });*/

    //Perform a FFT on the input stream, returns 1024 bins
    //Bin at index i corresponds to frequency i / 2048 * 44100
    const binSizeHi = audioCtx.sampleRate / analyserNodeHi.fftSize;
    const fftManagerHi = Object(__WEBPACK_IMPORTED_MODULE_3__fftDataManager_mjs__["a" /* default */])(analyserNodeHi.frequencyBinCount);
    const binSizeLo = audioCtx.sampleRate / analyserNodeLo.fftSize;
    const fftManagerLo = Object(__WEBPACK_IMPORTED_MODULE_3__fftDataManager_mjs__["a" /* default */])(analyserNodeLo.frequencyBinCount);
    const redrawSpectrogram = () => {
      requestAnimationFrame(redrawSpectrogram);
      __WEBPACK_IMPORTED_MODULE_1__model_mjs__["a" /* default */].heartbeat(audioEle.currentTime);
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


/***/ }),
/* 2 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__model_mjs__ = __webpack_require__(0);


const initAudio = async ({
  sid,
  audioEle,
  mediaSource,
  sourceBuffer,
} = {}) => {
  let curIndex = -1;
  const GetNextMediaSegment = async () => {
    curIndex++;
    const response = await fetch(
      'part?sid=' + encodeURIComponent(sid) + '&id=' + curIndex,
      {
        cache: 'no-store',
        headers: { 'X-Playback-Position': audioEle.currentTime },
      },
    );

    //Read metadata, e.g. current song
    const metadataEvents = JSON.parse(decodeURI(response.headers.get('X-Metadata')));
    if (typeof metadataEvents === 'object') __WEBPACK_IMPORTED_MODULE_0__model_mjs__["a" /* default */].processEvents(metadataEvents);

    return response.arrayBuffer();
  };

  async function appendNextMediaSegment() {
    const mediaSegment = await GetNextMediaSegment();

    if (mediaSource.readyState === 'closed') {
      return;
    }

    // Make sure the previous append is not still pending.
    if (sourceBuffer.updating) {
      await new Promise((resolve) => {
        const tmpHandler = () => {
          sourceBuffer.removeEventListener('updateend', tmpHandler);
          resolve();
        };
        sourceBuffer.addEventListener('updateend', tmpHandler);
      });
      //return;
    }

    if (mediaSegment.byteLength === 0) {
      //mediaSource.endOfStream();
      //setTimeout(() => appendNextMediaSegment(), 1000);
      return;
    }

    // NOTE: If mediaSource.readyState == “ended”, this appendBuffer() call will
    // cause mediaSource.readyState to transition to "open". The web application
    // should be prepared to handle multiple “sourceopen” events.
    sourceBuffer.appendBuffer(mediaSegment);
  }

  //Load first segment
  {
    const initSegment = await GetNextMediaSegment();

    if (initSegment == null) {
      // Error fetching the initialization segment. Signal end of stream with an error.
      mediaSource.endOfStream('network');
      return;
    }

    // Append the initialization segment.
    const firstAppendHandler = () => {
      sourceBuffer.removeEventListener('updateend', firstAppendHandler);

      //In case the autoplay doesn't work, we manually force a play here, though it shouldn't be necessary
      audioEle.play();

      // Append some initial media data.
      appendNextMediaSegment();
    };
    sourceBuffer.addEventListener('updateend', firstAppendHandler);
    sourceBuffer.appendBuffer(initSegment);

    setInterval(appendNextMediaSegment, 1000);
  }
};

/* harmony default export */ __webpack_exports__["a"] = (initAudio);


/***/ }),
/* 3 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__spectrogram_mjs__ = __webpack_require__(4);


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
  const spectrogramFunctions = Object(__WEBPACK_IMPORTED_MODULE_0__spectrogram_mjs__["a" /* default */])(canvas);
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
    },
  };
};

/* harmony default export */ __webpack_exports__["a"] = (initView);


/***/ }),
/* 4 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__viridis_mjs__ = __webpack_require__(5);


/** The height in pixels of the top navigation, the spectrogram is drawn below it */
const TOP_NAVIGATION_HEIGHT = 100;
/** How fast the spectrogram moves to the left, in pixels per second. This number should be a multiple of 60 because we redraw up to 60Hz */
const SPECTROGRAM_SPEED = 120;
/** How many samples are in one pixel */
const SPECTROGRAM_SAMPLES_PER_PIXEL = 44100 / SPECTROGRAM_SPEED;
/** The background color of the spectrogram is purple by default, rgb(68,1,84), which equals 0 in the Viridis color map */
const SPECTROGRAM_BACKGROUND = Object(__WEBPACK_IMPORTED_MODULE_0__viridis_mjs__["a" /* default */])(0);

//We center the spectrogram at the pitch standard A4 = 440 Hz
const SPECTROGRAM_TUNING = 440;
//We go down to A0 = 27.5 Hz
const SPECTROGRAM_OCTAVES_DOWN = -4;
//We go up to A7 = 1,760 Hz
const SPECTROGRAM_OCTAVES_UP = 2;
//Calculate lowest and highest frequency based on this data
const SPECTROGRAM_LOWEST_FREQUENCY = SPECTROGRAM_TUNING * (2 ** SPECTROGRAM_OCTAVES_DOWN);
const SPECTROGRAM_HIGHEST_FREQUENCY = SPECTROGRAM_TUNING * (2 ** SPECTROGRAM_OCTAVES_UP);

/**
 * A spectrogram of the audio stream. Left to right is time, bottom to top is frequency.
 * @param {HTMLCanvasElement} canvas
*/
const spectrogram = (canvas) => {
  canvas.style.position = 'absolute';
  canvas.style.top = TOP_NAVIGATION_HEIGHT + 'px';
  canvas.style.right = '0';
  canvas.style.bottom = '0';
  canvas.style.left = '0';

  let oldWidth = window.innerWidth;
  let oldHeight = window.innerHeight - TOP_NAVIGATION_HEIGHT;
  canvas.width = oldWidth;
  canvas.height = oldHeight;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = SPECTROGRAM_BACKGROUND;
  ctx.fillRect(0, 0, oldWidth, oldHeight);

  let prevTime = 0;

  return {
    /**
     * Upon new data, moves the graph to the left and inserts the input on the right side
     * @param {Uint8Array} data
     */
    addData: (fftManagerHi, binSizeHi, fftManagerLo, binSizeLo, newTime) => {
      const pixelsToMove = Math.floor((newTime - prevTime) / SPECTROGRAM_SAMPLES_PER_PIXEL);

      //move existing graph to the left
      //getImageData()/putImageData() takes 8-16 ms which is too slow, so we use drawImage() which takes <0.2ms
      ctx.drawImage(canvas, -pixelsToMove, 0);

      //If user tabbed out and returns, skip older pixels for better performance
      let startPixel = 0;
      if (pixelsToMove > 50) {
        ctx.fillStyle = Object(__WEBPACK_IMPORTED_MODULE_0__viridis_mjs__["a" /* default */])(0);
        ctx.fillRect(oldWidth - pixelsToMove, 0, pixelsToMove - 20, oldHeight);
        startPixel = pixelsToMove - 20;
        prevTime += startPixel * SPECTROGRAM_SAMPLES_PER_PIXEL;
      }

      for (let i = startPixel; i < pixelsToMove; i++) {
        const nearestBuffersHi = fftManagerHi.getNearestBuffers(prevTime);
        const nearestBuffersLo = fftManagerLo.getNearestBuffers(prevTime);
        prevTime += SPECTROGRAM_SAMPLES_PER_PIXEL;

        //add new pixels on the right side based on input data
        for (let j = oldHeight - 1; j >= 0; j--) {
          //convert y axis (log frequency) to frequency
          const frequency = SPECTROGRAM_LOWEST_FREQUENCY * 2 ** (j / oldHeight * (SPECTROGRAM_OCTAVES_UP - SPECTROGRAM_OCTAVES_DOWN));
          //find closest indices in nearestBuffersHi and nearestBuffersLo
          const freqLoRatio = frequency / binSizeLo;
          const freqLoIndex = Math.floor(freqLoRatio);
          const freqLoWeight = 1.0 - (freqLoRatio % 1);
          const freqHiRatio = frequency / binSizeHi;
          const freqHiIndex = Math.floor(freqHiRatio);
          const freqHiWeight = 1.0 - (freqHiRatio % 1);
          //interpolate between previous and current time, and interpolate between current frequency and subsequent frequency
          const amplitudeLo =
            (nearestBuffersLo.minWeight * (freqLoWeight * nearestBuffersLo.minArray[freqLoIndex] + (1.0 - freqLoWeight) * nearestBuffersLo.minArray[freqLoIndex + 1]) +
            nearestBuffersLo.maxWeight * (freqLoWeight * nearestBuffersLo.maxArray[freqLoIndex] + (1.0 - freqLoWeight) * nearestBuffersLo.maxArray[freqLoIndex + 1])) / 255;
          const amplitudeHi =
            (nearestBuffersHi.minWeight * (freqHiWeight * nearestBuffersHi.minArray[freqHiIndex] + (1.0 - freqHiWeight) * nearestBuffersHi.minArray[freqHiIndex + 1]) +
            nearestBuffersHi.maxWeight * (freqHiWeight * nearestBuffersHi.maxArray[freqHiIndex] + (1.0 - freqHiWeight) * nearestBuffersHi.maxArray[freqHiIndex + 1])) / 255;

          //interpolate between low and high frequency FFT data
          //const amplitude = ((1.0 - j / oldHeight) * amplitudeLo + (j / oldHeight) * amplitudeHi) / 255;
          //alternatively:
          //const amplitude = Math.sqrt(Math.max(amplitudeLo / 255, 0.1) * Math.max(amplitudeHi / 255, 0.1));
          const amplitude =
            0.1 * amplitudeLo +
            0.1 * amplitudeHi +
            0.8 * ((amplitudeLo + 0.1) * (amplitudeHi + 0.1) - 0.01) / 1.20;

          //set background color based on amplitude
          ctx.fillStyle = Object(__WEBPACK_IMPORTED_MODULE_0__viridis_mjs__["a" /* default */])(amplitude);
          //fill this pixel
          ctx.fillRect(oldWidth - pixelsToMove + i, oldHeight - j, 1, 1);
        }
      }
    },
    /**
     * Gets called whenever the window size has changed, and translates and resizes the currently drawn spectrogram accordingly to match
     */
    resize: () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight - TOP_NAVIGATION_HEIGHT;
      //Resizing will clear the canvas, so we need to copy the contents before resizing
      //If window width got smaller, we move canvas to the left and truncate leftmost pixels
      const imageData = (newWidth < oldWidth) ?
        ctx.getImageData(oldWidth - newWidth, 0, newWidth, oldHeight) :
        ctx.getImageData(0, 0, oldWidth, oldHeight);

      //resize canvas
      canvas.width = newWidth;
      canvas.height = newHeight;
      //fill with black pixels
      ctx.fillStyle = SPECTROGRAM_BACKGROUND;
      ctx.fillRect(0, 0, newWidth, newHeight);

      //putImageData() does not allow scaling, so we put the ImageData into a temporary canvas and use drawImage()
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = imageData.width;
      tmpCanvas.height = imageData.height;
      tmpCanvas.getContext('2d').putImageData(imageData, 0, 0);

      //paste contents back, but scaled accordingly
      const destinationX = (newWidth > oldWidth) ? newWidth - oldWidth : 0;
      ctx.drawImage(tmpCanvas, destinationX, 0, imageData.width, newHeight);

      oldWidth = newWidth;
      oldHeight = newHeight;
    },
  };
};

/* harmony default export */ __webpack_exports__["a"] = (spectrogram);


/***/ }),
/* 5 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/*
Viridis color map from matplotlib, a Python library (https://cran.r-project.org/web/packages/viridis/)
Copyright (c) 2015, Simon Garnier

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/**
 * Given a float in [0, 1], returns the closest RBG color associated with it
 */
const getViridisColor = ((() => {
  const colorMap = [
    [0.26700401, 0.00487433, 0.32941519],
    [0.26851048, 0.00960483, 0.33542652],
    [0.26994384, 0.01462494, 0.34137895],
    [0.27130489, 0.01994186, 0.34726862],
    [0.27259384, 0.02556309, 0.35309303],
    [0.27380934, 0.03149748, 0.35885256],
    [0.27495242, 0.03775181, 0.36454323],
    [0.27602238, 0.04416723, 0.37016418],
    [0.2770184, 0.05034437, 0.37571452],
    [0.27794143, 0.05632444, 0.38119074],
    [0.27879067, 0.06214536, 0.38659204],
    [0.2795655, 0.06783587, 0.39191723],
    [0.28026658, 0.07341724, 0.39716349],
    [0.28089358, 0.07890703, 0.40232944],
    [0.28144581, 0.0843197, 0.40741404],
    [0.28192358, 0.08966622, 0.41241521],
    [0.28232739, 0.09495545, 0.41733086],
    [0.28265633, 0.10019576, 0.42216032],
    [0.28291049, 0.10539345, 0.42690202],
    [0.28309095, 0.11055307, 0.43155375],
    [0.28319704, 0.11567966, 0.43611482],
    [0.28322882, 0.12077701, 0.44058404],
    [0.28318684, 0.12584799, 0.44496],
    [0.283072, 0.13089477, 0.44924127],
    [0.28288389, 0.13592005, 0.45342734],
    [0.28262297, 0.14092556, 0.45751726],
    [0.28229037, 0.14591233, 0.46150995],
    [0.28188676, 0.15088147, 0.46540474],
    [0.28141228, 0.15583425, 0.46920128],
    [0.28086773, 0.16077132, 0.47289909],
    [0.28025468, 0.16569272, 0.47649762],
    [0.27957399, 0.17059884, 0.47999675],
    [0.27882618, 0.1754902, 0.48339654],
    [0.27801236, 0.18036684, 0.48669702],
    [0.27713437, 0.18522836, 0.48989831],
    [0.27619376, 0.19007447, 0.49300074],
    [0.27519116, 0.1949054, 0.49600488],
    [0.27412802, 0.19972086, 0.49891131],
    [0.27300596, 0.20452049, 0.50172076],
    [0.27182812, 0.20930306, 0.50443413],
    [0.27059473, 0.21406899, 0.50705243],
    [0.26930756, 0.21881782, 0.50957678],
    [0.26796846, 0.22354911, 0.5120084],
    [0.26657984, 0.2282621, 0.5143487],
    [0.2651445, 0.23295593, 0.5165993],
    [0.2636632, 0.23763078, 0.51876163],
    [0.26213801, 0.24228619, 0.52083736],
    [0.26057103, 0.2469217, 0.52282822],
    [0.25896451, 0.25153685, 0.52473609],
    [0.25732244, 0.2561304, 0.52656332],
    [0.25564519, 0.26070284, 0.52831152],
    [0.25393498, 0.26525384, 0.52998273],
    [0.25219404, 0.26978306, 0.53157905],
    [0.25042462, 0.27429024, 0.53310261],
    [0.24862899, 0.27877509, 0.53455561],
    [0.2468114, 0.28323662, 0.53594093],
    [0.24497208, 0.28767547, 0.53726018],
    [0.24311324, 0.29209154, 0.53851561],
    [0.24123708, 0.29648471, 0.53970946],
    [0.23934575, 0.30085494, 0.54084398],
    [0.23744138, 0.30520222, 0.5419214],
    [0.23552606, 0.30952657, 0.54294396],
    [0.23360277, 0.31382773, 0.54391424],
    [0.2316735, 0.3181058, 0.54483444],
    [0.22973926, 0.32236127, 0.54570633],
    [0.22780192, 0.32659432, 0.546532],
    [0.2258633, 0.33080515, 0.54731353],
    [0.22392515, 0.334994, 0.54805291],
    [0.22198915, 0.33916114, 0.54875211],
    [0.22005691, 0.34330688, 0.54941304],
    [0.21812995, 0.34743154, 0.55003755],
    [0.21620971, 0.35153548, 0.55062743],
    [0.21429757, 0.35561907, 0.5511844],
    [0.21239477, 0.35968273, 0.55171011],
    [0.2105031, 0.36372671, 0.55220646],
    [0.20862342, 0.36775151, 0.55267486],
    [0.20675628, 0.37175775, 0.55311653],
    [0.20490257, 0.37574589, 0.55353282],
    [0.20306309, 0.37971644, 0.55392505],
    [0.20123854, 0.38366989, 0.55429441],
    [0.1994295, 0.38760678, 0.55464205],
    [0.1976365, 0.39152762, 0.55496905],
    [0.19585993, 0.39543297, 0.55527637],
    [0.19410009, 0.39932336, 0.55556494],
    [0.19235719, 0.40319934, 0.55583559],
    [0.19063135, 0.40706148, 0.55608907],
    [0.18892259, 0.41091033, 0.55632606],
    [0.18723083, 0.41474645, 0.55654717],
    [0.18555593, 0.4185704, 0.55675292],
    [0.18389763, 0.42238275, 0.55694377],
    [0.18225561, 0.42618405, 0.5571201],
    [0.18062949, 0.42997486, 0.55728221],
    [0.17901879, 0.43375572, 0.55743035],
    [0.17742298, 0.4375272, 0.55756466],
    [0.17584148, 0.44128981, 0.55768526],
    [0.17427363, 0.4450441, 0.55779216],
    [0.17271876, 0.4487906, 0.55788532],
    [0.17117615, 0.4525298, 0.55796464],
    [0.16964573, 0.45626209, 0.55803034],
    [0.16812641, 0.45998802, 0.55808199],
    [0.1666171, 0.46370813, 0.55811913],
    [0.16511703, 0.4674229, 0.55814141],
    [0.16362543, 0.47113278, 0.55814842],
    [0.16214155, 0.47483821, 0.55813967],
    [0.16066467, 0.47853961, 0.55811466],
    [0.15919413, 0.4822374, 0.5580728],
    [0.15772933, 0.48593197, 0.55801347],
    [0.15626973, 0.4896237, 0.557936],
    [0.15481488, 0.49331293, 0.55783967],
    [0.15336445, 0.49700003, 0.55772371],
    [0.1519182, 0.50068529, 0.55758733],
    [0.15047605, 0.50436904, 0.55742968],
    [0.14903918, 0.50805136, 0.5572505],
    [0.14760731, 0.51173263, 0.55704861],
    [0.14618026, 0.51541316, 0.55682271],
    [0.14475863, 0.51909319, 0.55657181],
    [0.14334327, 0.52277292, 0.55629491],
    [0.14193527, 0.52645254, 0.55599097],
    [0.14053599, 0.53013219, 0.55565893],
    [0.13914708, 0.53381201, 0.55529773],
    [0.13777048, 0.53749213, 0.55490625],
    [0.1364085, 0.54117264, 0.55448339],
    [0.13506561, 0.54485335, 0.55402906],
    [0.13374299, 0.54853458, 0.55354108],
    [0.13244401, 0.55221637, 0.55301828],
    [0.13117249, 0.55589872, 0.55245948],
    [0.1299327, 0.55958162, 0.55186354],
    [0.12872938, 0.56326503, 0.55122927],
    [0.12756771, 0.56694891, 0.55055551],
    [0.12645338, 0.57063316, 0.5498411],
    [0.12539383, 0.57431754, 0.54908564],
    [0.12439474, 0.57800205, 0.5482874],
    [0.12346281, 0.58168661, 0.54744498],
    [0.12260562, 0.58537105, 0.54655722],
    [0.12183122, 0.58905521, 0.54562298],
    [0.12114807, 0.59273889, 0.54464114],
    [0.12056501, 0.59642187, 0.54361058],
    [0.12009154, 0.60010387, 0.54253043],
    [0.11973756, 0.60378459, 0.54139999],
    [0.11951163, 0.60746388, 0.54021751],
    [0.11942341, 0.61114146, 0.53898192],
    [0.11948255, 0.61481702, 0.53769219],
    [0.11969858, 0.61849025, 0.53634733],
    [0.12008079, 0.62216081, 0.53494633],
    [0.12063824, 0.62582833, 0.53348834],
    [0.12137972, 0.62949242, 0.53197275],
    [0.12231244, 0.63315277, 0.53039808],
    [0.12344358, 0.63680899, 0.52876343],
    [0.12477953, 0.64046069, 0.52706792],
    [0.12632581, 0.64410744, 0.52531069],
    [0.12808703, 0.64774881, 0.52349092],
    [0.13006688, 0.65138436, 0.52160791],
    [0.13226797, 0.65501363, 0.51966086],
    [0.13469183, 0.65863619, 0.5176488],
    [0.13733921, 0.66225157, 0.51557101],
    [0.14020991, 0.66585927, 0.5134268],
    [0.14330291, 0.66945881, 0.51121549],
    [0.1466164, 0.67304968, 0.50893644],
    [0.15014782, 0.67663139, 0.5065889],
    [0.15389405, 0.68020343, 0.50417217],
    [0.15785146, 0.68376525, 0.50168574],
    [0.16201598, 0.68731632, 0.49912906],
    [0.1663832, 0.69085611, 0.49650163],
    [0.1709484, 0.69438405, 0.49380294],
    [0.17570671, 0.6978996, 0.49103252],
    [0.18065314, 0.70140222, 0.48818938],
    [0.18578266, 0.70489133, 0.48527326],
    [0.19109018, 0.70836635, 0.48228395],
    [0.19657063, 0.71182668, 0.47922108],
    [0.20221902, 0.71527175, 0.47608431],
    [0.20803045, 0.71870095, 0.4728733],
    [0.21400015, 0.72211371, 0.46958774],
    [0.22012381, 0.72550945, 0.46622638],
    [0.2263969, 0.72888753, 0.46278934],
    [0.23281498, 0.73224735, 0.45927675],
    [0.2393739, 0.73558828, 0.45568838],
    [0.24606968, 0.73890972, 0.45202405],
    [0.25289851, 0.74221104, 0.44828355],
    [0.25985676, 0.74549162, 0.44446673],
    [0.26694127, 0.74875084, 0.44057284],
    [0.27414922, 0.75198807, 0.4366009],
    [0.28147681, 0.75520266, 0.43255207],
    [0.28892102, 0.75839399, 0.42842626],
    [0.29647899, 0.76156142, 0.42422341],
    [0.30414796, 0.76470433, 0.41994346],
    [0.31192534, 0.76782207, 0.41558638],
    [0.3198086, 0.77091403, 0.41115215],
    [0.3277958, 0.77397953, 0.40664011],
    [0.33588539, 0.7770179, 0.40204917],
    [0.34407411, 0.78002855, 0.39738103],
    [0.35235985, 0.78301086, 0.39263579],
    [0.36074053, 0.78596419, 0.38781353],
    [0.3692142, 0.78888793, 0.38291438],
    [0.37777892, 0.79178146, 0.3779385],
    [0.38643282, 0.79464415, 0.37288606],
    [0.39517408, 0.79747541, 0.36775726],
    [0.40400101, 0.80027461, 0.36255223],
    [0.4129135, 0.80304099, 0.35726893],
    [0.42190813, 0.80577412, 0.35191009],
    [0.43098317, 0.80847343, 0.34647607],
    [0.44013691, 0.81113836, 0.3409673],
    [0.44936763, 0.81376835, 0.33538426],
    [0.45867362, 0.81636288, 0.32972749],
    [0.46805314, 0.81892143, 0.32399761],
    [0.47750446, 0.82144351, 0.31819529],
    [0.4870258, 0.82392862, 0.31232133],
    [0.49661536, 0.82637633, 0.30637661],
    [0.5062713, 0.82878621, 0.30036211],
    [0.51599182, 0.83115784, 0.29427888],
    [0.52577622, 0.83349064, 0.2881265],
    [0.5356211, 0.83578452, 0.28190832],
    [0.5455244, 0.83803918, 0.27562602],
    [0.55548397, 0.84025437, 0.26928147],
    [0.5654976, 0.8424299, 0.26287683],
    [0.57556297, 0.84456561, 0.25641457],
    [0.58567772, 0.84666139, 0.24989748],
    [0.59583934, 0.84871722, 0.24332878],
    [0.60604528, 0.8507331, 0.23671214],
    [0.61629283, 0.85270912, 0.23005179],
    [0.62657923, 0.85464543, 0.22335258],
    [0.63690157, 0.85654226, 0.21662012],
    [0.64725685, 0.85839991, 0.20986086],
    [0.65764197, 0.86021878, 0.20308229],
    [0.66805369, 0.86199932, 0.19629307],
    [0.67848868, 0.86374211, 0.18950326],
    [0.68894351, 0.86544779, 0.18272455],
    [0.69941463, 0.86711711, 0.17597055],
    [0.70989842, 0.86875092, 0.16925712],
    [0.72039115, 0.87035015, 0.16260273],
    [0.73088902, 0.87191584, 0.15602894],
    [0.74138803, 0.87344918, 0.14956101],
    [0.75188414, 0.87495143, 0.14322828],
    [0.76237342, 0.87642392, 0.13706449],
    [0.77285183, 0.87786808, 0.13110864],
    [0.78331535, 0.87928545, 0.12540538],
    [0.79375994, 0.88067763, 0.12000532],
    [0.80418159, 0.88204632, 0.11496505],
    [0.81457634, 0.88339329, 0.11034678],
    [0.82494028, 0.88472036, 0.10621724],
    [0.83526959, 0.88602943, 0.1026459],
    [0.84556056, 0.88732243, 0.09970219],
    [0.8558096, 0.88860134, 0.09745186],
    [0.86601325, 0.88986815, 0.09595277],
    [0.87616824, 0.89112487, 0.09525046],
    [0.88627146, 0.89237353, 0.09537439],
    [0.89632002, 0.89361614, 0.09633538],
    [0.90631121, 0.89485467, 0.09812496],
    [0.91624212, 0.89609127, 0.1007168],
    [0.92610579, 0.89732977, 0.10407067],
    [0.93590444, 0.8985704, 0.10813094],
    [0.94563626, 0.899815, 0.11283773],
    [0.95529972, 0.90106534, 0.11812832],
    [0.96489353, 0.90232311, 0.12394051],
    [0.97441665, 0.90358991, 0.13021494],
    [0.98386829, 0.90486726, 0.13689671],
    [0.99324789, 0.90615657, 0.1439362],
  ].map(arr => 'rgb(' + arr.map(val => Math.round(val * 255)).join(',') + ')');


  return (fracIn) => {
    //clamp fractional value into [0, 1] range
    const frac = Math.max(Math.min(fracIn, 1.0), 0.0);

    //return value from color map
    const index = Math.round(frac * (colorMap.length - 1));
    return colorMap[index];

    //Alternatively, we could interpolate between the two closest values from the color map
    //However, the color map is already so detailed that this will only have a minor benefit but will reduce performance
    /*
    const lerp = (min, max, frac) => min + (max - min) * frac;
    if (frac === 1) return colorMap[colorMap.length - 1];

    //calculate first index for interpolation
    const index = frac * (colorMap.length - 1);
    const indexInt = Math.floor(index);
    const indexFrac = index % 1;

    return [
      lerp(colorMap[indexInt][0], colorMap[indexInt + 1][0], indexFrac),
      lerp(colorMap[indexInt][1], colorMap[indexInt + 1][1], indexFrac),
      lerp(colorMap[indexInt][2], colorMap[indexInt + 1][2], indexFrac),
    ];
    */
  };
})());

/* harmony default export */ __webpack_exports__["a"] = (getViridisColor);


/***/ }),
/* 6 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
//Keeps track of all Float32Arrays allocated for FFT data, provides access to them and returns them as needed

const fftDataManager = (windowSize) => {
  const fftArrays = [];
  const unusedArrays = [];
  //If we ever cannot find an array, return an array filled with zeros
  const nullArray = new Uint8Array(windowSize);//TODO: need to use Float32Array

  return {
    getNewBuffer(curTime) {
      const curArray = (unusedArrays.length === 0) ? new Uint8Array(windowSize) : unusedArrays.splice(0, 1)[0];
      fftArrays.push({ time: curTime, data: curArray });
      return curArray;
    },
    getNearestBuffers(requestedTime) {
      //If we have no data, return zero
      if (fftArrays.length === 0) {
        return {
          minWeight: 0.0,
          minArray: nullArray,
          maxWeight: 0.0,
          maxArray: nullArray,
        };
      }

      let indexBeforeTime = -1;
      for (let i = 0, il = fftArrays.length; i < il; i++) {
        if (fftArrays[i].time <= requestedTime) {
          indexBeforeTime = i;
        } else {
          break;
        }
      }

      //If all of our buffers are after the request time, return first buffer in list but scale it down depending on time
      if (indexBeforeTime === -1) {
        //0 if right after request time, 1 if one second or later after requested time
        const weight = Math.min((fftArrays[0].time - requestedTime) / 44100, 1.0);
        return {
          minWeight: weight,
          minArray: nullArray,
          maxWeight: 1.0 - weight,
          maxArray: fftArrays[0].data,
        };
      }

      //If our index is the last in the array, we take it fully
      if (indexBeforeTime === fftArrays.length - 1) {
        return {
          minWeight: 1.0,
          minArray: fftArrays[indexBeforeTime].data,
          maxWeight: 0.0,
          maxArray: nullArray,
        };
      }

      //Otherwise, we can correctly interpolate between two arrays
      //weight is 0 if close to minArray, weight is 1 if close to maxArray
      const weight = (requestedTime - fftArrays[indexBeforeTime].time) / (fftArrays[indexBeforeTime + 1].time - fftArrays[indexBeforeTime].time);
      return {
        minWeight: 1.0 - weight,
        minArray: fftArrays[indexBeforeTime].data,
        maxWeight: weight,
        maxArray: fftArrays[indexBeforeTime + 1].data,
      };
    },
    garbageCollection(curTime) {
      //go through fftArrays, remove all entries where time is more than 3 seconds ago, and move array into unusedArrays
      while (fftArrays[0]) {
        if (curTime - fftArrays[0].time > 3 * 44100) {
          unusedArrays.push(fftArrays[0].data);
          fftArrays.splice(0, 1);
        } else {
          //If at least one entry is new enough, any follow-up entries will be even newer and can be ignored
          break;
        }
      }
    },
  };
};

/* harmony default export */ __webpack_exports__["a"] = (fftDataManager);


/***/ })
/******/ ]);