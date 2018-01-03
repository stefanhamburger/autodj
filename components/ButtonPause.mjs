import React from 'react';

function ButtonPause({ pauseCallback }) {
  return (
    <button onMouseDown={pauseCallback}>Pause/Continue</button>
  );
}

export default ButtonPause;
