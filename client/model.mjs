const upcomingSongs = [];
let setSong;
//...
const init = (setSongIn) => {
  setSong = setSongIn;
};

const processEvents = events => events.forEach((event) => {
  switch (event.type) {
    case 'SONG_START':
      upcomingSongs.push({ name: event.songName, time: event.time });
      break;
    default:
      console.error('Metadata event not recognized', event);
  }
});

const heartbeat = (time) => {
  for (let i = upcomingSongs.length - 1; i >= 0; i--) {
    const song = upcomingSongs[i];
    if (song.time <= time) {
      setSong(song.name);
      upcomingSongs.splice(i, 1);
    }
  }
};

export default { init, processEvents, heartbeat };
