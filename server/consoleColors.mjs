/**
 * Output colors in the Node.js console to improve debugging
 * For more colors, see https://en.wikipedia.org/wiki/ANSI_escape_code#Colors
 */

export const green = text => `\x1b[0;32m${text}\x1b[0m`;
export const magenta = text => `\x1b[0;35m${text}\x1b[0m`;
export const cyan = text => `\x1b[0;36m${text}\x1b[0m`;
