import React from 'react';

function CurrentSong({ name }) {
  return (
    <React.Fragment>
      <b>Currently playing:</b>
      {' '}
      {name.replace(/ - /g, ' – ')}
    </React.Fragment>
  );
}

export default CurrentSong;
