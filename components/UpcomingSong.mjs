import React from 'react';

function UpcomingSong({
  name,
}) {
  return (
    <React.Fragment>
      <b style={{ marginRight: '5px' }}>Upcoming:</b>
      {name === undefined ? 'TBD' : name.replace(/ - /g, ' – ')}
    </React.Fragment>
  );
}

export default UpcomingSong;
