import view from './view/view.mjs';
import calculateDuration from '../shared/calculateDuration.mjs';

const externals = {};
const songPlaylist = [];
const upcomingSongs = [];
const currentSongs = [];

const init = (sidIn) => {
  //session id as fetched in init.js
  externals.sid = sidIn;
};

const processEvents = events => events && events.forEach(async (event) => {
  switch (event.type) {
    case 'SONG_START': {
      const song = {
        id: event.id,
        name: event.songName,
        startTime: event.time, //given in seconds
        duration: 0,
      };
      songPlaylist.push(song);
      upcomingSongs.push(song);
      break;
    }
    case 'SONG_DURATION': {
      songPlaylist.filter(song => song.id === event.id).forEach((song) => {
        //Original duration is given in samples. Need to apply tempo adjustment to get actual duration
        song.duration = calculateDuration(event.origDuration, 1.1);
        song.endTime = song.startTime + song.duration / 48000;
        song.tempoAdjustment = event.tempoAdjustment;
      });
      break;
    }
    case 'TEMPO_INFO': {
      const { id } = event;
      songPlaylist.filter(song => song.id === id).forEach((song) => {
        song.bpmStart = event.bpmStart;
        song.bpmEnd = event.bpmEnd;
        song.beats = event.beats;
        song.beatsPos = 0;
      });
      break;
    }
    case 'THUMBNAIL_READY': {
      const { id } = event;
      const thumbnailResult = await fetch(`thumbnail?sid=${externals.sid}&song=${id}`, { cache: 'no-store' });
      const thumbnailBuffer = await thumbnailResult.arrayBuffer();
      const thumbnailMin = new Float32Array(thumbnailBuffer, 0, 600);
      const thumbnailMax = new Float32Array(thumbnailBuffer, 600 * 4);
      songPlaylist.filter(song => song.id === id).forEach((song) => {
        song.thumbnailMin = thumbnailMin;
        song.thumbnailMax = thumbnailMax;
      });
      break;
    }
    case 'NEXT_SONG': {
      const { songName } = event;
      view.setUpcoming(songName);
      break;
    }
    default:
      console.error('Metadata event not recognized', event);
  }
});

const heartbeat = (time) => {
  //Move all songs that have started playing from upcomingSongs to currentSongs
  for (let i = upcomingSongs.length - 1; i >= 0; i -= 1) {
    const song = upcomingSongs[i];
    if (time >= song.startTime) {
      upcomingSongs.splice(i, 1);
      currentSongs.push(song);
    }
  }

  //Remove all songs from currentSongs that have finished playing
  for (let i = currentSongs.length - 1; i >= 0; i -= 1) {
    const song = currentSongs[i];
    if (song.duration !== undefined && time > song.endTime) {
      currentSongs.splice(i, 1);
    }
  }

  //Send currently playing songs to view
  view.updateSongs(time, currentSongs);
};

const getCurrentSongs = () => currentSongs;

export default {
  init,
  processEvents,
  heartbeat,
  getCurrentSongs,
};
