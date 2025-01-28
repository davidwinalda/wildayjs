const path = require("path");
const fs = require("fs").promises;
const { cli } = require("../../utils/chalkUtils");

class ImageOptimizer {
  constructor(config) {
    console.log(cli.info("\n🎨 Initializing ImageOptimizer"));
    this.config = config;
    console.log(cli.info("Config:"), this.config);
  }

  isEnabled() {
    const enabled = this.config?.dynamicOptimize;
    console.log(
      cli.info(`Image optimization ${enabled ? "enabled" : "disabled"}`)
    );
    return enabled;
  }

  async optimizeAndServe(req, res, pathResolver) {
    console.log(cli.info("\n🖼️ Starting image optimization:"), req.url);

    try {
      const query = new URL(req.url, "http://localhost").searchParams;
      const imagePath = pathResolver.resolve(req.url);
      console.log(cli.info("📂 Image path resolved:"), imagePath);

      console.log(cli.info("📥 Reading source image"));
      const buffer = await fs.readFile(imagePath);

      const options = this.getOptions(query);
      console.log(cli.info("⚙️ Optimization options:"), options);

      console.log(cli.info("🔄 Processing image"));
      const result = await this.optimize(buffer, options);

      if (!result?.buffer) {
        console.error(cli.error("❌ No result buffer"));
        return false;
      }

      console.log(cli.info("📤 Serving optimized image"), {
        originalSize: buffer.length,
        optimizedSize: result.buffer.length,
        format: result.format,
      });

      this.serveImage(res, result, imagePath);
      return true;
    } catch (error) {
      console.error(cli.error("❌ Optimization error:"), {
        error: error.message,
        stack: error.stack,
      });
      return false;
    }
  }

  getOptions(query) {
    return {
      width: query.get("w") ? parseInt(query.get("w")) : null,
      height: query.get("h") ? parseInt(query.get("h")) : null,
      format: query.get("format"),
      quality: query.get("q") ? parseInt(query.get("q")) : null,
    };
  }

  async optimize(buffer, options) {
    console.log(cli.info("🔄 Optimizing with options:"), options);
    return await this.config.dynamicOptimize(buffer, options);
  }

  serveImage(res, result, imagePath) {
    const format = result.format || path.extname(imagePath).slice(1);
    const contentType = `image/${format.toLowerCase().replace("jpg", "jpeg")}`;

    console.log(cli.info("📤 Setting response headers:"), {
      contentType,
      size: result.buffer.length,
    });

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000");
    res.setHeader("Content-Length", result.buffer.length);
    res.end(result.buffer);
  }
}

module.exports = ImageOptimizer;
