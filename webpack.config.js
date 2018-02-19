const path = require('path');

module.exports = {
  devtool: 'inline-source-map',
  entry: './client/init.mjs',
  module: {
    loaders: [
      {
        test: /\.mjs$/,
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
