const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const moduleRules = (isDev) => ({
  rules: [
    {
      test: /\.js$/,
      exclude: /node_modules/,
      use: {
        loader: "babel-loader",
        options: {
          presets: [
            [
              "@babel/preset-env",
              {
                modules: false,
                useBuiltIns: "usage",
                corejs: 3,
                targets: {
                  browsers: [">0.25%", "not dead", "not ie 11"],
                },
              },
            ],
          ],
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
            importLoaders: 1,
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
      test: /\.(png|jpe?g|gif|svg|webp|avif)$/i,
      type: "asset/resource",
      generator: {
        filename: (pathData) => {
          const filename = path.basename(pathData.filename);
          return isDev ? `images/${filename}` : `images/${filename}`;
        },
      },
    },
    {
      test: /\.(woff2?|eot|ttf|otf)$/i,
      type: "asset/resource",
      generator: {
        filename: isDev ? "fonts/[name][ext]" : "fonts/[name]-[hash][ext]",
      },
    },
  ],
});

module.exports = moduleRules;
