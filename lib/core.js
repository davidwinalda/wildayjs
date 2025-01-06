const path = require("path");
const fs = require("fs").promises;
const render = require("./render");
const { errorTemplates } = require("./config/paths");
const Router = require("./router");
const RequestHandler = require("./requestHandler");
const StaticFileHandler = require("./staticFileHandler");
const CssBundler = require("./asset-pipeline/cssBundler");

class WildayJS {
  constructor() {
    this.routes = {};
    this.render = render;
    this.errorTemplates = errorTemplates;
    this.router = new Router(this);
    this.staticFileHandler = new StaticFileHandler();
    this.requestHandler = new RequestHandler(this);
    this.cssBundler = new CssBundler(process.cwd());

    // Bind methods
    this.handler = this.handler.bind(this);
    this.start = this.start.bind(this);
  }

  async start() {
    console.log("\n🚀 Starting WildayJS...");
    try {
      console.log("\n🔍 Starting asset pipeline...");
      await this.cssBundler.bundle();
      if (process.env.NODE_ENV !== "production") {
        await this.cssBundler.watch();
      }
    } catch (err) {
      console.error("Failed to start asset pipeline:", err);
      throw err;
    }
  }

  draw(callback) {
    callback(this.router.routes);
  }

  handler() {
    return this.requestHandler.handle.bind(this.requestHandler);
  }
}

module.exports = WildayJS;
