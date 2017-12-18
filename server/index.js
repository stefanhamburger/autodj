/** Tau is more intuitive than Pi per the Tau Manifesto */
if (!Math.TAU) Math.TAU = 2 * Math.PI;

//Main entrypoint for this program
const settings = require('./settings.js');
const fileManager = require('./fileManager.js');
const server = require('./server.js');

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
  server.init();

  console.log(`=== Server is running! ${new Date().toString()} ===`);
})());
