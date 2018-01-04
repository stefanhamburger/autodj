import fs from 'fs';
import path from 'path';
import * as settings from './settings.mjs';

/** We only load audio files that have one of these extensions */
const SUPPORTED_EXTENSIONS = ['mp3', 'wav', 'ogg', 'opus'];

/**
 * Defintion for Node.js' fs.Stats
 * @typedef {object} Stats - file stats
 * @property {number} size - file size
 * @property {Date} mtime - last modified
 * @property {function(): boolean} isFile - whether this is a file
 * @property {function(): boolean} isDirectory - whether this is a directory
 */

/**
 * Gets information about the given file or directory
 * @param {string} file - The full path  of the file or directory we want to get the stats of
 * @returns {Promise<Stats>}
 */
const getFileStats = async file => new Promise((resolve) => {
  fs.stat(file, (err, stats) => {
    resolve(err ? undefined : stats);
  });
});

/**
 * Returns the list of audio files in the given directory and its subdirectories
 * @param {string} dirPath - The full name of the file to get the stats of
 * @returns {Promise<Array>}
 */
const getFolderContents = async dirPath => new Promise((resolve) => {
  fs.readdir(dirPath, async (err, files) => {
    if (err) {
      resolve([]);
    } else {
      const out = [].concat(...(await Promise.all(files.map(async (file) => {
        const stats = await getFileStats(path.join(dirPath, file));
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
                path: path.join(dirPath, file),
              }];
            }
          } else if (stats.isDirectory()) {
            //get all files in this directory
            const subfiles = await getFolderContents(path.join(dirPath, file));
            return subfiles;
          }
        }
        return undefined;
      })))).filter(entry => entry !== undefined);
      resolve(out);
    }
  });
});

const files = {};

export const init = async () => {
  const { collections } = settings.get();
  await Promise.all(Object.keys(collections).map(async (key) => {
    files[key] = await getFolderContents(collections[key]);
  }));
};

export const getFiles = collection => files[collection];
