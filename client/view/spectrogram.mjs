import getViridisColor from './viridis.mjs';
import frequencyToVolume from './equalLoudnessContour.mjs';
import model from './../model.mjs';

/** The height in pixels of the top navigation, the spectrogram is drawn below it */
const TOP_NAVIGATION_HEIGHT = 140;
/** How fast the spectrogram moves to the left, in pixels per second. This number should be a multiple of 60 because we redraw up to 60Hz */
const SPECTROGRAM_SPEED = 120;
/** The background color of the spectrogram is purple by default, rgb(68,1,84), which equals 0 in the Viridis color map */
const SPECTROGRAM_BACKGROUND = getViridisColor(0);

//We center the spectrogram at the pitch standard A4 = 440 Hz
const SPECTROGRAM_TUNING = 440;
//We go down to A0 = 27.5 Hz
const SPECTROGRAM_OCTAVES_DOWN = -4;
//We go up to A8 = 7,040 Hz
const SPECTROGRAM_OCTAVES_UP = 4;
//Calculate lowest and highest frequency based on this data
const SPECTROGRAM_LOWEST_FREQUENCY = SPECTROGRAM_TUNING * (2 ** SPECTROGRAM_OCTAVES_DOWN);
//const SPECTROGRAM_HIGHEST_FREQUENCY = SPECTROGRAM_TUNING * (2 ** SPECTROGRAM_OCTAVES_UP);

let oldWidth;
let oldHeight;
let ctx;
let prevTime = 0;

/**
 * A spectrogram of the audio stream. Left to right is time, bottom to top is frequency.
 * @param {HTMLCanvasElement} canvas
*/
const init = (canvas) => {
  canvas.style.position = 'absolute';
  canvas.style.top = `${TOP_NAVIGATION_HEIGHT}px`;
  canvas.style.right = '0';
  canvas.style.bottom = '0';
  canvas.style.left = '0';

  oldWidth = window.innerWidth;
  oldHeight = window.innerHeight - TOP_NAVIGATION_HEIGHT;
  canvas.width = oldWidth;
  canvas.height = oldHeight;

  ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = SPECTROGRAM_BACKGROUND;
  ctx.fillRect(0, 0, oldWidth, oldHeight);
};

/**
 * Upon new data, moves the graph to the left and inserts the input on the right side
 */
const addData = ({
  fftManagerHi,
  binSizeHi,
  fftManagerLo,
  binSizeLo,
  newTime,
  sampleRate,
}) => {
  /** How many samples are in one pixel */
  const SPECTROGRAM_SAMPLES_PER_PIXEL = sampleRate / SPECTROGRAM_SPEED;

  const pixelsToMove = Math.floor((newTime - prevTime) / SPECTROGRAM_SAMPLES_PER_PIXEL);
  if (pixelsToMove === 0) return;
  const currentSongs = model.getCurrentSongs();

  //move existing graph to the left
  //getImageData()/putImageData() takes 8-16 ms which is too slow, so we use drawImage() which takes <0.2ms
  ctx.drawImage(ctx.canvas, -pixelsToMove, 0);

  //If user tabbed out and returns, skip older pixels for better performance
  let startPixel = 0;
  if (pixelsToMove > 30) {
    ctx.fillStyle = SPECTROGRAM_BACKGROUND;
    ctx.fillRect(oldWidth - pixelsToMove, 0, pixelsToMove - 20, oldHeight);
    startPixel = pixelsToMove - 20;
    prevTime += startPixel * SPECTROGRAM_SAMPLES_PER_PIXEL;
  }

  for (let i = startPixel; i < pixelsToMove; i += 1) {
    const nearestBuffersHi = fftManagerHi.getNearestBuffers(prevTime, sampleRate);
    const nearestBuffersLo = fftManagerLo.getNearestBuffers(prevTime, sampleRate);

    //add new pixels on the right side based on input data
    for (let j = oldHeight - 1; j >= 0; j -= 1) {
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
      const amplitudeProduct =
        0.15 * amplitudeLo +
        0.05 * amplitudeHi +
        0.8 * ((amplitudeLo + 0.1) * (amplitudeHi + 0.1) - 0.01) / 1.20;

      const jFrac = j / (oldHeight - 1);
      let amplitude;
      if (jFrac >= 0.5) {
        //On 0.5 to 1, use product of low and high
        amplitude = amplitudeProduct;
      } else if (jFrac <= 0.3) {
        //On 0 to 0.3, use high only
        amplitude = amplitudeHi;
      } else {
        //Between 0.3 and 0.5, lerp between both
        const jFracNormalized = (jFrac - 0.3) * 5;
        amplitude = jFracNormalized * amplitudeProduct + (1.0 - jFracNormalized) * amplitudeHi;
      }

      //Adjust volume based on Equal-loudness contour to strengthen mid-range tones
      //Since this reduces the amplitude of most frequency, we multiply by 1.5 to make up for the lost power
      amplitude *= frequencyToVolume(frequency) * 1.5;

      //set background color based on amplitude
      ctx.fillStyle = getViridisColor(amplitude);
      //fill this pixel
      ctx.fillRect(oldWidth - pixelsToMove + i, (oldHeight - 1) - j, 1, 1);
    }

    //Draw beat lines
    for (let j = 0; j < currentSongs.length; j += 1) {
      const song = currentSongs[j];
      //Ignore this song if beats have not yet been detected, or all beat lines were already drawn
      if (song.beats !== undefined && song.beatsPos < song.beats.length) {
        //Check that a beat occurs on this pixel
        const beatTime = song.beats[song.beatsPos];//in seconds
        const beatAbsTime = (song.startTime + beatTime / song.tempoAdjustment) * sampleRate;//in samples
        if (beatAbsTime <= prevTime + SPECTROGRAM_SAMPLES_PER_PIXEL) { //if end of pixel is after this beat
          if (prevTime <= beatAbsTime) { //if beginning of pixel is before this beat
            //If yes, draw a line (white at beginning, red at end of song)
            ctx.fillStyle = (beatTime > 60) ? '#f00' : '#fff';
            ctx.fillRect(oldWidth - pixelsToMove + i, 0, 1, oldHeight);
          }
          //Increase beats position so we know in the next loop we need to check the next beat
          song.beatsPos += 1;
        }
      }
    }

    prevTime += SPECTROGRAM_SAMPLES_PER_PIXEL;
  }
};

/**
 * Gets called whenever the window size has changed, and translates and resizes the currently drawn spectrogram accordingly to match
 */
const resize = () => {
  const newWidth = window.innerWidth;
  const newHeight = window.innerHeight - TOP_NAVIGATION_HEIGHT;
  //Resizing will clear the canvas, so we need to copy the contents before resizing
  //If window width got smaller, we move canvas to the left and truncate leftmost pixels
  const imageData = (newWidth < oldWidth) ?
    ctx.getImageData(oldWidth - newWidth, 0, newWidth, oldHeight) :
    ctx.getImageData(0, 0, oldWidth, oldHeight);

  //resize canvas
  ctx.canvas.width = newWidth;
  ctx.canvas.height = newHeight;
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
};

export default { init, addData, resize };
