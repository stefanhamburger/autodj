import React from 'react';

export default function UpcomingSong({
  name,
}) {
  return (
    <React.Fragment>
      <b style={{ marginRight: '5px' }}>Upcoming:</b>
      {name === undefined ? 'TBD' : name.replace(/ - /gu, ' – ')}
    </React.Fragment>
  );
}
