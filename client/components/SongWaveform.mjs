import React from 'react';
import getViridisColor from '../view/viridis.mjs';

/** Canvas element dimensions. Width must match THUMBNAIL_WIDTH in server/child-process/createThumbnail.mjs */
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 40;

/** Colors for thumbnail */
const COLOR_BACKGROUND = '#000';
const COLOR_BACKGROUND_EDGE = '#700';
const COLOR_FOREGROUND = getViridisColor(0.4).replace(/^rgb\((.+)\)$/u, 'rgba($1,0.6)');
const COLOR_FOREGROUND_PLAYED = getViridisColor(1.0).replace(/^rgb\((.+)\)$/u, 'rgba($1,0.6)');
const COLOR_TRACK_LINE = '#fff';
const COLOR_BPM_TEXT = '#fff';


/**
 * Calculate bpm at current position to display it next to % tempo adjustment
 */
const getTempoAtCurrentPos = (songInfo, entry) => {
  const elapsedTime = songInfo.elapsed / 48000;//calculate from samples to seconds for easier calculations

  let tempoAtCurPosition = 0;
  //do nothing if tempo has not yet been detected
  if (songInfo.bpmEnd !== undefined) {
    //if this is the first song, we only detected the tempo at the end and don't need to interpolate
    if (songInfo.bpmStart === undefined) {
      tempoAtCurPosition = songInfo.bpmEnd;
    } else {
      const duration = songInfo.endTime - songInfo.startTime;
      //if we are at the beginning, use bpmStart
      if (elapsedTime <= 60) {
        tempoAtCurPosition = songInfo.bpmStart;
      } else if (elapsedTime >= duration - 60) { //if we are at the end, use bpmEnd
        tempoAtCurPosition = songInfo.bpmEnd;
      } else { //otherwise, lerp between bpmStart and bpmEnd
        const lerpFactor = (elapsedTime - 60) / (duration - 60);
        tempoAtCurPosition = (1.0 - lerpFactor) * songInfo.bpmStart + lerpFactor * songInfo.bpmEnd;
      }
    }
    //update bpm based on tempo adjustment
    tempoAtCurPosition *= entry.tempoAdjustment;
  }
  return tempoAtCurPosition;
};


export default class SongWaveform extends React.Component {
  constructor(props) {
    super(props);
    this.canvas = React.createRef();
  }
  componentDidMount() {
    this.updateCanvas();
  }
  componentDidUpdate() {
    this.updateCanvas();
  }
  updateCanvas() {
    const { songInfo } = this.props;
    const ctx = this.canvas.current.getContext('2d');
    const position = Math.round((songInfo.origDuration === 0) ? 0 : songInfo.elapsed / songInfo.origDuration * CANVAS_WIDTH);

    //draw background
    ctx.fillStyle = COLOR_BACKGROUND;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    //fill first and last minute
    if (songInfo.origDuration !== 0) {
      ctx.fillStyle = COLOR_BACKGROUND_EDGE;
      const minuteWidth = Math.round(CANVAS_WIDTH * 60 * 48000 / songInfo.origDuration);
      if (songInfo.bpmStart !== undefined && songInfo.bpmStart !== 0) {
        ctx.fillRect(0, 0, minuteWidth, CANVAS_HEIGHT);
      }
      if (songInfo.bpmEnd !== undefined && songInfo.bpmEnd !== 0) {
        ctx.fillRect(CANVAS_WIDTH - minuteWidth, 0, minuteWidth, CANVAS_HEIGHT);
      }
    }

    //draw waveform
    if (songInfo.thumbnailMin !== undefined && songInfo.thumbnailMax !== undefined) {
      //as long as song was already played, use yellow background color
      let fgColorSwitched = false;
      ctx.fillStyle = COLOR_FOREGROUND_PLAYED;

      for (let i = 0; i < CANVAS_WIDTH; i += 1) {
        //once song is no longer played, switch to dark blue background color
        if (!fgColorSwitched && i > position) {
          ctx.fillStyle = COLOR_FOREGROUND;
          fgColorSwitched = true;
        }

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
    if (songInfo.elapsed > 0) {
      const entry = songInfo.playbackData.filter(innerEntry => songInfo.elapsed >= innerEntry.sampleOffset && songInfo.elapsed < innerEntry.sampleOffset + innerEntry.sampleLength)[0];
      if (entry !== undefined) {
        const tempoSign = (entry.tempoAdjustment < 1) ? '−' : '+';

        //calculate bpm at current position to display it next to % tempo adjustment
        const tempoAtCurPosition = getTempoAtCurrentPos(songInfo, entry);
        const currentBpm = (tempoAtCurPosition !== 0) ? ` = ${tempoAtCurPosition.toFixed(3)} bpm` : '';

        const tempoChangeText = `${tempoSign}${Math.round(Math.abs(entry.tempoAdjustment - 1) * 1000) / 10}%${currentBpm}`;
        if (position < CANVAS_WIDTH / 2) {
          ctx.textAlign = 'start';
          ctx.fillText(tempoChangeText, position + 2, 13);
        } else {
          ctx.textAlign = 'end';
          ctx.fillText(tempoChangeText, position - 2, 13);
        }
      }
    }

    //draw bpm
    ctx.fillStyle = COLOR_BPM_TEXT;
    ctx.font = '12px sans-serif';
    if (songInfo.bpmStart !== undefined) {
      ctx.textAlign = 'start';
      ctx.fillText(`${songInfo.bpmStart.toFixed(3)} bpm`, 3, CANVAS_HEIGHT - 6);
    }
    if (songInfo.bpmEnd !== undefined) {
      ctx.textAlign = 'end';
      ctx.fillText(`${songInfo.bpmEnd.toFixed(3)} bpm`, CANVAS_WIDTH - 3, CANVAS_HEIGHT - 6);
    }
  }
  render() {
    return (
      <canvas ref={this.canvas} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
    );
  }
}
