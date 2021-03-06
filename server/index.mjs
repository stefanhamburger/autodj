//Main entrypoint for the server process

import './lib/mathExtensions.mjs';//import statements must be at the top, so define Math functions in a separate file
import * as settings from './settings.mjs';
import * as fileManager from './fileManager.mjs';
import initServer from './server.mjs';
import * as consoleColors from './lib/consoleColors.mjs';

//Exit on async error to prevent further bugs and provide better debug messages
process.on('unhandledRejection', (err) => {
  console.error('Exiting due to unhandledRejection error:', err);
  process.exit(1);
});
//Report all errors on error console. For some reason, a crash was not reported. Possibly related to experimental ES modules
process.on('uncaughtException', (err) => {
  console.error('Exiting due to uncaughtException error:', err);
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

  console.log(consoleColors.cyan(`=== Server is running! ${new Date().toString()} ===`));
})());
