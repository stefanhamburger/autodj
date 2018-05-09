import React from 'react';

export default function ButtonPause({ isPaused, pauseCallback }) {
  return (
    //alternatively, we could use ▶/⏸ but they have a box around them
    <button onClick={pauseCallback} title="Pause or continue playback.">{ isPaused ? '►' : '❚❚'}</button>
  );
}
