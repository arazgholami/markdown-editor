const path = require('path');

module.exports = {
  entry: './wysiwyg-markdown-editor.js',
  output: {
    filename: 'wysiwyg-markdown-editor.bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'development', // Can be changed to 'production' for minified output
};
