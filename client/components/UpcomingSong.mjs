import React from 'react';
import sanitizeSongName from '../view/sanitizeSongName.mjs';

export default function UpcomingSong({
  name,
}) {
  return (
    <React.Fragment>
      <b style={{ marginRight: '5px' }}>Upcoming:</b>
      {name === undefined ? 'TBD' : sanitizeSongName(name)}
    </React.Fragment>
  );
}
