import React from 'react';

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
    ctx.fillRect(0, 0, 600, 40);

    //fill first and last minute
    if (this.props.duration !== 0) {
      ctx.fillStyle = 'orange';
      const minuteWidth = Math.round(600 * 60 * 48000 / this.props.duration);
      if (this.props.bpmStart !== undefined && this.props.bpmStart !== 0) {
        ctx.fillRect(0, 0, minuteWidth, 40);
      }
      if (this.props.bpmEnd !== undefined && this.props.bpmEnd !== 0) {
        ctx.fillRect(600 - minuteWidth, 0, minuteWidth, 40);
      }
    }

    //draw current position
    const position = (this.props.duration === 0) ? 0 : this.props.elapsed / this.props.duration;
    ctx.fillStyle = 'white';
    ctx.fillRect(Math.round(position * 600), 0, 1, 40);
  }
  render() {
    return (
      <canvas ref={(ele) => { this.canvas = ele; }} width={600} height={40} />
    );
  }
}

export default SongWaveform;
