/**
 * Function to convert timing values from after tempo adjustment to before tempo adjustment
 */

/**
 * We are provided with the timing values of the piece (offset and length in samples) post-tempo adjustment.
 * We need to figure out the timing before tempo adjustment to know which 4,096 sample blocks to use for tempo adjustment.
 * @param offset - offset of the requested piece into the song, given in samples after tempo adjustment
 * @param length - length of the requested piece, given in samples after tempo adjustment
 * @param tempoChange - amount of tempo change, e.g. 1.2 for +20% speedup
 */
export default function calculateTiming(offset, length, tempoChange) {
  let startingSample = 0 * 4096;//at which sample (rounded to blocks of 4,096 samples) the piece starts in the original audio (before tempo adjustment)
  let endingSample = 0 * 4096;//at which sample (rounded to blocks of 4,096 samples) the piece ends in the original audio (before tempo adjustment)
  let offsetAfterAdj = 0;//how many samples into the first block the piece starts (after tempo adjustment)

  let posBeforeAdj = 0;//the current position in the original song (before tempo adjustment)
  let posAfterAdj = 0;//the current position in the converted song (after tempo adjustment)
  let startNotYetFound = true;

  //iterate through song in blocks of 4,096 samples
  //TODO: tempo adjustment can vary over time
  while (posAfterAdj < offset + length) {
    //calculate size of this block after tempo adjustment
    const blockSize = Math.ceil(4096 / tempoChange);

    //if we reached the start of the piece, save position to output
    if (startNotYetFound && posAfterAdj + blockSize >= offset) {
      startNotYetFound = false;
      //set startingSample
      startingSample = posBeforeAdj;
      //set offsetAfterAdj
      offsetAfterAdj = offset - posAfterAdj;
    }
    //adjust position
    posBeforeAdj += 4096;
    posAfterAdj += blockSize;
  }

  //set endingSample
  endingSample = posBeforeAdj;

  return { startingSample, endingSample, offsetAfterAdj };
}
