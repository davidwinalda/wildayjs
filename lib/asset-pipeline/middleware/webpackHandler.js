const webpack = require("webpack");
const webpackDevMiddleware = require("webpack-dev-middleware");
const webpackHotMiddleware = require("webpack-hot-middleware");
const { cli } = require("../../utils/chalkUtils");

class WebpackHandler {
  constructor(compiler) {
    this.setupMiddleware(compiler);
  }

  setupMiddleware(compiler) {
    this.middleware = webpackDevMiddleware(compiler, {
      publicPath: "/assets/",
      serverSideRender: true,
      writeToDisk: (filePath) => /\.(css)$/i.test(filePath),
      stats: "minimal",
      headers: { "Access-Control-Allow-Origin": "*" },
    });

    this.hotMiddleware = webpackHotMiddleware(compiler, {
      path: "/__webpack_hmr",
      heartbeat: 10 * 1000,
      timeout: 20000,
    });
  }

  async handle(req, res) {
    return new Promise((resolve) => {
      this.middleware(req, res, () => {
        console.log(cli.info(`↪️ Webpack: ${req.url}`));
        resolve(true);
      });
    });
  }

  async handleHMR(req, res) {
    return new Promise((resolve) => {
      this.hotMiddleware(req, res, () => resolve(true));
    });
  }
}

module.exports = WebpackHandler;
