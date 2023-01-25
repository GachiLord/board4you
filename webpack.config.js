const path = require('path');


module.exports = {
  entry: {
    main: './src/client/desktop/index.js',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'bundle'),
  },
  devtool: 'inline-source-map',
  devServer: {
    static: {
      directory: './bundle',
      serveIndex: true,
    },
    historyApiFallback: true
  },

  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: "babel-loader",
          options: {
            "presets": ["@babel/preset-react"]
          }
        }
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: ["file-loader"]
      }
    ]
  }

};