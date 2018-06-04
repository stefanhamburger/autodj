import React from 'react';
import ButtonPause from './ButtonPause.mjs';
import ButtonSkip from './ButtonSkip.mjs';
import CurrentSong from './CurrentSong.mjs';
import Playlist from './Playlist.mjs';
import TotalDuration from './TotalDuration.mjs';
import UpcomingSong from './UpcomingSong.mjs';
import VolumeControl from './VolumeControl.mjs';

export default function PlaybackContainer({ state }) {
  //show total time (for long we have been playing audio)
  //show controls for media playback
  //TODO: add button for skipping to next song transition
  //show currently playing song (name, bpm, elapsed time, waveform)
  //show scheduled follow-up song (subject to successful tempo detection etc.)
  return (
    <React.Fragment>
      <div>
        <TotalDuration time={state.totalTime} />
        <Playlist songs={state.playlist} />
        <ButtonPause isPaused={state.isPaused} pauseCallback={state.onPause} />
        <ButtonSkip canSkip={state.canSkip} />
        <VolumeControl muted={state.muted} volume={state.volume} mutedCallback={state.onMuted} volumeChangeCallback={state.onVolumeChange} />
      </div>
      <div style={{ fontWeight: 'bold' }}>Currently playing:</div>
      <div style={{ display: 'flex' }}>
        {state.currentSongs.map(song => (
          <div key={song.id} style={{ marginRight: '10px' }}>
            <CurrentSong songInfo={song} />
          </div>
        ))}
      </div>
      <div>
        <UpcomingSong name={state.nextSong} />
      </div>
    </React.Fragment>
  );
}
