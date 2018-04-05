/**
 * Function to convert timing values from after tempo adjustment to before tempo adjustment
 */

//We are provided with the timing values (offset and length) post-tempo adjustment.
//We need to figure out the timing before tempo adjustment to know which part to tempo adjust.
export default function calculateTiming(offset, length, tempoChange) {
  let startingSample = 0 * 4096;//at which sample (rounded to blocks of 4,096 samples) the piece starts in the original audio (before tempo adjustment)
  let endingSample = 0 * 4096;//length of the piece before tempo adjustment (rounded to blocks of 4,096 samples)
  let offsetAfterAdj = 0;//how many samples into the first block the piece starts (after tempo adjustment)

  let posBeforeAdj = 0;
  let posAfterAdj = 0;
  let startNotYetFound = true;

  //process duration in blocks of 4,096 samples
  //TODO: tempo adjustment can vary over time
  while (posAfterAdj < offset + length) {
    //calculate size of block after tempo adjustment
    const blockSize = Math.ceil(4096 / tempoChange);

    //if we reached the start of the song, save position to output
    if (startNotYetFound && posAfterAdj + blockSize < offset) {
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
  endingSample = posAfterAdj;

  return { startingSample, endingSample, offsetAfterAdj };
}
