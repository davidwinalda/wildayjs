// const path = require("path");
// const fs = require("fs");
// const { cli } = require("../utils/chalkUtils");
// const ImageOptimizer = require("../services/imageOptimizer");

// class ImageManifestPlugin {
//   static instance = null;

//   constructor(options = {}) {
//     if (ImageManifestPlugin.instance) {
//       return ImageManifestPlugin.instance;
//     }

//     // Create a single optimizer instance
//     this.optimizer = new ImageOptimizer(options);

//     if (this.optimizer.config.debug) {
//       console.log(cli.info("\n📸 Image Manifest Plugin Initialized"));
//       console.log(cli.info("- Optimizer Config:"), this.optimizer.config);
//     }

//     ImageManifestPlugin.instance = this;
//     return this;
//   }

//   apply(compiler) {
//     compiler.hooks.emit.tapAsync(
//       "ImageManifestPlugin",
//       async (compilation, callback) => {
//         try {
//           const sourceDir = path.resolve(this.optimizer.config.sourceDir);

//           if (fs.existsSync(sourceDir)) {
//             const files = fs.readdirSync(sourceDir);
//             const imageFiles = files.filter((file) =>
//               /\.(png|jpe?g|gif|svg|webp|avif)$/i.test(file)
//             );

//             if (imageFiles.length > 0) {
//               if (this.optimizer.config.debug) {
//                 console.log(
//                   cli.info(`\n📸 Found ${imageFiles.length} images to process`)
//                 );
//               }

//               const outputDir = path.resolve(this.optimizer.config.outputDir);
//               if (!fs.existsSync(outputDir)) {
//                 fs.mkdirSync(outputDir, { recursive: true });
//               }

//               if (this.optimizer.config.preOptimize) {
//                 for (const file of imageFiles) {
//                   const sourcePath = path.join(sourceDir, file);
//                   if (this.optimizer.config.debug) {
//                     console.log(cli.info(`\n🔄 Processing: ${file}`));
//                   }
//                   await this.optimizer.preOptimize(sourcePath);
//                 }
//               } else if (this.optimizer.config.debug) {
//                 console.log(
//                   cli.info(
//                     "\n⏭️ Skipping image optimization (preOptimize is disabled)"
//                   )
//                 );
//               }

//               if (this.optimizer.config.dynamicOptimize) {
//                 await this.optimizer.ensureCacheDir();
//               }

//               const manifestPath = path.join(
//                 compiler.options.output.path,
//                 "manifest.json"
//               );
//               const manifest = fs.existsSync(manifestPath)
//                 ? JSON.parse(fs.readFileSync(manifestPath))
//                 : {};

//               imageFiles.forEach((file) => {
//                 const baseName = path.basename(file, path.extname(file));
//                 const originalKey = `images/${file}`;
//                 manifest[originalKey] = `/assets/${originalKey}`;

//                 if (
//                   this.optimizer.config.preOptimize ||
//                   this.optimizer.config.dynamicOptimize
//                 ) {
//                   this.optimizer.config.sizes.forEach((size) => {
//                     this.optimizer.config.formats.forEach((format) => {
//                       const variantKey = `images/${baseName}-${size}w.${format}`;
//                       manifest[variantKey] = `/assets/${variantKey}`;
//                     });
//                   });

//                   if (this.optimizer.config.placeholder) {
//                     const placeholderKey = `images/${baseName}-placeholder.${this.optimizer.config.formats[0]}`;
//                     manifest[placeholderKey] = `/assets/${placeholderKey}`;
//                   }
//                 }
//               });

//               fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
//               if (this.optimizer.config.debug) {
//                 console.log(
//                   cli.info("\n📸 Enhanced manifest with image variants")
//                 );
//                 console.log(manifest);
//               }
//             }
//           }

//           callback();
//         } catch (error) {
//           console.error(
//             cli.error("\n❌ Image manifest enhancement failed:"),
//             error
//           );
//           callback();
//         }
//       }
//     );
//   }
// }

// module.exports = ImageManifestPlugin;

const path = require("path");
const fs = require("fs");
const { cli } = require("../utils/chalkUtils");
const ImageOptimizer = require("../services/imageOptimizer");

class ImageManifestPlugin {
  static instance = null;

  constructor(options = {}) {
    if (ImageManifestPlugin.instance) {
      return ImageManifestPlugin.instance;
    }

    // Create a single optimizer instance
    this.optimizer = new ImageOptimizer(options);
    ImageManifestPlugin.instance = this;
    return this;
  }

  apply(compiler) {
    compiler.hooks.emit.tapAsync(
      "ImageManifestPlugin",
      async (compilation, callback) => {
        try {
          const sourceDir = path.resolve(this.optimizer.config.sourceDir);

          if (fs.existsSync(sourceDir)) {
            const files = fs.readdirSync(sourceDir);
            const imageFiles = files.filter((file) =>
              /\.(png|jpe?g|gif|svg|webp|avif)$/i.test(file)
            );

            if (imageFiles.length > 0) {
              console.log(
                `\n📝 Updating manifest for ${imageFiles.length} images`
              );

              const outputDir = path.resolve(this.optimizer.config.outputDir);
              if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
              }

              if (this.optimizer.config.preOptimize) {
                for (const file of imageFiles) {
                  const sourcePath = path.join(sourceDir, file);
                  await this.optimizer.preOptimize(sourcePath);
                }
              }

              if (this.optimizer.config.dynamicOptimize) {
                await this.optimizer.ensureCacheDir();
              }

              const manifestPath = path.join(
                compiler.options.output.path,
                "manifest.json"
              );
              const manifest = fs.existsSync(manifestPath)
                ? JSON.parse(fs.readFileSync(manifestPath))
                : {};

              let variantCount = 0;

              imageFiles.forEach((file) => {
                const baseName = path.basename(file, path.extname(file));
                const originalKey = `images/${file}`;
                manifest[originalKey] = `/assets/${originalKey}`;
                variantCount++;

                if (
                  this.optimizer.config.preOptimize ||
                  this.optimizer.config.dynamicOptimize
                ) {
                  this.optimizer.config.sizes.forEach((size) => {
                    this.optimizer.config.formats.forEach((format) => {
                      const variantKey = `images/${baseName}-${size}w.${format}`;
                      manifest[variantKey] = `/assets/${variantKey}`;
                      variantCount++;
                    });
                  });

                  if (this.optimizer.config.placeholder) {
                    const placeholderKey = `images/${baseName}-placeholder.${this.optimizer.config.formats[0]}`;
                    manifest[placeholderKey] = `/assets/${placeholderKey}`;
                    variantCount++;
                  }
                }
              });

              fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
              console.log(`✓ Added ${variantCount} image entries to manifest`);
            }
          }

          callback();
        } catch (error) {
          console.error("❌ Manifest update failed:", error.message);
          callback();
        }
      }
    );
  }
}

module.exports = ImageManifestPlugin;
