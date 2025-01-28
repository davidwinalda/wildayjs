// const { cli } = require("../../utils/chalkUtils");
// const ImagePathResolver = require("../utils/imagePathResolver");
// const ImageOptimizer = require("../../services/imageOptimizer");

// class ImageHandler {
//   constructor(imageOptimizer, staticHandler, wildayConfig) {
//     console.log(cli.info("\n📸 Initializing ImageHandler"));
//     // Create optimizer instance with the config
//     this.optimizer = new ImageOptimizer(imageOptimizer || {});
//     this.pathResolver = new ImagePathResolver(wildayConfig);
//     this.staticHandler = staticHandler;

//     // Initialize cache directory
//     this.optimizer.ensureCacheDir().catch((error) => {
//       console.error(cli.error("Cache directory initialization failed:"), error);
//     });
//   }

//   async handle(req, res) {
//     if (!this.isImageRequest(req)) {
//       console.log(cli.info("❌ Not an image request"));
//       return false;
//     }

//     try {
//       console.log(cli.info("🔄 Trying static handler first"));
//       if (await this.staticHandler.handle(req, res)) {
//         console.log(cli.info("✅ Served by static handler"));
//         return true;
//       }

//       if (this.optimizer.config.dynamicOptimize) {
//         console.log(cli.info("🎨 Attempting image optimization"));
//         const imagePath = this.pathResolver.resolve(req.url);
//         const query = new URL(req.url, "http://localhost").searchParams;

//         const options = {
//           width: query.get("w") ? parseInt(query.get("w")) : null,
//           height: query.get("h") ? parseInt(query.get("h")) : null,
//           format: query.get("format"),
//           quality: query.get("q")
//             ? parseInt(query.get("q"))
//             : this.optimizer.config.quality,
//         };

//         const result = await this.optimizer.dynamicOptimize(imagePath, options);

//         if (result?.buffer) {
//           const format = result.format || path.extname(imagePath).slice(1);
//           res.setHeader(
//             "Content-Type",
//             `image/${format.toLowerCase().replace("jpg", "jpeg")}`
//           );
//           res.setHeader("Cache-Control", "public, max-age=31536000");
//           res.setHeader("Content-Length", result.buffer.length);
//           res.end(result.buffer);
//           console.log(cli.info("✅ Image optimized and served"));
//           return true;
//         }
//       } else {
//         console.log(cli.info("⚠️ Image optimization disabled"));
//       }
//     } catch (error) {
//       console.error(cli.error("\n❌ Image handling error:"), {
//         url: req.url,
//         error: error.message,
//         stack: error.stack,
//       });
//     }
//     return false;
//   }

//   isImageRequest(req) {
//     const url = new URL(req.url, "http://localhost");
//     const isImage = /\.(png|jpe?g|gif|svg|webp|avif)$/i.test(url.pathname);
//     const query = url.searchParams;
//     const hasParams =
//       query.has("w") || query.has("h") || query.has("format") || query.has("q");

//     console.log(cli.info("🔍 Image request check:"), {
//       url: req.url,
//       isImage,
//       hasParams,
//       params: Object.fromEntries(query.entries()),
//     });

//     return isImage && hasParams;
//   }
// }

// module.exports = ImageHandler;

const { cli } = require("../../utils/chalkUtils");
const ImagePathResolver = require("../utils/imagePathResolver");
const ImageOptimizer = require("../../services/imageOptimizer");
const path = require("path");

class ImageHandler {
  constructor(imageOptimizer, staticHandler, wildayConfig) {
    console.log(cli.info("\n📸 Initializing ImageHandler"));

    // Create optimizer instance with the config
    this.optimizer = new ImageOptimizer(imageOptimizer || {});
    this.pathResolver = new ImagePathResolver(wildayConfig);
    this.staticHandler = staticHandler;

    // Log the configuration
    console.log(cli.info("🔧 Image Handler Config:"), {
      dynamicOptimize: this.optimizer.config.dynamicOptimize,
      quality: this.optimizer.config.quality,
      formats: this.optimizer.config.formats,
    });

    // Initialize cache directory
    this.optimizer.ensureCacheDir().catch((error) => {
      console.error(cli.error("Cache directory initialization failed:"), error);
    });
  }

  async handle(req, res) {
    if (!this.isImageRequest(req)) {
      console.log(cli.info("❌ Not an image request"));
      return false;
    }

    try {
      console.log(cli.info("🔄 Trying static handler first"));
      if (await this.staticHandler.handle(req, res)) {
        console.log(cli.info("✅ Served by static handler"));
        return true;
      }

      // Check if dynamic optimization is enabled
      if (!this.optimizer.config.dynamicOptimize) {
        console.log(cli.info("⚠️ Dynamic image optimization disabled"));
        return false;
      }

      console.log(cli.info("🎨 Attempting image optimization"));
      const imagePath = this.pathResolver.resolve(req.url);
      const query = new URL(req.url, "http://localhost").searchParams;

      const options = {
        width: query.get("w") ? parseInt(query.get("w")) : null,
        height: query.get("h") ? parseInt(query.get("h")) : null,
        format: query.get("format"),
        quality: query.get("q")
          ? parseInt(query.get("q"))
          : this.optimizer.config.quality,
      };

      console.log(cli.info("🔧 Optimization options:"), options);

      const result = await this.optimizer.dynamicOptimize(imagePath, options);

      if (result?.buffer) {
        const format = result.format || path.extname(imagePath).slice(1);
        res.setHeader(
          "Content-Type",
          `image/${format.toLowerCase().replace("jpg", "jpeg")}`
        );
        res.setHeader("Cache-Control", "public, max-age=31536000");
        res.setHeader("Content-Length", result.buffer.length);
        res.end(result.buffer);
        console.log(cli.info("✅ Image optimized and served"));
        return true;
      } else {
        console.log(cli.warn("⚠️ No optimized image buffer returned"));
        return false;
      }
    } catch (error) {
      console.error(cli.error("\n❌ Image handling error:"), {
        url: req.url,
        error: error.message,
        stack: error.stack,
      });
      return false;
    }
  }

  isImageRequest(req) {
    const url = new URL(req.url, "http://localhost");
    const isImage = /\.(png|jpe?g|gif|svg|webp|avif)$/i.test(url.pathname);
    const query = url.searchParams;
    const hasParams =
      query.has("w") || query.has("h") || query.has("format") || query.has("q");

    console.log(cli.info("🔍 Image request check:"), {
      url: req.url,
      isImage,
      hasParams,
      params: Object.fromEntries(query.entries()),
    });

    return isImage && hasParams;
  }
}

module.exports = ImageHandler;
