const webpack = require('webpack');
const path = require('path');
const argv = require('yargs').argv;
const glob = require('glob');
const address = require('address');

const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const PreloadWebpackPlugin = require('preload-webpack-plugin');
const SpriteLoaderPlugin = require('svg-sprite-loader/plugin');

const isDevelopment = argv.mode === 'development';
const isProduction = !isDevelopment;
const distPath = path.join(__dirname, '/public');

const isCompressCss = true;

const plugins = [
  new MiniCssExtractPlugin({
    filename: '[name].css',
    chunkFilename: '[id].css',
  }),

  ...glob.sync('./src/*.html').map(
    (html) =>
      new HtmlWebpackPlugin({
        filename: path.basename(html),
        template: html,
        chunks: ['main', `${path.basename(html).replace(/\.[^.]+$/, '')}`],
      })
  ),

  new PreloadWebpackPlugin({
    rel: 'preload',
    as(entry) {
      if (/\.(woff|woff2)$/.test(entry)) return 'font';
    },
    fileWhitelist: [/\.(woff|woff2)$/],
    include: 'allAssets',
  }),

  new SpriteLoaderPlugin(),
];

const config = {
  // source-map
  devtool: isDevelopment ? 'inline-source-map' : 'none',

  // pages
  entry: {
    main: './src/js/_main.js',
    index: './src/js/_index.js',
  },
  output: {
    filename: (chunkData) => {
      return chunkData.chunk.name === 'main' ? 'js/bundle.js' : 'js/[name].js';
    },
    path: distPath,
  },
  module: {
    rules: [
      {
        test: /\.html$/,
        use: 'html-loader?interpolate',
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
          },
        ],
      },
      {
        test: /\.scss$/,
        exclude: /node_modules/,
        use: [
          isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              plugins: [
                isProduction && isCompressCss ? require('cssnano') : () => {},
                require('autoprefixer')({
                  overrideBrowserslist: ['last 2 versions'],
                }),
              ],
            },
          },
          {
            loader: 'sass-loader',
            options: {
              minimize: isCompressCss,
              outputStyle: 'expanded',
            },
          },
        ],
      },
      {
        test: /\.(gif|png|jpe?g|)$/i,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: 'images/[name].[ext]',
            },
          },
          {
            loader: 'image-webpack-loader',
            options: {
              mozjpeg: {
                progressive: true,
                quality: 100,
              },
              optipng: {
                enabled: true,
              },
              pngquant: {
                quality: 100,
                speed: 1,
              },
            },
          },
        ],
      },
      {
        test: /\.(eot|ttf|woff|woff2)$/,
        use: {
          loader: 'file-loader',
          options: {
            name: 'fonts/[name].[ext]',
          },
        },
      },
      {
        test: /\.svg$/,
        use: [
          {
            loader: 'svg-sprite-loader',
          },
        ],
        include: [path.resolve(__dirname, 'src/svg')],
      },
      {
        test: /\.svg$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: 'images/[name].[ext]',
            },
          },
        ],
        include: [path.resolve(__dirname, 'src/img'), path.resolve(__dirname, 'node_modules')],
      },
    ],
  },
  plugins: isDevelopment ? [...plugins, new webpack.HotModuleReplacementPlugin()] : [...plugins],
  optimization: isProduction
    ? {
        minimizer: [
          new UglifyJsPlugin({
            sourceMap: false,
            parallel: true,
            uglifyOptions: {
              compress: {
                inline: false,
                drop_console: true,
              },
            },
          }),
        ],
      }
    : {},
  devServer: {
    contentBase: distPath,
    compress: !isDevelopment,
    hot: isDevelopment,
    open: true,
    inline: true,
    host: address.ip(),
    proxy: {
      '/api/**': {
        target: `${address.ip()}:9000`,
        secure: false,
        changeOrigin: true,
      },
    },
    before(app, server) {
      // https://github.com/webpack/webpack-dev-server/issues/1271#issuecomment-379792541
      server._watch(`./src/*.html`);
    },
  },
};

module.exports = config;
