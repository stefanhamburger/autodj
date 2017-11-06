const fileManager = require('./fileManager.js');
const ffmpeg = require('./ffmpeg.js');
const { decodeAudio } = require('./audioDecoder.js');

//number of samples to preload - this controls how fast the server can react to input from the client, so should be kept as small as possible
const PRELOAD_BUFFER_LENGTH = 5 * 48000;
//byte length is 8 bytes per sample (2 channels, Float32 format)
const BYTES_PER_SAMPLE = 8;

const addFileToStream = async (session) => {
    //wait until list of files was loaded
    const files = await fileManager.getFiles();

    const randomFile = files[Math.floor(Math.random() * files.length)];

    const { waveform } = await decodeAudio(randomFile.path);
    session.songs.push(waveform.buffer);
    console.log('[' + session.sid + '] Adding to playlist: ' + randomFile.name + '...');
};

//writes the given number of samples to the FFmpeg input stream to start encoding
const addToBuffer = async (session, numSamples) => {
    let remainingSamples = numSamples;
    //as long as we still need to write bytes to buffer
    while (remainingSamples > 0) {
        //if there is no data to write, skip this loop
        if (session.curSong >= session.songs.length) {
            break;
        }

        //write as many samples as possible from the current song
        //if end of song is reached, remember how many samples are still missing and add them using the follow-up song
        const remainingSongLength = session.songs[session.curSong].byteLength / BYTES_PER_SAMPLE - session.curSongPosition;
        const numSamplesToWrite = Math.min(remainingSamples, remainingSongLength);
        session.inputStream.write(Buffer.from(session.songs[session.curSong], session.curSongPosition * BYTES_PER_SAMPLE, numSamplesToWrite * BYTES_PER_SAMPLE));
        session.curSongPosition += numSamplesToWrite;
        remainingSamples -= numSamplesToWrite;

        if (session.curSongPosition >= session.songs[session.curSong].byteLength / BYTES_PER_SAMPLE) {
            session.curSong++;
            session.curSongPosition = 0;
        }
    }

    //if we need more waveform data, add another song (by starting to decoding it into waveform data)
    if (session.curSong >= session.songs.length - 1) {
        //TODO: if we already started decoding a song, this might add another song, leading to a race condition.
        //      Therefore, only add file if there isn't a add file operation already runnign
        await addFileToStream(session);
        if (remainingSamples > 0) {
            addToBuffer(session, remainingSamples);
        }
    }
};

//initializes audio buffer
module.exports.init = async (session) => {
    //create new FFmpeg process
    const { inputStream, getOutputBuffer, killCommand } = ffmpeg.createNewInstance();
    session.inputStream = inputStream;
    session.getOutputBuffer = getOutputBuffer;
    session.killCommand = killCommand;

    //initialize session data
    session.clientBufferLength = 0;//the playback position of the client (in seconds)
    session.songs = [];//the list of songs, given by their waveform data
    session.curSong = 0;//which song from the list is currently playing
    session.curSongPosition = 0;//the current position in the current song (given as sample index)

    await addFileToStream(session);
    //fill buffer with 10 seconds of audio
    addToBuffer(session, PRELOAD_BUFFER_LENGTH);
};

//write output if requested
module.exports.getBufferContents = (session, newBufferLength) => {
    if (newBufferLength > 0) {
        const prevLength = session.clientBufferLength;
        addToBuffer(session, Math.ceil((newBufferLength - prevLength) * 48000));
        session.clientBufferLength = newBufferLength;
    }

    //send as many bytes as there in session.ffmpegData since last output position
    const out = Buffer.concat(session.getOutputBuffer());
    return out;
};
