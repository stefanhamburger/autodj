const sessions = {};

//after how much time a session times out (because we haven't received any more client requests for it)
//this will free up resources and kill the FFmpeg process. Set to 5 minutes.
const SESSION_TIMEOUT = 5 * 60000;
//length of the session id. Doesn't need to be too long for our use case
const SESSION_ID_LENGTH = 16;

const hex = '0123456789abcdefghijklmnopqrstuvwxyz';
const generateSID = () => {
    let out = '';
    for (let i = 0; i < SESSION_ID_LENGTH; i++) {
        out += hex[Math.floor(Math.random() * hex.length)];
    }

    //if session id is already in use, find another one - highly unlikely, that this happens
    if (sessions[out] !== undefined) return generateSID();

    return out;
};

//set timeout when session obj is deleted to free up memory
//any further attempt to access the session will reset the timeout timer
module.exports.lifeSign = (session) => {
    clearTimeout(session.timeout);
    const { sid } = session;
    session.timeout = setTimeout(() => {
        console.log('[' + sid + '] Session timed out.');
        session.killCommand();
        delete sessions[sid];
    }, SESSION_TIMEOUT);
};

module.exports.newSession = () => {
    const sid = generateSID();
    const sessionObj = { sid };
    sessions[sid] = sessionObj;
    module.exports.lifeSign(sessionObj);
    console.log('[' + sid + '] Starting new session...');

    return { sid, obj: sessionObj };
};

module.exports.getSession = sid => sessions[sid];
