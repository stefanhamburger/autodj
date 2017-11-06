const fs = require('fs');

const PATH_SEPARATOR = '\\';//can also be /
const SUPPORTED_EXTENSIONS = ['mp3', 'wav', 'ogg'];

const getFileStats = async file => new Promise((resolve) => {
    fs.stat(file, (err, stats) => {
        resolve(err ? undefined : stats);
    });
});

//returns the list of audio files in the given directory and its subdirectories
const getFolderContents = async path => new Promise((resolve) => {
    fs.readdir(path, async (err, files) => {
        if (err) {
            resolve([]);
        } else {
            const out = [].concat(...(await Promise.all(files.map(async (file) => {
                const stats = await getFileStats(path + PATH_SEPARATOR + file);
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
                                path: path + PATH_SEPARATOR + file,
                            }];
                        }
                    } else if (stats.isDirectory()) {
                        //get all files in this directory
                        const subfiles = await getFolderContents(path + PATH_SEPARATOR + file);
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
    const buffer = fs.readFileSync('music.json');
    return JSON.parse(buffer);
};

const musicFolders = getFolders();
const files = getFolderContents(musicFolders[1].path);
module.exports.getFiles = () => files;
