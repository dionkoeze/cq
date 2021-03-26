const path = require('path')

module.exports = {
    entry: './frontend/client.js',
    output: {
      filename: 'bundle.js',
      path: path.resolve(__dirname),
    //   path: path.resolve(__dirname, 'dist'),
    },
}