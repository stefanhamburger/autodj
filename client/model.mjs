const upcomingSongs = [];
const tempoInfo = {};
let setSong;

const init = (setSongIn) => {
  setSong = setSongIn;
};

const processEvents = events => events.forEach((event) => {
  switch (event.type) {
    case 'SONG_START':
      upcomingSongs.push({ name: event.songName, time: event.time });
      break;
    case 'TEMPO_INFO_START': {
      let { bpm } = event;
      if (bpm === undefined) {
        bpm = 0;
      }
      tempoInfo[event.songName] = bpm;
      setSong();
      break;
    }
    case 'TEMPO_INFO_END': {
      let { bpm } = event;
      if (bpm === undefined) {
        bpm = 0;
      }
      //tempoInfo[event.songName] = bpm;//TODO
      //setSong();
      break;
    }
    default:
      console.error('Metadata event not recognized', event);
  }
});

const heartbeat = (time) => {
  for (let i = upcomingSongs.length - 1; i >= 0; i -= 1) {
    const song = upcomingSongs[i];
    if (song.time <= time) {
      setSong(song.name);
      upcomingSongs.splice(i, 1);
    }
  }
};

const getTempo = songName => tempoInfo[songName];

export default {
  init,
  processEvents,
  heartbeat,
  getTempo,
};
