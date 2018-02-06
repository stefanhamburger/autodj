import React from 'react';
import ButtonPause from './ButtonPause.mjs';
import CurrentSong from './CurrentSong.mjs';
import TotalDuration from './TotalDuration.mjs';
import VolumeControl from './VolumeControl.mjs';

function PlaybackContainer({ state }) {
  //show total time (for long we have been playing audio)
  //show controls for media playback
  //TODO: add button for skipping to next song transition
  //show currently playing song (name, bpm, elapsed time, waveform)
  return (
    <React.Fragment>
      <div>
        <TotalDuration time={state.totalTime} />
        <ButtonPause isPaused={state.isPaused} pauseCallback={state.onPause} />
        <VolumeControl volumeChangeCallback={state.onVolumeChange} />
      </div>
      <div>
        <CurrentSong
          name={state.songName}
          bpmStart={state.bpmStart}
          bpmEnd={state.bpmEnd}
          elapsed={state.songElapsed}
          duration={state.songDuration}
          thumbnailMin={state.thumbnailMin}
          thumbnailMax={state.thumbnailMax}
        />
      </div>
    </React.Fragment>
  );
}

export default PlaybackContainer;
