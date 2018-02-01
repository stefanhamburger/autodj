import React from 'react';

function ButtonPause({ isPaused, pauseCallback }) {
  return (
    //alternatively, we could use ▶/⏸ but they have a box around them
    <button onMouseDown={pauseCallback}>{ isPaused ? '►' : '❚❚'}</button>
  );
}

export default ButtonPause;
