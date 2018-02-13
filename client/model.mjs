const songPlaylist = [];
let setSong;
let sid;

const init = (setSongIn, sidIn) => {
  //reference to view.setSong()
  setSong = setSongIn;

  //session id as fetched in init.js
  sid = sidIn;
};

const processEvents = events => events && events.forEach(async (event) => {
  switch (event.type) {
    case 'SONG_START':
      songPlaylist.push({ id: event.id, name: event.songName, startTime: event.time });
      break;
    case 'SONG_DURATION': {
      const { id, duration } = event;
      songPlaylist.filter(song => song.id === id).forEach((song) => {
        song.duration = duration;
        setSong();
      });
      break;
    }
    case 'TEMPO_INFO_START': {
      const { id } = event;
      let { bpm } = event;
      if (bpm === undefined) bpm = 0;
      songPlaylist.filter(song => song.id === id).forEach((song) => {
        song.bpmStart = bpm;
        setSong();
      });
      break;
    }
    case 'TEMPO_INFO_END': {
      const { id } = event;
      let { bpm } = event;
      if (bpm === undefined) bpm = 0;
      songPlaylist.filter(song => song.id === id).forEach((song) => {
        song.bpmEnd = bpm;
        setSong();
      });
      break;
    }
    case 'THUMBNAIL_READY': {
      const { id } = event;
      const thumbnailResult = await fetch(`thumbnail?sid=${sid}&song=${id}`, { cache: 'no-store' });
      const thumbnailBuffer = await thumbnailResult.arrayBuffer();
      const thumbnailMin = new Float32Array(thumbnailBuffer, 0, 600);
      const thumbnailMax = new Float32Array(thumbnailBuffer, 600 * 4);
      songPlaylist.filter(song => song.id === id).forEach((song) => {
        song.thumbnailMin = thumbnailMin;
        song.thumbnailMax = thumbnailMax;
        setSong();
      });
      break;
    }
    default:
      console.error('Metadata event not recognized', event);
  }
});

const heartbeat = (time) => {
  //Find the current song by looking at the last song that is still being played in the present time
  for (let i = songPlaylist.length - 1; i >= 0; i -= 1) {
    const song = songPlaylist[i];
    if (song.startTime <= time) {
      setSong(song.id);
      break;
    }
  }
};

/** Get state information about the current song, or default values if song was not found. */
const getSongInfo = (songId) => {
  const requestedSong = songPlaylist.filter(song => song.id === songId)[0];

  //Use if statement until object spread becomes natively supported in webpack
  if (!requestedSong) {
    return {
      name: '',
      startTime: 0,
      duration: undefined,
      bpmStart: undefined,
      bpmEnd: undefined,
      thumbnailMin: undefined,
      thumbnailMax: undefined,
    };
  } else {
    return requestedSong;
  }

  /*//Override default values with values from requestedSong, if they exist, then return object
  return {
    name: '',
    startTime: 0,
    duration: 0,
    bpmStart: undefined,
    bpmEnd: undefined,
    thumbnailMin: undefined,
    thumbnailMax: undefined,
    ...requestedSong,
  };*/
};

export default {
  init,
  processEvents,
  heartbeat,
  getSongInfo,
};
