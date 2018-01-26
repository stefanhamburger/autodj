import React from 'react';

function CurrentSong({ name, bpm }) {
  //Generate JSX from bpm value
  let jsxTempo;
  if (bpm !== undefined) {
    if (bpm > 0) {
      jsxTempo = <React.Fragment>, {bpm} bpm</React.Fragment>;
    } else {
      jsxTempo = ' [Tempo detection failed]';
    }
  } else {
    jsxTempo = ' [Detecting tempo...]';
  }

  return (
    <React.Fragment>
      <b style={{ marginRight: '5px' }}>Currently playing:</b>
      {name.replace(/ - /g, ' – ')}
      {jsxTempo}
    </React.Fragment>
  );
}

export default CurrentSong;
