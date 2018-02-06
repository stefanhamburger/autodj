import React from 'react';

const timeToString = (timeIn) => {
  const time = Math.round(timeIn / 48000);//samples to seconds
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
}

function CurrentSong({
  name,
  bpmStart,
  bpmEnd,
  duration,
  elapsed,
}) {
  //Generate JSX from bpm value
  let jsxTempo;
  if (bpmStart === undefined && bpmEnd === undefined) {
    jsxTempo = ' [Detecting tempo...]';
  } else if ((bpmStart === 0 && bpmEnd === 0) || (bpmStart === 0 && bpmEnd === undefined) || (bpmStart === undefined && bpmEnd === 0)) {
    jsxTempo = ' [Tempo detection failed]';
  } else {
    jsxTempo = <React.Fragment> [{tempoToString(bpmStart)} bpm → {tempoToString(bpmEnd)} bpm]</React.Fragment>;
  }

  return (
    <React.Fragment>
      <b style={{ marginRight: '5px' }}>Currently playing:</b>
      {timeToString(elapsed)} / {timeToString(duration)} –&nbsp;
      {name !== '' ? name.replace(/ - /g, ' – ') : 'Loading...'}
      {jsxTempo}
    </React.Fragment>
  );
}

export default CurrentSong;
