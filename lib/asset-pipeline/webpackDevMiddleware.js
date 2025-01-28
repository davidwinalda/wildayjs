// const webpack = require("webpack");
// const webpackDevMiddleware = require("webpack-dev-middleware");
// const webpackHotMiddleware = require("webpack-hot-middleware");
// const createWebpackConfig = require("../config/webpack");
// const { loadWildayConfig } = require("../config");
// const path = require("path");
// const fs = require("fs");
// const StaticFileHandler = require("../staticFileHandler");
// const { log, cli } = require("../utils/chalkUtils");

// class WebpackDevServer {
//   constructor() {
//     this.compiler = null;
//     this.middleware = null;
//     this.hotMiddleware = null;
//     this.config = null;
//     this.staticHandler = new StaticFileHandler();
//     this.wildayConfig = loadWildayConfig();
//   }

//   async initialize() {
//     // Get webpack config with user customizations
//     this.config = createWebpackConfig(null, { mode: "development" });

//     // Ensure webpack is properly configured for HMR
//     if (!this.config.plugins) {
//       this.config.plugins = [];
//     }

//     // Add HMR plugins if not already present
//     if (
//       !this.config.plugins.some(
//         (p) => p instanceof webpack.HotModuleReplacementPlugin
//       )
//     ) {
//       this.config.plugins.push(
//         new webpack.HotModuleReplacementPlugin(),
//         new webpack.NoEmitOnErrorsPlugin()
//       );
//     }

//     this.compiler = webpack(this.config);

//     // Add file logging
//     this.compiler.hooks.done.tap("WildayJS", (stats) => {
//       console.log(cli.info("\n📦 Compiled Assets:"));
//       const assets = stats.compilation.getAssets();
//       assets.forEach((asset) => {
//         console.log(cli.info(`- ${asset.name}`));
//       });
//     });

//     // Configure middleware with writeToDisk for images and CSS
//     this.middleware = webpackDevMiddleware(this.compiler, {
//       publicPath: "/assets/", // Make sure this matches output.publicPath
//       serverSideRender: true,
//       writeToDisk: (filePath) => {
//         return /\.(png|jpe?g|gif|svg|webp|avif|css)$/i.test(filePath);
//       },
//       stats: "minimal",
//       index: false,
//       headers: {
//         "Access-Control-Allow-Origin": "*",
//       },
//     });

//     this.hotMiddleware = webpackHotMiddleware(this.compiler, {
//       log: console.log,
//       path: "/__webpack_hmr",
//       heartbeat: 10 * 1000,
//       timeout: 20000,
//       reload: true,
//     });

//     // Copy static images on initialization
//     await this.copyStaticImages();

//     // Wait for initial compilation
//     await new Promise((resolve) => {
//       this.middleware.waitUntilValid(() => {
//         console.log(cli.info("\n📦 Asset Pipeline Status:"));
//         console.log(cli.info("- Mode: development"));
//         console.log(cli.info("- Webpack: active"));
//         console.log(cli.info("- HMR: enabled"));
//         console.log(cli.info("- Assets: served from memory"));
//         resolve();
//       });
//     });
//   }

//   async copyStaticImages() {
//     const { paths } = this.wildayConfig.webpack;
//     const sourceDir = path.join(
//       process.cwd(),
//       paths?.assets || "app/assets",
//       "images"
//     );
//     const targetDir = path.join(
//       process.cwd(),
//       paths?.public || "public/assets",
//       "images"
//     );

//     if (!fs.existsSync(sourceDir)) {
//       return;
//     }

//     // Ensure target directory exists
//     if (!fs.existsSync(targetDir)) {
//       fs.mkdirSync(targetDir, { recursive: true });
//     }

//     // Copy all images
//     const files = fs.readdirSync(sourceDir);
//     for (const file of files) {
//       if (/\.(png|jpe?g|gif|svg|webp|avif)$/i.test(file)) {
//         const sourcePath = path.join(sourceDir, file);
//         const targetPath = path.join(targetDir, file);
//         fs.copyFileSync(sourcePath, targetPath);
//         console.log(cli.info(`📸 Copied static image: ${file}`));
//       }
//     }
//   }

//   getMiddleware() {
//     if (!this.middleware || !this.hotMiddleware) {
//       throw new Error(
//         "WebpackDevServer not initialized. Call initialize() first."
//       );
//     }
//     return [this.middleware, this.hotMiddleware];
//   }

//   isAssetRequest(req) {
//     return req.url.startsWith("/assets/") || req.url === "/__webpack_hmr";
//   }

//   async handleRequest(req, res, next) {
//     if (!this.isAssetRequest(req)) {
//       return Promise.resolve(false);
//     }

//     console.log(cli.info(`🔍 Asset Request: ${req.url}`));

//     // Handle HMR requests first
//     if (req.url === "/__webpack_hmr") {
//       return new Promise((resolve) => {
//         this.hotMiddleware(req, res, () => {
//           console.log(cli.info(`↪️ HMR handled: ${req.url}`));
//           resolve(true);
//         });
//       });
//     }

//     // Check if it's a static image request
//     if (/\.(png|jpe?g|gif|svg|webp|avif)$/i.test(req.url)) {
//       const handled = await this.staticHandler.handle(req, res);
//       if (handled) {
//         return true;
//       }
//     }

//     // Handle webpack assets
//     return new Promise((resolve) => {
//       this.middleware(req, res, () => {
//         console.log(cli.info(`↪️ Asset handled: ${req.url}`));
//         resolve(true);
//       });
//     });
//   }

//   watchImages() {
//     const { paths } = this.wildayConfig.webpack;
//     const imagesDir = path.join(
//       process.cwd(),
//       paths?.assets || "app/assets",
//       "images"
//     );
//     const targetDir = path.join(
//       process.cwd(),
//       paths?.public || "public/assets",
//       "images"
//     );

//     if (!fs.existsSync(imagesDir)) return;

//     fs.watch(imagesDir, (eventType, filename) => {
//       if (filename && /\.(png|jpe?g|gif|svg|webp|avif)$/i.test(filename)) {
//         console.log(cli.info(`📸 Image change detected: ${filename}`));
//         const sourcePath = path.join(imagesDir, filename);
//         const targetPath = path.join(targetDir, filename);

//         if (fs.existsSync(sourcePath)) {
//           fs.copyFileSync(sourcePath, targetPath);
//           console.log(cli.info(`📸 Updated static image: ${filename}`));
//         }
//       }
//     });
//   }
// }

// module.exports = WebpackDevServer;

const webpack = require("webpack");
const createWebpackConfig = require("../config/webpack");
const { loadWildayConfig } = require("../config");
const StaticFileHandler = require("../staticFileHandler");
const ImageHandler = require("./middleware/imageHandler");
const WebpackHandler = require("./middleware/webpackHandler");
const ImageWatcher = require("./utils/imageWatcher");
const { cli } = require("../utils/chalkUtils");

class WebpackDevServer {
  constructor() {
    this.wildayConfig = loadWildayConfig();
    this.setupHandlers();
  }

  setupHandlers() {
    this.staticHandler = new StaticFileHandler();
    this.imageHandler = new ImageHandler(
      this.wildayConfig.webpack?.images,
      this.staticHandler,
      this.wildayConfig
    );
  }

  async initialize() {
    try {
      const compiler = this.setupWebpack();
      this.webpackHandler = new WebpackHandler(compiler);

      const watcher = new ImageWatcher(this.wildayConfig);
      await watcher.watch();
    } catch (error) {
      console.error(cli.error("❌ Error initializing:"), error);
      throw error;
    }
  }

  setupWebpack() {
    const config = createWebpackConfig(null, { mode: "development" });
    this.addHMRPlugins(config);
    return webpack(config);
  }

  addHMRPlugins(config) {
    if (
      !config.plugins?.some(
        (p) => p instanceof webpack.HotModuleReplacementPlugin
      )
    ) {
      config.plugins = config.plugins || [];
      config.plugins.push(
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NoEmitOnErrorsPlugin()
      );
    }
  }

  async handleRequest(req, res) {
    if (!this.isAssetRequest(req)) return false;

    if (req.url === "/__webpack_hmr") {
      return this.webpackHandler.handleHMR(req, res);
    }

    return (
      (await this.imageHandler.handle(req, res)) ||
      (await this.webpackHandler.handle(req, res))
    );
  }

  isAssetRequest(req) {
    return req.url.startsWith("/assets/") || req.url === "/__webpack_hmr";
  }
}

module.exports = WebpackDevServer;
