/**
 * Starts creating waveform for the given song. Upon completion, emit event to client.
 * We can't send the whole waveform as an event (too large for HTTP headers);
 * Instead we'll just notify the client and offer a separate endpoint for the client to fetch waveform.
*/
const THUMBNAIL_WIDTH = 600;

export default async function createThumbnail(waveform) {
  //prepare output arrays, containing minimum and maximum waveform data per pixel
  const outMax = new Float32Array(THUMBNAIL_WIDTH);
  const outMin = new Float32Array(THUMBNAIL_WIDTH);
  for (let i = 0; i < THUMBNAIL_WIDTH; i += 1) {
    outMax[i] = Number.NEGATIVE_INFINITY;
    outMin[i] = Number.POSITIVE_INFINITY;
  }

  //How many samples are contained in one pixel
  const samplesPerPixel = waveform.length / 2 / THUMBNAIL_WIDTH;

  //Go through the waveform data, consuming two frames at once since waveform is always stereo interleaved
  for (let i = 0, il = waveform.length; i < il; i += 2) {
    //Calculate which bin this sample belongs into, and insert if needed
    //Ideally, we would blend samples into nearby pixels for anti-aliasing, but for our use case this may be overkill
    const value = (waveform[i] + waveform[i + 1]) / 2;
    const binIndex = Math.floor(i / 2 / samplesPerPixel);
    if (value > outMax[binIndex]) outMax[binIndex] = value;
    if (value < outMin[binIndex]) outMin[binIndex] = value;
  }

  const out = new Float32Array(2 * THUMBNAIL_WIDTH);
  out.set(outMin);
  out.set(outMax, THUMBNAIL_WIDTH);

  return out;
}