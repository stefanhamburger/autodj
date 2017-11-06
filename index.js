//Main entrypoint for this program
//Loads audio files into memory and initializes web server
require('./fileManager.js');//start reading list of files
require('./server.js');//start setting up server

console.log('Server is running!');
