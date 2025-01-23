const webpack = require("webpack");
const webpackDevMiddleware = require("webpack-dev-middleware");
const webpackHotMiddleware = require("webpack-hot-middleware");
const getWebpackConfig = require("../config/webpack.config");

class WebpackDevServer {
  constructor() {
    this.compiler = null;
    this.middleware = null;
    this.hotMiddleware = null;
    this.config = null;
  }

  async initialize() {
    this.config = getWebpackConfig("development");
    this.compiler = webpack(this.config);

    // Add file logging
    this.compiler.hooks.done.tap("WildayJS", (stats) => {
      console.log("\n📦 Compiled Assets:");
      const assets = stats.compilation.getAssets();
      assets.forEach((asset) => {
        console.log(`- ${asset.name}`);
      });
    });

    this.middleware = webpackDevMiddleware(this.compiler, {
      publicPath: this.config.output.publicPath,
      serverSideRender: true,
      writeToDisk: false,
      stats: "minimal",
      index: false,
    });

    this.hotMiddleware = webpackHotMiddleware(this.compiler, {
      log: console.log,
      path: "/__webpack_hmr",
      heartbeat: 10 * 1000,
      timeout: 20000,
    });

    // Wait for initial compilation
    await new Promise((resolve) => {
      this.middleware.waitUntilValid(() => {
        console.log("\n📦 Asset Pipeline Status:");
        console.log("- Mode: development");
        console.log("- Webpack: active");
        console.log("- HMR: enabled");
        console.log("- Assets: served from memory");
        resolve();
      });
    });
  }

  getMiddleware() {
    if (!this.middleware || !this.hotMiddleware) {
      throw new Error(
        "WebpackDevServer not initialized. Call initialize() first."
      );
    }
    return [this.middleware, this.hotMiddleware];
  }

  isAssetRequest(req) {
    return req.url.startsWith("/assets/") || req.url === "/__webpack_hmr";
  }

  async handleRequest(req, res, next) {
    if (!this.isAssetRequest(req)) {
      return Promise.resolve(false);
    }

    console.log(`🔍 Asset Request: ${req.url}`);

    const [devMiddleware, hotMiddleware] = this.getMiddleware();

    return new Promise((resolve) => {
      if (req.url === "/__webpack_hmr") {
        hotMiddleware(req, res, () => {
          console.log(`↪️ HMR handled: ${req.url}`);
          resolve(true);
        });
      } else {
        devMiddleware(req, res, () => {
          hotMiddleware(req, res, () => {
            console.log(`↪️ Asset handled: ${req.url}`);
            resolve(true);
          });
        });
      }
    });
  }
}

module.exports = WebpackDevServer;
