import * as consoleColors from './lib/consoleColors.mjs';
import fixPlaybackData from './lib/fixPlaybackData.mjs';

const sessions = {};

/**
 * @typedef {Object} Session
 * @property {string} sid - session id
 */

/**
 * After how many milliseconds a session times out (because we haven't received any more client requests for it).
 * This will free up resources and kill the FFmpeg process. Set to 15 seconds.
 */
const SESSION_TIMEOUT = 15000;
/** length of the session id. Doesn't need to be too long for our use case */
const SESSION_ID_LENGTH = 16;

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
/** Generates a new random session id */
const generateSID = () => {
  let out = '';
  for (let i = 0; i < SESSION_ID_LENGTH; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  //if session id is already in use, find another one - highly unlikely, that this happens
  if (sessions[out] !== undefined) return generateSID();

  return out;
};


/** Closes the given session and cleans up memory. */
const killSession = (session) => {
  console.log(`${consoleColors.magenta(`[${session.sid}]`)} Session timed out.`);
  session.killCommand();
  delete sessions[session.sid];
};


/**
 * Indicates that the given session is still active and should not be deleted
 * By default, sessions are automatically deleted after SESSION_TIMEOUT to free up memory
 * @param {Session} session - The session we want to extend
 */
export const lifeSign = (session) => {
  clearTimeout(session.timeout);
  session.timeout = setTimeout(() => {
    session.kill();
  }, SESSION_TIMEOUT);
};


/**
 * Creates a new session
 * @returns {Session}
 */
export const newSession = () => {
  const sid = generateSID();
  /** @type {Session} */
  const session = { sid };
  session.kill = killSession.bind(null, session);

  //Event manager - stores events emitted by server and sends them to client when requested
  session.events = [];
  session.emitEvent = event => session.events.push(event);
  session.flushEvents = () => {
    const eventsCopy = session.events.slice();
    session.events = [];
    return eventsCopy;
  };

  //Skips the song with the given id
  session.skipSong = (songId) => {
    session.currentSongs.filter(song => song.id === songId).forEach((songWrapper) => {
      console.log(`${consoleColors.magenta(`[${session.sid}]`)} Skipping song ${consoleColors.green(songWrapper.songRef.name)}!`);
      //Assuming that playbackData has only one entry
      const firstEntry = songWrapper.playbackData[0];
      //reduce first entry to end within 3 seconds
      firstEntry.sampleLength = (session.encoderPosition - firstEntry.realTimeStart + 3 * 48000) * firstEntry.tempoAdjustment;

      //add another entry to cover the end of the song, where the mixing occurs
      const newEntry = {
        sampleOffset: songWrapper.totalSampleLength - 20 * 48000,
        sampleLength: 20 * 48000,
        tempoAdjustment: firstEntry.tempoAdjustment,
      };
      songWrapper.playbackData.push(newEntry);
      fixPlaybackData(songWrapper);

      //TODO: also need to change start time of follow-up song
    });
  };

  //Do a sanity check on the client-provided audio playback time, and fix it if necessary. (clientTime is given in seconds)
  //Otherwise, clients can overlad the server by quickly seeking to a later time and forcing the server to process new songs
  //If the client is running out of buffer and lagging behind (e.g. due to network latency), this function has no effect
  session.prevTime = new Date() / 1000 - 0;
  session.verifyClientTime = (clientTime) => {
    const newDelta = new Date() / 1000 - clientTime;
    //We allow up to 3 seconds of seeking into the future.
    //Anything above that gets clipped to how much time has elapsed on the server since the last signal
    if (session.prevTime - newDelta > 3) {
      console.error(`${consoleColors.magenta(`[${session.sid}]`)} Caught possible denial of service with elapsed playtime: ${Math.abs(newDelta - session.prevTime)}.`);
      return new Date() / 1000 - session.prevTime;
    } else {
      session.prevTime = newDelta;
      return clientTime;
    }
  };

  sessions[sid] = session;
  lifeSign(session);
  console.log(`${consoleColors.magenta(`[${sid}]`)} Starting new session...`);

  return { sid, obj: session };
};


/**
 * Gets a session with the given session id
 * @param {string} sid - The id of the requested session
 */
export const getSession = sid => sessions[sid];
