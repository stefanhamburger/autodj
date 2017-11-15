//This file creates a web server for serving the static files in the public/ folder as well as providing endpoints for the APIs

const express = require('express');
const fs = require('fs');
const audioBuffer = require('./audioBuffer.js');
const sessions = require('./sessions.js');
const settings = require('./settings.js');

const app = express();

//all files from the public folder should be sent as root on the webserver
app.use(express.static('public'));

//main HTML
app.get('/', async (req, res) => {
  let output = fs.readFileSync('index.html');
  const collectionsString = Object.keys(settings.get().collections).map(key => '<option select>' + key + '</option>').join('');
  output = output.toString().replace(/__INSERT_COLLECTIONS__/, collectionsString);
  res.send(output);
});

//create a new audio stream
app.get('/init', async (req, res) => {
  const { sid, obj: session } = sessions.newSession();
  session.collection = req.query.collection;
  res.send(JSON.stringify({ sid }));

  audioBuffer.init(session);
});

app.get('/part', (req, res) => {
  const session = sessions.getSession(req.query.sid);
  if (session && req.query.id && req.query.id.match(/[0-9]+/)) {
    sessions.lifeSign(session);
    const clientBufferLength = Number(req.get('X-Playback-Position'));
    res.set('Content-Type', 'audio/webm');
    res.send(audioBuffer.getBufferContents(session, Number.isNaN(clientBufferLength) ? 0 : clientBufferLength));
    //TODO: if length of buffer contents is zero, maybe wait 250ms and try again before sending nothing
  } else {
    res.status(404).send('Session not found');
  }
});

module.exports.init = () => {
  //Only accept connections from localhost on port 3000
  //can be accessed with http://localhost:3000/
  app.listen(3000, '127.0.0.1');
};
