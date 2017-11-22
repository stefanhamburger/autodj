# Installation

1. Download and install [Node.js](https://nodejs.org/en/download/current/). This was tested with version 9.2.0; other versions might also work.
2. Download [FFmpeg](https://ffmpeg.org/download.html) (must have libopus included) and make sure it is included in PATH (so that it can be called from any directory)
3. Download this Git repository (`git pull https://github.com/stefanhamburger/autodj.git`)
4. Install dependencies by running `npm install`
5. In this folder, create a file called `settings.json`. You must have a local folder with audio files, this is not included with the repository. Include this folder as follows:
```
{
  "collections": {
    "My music collection": "/path/to/music/collection"
  }
}
```
6. Start the server by running `node index.js`
7. Open http://localhost:3000/ in your browser
