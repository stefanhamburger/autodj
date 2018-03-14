import React from 'react';
import getViridisColor from '../view/viridis.mjs';

/** Canvas element dimensions. Width must match THUMBNAIL_WIDTH in server/audioManager.mjs */
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 40;

/** Colors for thumbnail */
const COLOR_BACKGROUND = '#000';
const COLOR_BACKGROUND_EDGE = '#700';
const COLOR_FOREGROUND = getViridisColor(0.4).replace(/^rgb\((.+)\)$/, 'rgba($1,0.6)');
const COLOR_FOREGROUND_PLAYED = getViridisColor(1.0).replace(/^rgb\((.+)\)$/, 'rgba($1,0.6)');
const COLOR_TRACK_LINE = '#fff';
const COLOR_BPM_TEXT = '#fff';

export default class SongWaveform extends React.Component {
  componentDidMount() {
    this.updateCanvas();
  }
  componentDidUpdate() {
    this.updateCanvas();
  }
  updateCanvas() {
    const { songInfo } = this.props;
    const ctx = this.canvas.getContext('2d');
    const position = Math.round((songInfo.duration === 0) ? 0 : songInfo.elapsed / songInfo.duration * CANVAS_WIDTH);

    //draw background
    ctx.fillStyle = COLOR_BACKGROUND;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    //fill first and last minute
    if (songInfo.duration !== 0) {
      ctx.fillStyle = COLOR_BACKGROUND_EDGE;
      const minuteWidth = Math.round(CANVAS_WIDTH * 60 * 48000 / songInfo.duration);
      if (songInfo.bpmStart !== undefined && songInfo.bpmStart !== 0) {
        ctx.fillRect(0, 0, minuteWidth, CANVAS_HEIGHT);
      }
      if (songInfo.bpmEnd !== undefined && songInfo.bpmEnd !== 0) {
        ctx.fillRect(CANVAS_WIDTH - minuteWidth, 0, minuteWidth, CANVAS_HEIGHT);
      }
    }

    //draw waveform
    if (songInfo.thumbnailMin !== undefined && songInfo.thumbnailMax !== undefined) {
      for (let i = 0; i < CANVAS_WIDTH; i += 1) {
        //grey if this pixel was already played, otherwise black
        ctx.fillStyle = (i <= position) ? COLOR_FOREGROUND_PLAYED : COLOR_FOREGROUND;

        //need to lerp from [-1, 1] to [0, 40]
        const minValue = (songInfo.thumbnailMin[i] + 1) / 2 * CANVAS_HEIGHT;
        const maxValue = (songInfo.thumbnailMax[i] + 1) / 2 * CANVAS_HEIGHT;
        ctx.fillRect(i, minValue, 1, maxValue - minValue);
      }
    }

    //draw current position
    ctx.fillStyle = COLOR_TRACK_LINE;
    ctx.fillRect(position, 0, 1, CANVAS_HEIGHT);

    //show tempo adjustment next to current position (either to the left or right of white line)
    if (songInfo.tempoAdjustment !== undefined && songInfo.elapsed > 0) {
      const tempoSign = (songInfo.tempoAdjustment < 1) ? '−' : '+';
      const tempoChange = `${tempoSign}${Math.round(Math.abs(songInfo.tempoAdjustment - 1) * 1000) / 10}%`;
      if (position < CANVAS_WIDTH / 2) {
        ctx.textAlign = 'start';
        ctx.fillText(tempoChange, position + 2, 13);
      } else {
        ctx.textAlign = 'end';
        ctx.fillText(tempoChange, position - 2, 13);
      }
    }

    //draw bpm
    ctx.fillStyle = COLOR_BPM_TEXT;
    ctx.font = '12px sans-serif';
    if (songInfo.bpmStart !== undefined) {
      ctx.textAlign = 'start';
      ctx.fillText(`${(Math.round(songInfo.bpmStart * 1000) / 1000).toString()} bpm`, 3, CANVAS_HEIGHT - 6);
    }
    if (songInfo.bpmEnd !== undefined) {
      ctx.textAlign = 'end';
      ctx.fillText(`${(Math.round(songInfo.bpmEnd * 1000) / 1000).toString()} bpm`, CANVAS_WIDTH - 3, CANVAS_HEIGHT - 6);
    }
  }
  render() {
    return (
      <canvas ref={(ele) => { this.canvas = ele; }} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
    );
  }
}
