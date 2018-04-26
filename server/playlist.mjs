import * as fileManager from './fileManager.mjs';
//import startTempoRecognition from './startTempoRecognition.mjs';
import * as consoleColors from './lib/consoleColors.mjs';
//import * as audioManager from './audioManager.mjs';
import calculateDuration from '../shared/calculateDuration.mjs';
import { analyseSong } from './launchProcessWrapper.mjs';

const SONG_ID_LENGTH = 16;
const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
/** Generates a new random song id */
const generateId = (session) => {
  /** Get a list of previous ids based on current and finished songs */
  const previousIds = new Map([...session.currentSongs, ...session.finishedSongs].map(song => [song.id, true]));

  const innerGenerate = () => {
    let out = '';
    for (let i = 0; i < SONG_ID_LENGTH; i += 1) {
      out += alphabet[Math.floor(Math.random() * alphabet.length)];
    }

    //if song id is already in use, find another one - highly unlikely, that this happens
    if (previousIds.has(out)) return innerGenerate();

    return out;
  };

  return innerGenerate();
};


/**
 * Adds a follow-up song. The follow-up song must be tempo-detected both at beginning and end.
 * If it fails, a different follow-up song is picked.
 * @param session
 */
export async function addFollowUpSong(session) {
  //get random audio file
  const files = fileManager.getFiles(session.collection);
  const randomFile = files[Math.floor(Math.random() * files.length)];

  const id = generateId(session);
  const songWrapper = { id, songRef: randomFile };
  songWrapper.song = analyseSong(session, songWrapper, false);
  console.log(`${consoleColors.magenta(`[${session.sid}]`)} Analysing ${consoleColors.green(songWrapper.songRef.name)}...`);

  //inform client that we are considering this follow-up song - subject to successful tempo detection etc.
  session.emitEvent({
    type: 'NEXT_SONG',
    songName: songWrapper.songRef.name,
  });

  songWrapper.ready = false;
  const previousSongs = session.currentSongs.filter(entry => entry.id !== songWrapper.id);

  //find the song that is right before this one (= song with the highest starting time)
  const previousSong = previousSongs.reduce((accumulator, curSong) => {
    if (curSong.ready === true && curSong.startTime > accumulator.startTime) {
      return curSong;
    } else {
      return accumulator;
    }
  }, { startTime: Number.NEGATIVE_INFINITY });

  songWrapper.song = await songWrapper.song;
  songWrapper.totalLength = await songWrapper.song.duration;

  //do tempo recognition - and only use song if recognition was successful
  try {
    songWrapper.tempo = await songWrapper.song.tempo;
  } catch (error) {
    console.log(`${consoleColors.magenta(`[${session.sid}]`)} Tempo detection failed for ${consoleColors.green(songWrapper.songRef.name)}; skipping this song.`);

    //add another song
    addFollowUpSong(session);

    //stop processing this song
    return;
  }

  //the time in samples at which to start adding this song to the stream
  songWrapper.startTime = previousSong.endTime - 15 * 48000;

  songWrapper.tempoAdjustment = previousSong.tempoAdjustment * previousSong.tempo.bpmEnd / songWrapper.tempo.bpmStart;
  songWrapper.endTime = songWrapper.startTime + calculateDuration(songWrapper.totalLength, songWrapper.tempoAdjustment);

  session.emitEvent({
    type: 'SONG_START',
    id: songWrapper.id,
    songName: songWrapper.songRef.name,
    time: songWrapper.startTime / 48000,
  });
  session.emitEvent({
    type: 'SONG_DURATION',
    id: songWrapper.id,
    origDuration: songWrapper.totalLength,
    tempoAdjustment: songWrapper.tempoAdjustment,
  });

  session.emitEvent({
    type: 'TEMPO_INFO',
    id: songWrapper.id,
    bpmStart: songWrapper.tempo.bpmStart,
    bpmEnd: songWrapper.tempo.bpmEnd,
    beats: songWrapper.tempo.beats,
  });

  //Notify client that waveform data is ready
  await songWrapper.song.thumbnail;
  session.emitEvent({ type: 'THUMBNAIL_READY', id: songWrapper.id });

  session.currentSongs.push(songWrapper);
  console.log(`${consoleColors.magenta(`[${session.sid}]`)} Adding to playlist: ${consoleColors.green(songWrapper.songRef.name)}.`);

  songWrapper.ready = true;
}


/**
 * Adds a first song to the playlist. The first song is only tempo-detected at the end.
 * If tempo detection fails, the first song is quickly stopped and another first song
 * is selected.
 * @param session
 * @param offset
 */
export async function addFirstSong(session, offset = 0) {
  //get random audio file
  const files = fileManager.getFiles(session.collection);
  const randomFile = files[Math.floor(Math.random() * files.length)];

  const id = generateId(session);
  const songWrapper = { id, songRef: randomFile };
  session.currentSongs.push(songWrapper);

  songWrapper.song = analyseSong(session, songWrapper, true);
  console.log(`${consoleColors.magenta(`[${session.sid}]`)} Adding to playlist: ${consoleColors.green(songWrapper.songRef.name)}...`);

  songWrapper.startTime = offset;
  songWrapper.totalLength = 30 * 48000;//we assume the song is at least 30 seconds long, this will be overwritten as soon as we have the correct duration
  songWrapper.endTime = songWrapper.totalLength;//to be overwritten by correct end time later
  songWrapper.tempoAdjustment = 1;//we only change speed of follow-up songs for now. TODO: override this after next song has been analysed for better transition
  session.emitEvent({
    type: 'SONG_START',
    id: songWrapper.id,
    songName: songWrapper.songRef.name,
    time: songWrapper.startTime / 48000,
  });
  songWrapper.ready = false;//we need to store ready state separately since we can't get a promise's state natively
  songWrapper.song = await songWrapper.song;
  songWrapper.totalLength = await songWrapper.song.duration;
  //TODO: we should only send the duration if we are sure we are going to keep this song, or at least allow overriding it
  songWrapper.endTime = songWrapper.startTime + songWrapper.totalLength;
  session.emitEvent({
    type: 'SONG_DURATION',
    id: songWrapper.id,
    origDuration: songWrapper.totalLength,
    tempoAdjustment: songWrapper.tempoAdjustment,
  });

  songWrapper.ready = true;

  try {
    //do tempo recognition - for first song, we do not need to wait until it is done
    songWrapper.tempo = await songWrapper.song.tempo;
  } catch (error) {
    console.log(`${consoleColors.magenta(`[${session.sid}]`)} Tempo detection failed for ${consoleColors.green(songWrapper.songRef.name)}; finding new first song.`);

    //if tempo detection failed, end this song
    songWrapper.endTime = Math.max(songWrapper.startTime, session.encoderPosition) + 5 * 48000;//allow 5 seconds to process next file
    songWrapper.totalLength = songWrapper.endTime - songWrapper.startTime;

    //emit event that duration has changed
    session.emitEvent({
      type: 'SONG_DURATION',
      id: songWrapper.id,
      origDuration: songWrapper.totalLength,
      tempoAdjustment: songWrapper.tempoAdjustment,
    });

    //notify audio buffer that we pick a follow-up song ourselves and don't need audio buffer to do it
    songWrapper.hadTempoFailure = true;

    //select another song
    addFirstSong(session, songWrapper.endTime);
    reject();
    return;
  }

  session.emitEvent({
    type: 'TEMPO_INFO',
    id: songWrapper.id,
    bpmEnd: songWrapper.tempo.bpmEnd,
    beats: songWrapper.tempo.beats,
  });

  //Notify client that waveform data is ready
  await songWrapper.song.thumbnail;
  session.emitEvent({ type: 'THUMBNAIL_READY', id: songWrapper.id });

  setTimeout(addFollowUpSong.bind(null, session), 15000);
}
