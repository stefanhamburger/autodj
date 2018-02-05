import React from 'react';

function CurrentSong({ name, bpmStart, bpmEnd }) {
  //Generate JSX from bpm value
  let jsxTempo;
  if (bpmStart === undefined && bpmEnd === undefined) {
    jsxTempo = ' [Detecting tempo...]';
  } else if ((bpmStart === 0 && bpmEnd === 0) || (bpmStart === 0 && bpmEnd === undefined) || (bpmStart === undefined && bpmEnd === 0)) {
    jsxTempo = ' [Tempo detection failed]';
  } else {
    jsxTempo = <React.Fragment> [{bpmStart === 0 ? '???' : bpmStart} bpm → {bpmEnd === 0 ? '???' : bpmEnd} bpm]</React.Fragment>;
  }

  return (
    <React.Fragment>
      <b style={{ marginRight: '5px' }}>Currently playing:</b>
      {name !== '' ? name.replace(/ - /g, ' – ') : 'Loading...'}
      {jsxTempo}
    </React.Fragment>
  );
}

export default CurrentSong;
