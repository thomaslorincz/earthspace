'use strict';

const path = require('path');
const webpack = require('webpack');
const ejsPlugin = require('ejs-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  devServer: {
    port: 8080,
    open: true,
    hot: true,
    watchOptions: {
      poll: true
    }
  },
  node: {
    fs: 'empty',
    net: 'empty'
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader'
      },
      // {
      //   test: /\.js$/,
      //   use: 'eslint-loader',
      //   enforce: 'pre'
      // }
    ]
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new ejsPlugin({
      context: __dirname,
      entry: {
        '../views/src/index.ejs': {
          output: './views/src'
        }
      }
    })
  ]
};