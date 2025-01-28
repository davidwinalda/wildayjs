// const path = require("path");

// const baseConfig = (isDev) => ({
//   mode: isDev ? "development" : "production",
//   entry: {
//     application: [
//       isDev &&
//         "webpack-hot-middleware/client?path=/__webpack_hmr&timeout=20000&reload=true&overlay=true",
//       path.resolve(process.cwd(), "app/assets/javascript/application.js"),
//       path.resolve(process.cwd(), "app/assets/stylesheets/application.scss"),
//     ].filter(Boolean),
//   },
//   output: {
//     path: path.resolve(process.cwd(), "public/assets"),
//     filename: isDev
//       ? "javascript/[name].js"
//       : "javascript/[name]-[contenthash].js",
//     publicPath: "/assets/",
//     clean: !isDev,
//     assetModuleFilename: isDev
//       ? "images/[name][ext]"
//       : "images/[name]-[hash][ext]",
//     hotUpdateChunkFilename: "hot/[id].[fullhash].hot-update.js",
//     hotUpdateMainFilename: "hot/[fullhash].hot-update.json",
//   },
// });

// module.exports = baseConfig;

const path = require("path");
const webpack = require("webpack");

const baseConfig = (isDev) => {
  const config = {
    mode: isDev ? "development" : "production",
    entry: {
      application: [
        path.resolve(process.cwd(), "app/assets/javascript/application.js"),
        path.resolve(process.cwd(), "app/assets/stylesheets/application.scss"),
      ],
    },
    output: {
      path: path.resolve(process.cwd(), "public/assets"),
      filename: isDev
        ? "javascript/[name].js"
        : "javascript/[name]-[contenthash].js",
      publicPath: "/assets/",
      clean: !isDev,
      assetModuleFilename: isDev
        ? "images/[name][ext]"
        : "images/[name]-[hash][ext]",
      hotUpdateChunkFilename: "hot/[id].[fullhash].hot-update.js",
      hotUpdateMainFilename: "hot/[fullhash].hot-update.json",
    },
    optimization: {
      runtimeChunk: {
        name: "runtime",
      },
      splitChunks: {
        chunks: "all",
        cacheGroups: {
          defaultVendors: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
            enforce: true,
          },
        },
      },
    },
    plugins: [],
  };

  if (isDev) {
    // Add HMR entry point in development
    config.entry.application.unshift(
      "webpack-hot-middleware/client?path=/__webpack_hmr&timeout=20000&reload=true&name=application&overlay=true"
    );

    // Add development plugins
    config.plugins.push(
      new webpack.HotModuleReplacementPlugin(),
      new webpack.NoEmitOnErrorsPlugin()
    );
  }

  return config;
};

module.exports = baseConfig;
