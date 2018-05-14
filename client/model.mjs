import view from './view/view.mjs';

const externals = {};
const songPlaylist = [];
const upcomingSongs = [];
const currentSongs = [];

const init = (sidIn) => {
  //session id as fetched in init.js
  externals.sid = sidIn;
  //whether to skip a song: don't skip if false, otherwise skip the song with the given id
  externals.skipSong = false;
};

const processEvents = events => events && events.forEach(async (event) => {
  switch (event.type) {
    case 'SONG_START': {
      const song = {
        id: event.id,
        name: event.songName,
        startTime: event.time / 48000, //given in seconds
        origDuration: 0,
        canSkip: false,
      };
      songPlaylist.push(song);
      upcomingSongs.push(song);
      break;
    }
    case 'SONG_DURATION': {
      songPlaylist.filter(song => song.id === event.id).forEach((song) => {
        song.origDuration = event.origDuration;//in samples
        song.startTime = event.startTime / 48000;//in seconds
        song.endTime = event.endTime / 48000;//in seconds
        song.playbackData = event.playbackData.map(entry => ({ ...entry, realTimeStart: entry.realTimeStart / 48000, realTimeLength: entry.realTimeLength / 48000 }));
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
    case 'CAN_SKIP': {
      const { id } = event;
      songPlaylist.filter(song => song.id === id).forEach((song) => {
        song.canSkip = true;
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
    if (time >= song.startTime && song.origDuration > 0) {
      upcomingSongs.splice(i, 1);
      currentSongs.push(song);
    }
  }

  //Remove all songs from currentSongs that have finished playing
  for (let i = currentSongs.length - 1; i >= 0; i -= 1) {
    const song = currentSongs[i];
    if (time > song.endTime) {
      currentSongs.splice(i, 1);
    }
  }

  //Send currently playing songs to view
  view.updateSongs(time, currentSongs);
};

const getCurrentSongs = () => currentSongs;

const getSkipSong = () => externals.skipSong;
const setSkipSong = (newSkipSong) => {
  externals.skipSong = newSkipSong;
  //We have skipped this song, so disable skipping so user won't skip it a second time
  if (newSkipSong !== false) {
    songPlaylist.filter(song => song.id === newSkipSong).forEach((song) => {
      song.canSkip = false;
    });
  }
};

export default {
  init,
  processEvents,
  heartbeat,
  getCurrentSongs,
  getSkipSong,
  setSkipSong,
};
