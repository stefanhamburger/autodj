const path = require('path');

module.exports = {
  devtool: 'inline-source-map',
  entry: './client/init.js',
  module: {
    loaders: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
      },
    ],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'public'),
  },
  resolve: { extensions: ['.mjs', '.js'] },
};
