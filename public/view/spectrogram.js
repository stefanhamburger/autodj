/** The height in pixels of the top navigation, the spectrogram is drawn below it */
const TOP_NAVIGATION_HEIGHT = 100;
/** How fast the spectrogram moves to the left, in pixels per second. This number should be a multiple of 60 because we redraw up to 60Hz */
const SPECTROGRAM_SPEED = 120;
/** The background color of the spectrogram is purple by default, rgb(68,1,84), which equals 0 in the Viridis color map */
const SPECTROGRAM_BACKGROUND = getViridisColor(0);

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
    addData: (data, newTime) => {
      const pixelsToMove = (prevTime === 0) ? 0 : Math.floor((newTime - prevTime) * SPECTROGRAM_SPEED);
      prevTime = newTime;

      //move existing graph to the left
      //getImageData()/putImageData() takes 8-16 ms which is too slow, so we use drawImage() which takes <0.2ms
      ctx.drawImage(canvas, -pixelsToMove, 0);

      //add new pixels on the right side based on input data
      const heightPerData = 1 / data.length * oldHeight;
      for (let i = 0, il = data.length; i < il; i++) {
        //TODO: This causes a grid because certain pixels are drawn twice. We will need to round to integers
        //TODO: Frequencies should use a logarithmic scale
        ctx.fillStyle = getViridisColor(data[i] / 255);
        ctx.fillRect(oldWidth - pixelsToMove, oldHeight - i * heightPerData, pixelsToMove, heightPerData);
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
