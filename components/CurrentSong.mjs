import React from 'react';

function CurrentSong({ name, bpm }) {
  //Generate JSX from bpm value
  let jsxTempo;
  if (bpm === undefined) {
    jsxTempo = ' [Detecting tempo...]';
  } else if (bpm === 0) {
    jsxTempo = ' [Tempo detection failed]';
  } else {
    jsxTempo = <React.Fragment> [{bpm} bpm]</React.Fragment>;
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
