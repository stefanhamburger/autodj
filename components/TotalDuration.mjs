import React from 'react';

/*TODO this can be removed once we are sure it is no longer needed
class TotalDuration extends React.Component {
  render() {
    const timestamp = this.props.time;
    const hours = Math.floor(timestamp / 3600);
    const minutes = Math.floor(timestamp / 60);
    const seconds = timestamp % 60;
    return (
      <React.Fragment>
        {hours}
        :
        {(hours === 0) ? String(minutes) : String(minutes).padStart(2, '0')}
        :
        {String(seconds).padStart(2, '0')}
      </React.Fragment>
    );
  }
}*/

function TotalDuration({ time }) {
  //Calculate HH:MM:SS
  const timestamp = Math.floor(Number(time));
  const hours = Math.floor(timestamp / 3600);
  const minutes = Math.floor(timestamp / 60);
  const seconds = timestamp % 60;
  //Create DOM
  return (
    <React.Fragment>
      <b>Total time:</b>
      {' '}
      {(hours !== 0) ? `${hours}:` : ''}
      {(hours === 0) ? String(minutes) : String(minutes).padStart(2, '0')}
      :
      {String(seconds).padStart(2, '0')}
    </React.Fragment>
  );
  /*
  FIXME: Alternatively, merge hours and minutes. But it may be better to create separate fragments?
      <React.Fragment>
      <b>Total time:</b>{' '}
      {(hours === 0) ?
        String(minutes) :
        `${hours}:${String(minutes).padStart(2, '0')}`
      }
      :
      {String(seconds).padStart(2, '0')}
    </React.Fragment>
  */
}

export default TotalDuration;
