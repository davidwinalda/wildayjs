// const baseConfig = require("./base.config");
// const moduleRules = require("./module.rules");
// const optimizationConfig = require("./optimization.config");
// const pluginsConfig = require("./plugins.config");
// const devServerConfig = require("./devServer.config");
// const config = require("../index");
// const webpack = require("webpack");
// const path = require("path");

// const createWebpackConfig = (env, argv) => {
//   const isDev = process.env.NODE_ENV === "development";
//   const userWebpackConfig = config.webpack || {};
//   const mode = argv?.mode || process.env.NODE_ENV || "development";

//   // Get user's image config and only add absolute paths
//   const imageConfig = {
//     ...userWebpackConfig.images,
//     sourceDir: path.join(
//       process.cwd(),
//       userWebpackConfig.paths?.assets || "app/assets",
//       "images"
//     ),
//     outputDir: path.join(
//       process.cwd(),
//       userWebpackConfig.paths?.public || "public/assets",
//       "images"
//     ),
//   };

//   console.log("\n🔧 Webpack Config:");
//   console.log("- Environment:", mode);
//   console.log("- Development Mode:", isDev);
//   console.log("- Image Config:", imageConfig);

//   const plugins = [
//     ...pluginsConfig(isDev, { imageConfig }),
//     new webpack.LoaderOptionsPlugin({
//       options: {
//         imageOptimization: imageConfig,
//       },
//     }),
//     new webpack.DefinePlugin({
//       "process.env.NODE_ENV": JSON.stringify(mode),
//     }),
//   ];

//   const mergedConfig = {
//     ...baseConfig(isDev),
//     mode,
//     module: moduleRules(isDev),
//     optimization: {
//       ...optimizationConfig(isDev, { imageConfig }),
//       ...userWebpackConfig.optimization,
//     },
//     plugins,
//     devtool: isDev ? "eval-source-map" : "source-map",
//     stats: {
//       colors: true,
//       modules: false,
//       children: false,
//       chunks: false,
//       chunkModules: false,
//       assets: true,
//     },
//     cache: {
//       type: "memory",
//     },
//     watchOptions: {
//       ignored: /node_modules/,
//       aggregateTimeout: 300,
//       poll: 1000,
//     },
//     resolve: {
//       extensions: [".js", ".scss", ".css"],
//       ...(userWebpackConfig.resolve || {}),
//     },
//     performance: {
//       hints: isDev ? false : "warning",
//       maxEntrypointSize: 512000,
//       maxAssetSize: 512000,
//       ...(userWebpackConfig.performance || {}),
//     },
//     output: {
//       ...baseConfig(isDev).output,
//       clean: true,
//     },
//   };

//   if (isDev) {
//     mergedConfig.devServer = {
//       ...devServerConfig,
//       ...(userWebpackConfig.devServer || {}),
//     };
//   }

//   return mergedConfig;
// };

// module.exports = createWebpackConfig;

const baseConfig = require("./base.config");
const moduleRules = require("./module.rules");
const optimizationConfig = require("./optimization.config");
const pluginsConfig = require("./plugins.config");
const devServerConfig = require("./devServer.config");
const config = require("../index");
const webpack = require("webpack");
const path = require("path");

const createWebpackConfig = (env, argv) => {
  const isDev = process.env.NODE_ENV === "development";
  const userWebpackConfig = config.webpack || {};
  const mode = argv?.mode || process.env.NODE_ENV || "development";

  // Get user's image config and only add absolute paths
  const imageConfig = {
    ...userWebpackConfig.images,
    sourceDir: path.join(
      process.cwd(),
      userWebpackConfig.paths?.assets || "app/assets",
      "images"
    ),
    outputDir: path.join(
      process.cwd(),
      userWebpackConfig.paths?.public || "public/assets",
      "images"
    ),
  };

  const plugins = [
    ...pluginsConfig(isDev, { imageConfig }),
    new webpack.LoaderOptionsPlugin({
      options: {
        imageOptimization: imageConfig,
      },
    }),
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify(mode),
    }),
  ];

  const mergedConfig = {
    ...baseConfig(isDev),
    mode,
    module: moduleRules(isDev),
    optimization: {
      ...optimizationConfig(isDev, { imageConfig }),
      ...userWebpackConfig.optimization,
    },
    plugins,
    devtool: isDev ? "eval-source-map" : "source-map",
    stats: {
      colors: true,
      modules: false,
      children: false,
      chunks: false,
      chunkModules: false,
      assets: true,
    },
    cache: {
      type: "memory",
    },
    watchOptions: {
      ignored: /node_modules/,
      aggregateTimeout: 300,
      poll: 1000,
    },
    resolve: {
      extensions: [".js", ".scss", ".css"],
      ...(userWebpackConfig.resolve || {}),
    },
    performance: {
      hints: isDev ? false : "warning",
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
      ...(userWebpackConfig.performance || {}),
    },
    output: {
      ...baseConfig(isDev).output,
      clean: true,
    },
  };

  if (isDev) {
    mergedConfig.devServer = {
      ...devServerConfig,
      ...(userWebpackConfig.devServer || {}),
    };
  }

  return mergedConfig;
};

module.exports = createWebpackConfig;
