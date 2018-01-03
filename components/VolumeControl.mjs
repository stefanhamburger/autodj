import React from 'react';

function VolumeControl({ volumeChangeCallback }) {
  return (
    <label>
      Volume:
      {' '}
      <input type="range" min="0" defaultValue="10" max="100" step="1" onInput={event => volumeChangeCallback(Number(event.target.value) / 100)} />
    </label>
  );
}

export default VolumeControl;
