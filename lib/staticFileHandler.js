// const path = require("path");
// const fs = require("fs").promises;

// class StaticFileHandler {
//   constructor() {
//     this.staticExtensions = {
//       ".css": "text/css",
//       ".js": "application/javascript",
//       ".png": "image/png",
//       ".jpg": "image/jpeg",
//       ".jpeg": "image/jpeg",
//       ".gif": "image/gif",
//     };
//   }

//   async handle(req, res) {
//     const filePath = path.join(process.cwd(), "public", req.url);
//     const ext = path.extname(filePath);

//     try {
//       const content = await fs.readFile(filePath);
//       res.writeHead(200, {
//         "Content-Type": this.staticExtensions[ext] || "text/plain",
//         "Cache-Control": "public, max-age=31536000",
//       });
//       res.end(content);
//       return true;
//     } catch (err) {
//       console.error("Static file error:", err);
//       if (err.code === "ENOENT") {
//         console.log(`Static file not found: ${filePath}`);
//       } else {
//         throw err;
//       }
//       return false;
//     }
//   }
// }

// module.exports = StaticFileHandler;

const path = require("path");
const fs = require("fs").promises;
const mime = require("mime-types");

class StaticFileHandler {
  constructor() {
    this.publicDir = path.join(process.cwd(), "public");
  }

  async loadManifest() {
    try {
      const manifestPath = path.join(this.publicDir, "assets", "manifest.json");
      const manifestContent = await fs.readFile(manifestPath, "utf8");
      return JSON.parse(manifestContent);
    } catch (err) {
      console.log("📁 No manifest found:", err.message);
      return null;
    }
  }

  async handle(req, res) {
    try {
      const cleanUrl = decodeURIComponent(req.url.split("?")[0]);
      const isAssetRequest = cleanUrl.startsWith("/assets/");

      // In production, check manifest for asset paths
      if (isAssetRequest && process.env.NODE_ENV === "production") {
        const manifest = await this.loadManifest();
        if (manifest) {
          // Remove /assets/ prefix to match manifest keys
          const assetKey = cleanUrl.replace(/^\/assets\//, "");
          const manifestPath = manifest[assetKey];

          if (manifestPath) {
            // Use the full path from manifest
            const filePath = path.join(
              this.publicDir,
              manifestPath.replace(/^\/assets\//, "")
            );
            console.log("🔍 Serving asset from manifest:", filePath);

            const stats = await fs.stat(filePath);
            if (stats.isFile()) {
              const content = await fs.readFile(filePath);
              const contentType =
                mime.lookup(filePath) || "application/octet-stream";

              res.writeHead(200, {
                "Content-Type": contentType,
                "Content-Length": stats.size,
                "Cache-Control": "public, max-age=31536000",
              });

              res.end(content);
              return true;
            }
          }
        }
      }

      // Handle regular static files (non-assets or development mode)
      const filePath = path.join(this.publicDir, cleanUrl);

      try {
        const stats = await fs.stat(filePath);
        if (stats.isFile()) {
          console.log("✅ Static file found:", filePath);
          const content = await fs.readFile(filePath);
          const contentType =
            mime.lookup(filePath) || "application/octet-stream";

          res.writeHead(200, {
            "Content-Type": contentType,
            "Content-Length": stats.size,
            "Cache-Control":
              process.env.NODE_ENV === "development"
                ? "no-cache"
                : "public, max-age=31536000",
          });

          res.end(content);
          return true;
        }
      } catch (err) {
        console.log("❌ Static file not found:", filePath);
      }

      return false;
    } catch (err) {
      console.error("Static file handler error:", err);
      return false;
    }
  }
}

module.exports = StaticFileHandler;
