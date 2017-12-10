/** Tau is more intuitive than Pi per the Tau Manifesto */
if (!Math.TAU) Math.TAU = 2 * Math.PI;

/**
 * The window size. This should be equal to or less than the smallest unit we want to recognize.
 * Anything smaller than 10ms can no longer be distinguished by human listeners.
 * Set to 20ms, which equals a 1/96 note at 120bpm
 */
const WINDOW_SIZE = 960;

/**
 * How far we want to move the window each time. Should be <= WINDOW_SIZE, a small overlap improves recognition
*/
const HOP_SIZE = 480;

/**
 * The window function we apply to the waveform data to amplify sounds at the center of the window, while reducing beginning and end
*/
const BLACKMAN_WINDOW = new Float32Array(WINDOW_SIZE);
{
  const a = 0.16;
  const a0 = (1 - a) / 2;
  const a1 = 0.5;
  const a2 = a / 2;
  const w = n => a0 - a1 * Math.cos(Math.TAU * n / (WINDOW_SIZE - 1)) + a2 * Math.cos(2 * Math.TAU * n / (WINDOW_SIZE - 1));
  for (let i = 0; i < WINDOW_SIZE; i += 1) {
    BLACKMAN_WINDOW[i] = w(i);
  }
}

/** Extract a window from the waveform signal */
const getWindow = (waveform, position) => {
  const buffer = new Float32Array(WINDOW_SIZE);
  for (let i = 0; i < WINDOW_SIZE; i += 1) {
    const index = position - (WINDOW_SIZE / 2) + i;
    if (index < 0 || index >= waveform.length) {
      //use 0 if outside of waveform bounds
      buffer[i] = 0;
    } else {
      //apply Blackman window function
      buffer[i] = waveform[index] * BLACKMAN_WINDOW[i];
    }
  }
  return buffer;
};

/**
 * Process other events before continuing execution,
 * mimicing .NET's System.Windows.Forms.Application.DoEvents()
 * There's probably a better way to do this via iterators/generators or web workers.
*/
const processEvents = () => new Promise(resolve => setTimeout(resolve));

const detectBeats = async (waveform) => {
  //Get window
  let pos = 0;
  while (pos <= waveform.length) {
    const signalWindow = getWindow(waveform, pos);
    pos += HOP_SIZE;

    //apply a STFT to extract spectral coefficients
    //...

    //We now have current and previous spectral data, so take derivative and calculate peaks
    if (pos > 0) {
      //take discrete derivative of two consecutive windows (distance measure)
      //...

      //Sum up all frequencies
      //...

      //Remove average
      //...
    }

    //process other events so we don't block the process
    await processEvents();
  }

  //Detect peaks
  //...

  //Return peaks - TODO
  return [
    { time: 7.6, strength: 0.8 },
    { time: 8.5, strength: 0.6 },
    { time: 9.4, strength: 0.9 },
    { time: 10.3, strength: 0.7 },
  ];
};

module.exports.detectBeats = detectBeats;
