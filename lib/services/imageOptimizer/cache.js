// const { createHash } = require("crypto");
// const fs = require("fs").promises;
// const path = require("path");
// const { cli } = require("../../utils/chalkUtils");

// class ImageCache {
//   constructor() {
//     this.memoryCache = new Map();
//     console.log(cli.info("Image cache initialized"));
//   }

//   generateKey(buffer, options) {
//     try {
//       console.log(cli.info("Generating cache key for options:"), options);
//       const hash = createHash("sha1");
//       hash.update(buffer);
//       hash.update(JSON.stringify(options));
//       const key = hash.digest("hex");
//       console.log(cli.info("Generated cache key:"), key);
//       return key;
//     } catch (error) {
//       console.error(cli.error("Error generating cache key:"), error);
//       throw error;
//     }
//   }

//   async get(key, cacheDir) {
//     try {
//       console.log(cli.info("Checking cache for key:"), key);

//       // Check memory cache first
//       if (this.memoryCache.has(key)) {
//         console.log(cli.info("Memory cache hit"));
//         return this.memoryCache.get(key);
//       }

//       // Check file cache
//       if (cacheDir) {
//         const cachePath = path.join(cacheDir, `${key}.cache`);
//         console.log(cli.info("Checking file cache:"), cachePath);

//         try {
//           const buffer = await fs.readFile(cachePath);
//           console.log(cli.info("File cache hit"));
//           this.memoryCache.set(key, buffer);
//           return buffer;
//         } catch (error) {
//           console.log(cli.info("File cache miss"));
//           return null;
//         }
//       }

//       console.log(cli.info("Cache miss"));
//       return null;
//     } catch (error) {
//       console.error(cli.error("Error getting from cache:"), error);
//       return null;
//     }
//   }

//   async set(key, value, cacheDir) {
//     try {
//       console.log(cli.info("Caching result for key:"), key);

//       // Set in memory cache
//       this.memoryCache.set(key, value);
//       console.log(cli.info("Saved to memory cache"));

//       // Set in file cache
//       if (cacheDir) {
//         const cachePath = path.join(cacheDir, `${key}.cache`);
//         await fs.writeFile(cachePath, value);
//         console.log(cli.info("Saved to file cache:"), cachePath);
//       }
//     } catch (error) {
//       console.error(cli.error("Error setting cache:"), error);
//     }
//   }

//   has(key) {
//     const exists = this.memoryCache.has(key);
//     console.log(cli.info(`Cache check for key ${key}:`), exists);
//     return exists;
//   }

//   clear() {
//     console.log(cli.info("Clearing memory cache"));
//     this.memoryCache.clear();
//   }
// }

// module.exports = new ImageCache();

const { createHash } = require("crypto");
const fs = require("fs").promises;
const path = require("path");
const { cli } = require("../../utils/chalkUtils");

class ImageCache {
  constructor() {
    this.memoryCache = new Map();
  }

  generateKey(buffer, options) {
    try {
      const hash = createHash("sha1");
      hash.update(buffer);
      hash.update(JSON.stringify(options));
      return hash.digest("hex");
    } catch (error) {
      console.error("❌ Cache key error:", error.message);
      throw error;
    }
  }

  async get(key, cacheDir) {
    try {
      // Check memory cache first
      if (this.memoryCache.has(key)) {
        return this.memoryCache.get(key);
      }

      // Check file cache
      if (cacheDir) {
        const cachePath = path.join(cacheDir, `${key}.cache`);
        try {
          const buffer = await fs.readFile(cachePath);
          this.memoryCache.set(key, buffer);
          return buffer;
        } catch (error) {
          return null;
        }
      }

      return null;
    } catch (error) {
      console.error("❌ Cache read error:", error.message);
      return null;
    }
  }

  async set(key, value, cacheDir) {
    try {
      // Set in memory cache
      this.memoryCache.set(key, value);

      // Set in file cache
      if (cacheDir) {
        const cachePath = path.join(cacheDir, `${key}.cache`);
        await fs.writeFile(cachePath, value);
      }
    } catch (error) {
      console.error("❌ Cache write error:", error.message);
    }
  }

  has(key) {
    return this.memoryCache.has(key);
  }

  clear() {
    this.memoryCache.clear();
  }
}

module.exports = new ImageCache();
