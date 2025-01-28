// const webpack = require("webpack");
// const webpackConfig = require("../config/webpack");
// const { WebpackManifestPlugin } = require("webpack-manifest-plugin");

// async function buildProductionAssets() {
//   console.log("\n📦 Starting production build...");

//   return new Promise((resolve, reject) => {
//     try {
//       const config = webpackConfig({}, { mode: "production" });

//       // Remove existing manifest plugin
//       config.plugins = config.plugins.filter(
//         (plugin) => plugin.constructor.name !== "WebpackManifestPlugin"
//       );

//       // Add WebpackManifestPlugin with proper configuration
//       config.plugins.push(
//         new WebpackManifestPlugin({
//           fileName: "manifest.json",
//           writeToFileEmit: true,
//           filter: (file) => !file.path.includes("hot-update"),
//           generate: (seed, files) => {
//             const manifestFiles = files.reduce((manifest, file) => {
//               if (file.path.endsWith(".map")) return manifest;

//               let key, value;

//               // Handle different file types
//               if (file.path.includes("/javascript/")) {
//                 // JavaScript files
//                 const name = file.path.split("/").pop();
//                 key = `javascript/${name.replace(/-[a-f0-9]+\.js$/, ".js")}`;
//                 value = `javascript/${name}`;
//               } else if (file.path.includes("/stylesheets/")) {
//                 // CSS/SCSS files
//                 const name = file.path.split("/").pop();
//                 key = `stylesheets/${name.replace(
//                   /-[a-f0-9]+\.css$/,
//                   ".scss"
//                 )}`;
//                 value = `stylesheets/${name}`;
//               } else if (file.path.includes("/images/")) {
//                 // Image files
//                 const name = file.name.replace(/^images\//, "");
//                 key = `images/${name}`;
//                 value = `images/${name}`;
//               } else {
//                 // Other assets
//                 key = file.name;
//                 value = file.path;
//               }

//               // Clean up paths
//               key = key
//                 .replace(/^auto\//, "")
//                 .replace(/\/+/g, "/")
//                 .replace(/^images\/images\//, "images/");

//               value = `/assets/${value
//                 .replace(/^auto\//, "")
//                 .replace(/\/+/g, "/")
//                 .replace(/^images\/images\//, "images/")}`;

//               manifest[key] = value;
//               return manifest;
//             }, {});

//             return manifestFiles;
//           },
//         })
//       );

//       webpack(config, (err, stats) => {
//         if (err) {
//           console.error("\n❌ Webpack build error:", err);
//           return reject(err);
//         }

//         if (stats.hasErrors()) {
//           const info = stats.toJson();
//           console.error("\n❌ Webpack build failed:");
//           info.errors.forEach((error) => console.error(error));
//           return reject(new Error("Webpack build failed"));
//         }

//         console.log("\n✅ Production build complete!");
//         console.log("\n📊 Build Statistics:");
//         console.log(
//           stats.toString({
//             colors: true,
//             chunks: false,
//             modules: false,
//             children: false,
//             version: false,
//             builtAt: true,
//             assets: true,
//             timings: true,
//           })
//         );

//         resolve();
//       });
//     } catch (error) {
//       console.error("\n❌ Build failed:", error);
//       reject(error);
//     }
//   });
// }

// module.exports = buildProductionAssets;

const webpack = require("webpack");
const webpackConfig = require("../config/webpack");
const { WebpackManifestPlugin } = require("webpack-manifest-plugin");

async function buildProductionAssets() {
  console.log("\n🚀 Starting production build...");

  return new Promise((resolve, reject) => {
    try {
      const config = webpackConfig({}, { mode: "production" });

      // Remove existing manifest plugin
      config.plugins = config.plugins.filter(
        (plugin) => plugin.constructor.name !== "WebpackManifestPlugin"
      );

      // Add WebpackManifestPlugin with proper configuration
      config.plugins.push(
        new WebpackManifestPlugin({
          fileName: "manifest.json",
          writeToFileEmit: true,
          filter: (file) => !file.path.includes("hot-update"),
          generate: (seed, files) => {
            const manifestFiles = files.reduce((manifest, file) => {
              if (file.path.endsWith(".map")) return manifest;

              let key, value;

              // Handle different file types
              if (file.path.includes("/javascript/")) {
                // JavaScript files
                const name = file.path.split("/").pop();
                key = `javascript/${name.replace(/-[a-f0-9]+\.js$/, ".js")}`;
                value = `javascript/${name}`;
              } else if (file.path.includes("/stylesheets/")) {
                // CSS/SCSS files
                const name = file.path.split("/").pop();
                key = `stylesheets/${name.replace(
                  /-[a-f0-9]+\.css$/,
                  ".scss"
                )}`;
                value = `stylesheets/${name}`;
              } else if (file.path.includes("/images/")) {
                // Image files
                const name = file.name.replace(/^images\//, "");
                key = `images/${name}`;
                value = `images/${name}`;
              } else {
                // Other assets
                key = file.name;
                value = file.path;
              }

              // Clean up paths
              key = key
                .replace(/^auto\//, "")
                .replace(/\/+/g, "/")
                .replace(/^images\/images\//, "images/");

              value = `/assets/${value
                .replace(/^auto\//, "")
                .replace(/\/+/g, "/")
                .replace(/^images\/images\//, "images/")}`;

              manifest[key] = value;
              return manifest;
            }, {});

            return manifestFiles;
          },
        })
      );

      webpack(config, (err, stats) => {
        if (err) {
          console.error("❌ Build failed:", err.message);
          return reject(err);
        }

        if (stats.hasErrors()) {
          const info = stats.toJson();
          console.error("❌ Build errors:");
          info.errors.forEach((error) => console.error(`- ${error.message}`));
          return reject(new Error("Build failed"));
        }

        const { assets, time } = stats.toJson();
        const jsFiles = assets.filter((a) => a.name.endsWith(".js")).length;
        const cssFiles = assets.filter((a) => a.name.endsWith(".css")).length;
        const imageFiles = assets.filter((a) =>
          /\.(png|jpe?g|gif|webp)$/i.test(a.name)
        ).length;

        console.log("\n📊 Build Summary");
        console.log(`JavaScript: ${jsFiles} files`);
        console.log(`CSS: ${cssFiles} files`);
        console.log(`Images: ${imageFiles} files`);
        console.log(`Time: ${(time / 1000).toFixed(1)}s`);
        console.log("\n✨ Build completed successfully");

        resolve();
      });
    } catch (error) {
      console.error("❌ Build error:", error.message);
      reject(error);
    }
  });
}

module.exports = buildProductionAssets;
