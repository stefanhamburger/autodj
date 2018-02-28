import React from 'react';
import styled from 'styled-components';
import getViridisColor from '../view/viridis.mjs';

const Container = styled.default.label`
  &:hover > input {
    display: inline-block;
  }
`;

const Button = styled.default.button`
  display: inline-block;
  width: 24px;
  height: 24px;
  padding: 0;
  background-color: #ddb6e6;
  border: 1px solid ${getViridisColor(0)};
  border-radius: 5px;
  text-align: center;
`;

const Slider = styled.default.input`
  display: none;
  width: 100px;
  height: 15px;
  position: absolute;
  margin-left: 0px;
  margin-top: 3px;
  z-index: 3;
  background-color: rgba(240, 240, 240, 0.8);
`;

export default function VolumeControl({ volumeChangeCallback }) {
  return (
    <Container>
      <Button>🔉</Button>
      <Slider type="range" min="0" defaultValue="10" max="100" step="1" onInput={event => volumeChangeCallback(Number(event.target.value) / 100)} />
    </Container>
  );
}
