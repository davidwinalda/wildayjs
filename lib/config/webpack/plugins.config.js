// const webpack = require("webpack");
// const MiniCssExtractPlugin = require("mini-css-extract-plugin");
// const { WebpackManifestPlugin } = require("webpack-manifest-plugin");
// const ImageOptimizationPlugin = require("../../asset-pipeline/ImageOptimizationPlugin");
// const ImageManifestPlugin = require("../../asset-pipeline/ImageManifestPlugin");

// const pluginsConfig = (isDev, { imageConfig }) => {
//   console.log("\n🔧 Plugin Config:");
//   console.log("- Image Config:", imageConfig);
//   console.log("- Environment:", isDev ? "development" : "production");

//   return [
//     new MiniCssExtractPlugin({
//       filename: isDev
//         ? "stylesheets/[name].css"
//         : "stylesheets/[name]-[contenthash].css",
//     }),
//     !isDev && new ImageOptimizationPlugin(imageConfig),
//     new WebpackManifestPlugin({
//       fileName: "manifest.json",
//       writeToFileEmit: true,
//       filter: (file) => !file.path.includes("hot-update"),
//       generate: (seed, files) => {
//         const manifestFiles = files.reduce((manifest, file) => {
//           if (file.path.endsWith(".map")) return manifest;

//           let key, value;

//           // Handle different file types
//           if (file.path.includes("/javascript/")) {
//             // JavaScript files
//             const name = file.path.split("/").pop();
//             key = `javascript/${name.replace(/-[a-f0-9]+\.js$/, ".js")}`;
//             value = `javascript/${name}`;
//           } else if (file.path.includes("/stylesheets/")) {
//             // CSS/SCSS files
//             const name = file.path.split("/").pop();
//             key = `stylesheets/${name.replace(/-[a-f0-9]+\.css$/, ".scss")}`;
//             value = `stylesheets/${name}`;
//           } else if (file.path.includes("/images/")) {
//             // Image files
//             const name = file.name.replace(/^auto\//, "");
//             key = `images/${name}`;
//             value = `images/${file.path.replace(/^auto\//, "")}`;
//           } else {
//             // Other assets
//             key = file.name.replace(/^auto\//, "");
//             value = file.path.replace(/^auto\//, "");
//           }

//           // Clean up any duplicate slashes and ensure proper path structure
//           key = key.replace(/^auto\//, "").replace(/\/+/g, "/");
//           value = value.replace(/^auto\//, "").replace(/\/+/g, "/");

//           manifest[key] = `/assets/${value}`;
//           return manifest;
//         }, {});

//         return manifestFiles;
//       },
//     }),
//     !isDev && new ImageManifestPlugin(imageConfig),
//     new webpack.DefinePlugin({
//       "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
//     }),
//   ].filter(Boolean);
// };

// module.exports = pluginsConfig;

const path = require("path");
const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { WebpackManifestPlugin } = require("webpack-manifest-plugin");
const ImageOptimizationPlugin = require("../../asset-pipeline/ImageOptimizationPlugin");
const ImageManifestPlugin = require("../../asset-pipeline/ImageManifestPlugin");
const { getConfig } = require("../../services/imageOptimizer/config");

const pluginsConfig = (isDev, { imageConfig }) => {
  // Get a clean copy of the config to ensure consistency
  const finalConfig = getConfig(imageConfig);

  const plugins = [
    new MiniCssExtractPlugin({
      filename: isDev
        ? "stylesheets/[name].css"
        : "stylesheets/[name]-[contenthash].css",
    }),

    // Only run image optimization in production
    !isDev && new ImageOptimizationPlugin(finalConfig),

    new WebpackManifestPlugin({
      fileName: "manifest.json",
      writeToFileEmit: true,
      filter: (file) => !file.path.includes("hot-update"),
      generate: (seed, files) => {
        const manifestFiles = files.reduce((manifest, file) => {
          if (file.path.endsWith(".map")) return manifest;

          let key, value;

          if (file.path.includes("/javascript/")) {
            const name = file.path.split("/").pop();
            key = `javascript/${name.replace(/-[a-f0-9]+\.js$/, ".js")}`;
            value = `javascript/${name}`;
          } else if (file.path.includes("/stylesheets/")) {
            const name = file.path.split("/").pop();
            key = `stylesheets/${name.replace(/-[a-f0-9]+\.css$/, ".scss")}`;
            value = `stylesheets/${name}`;
          } else if (file.path.includes("/images/")) {
            const name = file.name.replace(/^auto\//, "");
            key = `images/${name}`;
            value = `images/${file.path.replace(/^auto\//, "")}`;
          } else {
            key = file.name.replace(/^auto\//, "");
            value = file.path.replace(/^auto\//, "");
          }

          key = key.replace(/^auto\//, "").replace(/\/+/g, "/");
          value = value.replace(/^auto\//, "").replace(/\/+/g, "/");

          manifest[key] = `/assets/${value}`;
          return manifest;
        }, {});

        return manifestFiles;
      },
    }),

    // Add ImageManifestPlugin in production
    !isDev && new ImageManifestPlugin(finalConfig),

    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
    }),
  ].filter(Boolean);

  return plugins;
};

module.exports = pluginsConfig;
