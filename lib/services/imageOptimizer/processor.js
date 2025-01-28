const sharp = require("sharp");
const ImageTransformer = require("./transformer");
const { cli } = require("../../utils/chalkUtils");

class ImageProcessor {
  static async processImage(buffer, options) {
    try {
      const image = sharp(buffer);
      const metadata = await ImageTransformer.getMetadata(image);
      const results = [];

      // Original file
      results.push({
        buffer,
        size: "original",
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
      });

      // Process each size if specified
      if (options.sizes) {
        for (const size of options.sizes) {
          if (size > metadata.width) continue;

          const resized = await ImageTransformer.resize(image, { width: size });

          // Original format
          const resizedBuffer = await resized.toBuffer();
          results.push({
            buffer: resizedBuffer,
            size,
            format: metadata.format,
            width: size,
            height: Math.round((size / metadata.width) * metadata.height),
          });

          // Additional formats
          if (options.formats) {
            for (const format of options.formats) {
              const converted = await ImageTransformer.convert(
                resized,
                format,
                {
                  quality: options.quality,
                }
              );

              const convertedBuffer = await converted.toBuffer();
              results.push({
                buffer: convertedBuffer,
                size,
                format,
                width: size,
                height: Math.round((size / metadata.width) * metadata.height),
              });
            }
          }
        }
      }

      // Generate placeholder if requested
      if (options.placeholder) {
        const placeholder = await ImageTransformer.createPlaceholder(image);
        const placeholderBuffer = await placeholder.toBuffer();

        results.push({
          buffer: placeholderBuffer,
          size: "placeholder",
          format: metadata.format,
          width: 10,
          height: Math.round((10 / metadata.width) * metadata.height),
        });
      }

      return results;
    } catch (error) {
      console.error(cli.error("Error processing image:"), error);
      throw error;
    }
  }

  static async optimizeImage(buffer, options) {
    try {
      let image = sharp(buffer);
      const metadata = await ImageTransformer.getMetadata(image);

      if (options.width || options.height) {
        image = await ImageTransformer.resize(image, {
          width: options.width,
          height: options.height,
        });
      }

      if (options.format) {
        image = await ImageTransformer.convert(image, options.format, {
          quality: options.quality,
        });
      }

      const finalBuffer = await image.toBuffer();
      const finalMetadata = await ImageTransformer.getMetadata(
        sharp(finalBuffer)
      );

      return {
        buffer: finalBuffer,
        format: finalMetadata.format,
        width: finalMetadata.width,
        height: finalMetadata.height,
      };
    } catch (error) {
      console.error(cli.error("Error optimizing image:"), error);
      throw error;
    }
  }
}

module.exports = ImageProcessor;
