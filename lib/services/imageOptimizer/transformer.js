// const sharp = require("sharp");
// const { cli } = require("../../utils/chalkUtils");

// class ImageTransformer {
//   static async getMetadata(image) {
//     try {
//       console.log(cli.info("Getting image metadata..."));
//       const metadata = await image.metadata();
//       console.log(cli.info("Image metadata:"), metadata);
//       return metadata;
//     } catch (error) {
//       console.error(cli.error("Error getting metadata:"), error);
//       throw error;
//     }
//   }

//   static async resize(image, options = {}) {
//     try {
//       console.log(cli.info("Resizing image with options:"), options);
//       const resized = image.resize({
//         width: options.width,
//         height: options.height,
//         fit: "contain",
//         withoutEnlargement: true,
//       });
//       console.log(cli.info("Image resized successfully"));
//       return resized;
//     } catch (error) {
//       console.error(cli.error("Error resizing image:"), error);
//       throw error;
//     }
//   }

//   static async convert(image, format, options = {}) {
//     try {
//       console.log(
//         cli.info(`Converting image to ${format} with options:`),
//         options
//       );
//       let converted;

//       switch (format.toLowerCase()) {
//         case "webp":
//           converted = image.webp({
//             quality: options.quality || 80,
//             lossless: false,
//           });
//           break;
//         case "avif":
//           converted = image.avif({
//             quality: options.quality || 80,
//           });
//           break;
//         case "png":
//           converted = image.png({
//             quality: options.quality || 80,
//           });
//           break;
//         case "jpeg":
//         case "jpg":
//           converted = image.jpeg({
//             quality: options.quality || 80,
//             mozjpeg: true,
//           });
//           break;
//         default:
//           throw new Error(`Unsupported format: ${format}`);
//       }

//       console.log(cli.info(`Image converted to ${format} successfully`));
//       return converted;
//     } catch (error) {
//       console.error(cli.error("Error converting image:"), error);
//       throw error;
//     }
//   }

//   static async createPlaceholder(image) {
//     try {
//       console.log(cli.info("Creating placeholder image..."));
//       const placeholder = image
//         .resize(10, 10, { fit: "inside" })
//         .blur(2)
//         .jpeg({ quality: 50 });
//       console.log(cli.info("Placeholder created successfully"));
//       return placeholder;
//     } catch (error) {
//       console.error(cli.error("Error creating placeholder:"), error);
//       throw error;
//     }
//   }
// }

// module.exports = ImageTransformer;

const sharp = require("sharp");
const { cli } = require("../../utils/chalkUtils");

class ImageTransformer {
  static async getMetadata(image) {
    try {
      const metadata = await image.metadata();
      return metadata;
    } catch (error) {
      console.error(cli.error("Error getting metadata"));
      throw error;
    }
  }

  static async resize(image, options = {}) {
    try {
      const resized = image.resize({
        width: options.width,
        height: options.height,
        fit: "contain",
        withoutEnlargement: true,
      });
      return resized;
    } catch (error) {
      console.error(cli.error("Error resizing image"));
      throw error;
    }
  }

  static async convert(image, format, options = {}) {
    try {
      let converted;

      switch (format.toLowerCase()) {
        case "webp":
          converted = image.webp({
            quality: options.quality || 80,
            lossless: false,
          });
          break;
        case "avif":
          converted = image.avif({
            quality: options.quality || 80,
          });
          break;
        case "png":
          converted = image.png({
            quality: options.quality || 80,
          });
          break;
        case "jpeg":
        case "jpg":
          converted = image.jpeg({
            quality: options.quality || 80,
            mozjpeg: true,
          });
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      return converted;
    } catch (error) {
      console.error(cli.error(`Error converting to ${format}`));
      throw error;
    }
  }

  static async createPlaceholder(image) {
    try {
      const placeholder = image
        .resize(10, 10, { fit: "inside" })
        .blur(2)
        .jpeg({ quality: 50 });
      return placeholder;
    } catch (error) {
      console.error(cli.error("Error creating placeholder"));
      throw error;
    }
  }
}

module.exports = ImageTransformer;
