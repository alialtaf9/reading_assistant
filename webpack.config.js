const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  devtool: false, // Remove source maps for simplicity
  entry: {
    'background/background': './src/background/background.ts',
    'content/contentScript': './src/content/contentScript.ts',
    'overlay-ui/overlay': './src/overlay-ui/overlay.tsx',
    'popup': './src/popup.js'  // Add popup.js as an entry point
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
        { from: 'popup.html', to: 'popup.html' }  // Copy popup.html
      ],
    }),
    new HtmlWebpackPlugin({
      template: './src/overlay-ui/index.html',
      filename: 'overlay-ui/index.html',
      chunks: ['overlay-ui/overlay'],
    }),
  ],
}; 