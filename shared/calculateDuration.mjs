/**
 * Isomorphic function to calculate the new duration after tempo adjustment.
 * This must produce identical results on client- and server-side.
 */
export default (duration, tempoAdjustment) => {
  let out = 0;
  let samplesLeft = duration;

  //process duration in blocks of 4,096 samples
  //TODO: tempo adjustment can vary over time
  while (samplesLeft > 0) {
    const blockSize = Math.min(4096, samplesLeft);
    out += Math.ceil(blockSize / tempoAdjustment);
    samplesLeft -= blockSize;
  }

  return out;
};
