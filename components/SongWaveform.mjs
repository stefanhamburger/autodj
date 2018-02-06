import React from 'react';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 40;

class SongWaveform extends React.Component {
  componentDidMount() {
    this.updateCanvas();
  }
  componentDidUpdate() {
    this.updateCanvas();
  }
  updateCanvas() {
    const ctx = this.canvas.getContext('2d');
    //draw background
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    //fill first and last minute
    if (this.props.duration !== 0) {
      ctx.fillStyle = 'orange';
      const minuteWidth = Math.round(CANVAS_WIDTH * 60 * 48000 / this.props.duration);
      if (this.props.bpmStart !== undefined && this.props.bpmStart !== 0) {
        ctx.fillRect(0, 0, minuteWidth, CANVAS_HEIGHT);
      }
      if (this.props.bpmEnd !== undefined && this.props.bpmEnd !== 0) {
        ctx.fillRect(CANVAS_WIDTH - minuteWidth, 0, minuteWidth, CANVAS_HEIGHT);
      }
    }

    //draw waveform
    if (this.props.thumbnailMin !== undefined && this.props.thumbnailMax !== undefined) {
      ctx.fillStyle = 'black';
      for (let i = 0; i < CANVAS_WIDTH; i += 1) {
        //need to lerp from [-1, 1] to [0, 40]
        const minValue = (this.props.thumbnailMin[i] + 1) / 2 * CANVAS_HEIGHT;
        const maxValue = (this.props.thumbnailMax[i] + 1) / 2 * CANVAS_HEIGHT;
        ctx.fillRect(i, minValue, 1, maxValue - minValue);
      }
    }

    //draw current position
    const position = (this.props.duration === 0) ? 0 : this.props.elapsed / this.props.duration;
    ctx.fillStyle = 'white';
    ctx.fillRect(Math.round(position * CANVAS_WIDTH), 0, 1, CANVAS_HEIGHT);
  }
  render() {
    return (
      <canvas ref={(ele) => { this.canvas = ele; }} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
    );
  }
}

export default SongWaveform;
