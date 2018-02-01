import React from 'react';

function ButtonPause({ isPaused, pauseCallback }) {
  return (
    <button onMouseDown={pauseCallback}>{ isPaused ? '▶️' : '⏸'}</button>
  );
}

export default ButtonPause;
