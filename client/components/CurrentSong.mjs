import React from 'react';
import SongWaveform from './SongWaveform.mjs';

const timeToString = (timeIn) => {
  const time = Math.floor(timeIn / 48000);//samples to seconds
  const seconds = time % 60;
  const minutes = Math.floor(time / 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export default function CurrentSong({ songInfo }) {
  return (
    <React.Fragment>
      {timeToString(songInfo.elapsed)} / {timeToString(songInfo.duration)} |{' '}
      {songInfo.name.replace(/ - /g, ' – ')}
      <br />
      <SongWaveform songInfo={songInfo} />
    </React.Fragment>
  );
}
