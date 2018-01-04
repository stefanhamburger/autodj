import React from 'react';

function CurrentSong({ name, bpm }) {
  return (
    <React.Fragment>
      <b style={{ marginRight: '5px' }}>Currently playing:</b>
      {name.replace(/ - /g, ' – ')}
      {bpm !== undefined ? <React.Fragment>, {bpm} bpm</React.Fragment> : ''}
    </React.Fragment>
  );
}

export default CurrentSong;
