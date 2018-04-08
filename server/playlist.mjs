import * as fileManager from './fileManager.mjs';
//import startTempoRecognition from './startTempoRecognition.mjs';
import * as consoleColors from './lib/consoleColors.mjs';
//import * as audioManager from './audioManager.mjs';
import calculateDuration from '../shared/calculateDuration.mjs';
import analyseSong from './launchProcessWrapper.mjs';

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
 * Pick a random song, start decoding it and add it to the playlist.
 * @param {module:session.Session} session
*/
export default function addFileToStream(session, isFirstSong = false) {
  //get random audio file
  const files = fileManager.getFiles(session.collection);
  const randomFile = files[Math.floor(Math.random() * files.length)];

  const id = generateId(session);
  const songWrapper = { id, songRef: randomFile };
  session.currentSongs.push(songWrapper);
  //audioManager.addReference(randomFile, { sid: session.sid, id });
  songWrapper.song = analyseSong(session, songWrapper.songRef, isFirstSong);
  console.log(`${consoleColors.magenta(`[${session.sid}]`)} Adding to playlist: ${consoleColors.green(songWrapper.songRef.name)}...`);
  //const thumbnailPromise = audioManager.createThumbnail(session, songWrapper);

  //If this is the first song in the stream, start playing immediately without worrying about mixing
  if (isFirstSong === true) {
    songWrapper.startTime = 0;
    songWrapper.totalLength = 30 * 48000;//we assume the song is at least 30 seconds long, this will be overwritten as soon as we have the correct duration
    songWrapper.endTime = songWrapper.totalLength;//to be overwritten by correct end time later
    songWrapper.tempoAdjustment = 1;//we only change speed of follow-up songs for now. TODO: override this after next song has been analysed for better transition
    session.emitEvent({
      type: 'SONG_START',
      id: songWrapper.id,
      songName: songWrapper.songRef.name,
      time: 0,
    });
    songWrapper.ready = false;//we need to store ready state separately since we can't get a promise's state natively
    songWrapper.readyPromise = new Promise(async (resolve) => {
      songWrapper.song = await songWrapper.song;
      songWrapper.totalLength = await songWrapper.song.duration;
      //TODO: we should only send the duration if we are sure we are going to keep this song, or at least allow overriding it
      songWrapper.endTime = songWrapper.startTime + calculateDuration(songWrapper.totalLength, songWrapper.tempoAdjustment);
      session.emitEvent({
        type: 'SONG_DURATION',
        id: songWrapper.id,
        origDuration: songWrapper.totalLength,
        tempoAdjustment: songWrapper.tempoAdjustment,
      });

      //do tempo recognition - for first song, we do not need to wait until it is done
      songWrapper.tempo = await songWrapper.song.tempo;
      /*try {
        await startTempoRecognition(session, songWrapper, true);
      } catch (error) {
        //TODO: tempo recognition failed, we need to immediately switch to another random song
      }*/

      session.emitEvent({
        type: 'TEMPO_INFO',
        id: songWrapper.id,
        bpmEnd: songWrapper.tempo.bpmEnd,
        beats: songWrapper.tempo.beats,
      });

      //Notify client that waveform data is ready
      /*await thumbnailPromise.then(() => {
        session.emitEvent({ type: 'THUMBNAIL_READY', id: songWrapper.id });
      });*/

      resolve();
      songWrapper.ready = true;
    });
  } else { //append new song at the end of the previous song
    //inform client that we are considering this follow-up song - subject to successful tempo detection etc.
    session.emitEvent({
      type: 'NEXT_SONG',
      songName: songWrapper.songRef.name,
    });

    songWrapper.ready = false;
    songWrapper.readyPromise = new Promise(async (resolve) => {
      const previousSongs = session.currentSongs.filter(entry => entry.id !== songWrapper.id);

      //wait until previous songs have finished processing
      await Promise.all(previousSongs.map(entry => entry.readyPromise));

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
      //songWrapper.totalLength = (await audioManager.getDuration(songWrapper.songRef));

      //do tempo recognition - and only use song if recognition was successful
      songWrapper.tempo = await songWrapper.song.tempo;
      /*try {
        await startTempoRecognition(session, songWrapper);
      } catch (error) {
        console.log(`${consoleColors.magenta(`[${session.sid}]`)} Tempo detection failed; skipping ${consoleColors.green(songWrapper.songRef.name)}...`);
        //remove this song and start converting another song
        //audioManager.removeReference(songWrapper.songRef, { sid: session.sid, id: songWrapper.id });
        session.currentSongs.splice(session.currentSongs.findIndex(entry => entry.id === songWrapper.id), 1);
        resolve();
        addFileToStream(session);
        return;
      }*/

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
      /*await thumbnailPromise.then(() => {
        session.emitEvent({ type: 'THUMBNAIL_READY', id: songWrapper.id });
      });*/

      resolve();
      songWrapper.ready = true;

      //As soon as the new tempo is known, we can start converting the audio
      //This way, the app doesn't need to wait when this song starts playing. We don't care about the result though
      //setTimeout(audioManager.getFinalWaveform.bind(null, songWrapper), 5000);
    });
  }
}
