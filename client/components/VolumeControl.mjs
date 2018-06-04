import React from 'react';
import styled from 'styled-components';
import getViridisColor from '../view/viridis.mjs';

const Container = styled.default.label`
  & > button {
    display: inline-block;
    width: 24px;
    height: 24px;
    padding: 0;
    background-color: #ddb6e6;
    border: 1px solid ${getViridisColor(0)};
    border-radius: 5px;
    text-align: center;
  }

  & > input {
    visibility: hidden;
    opacity: 0;
    transition: opacity 0.2s linear, visibility 0.2s linear;

    display: inline-block;
    width: 100px;
    height: 15px;
    position: absolute;
    margin-left: 0px;
    margin-top: 3px;
    z-index: 1;
    background-color: rgba(240, 240, 240, 0.8);
  }

  &:hover > input {
    visibility: visible;
    opacity: 1;
    transition: none;
  }
`;

/** Returns an appropriate emoji for this volume level (given in 0 to 1) */
function getSymbol(volume) {
  if (volume >= 0.5) return '🔊';//0.5 - 1.0
  if (volume >= 0.1) return '🔉';//0.1 - 0.49
  if (volume > 0) return '🔈';//0.01 - 0.09
  return '🔇';//0
}

export default function VolumeControl({
  muted,
  volume,
  mutedCallback,
  volumeChangeCallback,
}) {
  const visibleVolume = muted ? 0 : volume;
  return (
    <Container>
      <button onClick={mutedCallback}>{getSymbol(visibleVolume)}</button>
      <input type="range" min="0" defaultValue={Math.round(visibleVolume * 100)} max="100" step="1" onInput={event => volumeChangeCallback(Number(event.target.value) / 100)} />
    </Container>
  );
}
