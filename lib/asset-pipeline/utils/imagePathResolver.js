const path = require("path");
const fsSync = require("fs");
const { cli } = require("../../utils/chalkUtils");

class ImagePathResolver {
  constructor(wildayConfig) {
    console.log(cli.info("\n📂 Initializing ImagePathResolver"));
    this.config = wildayConfig.webpack;
    console.log(cli.info("Config paths:"), {
      assets: this.config.paths?.assets || "app/assets",
      public: this.config.paths?.public || "public/assets",
    });
  }

  resolve(urlPath) {
    console.log(cli.info("\n🔍 Resolving image path:"), urlPath);

    const cleanPath = this.cleanUrlPath(urlPath);
    console.log(cli.info("Clean path:"), cleanPath);

    const possiblePaths = this.getPossiblePaths(cleanPath);
    console.log(cli.info("Checking paths:"), possiblePaths);

    for (const fullPath of possiblePaths) {
      if (fsSync.existsSync(fullPath)) {
        console.log(cli.info("✅ Found at:"), fullPath);
        return fullPath;
      }
      console.log(cli.info("❌ Not found at:"), fullPath);
    }

    throw new Error(`Image not found: ${cleanPath}`);
  }

  cleanUrlPath(urlPath) {
    return new URL(urlPath, "http://localhost").pathname
      .replace(/^\/assets\//, "")
      .split("?")[0];
  }

  getPossiblePaths(cleanPath) {
    const { paths } = this.config;
    return [
      path.join(process.cwd(), paths?.assets || "app/assets", cleanPath),
      path.join(process.cwd(), paths?.public || "public/assets", cleanPath),
    ];
  }
}

module.exports = ImagePathResolver;
