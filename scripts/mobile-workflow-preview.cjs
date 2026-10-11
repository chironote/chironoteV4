// Standalone synthetic review bundle. Never imported by the production app.
process.env.BABEL_ENV = 'development';
const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const root = path.resolve(__dirname, '..');
const output = path.join(root, '.mobile-preview');
const mock = name => path.join(__dirname, 'mobile-preview', name + '.js');
webpack({ mode: 'development', devtool: false, entry: path.join(__dirname, 'mobile-preview/entry.jsx'), output: { path: output, filename: 'preview.js', publicPath: '' },
  resolve: { extensions: ['.js', '.jsx'], alias: { 'aws-amplify/auth$': mock('auth'), 'aws-amplify/api$': mock('api') } },
  plugins: [new webpack.NormalModuleReplacementPlugin(/services[\\/]patientNotes$/, mock('patientNotes')), new webpack.NormalModuleReplacementPlugin(/services[\\/]nativePlatform$/, mock('nativePlatform')), new webpack.NormalModuleReplacementPlugin(/utils[\\/]analytics$/, mock('analytics'))],
  module: { rules: [{ test: /\.[jt]sx?$/, exclude: /node_modules/, use: { loader: require.resolve('babel-loader'), options: { presets: [require.resolve('babel-preset-react-app')] } } }, { test: /\.css$/, use: [require.resolve('style-loader'), require.resolve('css-loader')] }, { test: /\.(svg|png|jpg|woff2?)$/, type: 'asset/resource' }] }
}, (error, stats) => {
  if (error || stats.hasErrors()) { console.error(error || stats.toString({ all: false, errors: true })); process.exitCode = 1; return; }
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'index.html'), '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0&amp;display=block"><title>Synthetic mobile workflow preview</title></head><body><div id="root"></div><script src="preview.js"></script></body></html>');
  console.log('Synthetic fixture ready at .mobile-preview; use #patients, #export, #capture, #clipboard, or #popup.');
});
