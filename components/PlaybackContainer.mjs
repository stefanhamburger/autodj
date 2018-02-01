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
  //show total time (for long we have been playing audio)
  //show controls for media playback
  //show currently playing song
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
