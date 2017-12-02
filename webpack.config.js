const path = require('path');

module.exports = {
  entry: './client/init.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'public'),
  },
};
