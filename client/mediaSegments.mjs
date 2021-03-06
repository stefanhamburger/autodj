import model from './model.mjs';

const initAudio = async ({
  sid,
  audioEle,
  mediaSource,
  sourceBuffer,
} = {}) => {
  let curIndex = -1;
  const GetNextMediaSegment = async () => {
    curIndex += 1;
    const headers = { 'X-Playback-Position': audioEle.currentTime };

    const skipSong = model.getSkipSong();
    if (skipSong !== false) {
      headers['X-Skip-Song'] = skipSong;
      //since we sent the skip command, no need to send it a second time
      model.setSkipSong(false);
    }

    const response = await fetch(
      `part?sid=${encodeURIComponent(sid)}&id=${curIndex}`,
      {
        cache: 'no-store',
        headers,
      },
    );

    //Read metadata, e.g. current song
    if (response.headers.has('X-Metadata')) {
      const headerValue = response.headers.get('X-Metadata');
      const metadataEvents = JSON.parse(decodeURI(headerValue));
      if (typeof metadataEvents === 'object') model.processEvents(metadataEvents);
    }

    return response.arrayBuffer();
  };

  async function appendNextMediaSegment() {
    const mediaSegment = await GetNextMediaSegment();

    if (mediaSource.readyState === 'closed') {
      return;
    }

    // Make sure the previous append is not still pending.
    if (sourceBuffer.updating) {
      await new Promise((resolve) => {
        const tmpHandler = () => {
          sourceBuffer.removeEventListener('updateend', tmpHandler);
          resolve();
        };
        sourceBuffer.addEventListener('updateend', tmpHandler);
      });
      //return;
    }

    if (mediaSegment.byteLength === 0) {
      //mediaSource.endOfStream();
      //setTimeout(() => appendNextMediaSegment(), 1000);
      return;
    }

    // NOTE: If mediaSource.readyState == “ended”, this appendBuffer() call will
    // cause mediaSource.readyState to transition to "open". The web application
    // should be prepared to handle multiple “sourceopen” events.
    sourceBuffer.appendBuffer(mediaSegment);
  }

  //Load first segment
  {
    const initSegment = await GetNextMediaSegment();

    if (initSegment == null) {
      // Error fetching the initialization segment. Signal end of stream with an error.
      mediaSource.endOfStream('network');
      return;
    }

    // Append the initialization segment.
    const firstAppendHandler = () => {
      sourceBuffer.removeEventListener('updateend', firstAppendHandler);

      //In case the autoplay doesn't work, we manually force a play here, though it shouldn't be necessary
      audioEle.play();

      // Append some initial media data.
      appendNextMediaSegment();
    };
    sourceBuffer.addEventListener('updateend', firstAppendHandler);
    sourceBuffer.appendBuffer(initSegment);

    setInterval(appendNextMediaSegment, 1000);
  }
};

export default initAudio;
