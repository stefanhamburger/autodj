//This file creates a web server for serving the static files in the public/ folder as well as providing endpoints for the APIs

import express from 'express';
import fs from 'fs';
import * as audioBuffer from './audioBuffer.mjs';
import * as audioManager from './audioManager.mjs';
import * as sessions from './sessions.mjs';
import { get as getSettings } from './settings.mjs';

const app = express();

//all files from the public folder should be sent as root on the webserver
app.use(express.static('public'));


//main HTML
app.get('/', (req, res) => {
  let output = fs.readFileSync('./index.html');
  const collectionsString = Object.keys(getSettings().collections).map(key => `<option>${key}</option>`).join('');
  output = output.toString().replace(/__INSERT_COLLECTIONS__/, collectionsString);
  res.send(output);
});


/** Create a new audio stream */
app.get('/init', (req, res) => {
  const { sid, obj: session } = sessions.newSession();
  let numChannels = Number(req.query.numChannels);
  if (!Number.isInteger(numChannels)) numChannels = 2;
  session.numChannels = Math.min(2, Math.max(1, numChannels));
  session.collection = req.query.collection;
  res.send(JSON.stringify({ sid }));

  audioBuffer.init(session);
});


/** Send a part of the audio buffer to MSE */
app.get('/part', (req, res) => {
  const session = sessions.getSession(req.query.sid);
  if (session && req.query.id && req.query.id.match(/[0-9]+/)) {
    sessions.lifeSign(session);
    let clientBufferLength = Number(req.get('X-Playback-Position'));
    clientBufferLength = Number.isNaN(clientBufferLength) ? 0 : clientBufferLength;
    clientBufferLength = session.verifyClientTime(clientBufferLength);
    res.set('Content-Type', 'audio/webm');

    //Get metadata
    const metadata = session.flushEvents();
    res.set('X-Metadata', encodeURI(JSON.stringify(metadata)));

    //send as many bytes as there in session.ffmpegData since last output position
    const ffmpegBuffer = session.getEncoderOutput();
    res.send(Buffer.concat(ffmpegBuffer.buffer, ffmpegBuffer.length));
    //TODO: if length of buffer contents is zero, maybe wait 250ms and try again before sending nothing

    //start converting more audio so that it's ready when the next request arrives
    audioBuffer.scheduleNewAudio(session, clientBufferLength);
  } else {
    res.status(404).send('Session not found');
  }
});


/** Send thumbnail of the waveform data */
app.get('/thumbnail', (req, res) => {
  const { sid, song } = req.query;
  try {
    res.send(Buffer.from(audioManager.getThumbnail(sid, song).buffer));
  } catch (error) {
    res.status(404).end();
  }
});


export default function () {
  //Only accept connections from localhost on port 3000
  //can be accessed with http://localhost:3000/
  app.listen(3000, '127.0.0.1');
}
