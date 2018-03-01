import React from 'react';
import SongWaveform from './SongWaveform.mjs';

const timeToString = (timeIn) => {
  const time = Math.floor(timeIn / 48000);//samples to seconds
  const seconds = time % 60;
  const minutes = Math.floor(time / 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const tempoToString = (bpm) => {
  if (bpm === undefined) {
    return '...';
  } else if (bpm === 0) {
    return '???';
  } else {
    return bpm.toString();
  }
};

export default function CurrentSong({ songInfo }) {
  //Generate JSX from bpm value
  let jsxTempo;
  if (songInfo.bpmStart === undefined && songInfo.bpmEnd === undefined) {
    jsxTempo = ' [Detecting tempo...]';
  } else if ((songInfo.bpmStart === 0 && songInfo.bpmEnd === 0) || (songInfo.bpmStart === 0 && songInfo.bpmEnd === undefined) || (songInfo.bpmStart === undefined && songInfo.bpmEnd === 0)) {
    jsxTempo = ' [Tempo detection failed]';
  } else if (songInfo.bpmStart === undefined) {
    jsxTempo = <React.Fragment> [Ends with {tempoToString(songInfo.bpmEnd)} bpm]</React.Fragment>;
  } else {
    jsxTempo = <React.Fragment> [{tempoToString(songInfo.bpmStart)} bpm → {tempoToString(songInfo.bpmEnd)} bpm]</React.Fragment>;
  }

  const duration = songInfo.duration !== undefined ? songInfo.duration : 0;

  return (
    <React.Fragment>
      {timeToString(songInfo.elapsed)} / {timeToString(duration)} |{' '}
      {songInfo.name.replace(/ - /g, ' – ')}
      {jsxTempo}
      <br />
      <SongWaveform
        bpmStart={songInfo.bpmStart}
        bpmEnd={songInfo.bpmEnd}
        duration={duration}
        elapsed={songInfo.elapsed}
        thumbnailMin={songInfo.thumbnailMin}
        thumbnailMax={songInfo.thumbnailMax}
      />
    </React.Fragment>
  );
}
