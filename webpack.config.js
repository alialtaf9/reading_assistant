const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map', // Add source maps for debugging
  entry: {
    'background/background': './src/background/background.ts',
    'content/contentScript': './src/content/contentScript.ts',
    'overlay-ui/overlay': './src/overlay-ui/overlay.tsx',
    'popup': './src/popup.js'  // Entry point for popup
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true // Clean output directory before build
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'assets', to: 'assets' },
        { from: 'popup.html', to: 'popup.html' }  // Copy popup.html for completeness
      ],
    }),
    new HtmlWebpackPlugin({
      template: './src/overlay-ui/index.html',
      filename: 'overlay-ui/index.html',
      chunks: ['overlay-ui/overlay'],
    }),
    // Keep this HtmlWebpackPlugin for popup.html but only use it when needed
    // for development purposes, not for primary functionality
    new HtmlWebpackPlugin({
      template: './popup.html',
      filename: 'popup.html',
      chunks: ['popup'],
      inject: false,
    }),
  ],
}; 