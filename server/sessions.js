/** @module session */

const sessions = {};

/**
 * @typedef {Object} module:session.Session
 * @property {string} sid - session id
 */

/**
 * after how much time a session times out (because we haven't received any more client requests for it)
 * This will free up resources and kill the FFmpeg process. Set to 5 minutes.
 */
const SESSION_TIMEOUT = 1 * 15000;
/** length of the session id. Doesn't need to be too long for our use case */
const SESSION_ID_LENGTH = 16;

const hex = '0123456789abcdefghijklmnopqrstuvwxyz';
/** generates a new random session id */
const generateSID = () => {
  let out = '';
  for (let i = 0; i < SESSION_ID_LENGTH; i += 1) {
    out += hex[Math.floor(Math.random() * hex.length)];
  }

  //if session id is already in use, find another one - highly unlikely, that this happens
  if (sessions[out] !== undefined) return generateSID();

  return out;
};

/**
 * Indicates that the given session is still active and should not be deleted
 * By default, sessions are automatically deleted after SESSION_TIMEOUT to free up memory
 * @param {*} session - The session we want to extend
 */
module.exports.lifeSign = (session) => {
  clearTimeout(session.timeout);
  const { sid } = session;
  session.timeout = setTimeout(() => {
    console.log(`[${sid}] Session timed out.`);
    session.killCommand();
    delete sessions[sid];
  }, SESSION_TIMEOUT);
};

/**
 * Creates a new session
 * @returns {module:session.Session}
 */
module.exports.newSession = () => {
  const sid = generateSID();
  const session = { sid };
  session.events = [];
  session.emitEvent = event => session.events.push(event);
  session.flushEvents = () => {
    const eventsCopy = session.events.slice();
    session.events = [];
    return eventsCopy;
  };

  sessions[sid] = session;
  module.exports.lifeSign(session);
  console.log(`[${sid}] Starting new session...`);

  return { sid, obj: session };
};

/**
 * Gets a session with the given session id
 * @param {string} sid - The id of the requested session
 */
module.exports.getSession = sid => sessions[sid];
