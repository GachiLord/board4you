const path = require('path');


module.exports = () => {
  return {
    entry: {
      desktop: './src/entries/editor.tsx',
      'pdf': 'pdfjs-dist/legacy/build/pdf',
      'pdf.worker': 'pdfjs-dist/build/pdf.worker.min'
    },
    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, 'bundles'),
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],    
    },
    devtool: 'inline-source-map',
    devServer: {
      static: {
        directory: './bundles',
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
              "presets": ["@babel/preset-typescript"]
            }
          }
        },
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
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
    },
  };
}