const path = require("path");
const fs = require("fs").promises;

class StaticFileHandler {
  constructor() {
    this.staticExtensions = {
      ".css": "text/css",
      ".js": "application/javascript",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
    };
  }

  async handle(req, res) {
    const filePath = path.join(process.cwd(), "public", req.url);
    const ext = path.extname(filePath);

    try {
      const content = await fs.readFile(filePath);
      res.writeHead(200, {
        "Content-Type": this.staticExtensions[ext] || "text/plain",
        "Cache-Control": "public, max-age=31536000",
      });
      res.end(content);
      return true;
    } catch (err) {
      console.error("Static file error:", err);
      if (err.code === "ENOENT") {
        console.log(`Static file not found: ${filePath}`);
      } else {
        throw err;
      }
      return false;
    }
  }
}

module.exports = StaticFileHandler;
