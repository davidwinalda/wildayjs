const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const { WebpackManifestPlugin } = require("webpack-manifest-plugin");
const webpack = require("webpack");

module.exports = (env = "development") => {
  const isDev = env === "development";

  console.log("\n🔧 Webpack Config:");
  console.log("- Environment:", env);
  console.log("- Development Mode:", isDev);

  const config = {
    mode: env,
    entry: {
      application: [
        isDev &&
          "webpack-hot-middleware/client?path=/__webpack_hmr&timeout=20000&reload=true",
        path.resolve(process.cwd(), "app/assets/javascript/application.js"),
        path.resolve(process.cwd(), "app/assets/stylesheets/application.scss"),
      ].filter(Boolean),
    },
    output: {
      path: path.resolve(process.cwd(), "public/assets"),
      filename: "javascript/[name].js",
      publicPath: "/assets/",
      clean: !isDev,
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env"],
              cacheDirectory: true,
            },
          },
        },
        {
          test: /\.s[ac]ss$/i,
          use: [
            {
              loader: MiniCssExtractPlugin.loader,
              options: {
                publicPath: "../",
              },
            },
            {
              loader: "css-loader",
              options: {
                sourceMap: isDev,
              },
            },
            {
              loader: "sass-loader",
              options: {
                sourceMap: isDev,
                api: "modern",
                implementation: require("sass"),
                sassOptions: {
                  outputStyle: isDev ? "expanded" : "compressed",
                },
              },
            },
          ],
        },
        {
          test: /\.(png|jpe?g|gif|svg|webp)$/i,
          type: "asset/resource",
          generator: {
            filename: "images/[name]-[hash][ext]",
          },
        },
        {
          test: /\.(woff2?|eot|ttf|otf)$/i,
          type: "asset/resource",
          generator: {
            filename: "fonts/[name]-[hash][ext]",
          },
        },
      ],
    },
    optimization: {
      minimize: !isDev,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            format: {
              comments: false,
            },
          },
          extractComments: false,
        }),
        new CssMinimizerPlugin(),
      ],
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: "stylesheets/[name].css",
      }),
      isDev && new webpack.HotModuleReplacementPlugin(),
      !isDev &&
        new WebpackManifestPlugin({
          fileName: "manifest.json",
          publicPath: "/assets/",
          writeToFileEmit: true,
        }),
      new webpack.DefinePlugin({
        "process.env.NODE_ENV": JSON.stringify(env),
      }),
    ].filter(Boolean),
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
    },
    resolve: {
      extensions: [".js", ".scss", ".css"],
    },
  };

  if (isDev) {
    config.plugins.push(
      new webpack.ProgressPlugin((percentage, message, ...args) => {
        console.log(`${(percentage * 100).toFixed(2)}%`, message, ...args);
      })
    );
  }

  return config;
};
