const webpack = require("webpack");
const getWebpackConfig = require("../config/webpack.config");

async function buildProductionAssets() {
  return new Promise((resolve, reject) => {
    const config = getWebpackConfig("production");

    webpack(config, (err, stats) => {
      if (err) {
        console.error("❌ Webpack build error:", err);
        return reject(err);
      }

      if (stats.hasErrors()) {
        const info = stats.toJson();
        console.error("❌ Webpack build failed:");
        info.errors.forEach((error) => console.error(error));
        return reject(new Error("Webpack build failed"));
      }

      console.log("\n📦 Production build complete!");
      console.log(stats.toString({ colors: true, chunks: false }));
      resolve();
    });
  });
}

module.exports = buildProductionAssets;
