const fs = require('fs');

let settings;

//Gets settings object
module.exports.get = () => settings;

module.exports.init = () => {
  const buffer = fs.readFileSync('settings.json');
  settings = JSON.parse(buffer);
};
