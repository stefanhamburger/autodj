// A wrapper for reading & parsing the settings.json file and returning the settings

import fs from 'fs';

/**
* @typedef Settings
* @property {Object} collections An object where each member is the name of a song collection, and the value is the file path to that collection
*/

let settings;

//Gets settings object
export function get() {
  return settings;
}

/**
 * Reads the settings file and stores it in memory.
 * @returns {undefined}
 */
export function init() {
  /** @type {string} */
  const buffer = fs.readFileSync('settings.json');
  settings = JSON.parse(buffer);
}
