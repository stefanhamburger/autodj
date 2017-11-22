//The height in pixels of the top navigation, the spectrogram is drawn below it
const TOP_NAVIGATION_HEIGHT = 100;
//How fast the spectrogram moves to the left, in pixels per second
const SPECTROGRAM_SPEED = 20;

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
  const ctx = canvas.getContext('2d');
  let lastTime = Date.now();
  let oldWidth = window.innerWidth;
  let oldHeight = window.innerHeight - TOP_NAVIGATION_HEIGHT;
  canvas.width = oldWidth;
  canvas.height = oldHeight;

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, oldWidth, oldHeight);

  return {
    /** Upon new data, moves the graph to the left and inserts the input on the right side */
    addData: (data) => {
      const newTime = Date.now();
      const pixelsToMove = Math.round((newTime - lastTime) / 1000 * SPECTROGRAM_SPEED);//TODO: we probably should not round here

      //move existing graph to the left
      const imageData = ctx.getImageData(pixelsToMove, 0, oldWidth - pixelsToMove, oldHeight);
      ctx.putImageData(imageData, 0, 0, 0, 0, oldWidth - pixelsToMove, oldHeight);

      //add new pixels on the right side based on input data
      ctx.fillStyle = 'black';
      ctx.fillRect(oldWidth - pixelsToMove, 0, pixelsToMove, oldHeight);
      for (let i = 0; i < data.length; i++) {
        ctx.fillStyle = 'rgb(' + getViridisColor(data[i]).map(val => Math.round(val * 255)).join(',') + ')';
        ctx.fillRect(oldWidth - pixelsToMove, i / data.length * oldHeight, pixelsToMove, 1 / data.length * oldHeight);
      }

      lastTime = newTime;
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
      ctx.fillStyle = 'black';
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
