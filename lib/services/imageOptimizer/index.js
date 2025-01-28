// const fs = require("fs").promises;
// const path = require("path");
// const config = require("./config");
// const cache = require("./cache");
// const ImageProcessor = require("./processor");
// const { cli } = require("../../utils/chalkUtils");

// class ImageOptimizer {
//   constructor(options = {}) {
//     this.config = { ...config.defaults, ...options };
//     this.validateConfig();

//     console.log(cli.info("\n📸 Image Optimizer Initialized:"));
//     console.log(cli.info("- Config:"), this.config);
//   }

//   validateConfig() {
//     if (!this.config.preOptimize && !this.config.dynamicOptimize) {
//       throw new Error(
//         "At least one of preOptimize or dynamicOptimize must be enabled"
//       );
//     }

//     if (this.config.dynamicOptimize && !this.config.cacheDir) {
//       throw new Error("cacheDir is required when dynamicOptimize is enabled");
//     }

//     if (
//       this.config.preOptimize &&
//       (!this.config.sizes || !this.config.formats)
//     ) {
//       throw new Error(
//         "sizes and formats are required when preOptimize is enabled"
//       );
//     }
//   }

//   async dynamicOptimize(input, options = {}) {
//     if (!this.config.dynamicOptimize) {
//       throw new Error("Dynamic optimization is disabled");
//     }

//     try {
//       console.log(cli.info("\n🖼️ Dynamic optimization started"));
//       console.log(cli.info("Options:"), options);

//       // Handle both buffer and file path inputs
//       let buffer;
//       if (Buffer.isBuffer(input)) {
//         buffer = input;
//         console.log(cli.info("Using provided buffer"));
//       } else {
//         try {
//           console.log(cli.info("Reading file:"), input);
//           await fs.access(input);
//           buffer = await fs.readFile(input);
//           console.log(cli.info("File read successfully"));
//         } catch (error) {
//           console.error(cli.error("File not found:"), input);
//           throw new Error(`Source file not found: ${input}`);
//         }
//       }

//       const cacheKey = cache.generateKey(buffer, options);
//       console.log(cli.info("Cache key generated:"), cacheKey);

//       // Check cache
//       const cachedResult = await cache.get(cacheKey, this.config.cacheDir);
//       if (cachedResult) {
//         console.log(cli.info("Cache hit - returning cached result"));
//         return {
//           buffer: cachedResult,
//           format: options.format || path.extname(input).slice(1) || "jpeg",
//           width: options.width,
//           height: options.height,
//         };
//       }

//       console.log(cli.info("Cache miss - processing image"));

//       // Merge config with options, but options take precedence
//       const processOptions = {
//         ...this.config,
//         ...options,
//         debug: true, // Force debug for better logging
//       };

//       // Process image
//       console.log(cli.info("Processing with options:"), processOptions);
//       const result = await ImageProcessor.optimizeImage(buffer, processOptions);

//       console.log(cli.info("Optimization complete:"), {
//         format: result.format,
//         width: result.width,
//         height: result.height,
//         size: result.buffer.length,
//       });

//       // Cache result
//       console.log(cli.info("Caching result"));
//       await cache.set(cacheKey, result.buffer, this.config.cacheDir);

//       return result; // Return full result object
//     } catch (error) {
//       console.error(cli.error("Error in dynamic optimization:"), error);
//       throw error;
//     }
//   }

//   async ensureCacheDir() {
//     if (this.config.dynamicOptimize && this.config.cacheDir) {
//       try {
//         console.log(cli.info("Ensuring cache directory exists"));
//         await fs.mkdir(this.config.cacheDir, { recursive: true });

//         // Verify write permissions
//         const testFile = path.join(this.config.cacheDir, ".test");
//         await fs.writeFile(testFile, "test");
//         await fs.unlink(testFile);

//         console.log(cli.info(`Cache directory ready: ${this.config.cacheDir}`));
//       } catch (error) {
//         console.error(cli.error("Cache directory error:"), error);
//         throw new Error(`Cache directory error: ${error.message}`);
//       }
//     }
//   }

//   async preOptimize(sourcePath) {
//     if (!this.config.preOptimize) {
//       throw new Error("Pre-optimization is disabled");
//     }

//     try {
//       console.log(cli.info(`\n📸 Pre-optimizing: ${sourcePath}`));

//       try {
//         await fs.access(sourcePath);
//         console.log(cli.info("Source file exists"));
//       } catch (error) {
//         console.error(cli.error("Source file not found:"), sourcePath);
//         throw new Error(`Source file not found: ${sourcePath}`);
//       }

//       const buffer = await fs.readFile(sourcePath);
//       console.log(cli.info("File read successfully"));

//       const results = await ImageProcessor.processImage(buffer, this.config);
//       console.log(cli.info(`Generated ${results.length} variants`));

//       return results;
//     } catch (error) {
//       console.error(cli.error(`Error pre-optimizing ${sourcePath}:`), error);
//       throw error;
//     }
//   }

//   async clearCache() {
//     if (this.config.dynamicOptimize && this.config.cacheDir) {
//       try {
//         console.log(cli.info("\n🧹 Clearing image cache"));
//         await fs.rm(this.config.cacheDir, { recursive: true, force: true });
//         await this.ensureCacheDir();
//         cache.clear();
//         console.log(cli.info("✅ Cache cleared successfully"));
//       } catch (error) {
//         console.error(cli.error("Error clearing cache:"), error);
//         throw new Error(`Failed to clear cache: ${error.message}`);
//       }
//     }
//   }

//   getStats() {
//     return {
//       config: this.config,
//       cacheEnabled: this.config.dynamicOptimize,
//       cacheDir: this.config.cacheDir,
//       preOptimizeEnabled: this.config.preOptimize,
//       supportedFormats: this.config.formats,
//       supportedSizes: this.config.sizes,
//     };
//   }
// }

// module.exports = ImageOptimizer;

const fs = require("fs").promises;
const path = require("path");
const sharp = require("sharp");
const { getConfig } = require("./config");
const cache = require("./cache");
const ImageProcessor = require("./processor");
const { cli } = require("../../utils/chalkUtils");

class ImageOptimizer {
  static #instance = null;
  #config = null;

  constructor(options = {}) {
    if (ImageOptimizer.#instance) {
      return ImageOptimizer.#instance;
    }

    this._processedFiles = new Set();
    this._imagesChecked = false;

    // Get config from singleton config instance
    this.#config = getConfig(options);

    // Validate config
    if (this.#config.dynamicOptimize && !this.#config.cacheDir) {
      throw new Error("cacheDir is required when dynamicOptimize is enabled");
    }

    ImageOptimizer.#instance = this;
    return this;
  }

  get config() {
    return { ...this.#config };
  }

  async dynamicOptimize(originalPath, options = {}) {
    if (!this.config.dynamicOptimize) {
      throw new Error("Dynamic optimization is disabled in config");
    }

    try {
      const {
        width,
        format = "webp",
        quality = this.config.quality,
        placeholder = false,
      } = options;

      if (this.config.debug) {
        console.log("\n🔄 Dynamic optimization:", {
          originalPath,
          width,
          format,
          quality,
          placeholder,
        });
      }

      let pipeline = sharp(originalPath);

      // Handle placeholder generation
      if (placeholder) {
        pipeline = pipeline
          .resize(20, null, { withoutEnlargement: true })
          .blur(1);
      }
      // Handle regular resizing
      else if (width) {
        pipeline = pipeline.resize(width, null, {
          withoutEnlargement: true,
          fit: "inside",
        });
      }

      // Set format and quality
      if (format === "webp") {
        pipeline = pipeline.webp({ quality });
      } else if (format === "avif") {
        pipeline = pipeline.avif({ quality });
      } else if (format === "png") {
        pipeline = pipeline.png({ quality });
      } else {
        pipeline = pipeline.jpeg({ quality });
      }

      const { data: buffer, info } = await pipeline.toBuffer({
        resolveWithObject: true,
      });

      if (this.config.debug) {
        console.log("✅ Dynamic optimization complete:", {
          width: info.width,
          height: info.height,
          format: info.format,
          size: `${(buffer.length / 1024).toFixed(2)}KB`,
        });
      }

      return {
        buffer,
        width: info.width,
        height: info.height,
        format: info.format,
      };
    } catch (error) {
      console.error("❌ Dynamic optimization failed:", error);
      throw error;
    }
  }

  async preOptimize(sourcePath) {
    if (!this.config.preOptimize) {
      if (this.config.debug) {
        console.log(
          cli.info("\n⏭️ Skipping pre-optimization (disabled in config)")
        );
      }
      return [];
    }

    const filename = path.basename(sourcePath);
    if (this._processedFiles.has(sourcePath)) {
      if (this.config.debug) {
        console.log(cli.info(`\n⏭️ Skipping ${filename} (already processed)`));
      }
      return [];
    }

    try {
      await this.ensureOutputDir();
      const fileBuffer = await fs.readFile(sourcePath);
      const results = await ImageProcessor.processImage(fileBuffer, {
        sizes: this.config.sizes,
        formats: this.config.formats,
        quality: this.config.quality,
        placeholder: this.config.placeholder,
      });

      const processedResults = [];
      const relativePath = path.relative(this.config.sourceDir, sourcePath);
      const basename = path.basename(relativePath, path.extname(relativePath));

      for (const result of results) {
        let filename;
        if (result.size === "original") {
          filename = path.basename(sourcePath);
        } else if (result.size === "placeholder") {
          filename = `${basename}-placeholder.${result.format}`;
        } else {
          filename = `${basename}-${result.size}w.${result.format}`;
        }

        const outputPath = path.join(this.config.outputDir, filename);
        await fs.writeFile(outputPath, result.buffer);

        if (this.config.debug) {
          console.log(cli.info(`Generated: ${filename}`));
        }

        processedResults.push({
          originalPath: relativePath,
          outputPath: filename,
          format: result.format,
          size: result.size,
          width: result.width,
          height: result.height,
          buffer: result.buffer,
        });
      }

      this._processedFiles.add(sourcePath);
      console.log(cli.success(`✅ Pre-optimized: ${filename}`));

      return processedResults;
    } catch (error) {
      console.error(cli.error(`Error pre-optimizing ${filename}:`), error);
      return [];
    }
  }

  async ensureOutputDir() {
    try {
      await fs.mkdir(this.config.outputDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create output directory: ${error.message}`);
    }
  }

  async ensureCacheDir() {
    if (this.config.dynamicOptimize && this.config.cacheDir) {
      try {
        const cacheDir = path.resolve(process.cwd(), this.config.cacheDir);
        await fs.mkdir(cacheDir, { recursive: true });

        if (this.config.debug) {
          console.log(
            cli.info(`\n📁 Cache directory created: ${this.config.cacheDir}`)
          );
          console.log(
            cli.success(`✅ Cache system ready at: ${this.config.cacheDir}`)
          );
        }
      } catch (error) {
        throw new Error(`Cache directory error: ${error.message}`);
      }
    }
  }

  async clearCache() {
    if (this.config.dynamicOptimize && this.config.cacheDir) {
      try {
        await fs.rm(this.config.cacheDir, { recursive: true, force: true });
        await this.ensureCacheDir();
        cache.clear();
      } catch (error) {
        throw new Error(`Failed to clear cache: ${error.message}`);
      }
    }
  }

  getStats() {
    return {
      config: { ...this.config },
      cacheEnabled: this.config.dynamicOptimize,
      cacheDir: this.config.cacheDir,
      preOptimizeEnabled: this.config.preOptimize,
      supportedFormats: [...this.config.formats],
      supportedSizes: [...this.config.sizes],
    };
  }
}

module.exports = ImageOptimizer;
