const path = require('path');

module.exports = {
  devtool: 'inline-source-map',
  entry: './client/init.mjs',
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.mjs$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            plugins: ['transform-object-rest-spread'],
            presets: ['react'],
          },
        },
      },
    ],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'public'),
  },
};
