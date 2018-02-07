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
      songPlaylist.push({ id: event.id, name: event.songName, time: event.time });
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
  for (let i = songPlaylist.length - 1; i >= 0; i -= 1) {
    const song = songPlaylist[i];
    if (song.time <= time) {
      setSong(song.id);
      break;
    }
  }
};

const getSongName = (songId) => {
  const requestedSong = songPlaylist.filter(song => song.id === songId)[0];
  if (!requestedSong) throw new Error(`Could not find song ${songId}.`);
  return requestedSong.name;
};

const getTempo = (songName) => {
  const requestedSong = songPlaylist.filter(song => song.name === songName)[0];
  if (!requestedSong) {
    return { bpmStart: undefined, bpmEnd: undefined };
  }
  return { bpmStart: requestedSong.bpmStart, bpmEnd: requestedSong.bpmEnd };
};

const getSongPosition = (songName) => {
  const requestedSong = songPlaylist.filter(song => song.name === songName)[0];
  if (!requestedSong) throw new Error(`Could not find song ${songName}.`);

  const duration = requestedSong.duration !== undefined ? requestedSong.duration : 0;
  const start = requestedSong.time;
  return { duration, start };
};

const getThumbnail = (songName) => {
  const requestedSong = songPlaylist.filter(song => song.name === songName)[0];
  if (!requestedSong) throw new Error(`Could not find song ${songName}.`);

  return {
    thumbnailMin: requestedSong.thumbnailMin,
    thumbnailMax: requestedSong.thumbnailMax,
  };
};

export default {
  init,
  processEvents,
  heartbeat,
  getSongName,
  getTempo,
  getSongPosition,
  getThumbnail,
};
