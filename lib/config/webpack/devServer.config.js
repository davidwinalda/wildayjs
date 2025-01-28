const path = require("path");

const devServerConfig = {
  hot: true,
  client: {
    overlay: false,
  },
  headers: {
    "Access-Control-Allow-Origin": "*",
  },
  static: {
    directory: path.join(process.cwd(), "public"),
    publicPath: "/assets/",
  },
  devMiddleware: {
    publicPath: "/assets/",
    writeToDisk: false,
  },
};

module.exports = devServerConfig;
