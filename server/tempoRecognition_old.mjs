/**
 * The window size. This should be equal to or less than the smallest unit we want to recognize.
 * Anything smaller than 10ms can no longer be distinguished by human listeners.
 * Set to 20ms, which equals a 1/96 note at 120bpm
 */
const WINDOW_SIZE = 960;

/**
 * How far we want to move the window each time. Should be < WINDOW_SIZE, a small overlap improves recognition
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

/** Perform a Short-Time Fourier Transform on the input waveform */
const stft = (waveform) => {
  const out = [];

  //Per the Nyquist–Shannon theorem, we can only do a FFT to half of the sample rate
  const fftSize = waveform.length / 2;

  //for each partial
  for (let i = 0; i < fftSize; i += 1) {
    const frequency = i * 48000 / fftSize;//frequency of this partial in Hertz
    let real = 0;
    let imaginary = 0;

    //for each sample
    for (let j = 0; j < waveform.length; j += 1) {
      real += waveform[j] * Math.cos(Math.TAU * frequency * j);
      imaginary += waveform[j] * Math.sin(Math.TAU * frequency * j);
    }

    const amplitude = Math.sqrt(real * real + imaginary * imaginary);
    const phase = Math.atan2(imaginary, real);

    out.push({ frequency, amplitude, phase });
  }

  return out;
};

/**
 * Process other events before continuing execution,
 * mimicing .NET's System.Windows.Forms.Application.DoEvents()
 * There's probably a better way to do this via iterators/generators or web workers.
*/
const processEvents = () => new Promise(resolve => setTimeout(resolve));

const detectBeats = async (waveform) => {
  const beatData = [];

  //Get window
  let pos = 0;
  let prevFreqData;
  let curFreqData;
  while (pos <= waveform.length) {
    const signalWindow = getWindow(waveform, pos);
    pos += HOP_SIZE;

    //apply a STFT to extract spectral coefficients
    prevFreqData = curFreqData;
    curFreqData = stft(signalWindow);

    //We now have current and previous spectral data, so take derivative and calculate peaks
    if (pos > 0) {
      //take discrete derivative of two consecutive windows (distance measure)
      const derivative = [];
      for (let i = 0; i < curFreqData.length; i += 1) {
        derivative[i] = curFreqData[i].amplitude - prevFreqData[i].amplitude;
        //TODO: we can use a better distance measure than this
      }

      //Sum up all frequencies
      const sum = derivative.reduce((accum, currentValue) => accum + currentValue, 0);
      beatData.push(sum);
    }

    //process other events so we don't block the process
    await processEvents();
  }

  //Remove average
  //...

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

export default detectBeats;
