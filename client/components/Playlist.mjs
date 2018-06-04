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
  & > ol {
    visibility: hidden;
    opacity: 0;
    transition: opacity 0.5s linear, visibility 0.5s linear;

    position: absolute;
    max-height: 200px;
    margin-top: 18px;
    padding: 5px 5px 5px 30px;
    overflow-y: auto;
    z-index: 1;

    background-color: rgba(255, 255, 255, 0.95);
    border: 1px solid black;
  }
  &:hover > ol {
    visibility: visible;
    opacity: 1;
    transition: none;
  }
`;

export default function Playlist({ songs = [] }) {
  return (
    <Container>
      <ol reversed>
        {songs.length === 0 ?
          <li>TBD</li> :
          songs.map(song => (
            <li key={song.id} style={song.current === true ? { backgroundColor: currentSongBgColor } : {}}>
              {sanitizeSongName(song.name)}
            </li>
          ))}
      </ol>
      Playlist&nbsp;▼
    </Container>
  );
}
