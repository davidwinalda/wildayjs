// const path = require("path");
// const fs = require("fs");
// const fsPromises = require("fs").promises;
// const ImageOptimizer = require("../services/imageOptimizer");
// const { cli } = require("../utils/chalkUtils");
// const { getConfig } = require("../services/imageOptimizer/config");

// class ImageOptimizationPlugin {
//   static #instance = null;
//   #config = null;
//   #optimizer = null;
//   #processedImages = new Set();
//   #emittedFiles = new Set();
//   #initialized = false;

//   constructor(options = {}) {
//     if (ImageOptimizationPlugin.#instance) {
//       return ImageOptimizationPlugin.#instance;
//     }

//     console.log(cli.info("\n🔍 ImageOptimizationPlugin Constructor"));

//     // Get config from singleton config instance
//     this.#config = getConfig(options);

//     // Create optimizer instance
//     this.#optimizer = new ImageOptimizer(this.#config);

//     if (this.#config.debug) {
//       console.log(cli.info("\n🔧 Plugin Configuration:"));
//       console.log(this.#config);
//     }

//     ImageOptimizationPlugin.#instance = this;
//     return this;
//   }

//   async #processImage(sourcePath, compilation) {
//     const relativePath = path.relative(process.cwd(), sourcePath);
//     const filename = path.basename(sourcePath);

//     if (this.#processedImages.has(relativePath)) {
//       return { success: true, skipped: true };
//     }

//     try {
//       if (this.#config.debug) {
//         console.log(cli.info(`\n🔄 Processing: ${filename}`));
//       }

//       const buffer = await fsPromises.readFile(sourcePath);
//       const results = await this.#optimizer.preOptimize(sourcePath);
//       const processedFiles = [];

//       // Emit original file
//       const originalAssetName = `images/${filename}`;
//       compilation.emitAsset(originalAssetName, {
//         source: () => buffer,
//         size: () => buffer.length,
//       });
//       processedFiles.push(originalAssetName);

//       // Process and emit variants
//       for (const result of results) {
//         const outputName = this.#getOutputPath(filename, result);

//         compilation.emitAsset(outputName, {
//           source: () => result.buffer,
//           size: () => result.buffer.length,
//         });

//         if (this.#config.debug) {
//           console.log(cli.info(`  ✓ Generated: ${path.basename(outputName)}`));
//         }

//         this.#emittedFiles.add(outputName);
//         processedFiles.push(outputName);
//       }

//       this.#processedImages.add(relativePath);
//       return { success: true, skipped: false, files: processedFiles };
//     } catch (error) {
//       console.error(cli.error(`Error processing ${filename}:`), error);
//       return { success: false, error };
//     }
//   }

//   apply(compiler) {
//     if (this.#initialized) return;
//     this.#initialized = true;

//     if (this.#config.debug) {
//       console.log(cli.info("\n🔍 Apply Method - Current Config:"));
//       console.log(this.#config);
//     }

//     if (!this.#config.preOptimize) {
//       console.log(
//         cli.info("\n⏭️ Skipping image optimization (preOptimize is disabled)")
//       );
//       return;
//     }

//     compiler.hooks.thisCompilation.tap(
//       "ImageOptimizationPlugin",
//       (compilation) => {
//         compilation.hooks.processAssets.tapAsync(
//           {
//             name: "ImageOptimizationPlugin",
//             stage: compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
//           },
//           async (assets, callback) => {
//             try {
//               const sourceDir = path.resolve(
//                 process.cwd(),
//                 this.#config.sourceDir
//               );

//               if (!fs.existsSync(sourceDir)) {
//                 console.log(
//                   cli.warn(`\n⚠️ Source directory not found: ${sourceDir}`)
//                 );
//                 callback();
//                 return;
//               }

//               const files = await fsPromises.readdir(sourceDir);
//               const imageFiles = files.filter((file) =>
//                 /\.(png|jpe?g|gif|webp)$/i.test(file)
//               );

//               if (imageFiles.length === 0) {
//                 if (this.#config.debug) {
//                   console.log(cli.info("\n📸 No images found to process"));
//                 }
//                 callback();
//                 return;
//               }

//               if (this.#config.debug) {
//                 console.log(
//                   cli.info(`\n📸 Found ${imageFiles.length} images to process`)
//                 );
//               }

//               const results = [];
//               for (const filename of imageFiles) {
//                 const sourcePath = path.join(sourceDir, filename);
//                 const result = await this.#processImage(
//                   sourcePath,
//                   compilation
//                 );
//                 results.push(result);
//               }

//               if (this.#config.debug) {
//                 const processed = results.filter(
//                   (r) => r.success && !r.skipped
//                 ).length;
//                 const skipped = results.filter(
//                   (r) => r.success && r.skipped
//                 ).length;
//                 const failed = results.filter((r) => !r.success).length;

//                 console.log(cli.info("\n📊 Image Processing Summary:"));
//                 if (processed > 0)
//                   console.log(cli.info(`  ✅ Processed: ${processed}`));
//                 if (skipped > 0)
//                   console.log(cli.info(`  ⏭️  Skipped: ${skipped}`));
//                 if (failed > 0)
//                   console.log(cli.error(`  ❌ Failed: ${failed}`));
//               }

//               callback();
//             } catch (error) {
//               console.error(cli.error("\n❌ Fatal error:"), error);
//               callback(error);
//             }
//           }
//         );
//       }
//     );
//   }

//   #getOutputPath(filename, result) {
//     const ext = path.extname(filename);
//     const basename = path.basename(filename, ext);

//     if (result.size === "placeholder") {
//       return `images/${basename}-placeholder.${result.format}`;
//     }

//     if (result.size === "original") {
//       return `images/${filename}`;
//     }

//     return `images/${basename}-${result.size}w.${result.format}`;
//   }
// }

// module.exports = ImageOptimizationPlugin;

const path = require("path");
const fs = require("fs");
const fsPromises = require("fs").promises;
const ImageOptimizer = require("../services/imageOptimizer");
const { cli } = require("../utils/chalkUtils");
const { getConfig } = require("../services/imageOptimizer/config");

class ImageOptimizationPlugin {
  static #instance = null;
  #config = null;
  #optimizer = null;
  #processedImages = new Set();
  #emittedFiles = new Set();
  #initialized = false;

  constructor(options = {}) {
    if (ImageOptimizationPlugin.#instance) {
      return ImageOptimizationPlugin.#instance;
    }

    this.#config = getConfig(options);
    this.#optimizer = new ImageOptimizer(this.#config);
    ImageOptimizationPlugin.#instance = this;
    return this;
  }

  async #processImage(sourcePath, compilation) {
    const relativePath = path.relative(process.cwd(), sourcePath);
    const filename = path.basename(sourcePath);

    if (this.#processedImages.has(relativePath)) {
      return { success: true, skipped: true };
    }

    try {
      console.log(`🖼️  Processing ${filename}...`);

      const buffer = await fsPromises.readFile(sourcePath);
      const results = await this.#optimizer.preOptimize(sourcePath);
      const processedFiles = [];

      // Emit original file
      const originalAssetName = `images/${filename}`;
      compilation.emitAsset(originalAssetName, {
        source: () => buffer,
        size: () => buffer.length,
      });
      processedFiles.push(originalAssetName);

      // Process and emit variants
      for (const result of results) {
        const outputName = this.#getOutputPath(filename, result);
        compilation.emitAsset(outputName, {
          source: () => result.buffer,
          size: () => result.buffer.length,
        });
        this.#emittedFiles.add(outputName);
        processedFiles.push(outputName);
      }

      console.log(`✓ Generated ${results.length + 1} variants`);
      this.#processedImages.add(relativePath);
      return { success: true, skipped: false, files: processedFiles };
    } catch (error) {
      console.error(`❌ Failed to process ${filename}:`, error.message);
      return { success: false, error };
    }
  }

  apply(compiler) {
    if (this.#initialized) return;
    this.#initialized = true;

    if (!this.#config.preOptimize) {
      return;
    }

    compiler.hooks.thisCompilation.tap(
      "ImageOptimizationPlugin",
      (compilation) => {
        compilation.hooks.processAssets.tapAsync(
          {
            name: "ImageOptimizationPlugin",
            stage: compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
          },
          async (assets, callback) => {
            try {
              const sourceDir = path.resolve(
                process.cwd(),
                this.#config.sourceDir
              );

              if (!fs.existsSync(sourceDir)) {
                console.log("⚠️  Source directory not found");
                callback();
                return;
              }

              const files = await fsPromises.readdir(sourceDir);
              const imageFiles = files.filter((file) =>
                /\.(png|jpe?g|gif|webp)$/i.test(file)
              );

              if (imageFiles.length === 0) {
                callback();
                return;
              }

              console.log(`\n📸 Processing ${imageFiles.length} images...`);

              const results = [];
              for (const filename of imageFiles) {
                const sourcePath = path.join(sourceDir, filename);
                const result = await this.#processImage(
                  sourcePath,
                  compilation
                );
                results.push(result);
              }

              const processed = results.filter(
                (r) => r.success && !r.skipped
              ).length;
              const failed = results.filter((r) => !r.success).length;

              if (processed > 0 || failed > 0) {
                console.log("\n📊 Image Summary");
                console.log(`Processed: ${processed}`);
                if (failed > 0) console.log(`Failed: ${failed}`);
              }

              callback();
            } catch (error) {
              console.error("❌ Image processing error:", error.message);
              callback(error);
            }
          }
        );
      }
    );
  }

  #getOutputPath(filename, result) {
    const ext = path.extname(filename);
    const basename = path.basename(filename, ext);

    if (result.size === "placeholder") {
      return `images/${basename}-placeholder.${result.format}`;
    }

    if (result.size === "original") {
      return `images/${filename}`;
    }

    return `images/${basename}-${result.size}w.${result.format}`;
  }
}

module.exports = ImageOptimizationPlugin;
