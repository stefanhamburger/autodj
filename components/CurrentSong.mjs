import React from 'react';

function CurrentSong({ name }) {
  return (
    <React.Fragment>
      <b style={{ marginRight: '5px' }}>Currently playing:</b>
      {name.replace(/ - /g, ' – ')}
    </React.Fragment>
  );
}

export default CurrentSong;
