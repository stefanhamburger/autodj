const songPlaylist = [];
let setSong;

const init = (setSongIn) => {
  setSong = setSongIn;
};

const processEvents = events => events && events.forEach((event) => {
  switch (event.type) {
    case 'SONG_START':
      songPlaylist.push({ id: event.id, name: event.songName, time: event.time });
      break;
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
    default:
      console.error('Metadata event not recognized', event);
  }
});

const heartbeat = (time) => {
  for (let i = songPlaylist.length - 1; i >= 0; i -= 1) {
    const song = songPlaylist[i];
    if (song.time <= time) {
      setSong(song.name);
      //songPlaylist.splice(i, 1);
      break;
    }
  }
};

const getTempo = (songName) => {
  const requestedSong = songPlaylist.filter(song => song.name === songName)[0];
  if (!requestedSong) throw new Error(`Could not find song ${songName}.`);
  return { bpmStart: requestedSong.bpmStart, bpmEnd: requestedSong.bpmEnd };
};

export default {
  init,
  processEvents,
  heartbeat,
  getTempo,
};
