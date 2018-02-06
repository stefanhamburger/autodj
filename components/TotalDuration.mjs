import React from 'react';

function TotalDuration({ time }) {
  //Calculate HH:MM:SS
  const timestamp = Math.floor(time);
  const hours = Math.floor(timestamp / 3600);
  const minutes = Math.floor(timestamp / 60) % 60;
  const seconds = timestamp % 60;
  //Create DOM
  return (
    <React.Fragment>
      <b style={{ display: 'inline-block', marginRight: '5px' }}>Total time:</b>
      <span>
        {(hours !== 0) ? `${hours}:` : ''}
        {(hours === 0) ? String(minutes) : String(minutes).padStart(2, '0')}
        :
        {String(seconds).padStart(2, '0')}
      </span>
    </React.Fragment>
  );
}

export default TotalDuration;
