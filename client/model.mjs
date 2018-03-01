const externals = {};
const songPlaylist = [];
const upcomingSongs = [];
const currentSongs = [];

const init = (setSongIn, setUpcomingIn, sidIn) => {
  //reference to view.setSong()
  externals.setSong = setSongIn;

  //reference to view.setUpcoming()
  externals.setUpcoming = setUpcomingIn;

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
      };
      songPlaylist.push(song);
      upcomingSongs.push(song);
      break;
    }
    case 'SONG_DURATION': {
      const { id, duration } = event;
      songPlaylist.filter(song => song.id === id).forEach((song) => {
        song.duration = duration;//given in samples
        externals.setSong();
      });
      break;
    }
    case 'TEMPO_INFO_START': {
      const { id } = event;
      let { bpm } = event;
      if (bpm === undefined) bpm = 0;
      songPlaylist.filter(song => song.id === id).forEach((song) => {
        song.bpmStart = bpm;
        externals.setSong();
      });
      break;
    }
    case 'TEMPO_INFO_END': {
      const { id } = event;
      let { bpm } = event;
      if (bpm === undefined) bpm = 0;
      songPlaylist.filter(song => song.id === id).forEach((song) => {
        song.bpmEnd = bpm;
        externals.setSong();
      });
      break;
    }
    case 'TEMPO_BEATS': {
      const { id, beats } = event;
      songPlaylist.filter(song => song.id === id).forEach((song) => {
        song.beats = beats;
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
        externals.setSong();
      });
      break;
    }
    case 'NEXT_SONG': {
      const { songName } = event;
      externals.setUpcoming(songName);
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
    if (song.duration !== undefined && time > song.startTime + song.duration / 48000) {
      currentSongs.splice(i, 1);
    }
  }

  //Send currently playing songs to view
  externals.setSong(currentSongs);
};

export default {
  init,
  processEvents,
  heartbeat,
};
