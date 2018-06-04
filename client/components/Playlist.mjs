import React from 'react';
import styled from 'styled-components';
import sanitizeSongName from '../view/sanitizeSongName.mjs';

const Container = styled.default.div`
  display: inline-block;
  & > ul {
    display: none;
    position: absolute;
    background-color: rgba(255, 255, 255, 0.8);
    border: 1px solid black;
    margin-top: 16px;
  }
  &:hover > ul {
    display: block;
  }
`;

export default function Playlist({ songs = [] }) {
  return (
    <Container>
      <ul>
        {songs.map(song => <li key={song.id}>{sanitizeSongName(song.name)}</li>)}
      </ul>
      Playlist
    </Container>
  );
}
