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

      for (let i = 0; i < pixelsToMove; i++) {
        const nearestBuffersHi = fftManagerHi.getNearestBuffers(prevTime * 44100);
        const nearestBuffersLo = fftManagerLo.getNearestBuffers(prevTime * 44100);
        prevTime += 1 / SPECTROGRAM_SPEED;
        //If user tabbed out and returns, skip older pixels for better performance
        if (pixelsToMove > 50 && i < pixelsToMove - 20) continue;

        //add new pixels on the right side based on input data
        for (let j = 0, jl = nearestBuffersLo.minArray.length; j < jl; j++) {
          const frequency = j * binSizeLo;
          const amplitude = nearestBuffersLo.minWeight * nearestBuffersLo.minArray[j] + nearestBuffersLo.maxWeight * nearestBuffersLo.maxArray[j];
          //Convert frequency to logarithmic scale
          const logFrequency = frequencyToLogFrequency(frequency);
          const logNextFrequency = frequencyToLogFrequency(frequency + binSizeLo);
          //calculate position and height of the rectangle we want to draw
          const rectPosition = logFrequency * oldHeight;
          let rectHeight = (logNextFrequency - logFrequency) * oldHeight;
          if (rectPosition >= oldHeight * 0.3) {
            continue;
          } else if (rectPosition + rectHeight >= oldHeight * 0.5) {
            rectHeight = oldHeight * 0.3 - rectPosition;
          }
          //set background color based on amplitude
          ctx.fillStyle = getViridisColor(amplitude / 255);
          //We need to invert y axis since frequencies are ordered from bottom to top
          ctx.fillRect(oldWidth - pixelsToMove + i, oldHeight - rectPosition - rectHeight, 1, rectHeight);
        }

        //add new pixels on the right side based on input data
        for (let j = 0, jl = nearestBuffersHi.minArray.length; j < jl; j++) {
          const frequency = j * binSizeHi;
          const amplitude = nearestBuffersHi.minWeight * nearestBuffersHi.minArray[j] + nearestBuffersHi.maxWeight * nearestBuffersHi.maxArray[j];
          //Convert frequency to logarithmic scale
          const logFrequency = frequencyToLogFrequency(frequency);
          const logNextFrequency = frequencyToLogFrequency(frequency + binSizeHi);
          //calculate position and height of the rectangle we want to draw
          const rectPosition = logFrequency * oldHeight;
          const rectHeight = (logNextFrequency - logFrequency) * oldHeight;
          if (rectPosition < oldHeight * 0.3) {
            continue;
          }
          //set background color based on amplitude
          ctx.fillStyle = getViridisColor(amplitude / 255);
          //We need to invert y axis since frequencies are ordered from bottom to top
          ctx.fillRect(oldWidth - pixelsToMove + i, oldHeight - rectPosition - rectHeight, 1, rectHeight);
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
