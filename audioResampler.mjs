import { getChannel } from './waveformWrapper.mjs';

//Resamples a waveform from 44,100 Hz to 48,000 Hz. Uses linear interpolation, which doesn't produce good results so we should eventually replace it.
//TODO: we can use a better algorithm, see e.g. http://www.univie.ac.at/nuhag-php/bibtex/open_files/falara00_kannan%20rajamani.pdf
//      and tutorials on https://dspguru.com/dsp/faqs/ and External links on https://en.wikipedia.org/wiki/Sample-rate_conversion
const resampleChannel = (origChannel, resampledChannel) => {
  let posOriginal = 0;//sample position in the original buffer (44,100 sample rate)
  let posResampled = 0;//sample position in the resampled buffer (48,000 sample rate)
  while (posResampled < resampledChannel.length) {
    //the lowest common denominator of 44,100 / 48,000 is 147 / 160.
    for (let i = 0; i < 160; i++) {
      const firstIndex = posOriginal + Math.floor(i * 147 / 160);
      const firstWeight = 1 - ((i * 147 / 160) % 1);
      resampledChannel.set(posResampled + i, firstWeight * origChannel.get(firstIndex) + (1.0 - firstWeight) * origChannel.get(firstIndex + 1));
    }
    posOriginal += 147;
    posResampled += 160;
  }
};

export const resample = (waveformBuffer, leftChannel, rightChannel) => {
  const resampledLength = Math.ceil(waveformBuffer.length / 2 * 160 / 147) * 2;
  const resampledBuffer = new Float32Array(resampledLength);
  const resampledLeft = getChannel({ waveform: resampledBuffer, curChannel: 0 });
  const resampledRight = getChannel({ waveform: resampledBuffer, curChannel: 1 });
  resampleChannel(leftChannel, resampledLeft);
  resampleChannel(rightChannel, resampledRight);
  return resampledBuffer;
};
