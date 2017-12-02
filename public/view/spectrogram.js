/** The height in pixels of the top navigation, the spectrogram is drawn below it */
const TOP_NAVIGATION_HEIGHT = 100;
/** How fast the spectrogram moves to the left, in pixels per second. This number should be a multiple of 60 because we redraw up to 60Hz */
const SPECTROGRAM_SPEED = 120;
/** The background color of the spectrogram is purple by default, rgb(68,1,84), which equals 0 in the Viridis color map */
const SPECTROGRAM_BACKGROUND = getViridisColor(0);

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

  const frequencyToLogFrequency = (freq) => {
    if (freq <= SPECTROGRAM_LOWEST_FREQUENCY) return 0;
    if (freq >= SPECTROGRAM_HIGHEST_FREQUENCY) return 1;
    const ratio = freq / SPECTROGRAM_LOWEST_FREQUENCY;
    const ratioLog = Math.log2(ratio) / (SPECTROGRAM_OCTAVES_UP - SPECTROGRAM_OCTAVES_DOWN);
    return ratioLog;
  };

  let prevTime = 0;

  return {
    /**
     * Upon new data, moves the graph to the left and inserts the input on the right side
     * @param {Uint8Array} data
     */
    addData: (fftManagerHi, binSizeHi, fftManagerLo, binSizeLo, newTime) => {
      const pixelsToMove = Math.floor((newTime - prevTime) * SPECTROGRAM_SPEED);

      //move existing graph to the left
      //getImageData()/putImageData() takes 8-16 ms which is too slow, so we use drawImage() which takes <0.2ms
      ctx.drawImage(canvas, -pixelsToMove, 0);

      //If user tabbed out and returns, skip older pixels for better performance
      let startPixel = 0;
      if (pixelsToMove > 50) {
        ctx.fillStyle = getViridisColor(0);
        ctx.fillRect(oldWidth - pixelsToMove, 0, pixelsToMove - 20, oldHeight);
        startPixel = pixelsToMove - 20;
        prevTime += startPixel / SPECTROGRAM_SPEED;
      }

      for (let i = startPixel; i < pixelsToMove; i++) {
        const nearestBuffersHi = fftManagerHi.getNearestBuffers(prevTime * 44100);
        const nearestBuffersLo = fftManagerLo.getNearestBuffers(prevTime * 44100);
        prevTime += 1 / SPECTROGRAM_SPEED;

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
          ctx.fillStyle = getViridisColor(amplitude);
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
