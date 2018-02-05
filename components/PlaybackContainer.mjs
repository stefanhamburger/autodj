import React from 'react';
import ButtonPause from './ButtonPause.mjs';
import CurrentSong from './CurrentSong.mjs';
import TotalDuration from './TotalDuration.mjs';
import VolumeControl from './VolumeControl.mjs';

function PlaybackContainer({ state }) {
  //show total time (for long we have been playing audio)
  //show controls for media playback
  //show currently playing song
  return (
    <React.Fragment>
      <div>
        <TotalDuration time={state.totalTime} />
        <ButtonPause isPaused={state.isPaused} pauseCallback={state.onPause} />
        <VolumeControl volumeChangeCallback={state.onVolumeChange} />
      </div>
      <div>
        <CurrentSong name={state.songName} bpmStart={state.bpmStart} bpmEnd={state.bpmEnd} />
      </div>
    </React.Fragment>
  );
}

export default PlaybackContainer;
