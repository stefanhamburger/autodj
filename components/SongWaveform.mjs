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
    const position = Math.round((this.props.duration === 0) ? 0 : this.props.elapsed / this.props.duration * CANVAS_WIDTH);

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
      for (let i = 0; i < CANVAS_WIDTH; i += 1) {
        //grey if this pixel was already played, otherwise black
        ctx.fillStyle = (i <= position) ? 'rgba(0, 200, 0, 0.7)' : 'rgba(0, 0, 0, 0.7)';

        //need to lerp from [-1, 1] to [0, 40]
        const minValue = (this.props.thumbnailMin[i] + 1) / 2 * CANVAS_HEIGHT;
        const maxValue = (this.props.thumbnailMax[i] + 1) / 2 * CANVAS_HEIGHT;
        ctx.fillRect(i, minValue, 1, maxValue - minValue);
      }
    }

    //draw current position
    ctx.fillStyle = 'white';
    ctx.fillRect(position, 0, 1, CANVAS_HEIGHT);
  }
  render() {
    return (
      <canvas ref={(ele) => { this.canvas = ele; }} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
    );
  }
}

export default SongWaveform;
