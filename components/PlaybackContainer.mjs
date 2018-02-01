import React from 'react';
import ButtonPause from './ButtonPause.mjs';
import CurrentSong from './CurrentSong.mjs';
import TotalDuration from './TotalDuration.mjs';
import VolumeControl from './VolumeControl.mjs';

function PlaybackContainer({
  totalTime = 0,
  onPause,
  onVolumeChange,
  songName = '',
  bpm = undefined,
}) {
  return (
    <React.Fragment>
      <div>
        <TotalDuration time={totalTime} />
        <ButtonPause pauseCallback={onPause} />
        <VolumeControl volumeChangeCallback={onVolumeChange} />
      </div>
      <div>
        <CurrentSong name={songName} bpm={bpm} />
      </div>
    </React.Fragment>
  );
}

export default PlaybackContainer;
