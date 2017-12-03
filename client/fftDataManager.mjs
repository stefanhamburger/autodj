//Keeps track of all Float32Arrays allocated for FFT data, provides access to them and returns them as needed

const fftDataManager = (windowSize) => {
  const fftArrays = [];
  const unusedArrays = [];
  //If we ever cannot find an array, return an array filled with zeros
  const nullArray = new Uint8Array(windowSize);//TODO: need to use Float32Array

  return {
    getNewBuffer(curTime) {
      const curArray = (unusedArrays.length === 0) ? new Uint8Array(windowSize) : unusedArrays.pop();
      fftArrays.push({ time: curTime, data: curArray });
      return curArray;
    },
    getNearestBuffers(requestedTime) {
      //If we have no data, return zero
      if (fftArrays.length === 0) {
        return {
          minWeight: 0.0,
          minArray: nullArray,
          maxWeight: 0.0,
          maxArray: nullArray,
        };
      }

      let indexBeforeTime = -1;
      for (let i = 0, il = fftArrays.length; i < il; i++) {
        if (fftArrays[i].time <= requestedTime) {
          indexBeforeTime = i;
        } else {
          break;
        }
      }

      //If all of our buffers are after the request time, return first buffer in list but scale it down depending on time
      if (indexBeforeTime === -1) {
        //0 if right after request time, 1 if one second or later after requested time
        const weight = Math.min((fftArrays[0].time - requestedTime) / 44100, 1.0);
        return {
          minWeight: weight,
          minArray: nullArray,
          maxWeight: 1.0 - weight,
          maxArray: fftArrays[0].data,
        };
      }

      //If our index is the last in the array, we take it fully
      if (indexBeforeTime === fftArrays.length - 1) {
        return {
          minWeight: 1.0,
          minArray: fftArrays[indexBeforeTime].data,
          maxWeight: 0.0,
          maxArray: nullArray,
        };
      }

      //Otherwise, we can correctly interpolate between two arrays
      //weight is 0 if close to minArray, weight is 1 if close to maxArray
      const weight = (requestedTime - fftArrays[indexBeforeTime].time) / (fftArrays[indexBeforeTime + 1].time - fftArrays[indexBeforeTime].time);
      return {
        minWeight: 1.0 - weight,
        minArray: fftArrays[indexBeforeTime].data,
        maxWeight: weight,
        maxArray: fftArrays[indexBeforeTime + 1].data,
      };
    },
    garbageCollection(curTime) {
      //go through fftArrays, remove all entries where time is more than 3 seconds ago, and move array into unusedArrays
      while (fftArrays[0]) {
        if (curTime - fftArrays[0].time > 3 * 44100) {
          const removedElement = fftArrays.shift();
          unusedArrays.push(removedElement.data);
        } else {
          //If at least one entry is new enough, any follow-up entries will be even newer and can be ignored
          break;
        }
      }
    },
  };
};

export default fftDataManager;
