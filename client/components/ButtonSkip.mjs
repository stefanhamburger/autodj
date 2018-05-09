import React from 'react';

export default function ButtonPause({ canSkip, skipCallback }) {
  return (
    <button onClick={skipCallback} disabled={!canSkip} title="Skip to the end of the current song and start mixing into the next song. Only available once the next song has been processed.">⏭</button>
  );
}
