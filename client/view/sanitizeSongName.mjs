/** Receives the original file name (without extension) and returns a representation for display in the UI. */
export default function sanitizeSongName(name) {
  return name.replace(/ - /gu, ' – ');
}
