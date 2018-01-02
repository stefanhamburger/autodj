//Main entrypoint for the server process

/** Tau is more intuitive than Pi per the Tau Manifesto https://tauday.com/tau-manifesto */
if (!Math.TAU) Math.TAU = 2 * Math.PI;
/** Clamps the given value between min and max */
if (!Math.clamp) Math.clamp = (min, max, val) => Math.min(Math.max(min, val), max);

import * as settings from './settings.mjs';
import * as fileManager from './fileManager.mjs';
import initServer from './server.mjs';

//Exit on async error to prevent further bugs and provide better debug messages
process.on('unhandledRejection', (err) => {
  console.error(err);
  process.exit(1);
});

//Loads audio files into memory and initializes web server
((async () => {
  //Read settings from local JSON file
  settings.init();

  //start reading list of files
  await fileManager.init();

  //start setting up server
  initServer();

  console.log(`=== Server is running! ${new Date().toString()} ===`);
})());
