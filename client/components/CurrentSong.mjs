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

export default function CurrentSong({
  name,
  bpmStart,
  bpmEnd,
  duration,
  elapsed,
  thumbnailMin,
  thumbnailMax,
}) {
  //Generate JSX from bpm value
  let jsxTempo;
  if (bpmStart === undefined && bpmEnd === undefined) {
    jsxTempo = ' [Detecting tempo...]';
  } else if ((bpmStart === 0 && bpmEnd === 0) || (bpmStart === 0 && bpmEnd === undefined) || (bpmStart === undefined && bpmEnd === 0)) {
    jsxTempo = ' [Tempo detection failed]';
  } else if (bpmStart === undefined) {
    jsxTempo = <React.Fragment> [Ends with {tempoToString(bpmEnd)} bpm]</React.Fragment>;
  } else {
    jsxTempo = <React.Fragment> [{tempoToString(bpmStart)} bpm → {tempoToString(bpmEnd)} bpm]</React.Fragment>;
  }

  return (
    <React.Fragment>
      <b style={{ marginRight: '5px' }}>Currently playing:</b>
      {timeToString(elapsed)} / {timeToString(duration)} |{' '}
      {name !== '' ? name.replace(/ - /g, ' – ') : 'Loading...'}
      {jsxTempo}
      <br />
      <SongWaveform
        bpmStart={bpmStart}
        bpmEnd={bpmEnd}
        duration={duration}
        elapsed={elapsed}
        thumbnailMin={thumbnailMin}
        thumbnailMax={thumbnailMax}
      />
    </React.Fragment>
  );
}
