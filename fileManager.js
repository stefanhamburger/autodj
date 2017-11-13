const fs = require('fs');
const path = require('path');

const PATH_SEPARATOR = path.sep;
const SUPPORTED_EXTENSIONS = ['mp3', 'wav', 'ogg'];

const getFileStats = async file => new Promise((resolve) => {
  fs.stat(file, (err, stats) => {
    resolve(err ? undefined : stats);
  });
});

//returns the list of audio files in the given directory and its subdirectories
const getFolderContents = async dirPath => new Promise((resolve) => {
  fs.readdir(dirPath, async (err, files) => {
    if (err) {
      resolve([]);
    } else {
      const out = [].concat(...(await Promise.all(files.map(async (file) => {
        const stats = await getFileStats(dirPath + PATH_SEPARATOR + file);
        if (stats) {
          if (stats.isFile()) {
            const extensionStart = file.lastIndexOf('.');
            const fileName = file.substr(0, extensionStart);
            const extension = file.substr(extensionStart + 1);
            if (SUPPORTED_EXTENSIONS.includes(extension)) {
              return [{
                name: fileName,
                extension,
                size: stats.size,
                lastMod: stats.mtime,
                path: dirPath + PATH_SEPARATOR + file,
              }];
            }
          } else if (stats.isDirectory()) {
            //get all files in this directory
            const subfiles = await getFolderContents(dirPath + PATH_SEPARATOR + file);
            return subfiles;
          }
        }
        return undefined;
      })))).filter(entry => entry !== undefined);
      resolve(out);
    }
  });
});

const getFolders = () => {
  const buffer = fs.readFileSync('settings.json');
  return JSON.parse(buffer);
};

const musicFolders = getFolders().collections;
const files = getFolderContents(musicFolders[Object.keys(musicFolders)[0]]);
module.exports.getFiles = () => files;
