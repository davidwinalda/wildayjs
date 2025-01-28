// const path = require("path");
// const fs = require("fs").promises;
// const mime = require("mime-types");
// const ImageOptimizer = require("./services/imageOptimizer");
// const imageCache = require("./services/imageOptimizer/cache");

// class StaticFileHandler {
//   constructor() {
//     this.publicDir = path.join(process.cwd(), "public");
//     this.assetsDir = path.join(this.publicDir, "assets");
//     this.sourceDir = path.join(process.cwd(), "app/assets");
//     this.imageOptimizer = new ImageOptimizer({
//       cacheDir: "storage/image-cache",
//     });
//   }

//   async loadManifest() {
//     try {
//       const manifestPath = path.join(this.assetsDir, "manifest.json");
//       const manifestContent = await fs.readFile(manifestPath, "utf8");
//       return JSON.parse(manifestContent);
//     } catch (err) {
//       console.log("📁 No manifest found:", err.message);
//       return null;
//     }
//   }

//   isImageVariant(filePath) {
//     return (
//       /\.(webp|avif|jpg|jpeg|png|gif)$/i.test(filePath) &&
//       /(-\d+w\.)|(-placeholder\.)/.test(filePath)
//     );
//   }

//   async handle(req, res) {
//     try {
//       const cleanUrl = decodeURIComponent(req.url.split("?")[0]);
//       const isAssetRequest = cleanUrl.startsWith("/assets/");

//       if (!isAssetRequest) {
//         return false;
//       }

//       // Try to serve the file directly from public/assets first
//       const directFilePath = path.join(this.publicDir, cleanUrl);
//       const assetKey = cleanUrl.replace(/^\/assets\//, "");
//       const isImageVariant = this.isImageVariant(assetKey);

//       try {
//         const stats = await fs.stat(directFilePath);
//         if (stats.isFile()) {
//           if (isImageVariant && this.imageOptimizer.config.dynamicOptimize) {
//             console.log("\n📦 Cache Status:");
//             console.log("├── 💾 Found in file cache:", assetKey);
//             console.log("├── 📁 Cache location:", directFilePath);
//             console.log(
//               "├── 📊 File size:",
//               `${(stats.size / 1024).toFixed(2)} KB`
//             );
//             console.log("└── ⏰ Last modified:", stats.mtime);
//           } else {
//             console.log("✅ Serving static asset:", cleanUrl);
//           }

//           const content = await fs.readFile(directFilePath);
//           const contentType =
//             mime.lookup(directFilePath) || "application/octet-stream";

//           res.writeHead(200, {
//             "Content-Type": contentType,
//             "Content-Length": stats.size,
//             "Cache-Control":
//               process.env.NODE_ENV === "production"
//                 ? "public, max-age=31536000"
//                 : "no-cache",
//             ...(isImageVariant && { "X-Cache": "HIT" }),
//           });

//           res.end(content);
//           if (isImageVariant && this.imageOptimizer.config.dynamicOptimize) {
//             console.log("✨ Successfully served from cache\n");
//           }
//           return true;
//         }
//       } catch (err) {
//         console.log("⚠️ Asset not found directly, checking manifest...");
//       }

//       // Check manifest for the file
//       const manifest = await this.loadManifest();
//       if (manifest) {
//         const manifestPath = manifest[assetKey];

//         if (manifestPath) {
//           const filePath = path.join(
//             this.publicDir,
//             manifestPath.replace(/^\/assets\//, "")
//           );
//           console.log("🔍 Serving asset from manifest:", filePath);

//           try {
//             const stats = await fs.stat(filePath);
//             if (stats.isFile()) {
//               const content = await fs.readFile(filePath);
//               const contentType =
//                 mime.lookup(filePath) || "application/octet-stream";

//               res.writeHead(200, {
//                 "Content-Type": contentType,
//                 "Content-Length": stats.size,
//                 "Cache-Control":
//                   process.env.NODE_ENV === "production"
//                     ? "public, max-age=31536000"
//                     : "no-cache",
//                 ...(isImageVariant && { "X-Cache": "HIT" }),
//               });

//               res.end(content);
//               return true;
//             }
//           } catch (err) {
//             console.error("❌ Error serving file from manifest:", err.message);

//             if (isImageVariant) {
//               return this.handleImageVariant(req, res, assetKey, manifest);
//             }
//           }
//         } else if (isImageVariant) {
//           return this.handleImageVariant(req, res, assetKey, manifest);
//         }
//       }

//       console.log("❌ Asset not found:", cleanUrl);
//       return false;
//     } catch (err) {
//       console.error("Static file handler error:", err);
//       return false;
//     }
//   }

//   async handleImageVariant(req, res, assetKey, manifest) {
//     if (!this.imageOptimizer.config.dynamicOptimize) {
//       console.log("❌ Dynamic image optimization is disabled");
//       return false;
//     }

//     try {
//       console.log("\n🔍 Processing image request:", assetKey);

//       const baseMatch = assetKey.match(
//         /^images\/(.+?)(?:-(?:\d+w|placeholder))/
//       );
//       if (!baseMatch) {
//         console.error("❌ Invalid image variant path:", assetKey);
//         return false;
//       }

//       const baseName = baseMatch[1];
//       const originalFileName = `${baseName}.png`;
//       const originalKey = `images/${originalFileName}`;

//       const sourceImagePath = path.join(
//         this.sourceDir,
//         "images",
//         originalFileName
//       );
//       console.log("🔍 Looking for original image in:", sourceImagePath);

//       let originalPath;
//       try {
//         await fs.access(sourceImagePath);
//         originalPath = sourceImagePath;
//         console.log(
//           "✅ Found original image in source directory:",
//           sourceImagePath
//         );
//       } catch (err) {
//         const publicImagePath = path.join(
//           this.publicDir,
//           "assets",
//           originalKey
//         );
//         try {
//           await fs.access(publicImagePath);
//           originalPath = publicImagePath;
//           console.log(
//             "✅ Found original image in public directory:",
//             publicImagePath
//           );
//         } catch (err) {
//           console.error(
//             "❌ Original image not found in any location:",
//             originalKey
//           );
//           return false;
//         }
//       }

//       const sizeMatch = assetKey.match(/-(\d+)w/);
//       const size = sizeMatch ? parseInt(sizeMatch[1]) : null;
//       const format = path.extname(assetKey).slice(1);
//       const isPlaceholder = assetKey.includes("-placeholder");

//       // Read original image for cache key generation
//       const originalBuffer = await fs.readFile(originalPath);
//       const options = {
//         width: size,
//         format,
//         quality: 80,
//         placeholder: isPlaceholder,
//       };

//       // Generate cache key and check cache
//       const cacheKey = imageCache.generateKey(originalBuffer, options);
//       const cachedBuffer = await imageCache.get(
//         cacheKey,
//         this.imageOptimizer.config.cacheDir
//       );

//       if (cachedBuffer) {
//         console.log("\n📦 Cache Status:");
//         console.log("├── 💾 Found in cache");
//         console.log("├── 🔑 Cache key:", cacheKey);
//         console.log(
//           "├── 📊 Size:",
//           `${(cachedBuffer.length / 1024).toFixed(2)} KB`
//         );
//         console.log("└── ✅ Serving from cache\n");

//         res.writeHead(200, {
//           "Content-Type": `image/${format}`,
//           "Content-Length": cachedBuffer.length,
//           "Cache-Control":
//             process.env.NODE_ENV === "production"
//               ? "public, max-age=31536000"
//               : "no-cache",
//           "X-Cache": "HIT",
//         });
//         res.end(cachedBuffer);
//         return true;
//       }

//       console.log("\n📦 Cache Status:");
//       console.log("├── ❌ Cache miss");
//       console.log("├── 🔑 Cache key:", cacheKey);
//       console.log("└── 🔄 Generating new variant...\n");

//       const result = await this.imageOptimizer.dynamicOptimize(
//         originalPath,
//         options
//       );

//       // Save to cache
//       await imageCache.set(
//         cacheKey,
//         result.buffer,
//         this.imageOptimizer.config.cacheDir
//       );

//       console.log("\n📦 New Variant Generated:");
//       console.log("├── 🔑 Cache key:", cacheKey);
//       console.log(
//         "├── 📊 Size:",
//         `${(result.buffer.length / 1024).toFixed(2)} KB`
//       );
//       console.log("└── ✅ Cached and ready to serve\n");

//       res.writeHead(200, {
//         "Content-Type": `image/${format}`,
//         "Content-Length": result.buffer.length,
//         "Cache-Control":
//           process.env.NODE_ENV === "production"
//             ? "public, max-age=31536000"
//             : "no-cache",
//         "X-Cache": "MISS",
//       });
//       res.end(result.buffer);

//       console.log("✅ Generated, cached and served image variant:", assetKey);
//       return true;
//     } catch (error) {
//       console.error("❌ Error generating image variant:", error);
//       return false;
//     }
//   }
// }

// module.exports = StaticFileHandler;

const path = require("path");
const fs = require("fs").promises;
const mime = require("mime-types");
const ImageOptimizer = require("./services/imageOptimizer");
const imageCache = require("./services/imageOptimizer/cache");

class StaticFileHandler {
  constructor() {
    this.publicDir = path.join(process.cwd(), "public");
    this.assetsDir = path.join(this.publicDir, "assets");
    this.sourceDir = path.join(process.cwd(), "app/assets");
    this.imageOptimizer = new ImageOptimizer({
      cacheDir: "storage/image-cache",
    });
  }

  async loadManifest() {
    try {
      const manifestPath = path.join(this.assetsDir, "manifest.json");
      const manifestContent = await fs.readFile(manifestPath, "utf8");
      return JSON.parse(manifestContent);
    } catch (err) {
      return null;
    }
  }

  isImageVariant(filePath) {
    return (
      /\.(webp|avif|jpg|jpeg|png|gif)$/i.test(filePath) &&
      /(-\d+w\.)|(-placeholder\.)/.test(filePath)
    );
  }

  async handle(req, res) {
    try {
      const cleanUrl = decodeURIComponent(req.url.split("?")[0]);
      const isAssetRequest = cleanUrl.startsWith("/assets/");

      if (!isAssetRequest) {
        return false;
      }

      // Try to serve the file directly from public/assets first
      const directFilePath = path.join(this.publicDir, cleanUrl);
      const assetKey = cleanUrl.replace(/^\/assets\//, "");
      const isImageVariant = this.isImageVariant(assetKey);

      try {
        const stats = await fs.stat(directFilePath);
        if (stats.isFile()) {
          if (isImageVariant && this.imageOptimizer.config.dynamicOptimize) {
            console.log("📦 Serving cached:", assetKey);
          }

          const content = await fs.readFile(directFilePath);
          const contentType =
            mime.lookup(directFilePath) || "application/octet-stream";

          res.writeHead(200, {
            "Content-Type": contentType,
            "Content-Length": stats.size,
            "Cache-Control":
              process.env.NODE_ENV === "production"
                ? "public, max-age=31536000"
                : "no-cache",
            ...(isImageVariant && { "X-Cache": "HIT" }),
          });

          res.end(content);
          return true;
        }
      } catch (err) {
        // Asset not found directly
      }

      // Check manifest for the file
      const manifest = await this.loadManifest();
      if (manifest) {
        const manifestPath = manifest[assetKey];

        if (manifestPath) {
          const filePath = path.join(
            this.publicDir,
            manifestPath.replace(/^\/assets\//, "")
          );

          try {
            const stats = await fs.stat(filePath);
            if (stats.isFile()) {
              const content = await fs.readFile(filePath);
              const contentType =
                mime.lookup(filePath) || "application/octet-stream";

              res.writeHead(200, {
                "Content-Type": contentType,
                "Content-Length": stats.size,
                "Cache-Control":
                  process.env.NODE_ENV === "production"
                    ? "public, max-age=31536000"
                    : "no-cache",
                ...(isImageVariant && { "X-Cache": "HIT" }),
              });

              res.end(content);
              return true;
            }
          } catch (err) {
            if (isImageVariant) {
              return this.handleImageVariant(req, res, assetKey, manifest);
            }
          }
        } else if (isImageVariant) {
          return this.handleImageVariant(req, res, assetKey, manifest);
        }
      }

      return false;
    } catch (err) {
      console.error("❌ Error:", err.message);
      return false;
    }
  }

  async handleImageVariant(req, res, assetKey, manifest) {
    if (!this.imageOptimizer.config.dynamicOptimize) {
      return false;
    }

    try {
      console.log("\n🖼️  Processing:", assetKey);

      const baseMatch = assetKey.match(
        /^images\/(.+?)(?:-(?:\d+w|placeholder))/
      );
      if (!baseMatch) {
        return false;
      }

      const baseName = baseMatch[1];
      const originalFileName = `${baseName}.png`;
      const originalKey = `images/${originalFileName}`;

      const sourceImagePath = path.join(
        this.sourceDir,
        "images",
        originalFileName
      );

      let originalPath;
      try {
        await fs.access(sourceImagePath);
        originalPath = sourceImagePath;
      } catch (err) {
        const publicImagePath = path.join(
          this.publicDir,
          "assets",
          originalKey
        );
        try {
          await fs.access(publicImagePath);
          originalPath = publicImagePath;
        } catch (err) {
          return false;
        }
      }

      const sizeMatch = assetKey.match(/-(\d+)w/);
      const size = sizeMatch ? parseInt(sizeMatch[1]) : null;
      const format = path.extname(assetKey).slice(1);
      const isPlaceholder = assetKey.includes("-placeholder");

      // Read original image for cache key generation
      const originalBuffer = await fs.readFile(originalPath);
      const options = {
        width: size,
        format,
        quality: 80,
        placeholder: isPlaceholder,
      };

      // Generate cache key and check cache
      const cacheKey = imageCache.generateKey(originalBuffer, options);
      const cachedBuffer = await imageCache.get(
        cacheKey,
        this.imageOptimizer.config.cacheDir
      );

      if (cachedBuffer) {
        console.log("✨ Cache hit");

        res.writeHead(200, {
          "Content-Type": `image/${format}`,
          "Content-Length": cachedBuffer.length,
          "Cache-Control":
            process.env.NODE_ENV === "production"
              ? "public, max-age=31536000"
              : "no-cache",
          "X-Cache": "HIT",
        });
        res.end(cachedBuffer);
        return true;
      }

      console.log("🔄 Generating variant");

      const result = await this.imageOptimizer.dynamicOptimize(
        originalPath,
        options
      );

      // Save to cache
      await imageCache.set(
        cacheKey,
        result.buffer,
        this.imageOptimizer.config.cacheDir
      );

      console.log("✅ Generated and cached");

      res.writeHead(200, {
        "Content-Type": `image/${format}`,
        "Content-Length": result.buffer.length,
        "Cache-Control":
          process.env.NODE_ENV === "production"
            ? "public, max-age=31536000"
            : "no-cache",
        "X-Cache": "MISS",
      });
      res.end(result.buffer);

      return true;
    } catch (error) {
      console.error("❌ Error:", error.message);
      return false;
    }
  }
}

module.exports = StaticFileHandler;
