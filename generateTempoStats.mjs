import Worker from 'tiny-worker';
import * as settings from './server/settings.mjs';
import * as fileManager from './server/fileManager.mjs';
import decodeAudio from './server/ffmpegDecoder.mjs';

/** Number of songs to process in parallel. Tune this for performance. Should not be higher than number of CPU cores. */
const MAX_PARALLEL_TASKS = 4;
const ThreadPool = ((() => {
  let numTasks = 0;
  const queue = [];
  return {
    prepareTask: () => new Promise((resolve) => {
      const callback = () => {
        numTasks += 1;
        resolve();
      };
      if (numTasks < MAX_PARALLEL_TASKS) {
        callback();
      } else {
        queue.push(callback);
      }
    }),
    taskDone: () => {
      numTasks -= 1;
      if (queue.length > 0) {
        const firstEntry = queue.shift();
        firstEntry();
      }
    },
  };
})());


function getTempo({ waveform }) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('server/worker/tempoRecognition.mjs');

    worker.onmessage = (msg) => {
      worker.terminate();
      resolve(msg.data);
    };
    worker.onerror = (error) => {
      reject(error);
    };

    //send number of samples
    worker.postMessage(waveform.length);

    //to prevent Node from blocking and using too much RAM, send waveform in blocks of 48k samples
    let pos = 0;
    const sendNextSamples = () => {
      worker.postMessage(Array.from(waveform.slice(pos, pos + 48000)));
      pos += 48000;
      if (pos < waveform.length) {
        setTimeout(sendNextSamples);
      }
    };
    sendNextSamples();
  });
}


((async () => {
  //Read settings from local JSON file
  settings.init();

  //start reading list of files
  await fileManager.init();

  const collection = process.env.COLLECTION;
  const files = fileManager.getFiles(collection);
  if (!files) {
    console.error(`Error: Music collection "${collection}" not found.`);
    process.exit(1);
  }

  console.log(`Starting analysis of ${files.length} files...`);
  await Promise.all(files.map(async (file) => {
    await ThreadPool.prepareTask();
    const buffer = await decodeAudio(file.path);
    const floatArray = new Float32Array(buffer);
    try {
      const tempo = await getTempo({ waveform: floatArray });
      console.log(`Song "${file.name}" has ${tempo} bpm`);
    } catch (error) {
      console.log(`Song "${file.name}" failed; worker crashed`);
    }
    ThreadPool.taskDone();
  }));
})());
