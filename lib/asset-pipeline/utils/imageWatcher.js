const path = require("path");
const fs = require("fs").promises;
const fsSync = require("fs");
const { cli } = require("../../utils/chalkUtils");

class ImageWatcher {
  constructor(config) {
    this.config = config;
  }

  async watch() {
    const { sourceDir, targetDir } = this.getPaths();
    if (!fsSync.existsSync(sourceDir)) return;

    fsSync.watch(sourceDir, async (_, filename) => {
      if (!this.isImage(filename)) return;
      await this.copyImage(filename, sourceDir, targetDir);
    });
  }

  getPaths() {
    const { paths } = this.config.webpack;
    return {
      sourceDir: path.join(
        process.cwd(),
        paths?.assets || "app/assets",
        "images"
      ),
      targetDir: path.join(
        process.cwd(),
        paths?.public || "public/assets",
        "images"
      ),
    };
  }

  isImage(filename) {
    return filename && /\.(png|jpe?g|gif|svg|webp|avif)$/i.test(filename);
  }

  async copyImage(filename, sourceDir, targetDir) {
    try {
      const sourcePath = path.join(sourceDir, filename);
      const targetPath = path.join(targetDir, filename);

      if (fsSync.existsSync(sourcePath)) {
        await fs.copyFile(sourcePath, targetPath);
        console.log(cli.info(`✅ Updated: ${filename}`));
      }
    } catch (error) {
      console.error(cli.error(`Error updating ${filename}:`), error);
    }
  }
}

module.exports = ImageWatcher;
