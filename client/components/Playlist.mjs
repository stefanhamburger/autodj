import React from 'react';
import styled from 'styled-components';
import sanitizeSongName from '../view/sanitizeSongName.mjs';
import getViridisColor from '../view/viridis.mjs';

const currentSongBgColor = getViridisColor(1.0);

const Container = styled.default.div`
  display: inline-block;
  background: #eee;
  padding: 0 3px;
  border: 1px solid #777;
  & > ul {
    visibility: hidden;
    opacity: 0;
    position: absolute;
    background-color: rgba(255, 255, 255, 0.9);
    border: 1px solid black;
    margin-top: 18px;
    padding: 5px 5px 5px 20px;
    transition: opacity 0.5s linear, visibility 0.5s linear;
  }
  &:hover > ul {
    visibility: visible;
    opacity: 1;
    transition: none;
  }
`;

export default function Playlist({ songs = [] }) {
  return (
    <Container>
      <ul>
        {songs.map(song => <li key={song.id} style={song.current === true ? { backgroundColor: currentSongBgColor } : {}}>{sanitizeSongName(song.name)}</li>)}
      </ul>
      Playlist&nbsp;▼
    </Container>
  );
}
