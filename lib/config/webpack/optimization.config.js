// const TerserPlugin = require("terser-webpack-plugin");
// const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
// const ImageMinimizerPlugin = require("image-minimizer-webpack-plugin");

// const optimizationConfig = (isDev) => ({
//   minimize: !isDev,
//   minimizer: [
//     new TerserPlugin({
//       terserOptions: {
//         parse: {
//           ecma: 2020,
//         },
//         compress: {
//           ecma: 5,
//           warnings: false,
//           comparisons: false,
//           inline: 2,
//           drop_console: false,
//           drop_debugger: !isDev,
//           pure_funcs: [],
//           passes: 2,
//         },
//         mangle: {
//           safari10: true,
//         },
//         format: {
//           comments: false,
//           ecma: 5,
//           ascii_only: true,
//           wrap_iife: true,
//         },
//       },
//       parallel: true,
//       extractComments: false,
//     }),
//     new CssMinimizerPlugin(),
//     !isDev &&
//       new ImageMinimizerPlugin({
//         minimizer: {
//           implementation: ImageMinimizerPlugin.sharpMinify,
//           options: {
//             encodeOptions: {
//               jpeg: {
//                 quality: 80,
//                 progressive: true,
//                 chromaSubsampling: "4:4:4",
//                 optimizeCoding: true,
//                 mozjpeg: true,
//               },
//               png: {
//                 quality: 80,
//                 palette: true,
//                 compressionLevel: 9,
//               },
//               webp: {
//                 quality: 80,
//                 lossless: false,
//                 effort: 6,
//               },
//               avif: {
//                 quality: 80,
//                 lossless: false,
//                 effort: 9,
//               },
//               gif: false,
//             },
//           },
//         },
//         generator: [
//           {
//             preset: "webp",
//             implementation: ImageMinimizerPlugin.sharpGenerate,
//             options: {
//               encodeOptions: {
//                 webp: {
//                   quality: 80,
//                   effort: 6,
//                 },
//               },
//             },
//           },
//         ],
//       }),
//   ].filter(Boolean),
//   splitChunks: {
//     chunks: "all",
//     minSize: isDev ? 0 : 20000,
//     minRemainingSize: 0,
//     minChunks: 1,
//     maxAsyncRequests: 30,
//     maxInitialRequests: 30,
//     enforceSizeThreshold: 50000,
//     cacheGroups: {
//       defaultVendors: {
//         test: /[\\/]node_modules[\\/]/,
//         name: "vendors",
//         chunks: "initial",
//         priority: 10,
//         enforce: true,
//       },
//       common: {
//         minChunks: 2,
//         name: "common",
//         chunks: "initial",
//         priority: -10,
//         reuseExistingChunk: true,
//       },
//       styles: {
//         name: (module, chunks, cacheGroupKey) => {
//           const moduleFileName = module
//             .identifier()
//             .split("/")
//             .reduceRight((item) => item);
//           // Get the entry point name from the chunk
//           const allChunksNames = chunks.map((item) => item.name).join("~");
//           return allChunksNames || "application";
//         },
//         test: /\.(css|scss)$/,
//         type: "css/mini-extract",
//         chunks: "all",
//         enforce: true,
//         priority: 40,
//       },
//     },
//   },
//   runtimeChunk: {
//     name: "runtime",
//   },
// });

// module.exports = optimizationConfig;

const TerserPlugin = require("terser-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const ImageMinimizerPlugin = require("image-minimizer-webpack-plugin");

const optimizationConfig = (isDev, { imageConfig }) => ({
  minimize: !isDev,
  minimizer: [
    new TerserPlugin({
      terserOptions: {
        parse: {
          ecma: 2020,
        },
        compress: {
          ecma: 5,
          warnings: false,
          comparisons: false,
          inline: 2,
          drop_console: false,
          drop_debugger: !isDev,
          pure_funcs: [],
          passes: 2,
        },
        mangle: {
          safari10: true,
        },
        format: {
          comments: false,
          ecma: 5,
          ascii_only: true,
          wrap_iife: true,
        },
      },
      parallel: true,
      extractComments: false,
    }),
    new CssMinimizerPlugin(),
    // Only add ImageMinimizerPlugin if preOptimize is true and not in dev mode
    !isDev &&
      imageConfig.preOptimize &&
      new ImageMinimizerPlugin({
        minimizer: {
          implementation: ImageMinimizerPlugin.sharpMinify,
          options: {
            encodeOptions: {
              jpeg: {
                quality: imageConfig.quality,
                progressive: true,
                chromaSubsampling: "4:4:4",
                optimizeCoding: true,
                mozjpeg: true,
              },
              png: {
                quality: imageConfig.quality,
                compressionLevel: 9,
              },
              webp: {
                quality: imageConfig.quality,
                lossless: false,
                effort: 6,
              },
              avif: {
                quality: imageConfig.quality,
                lossless: false,
                effort: 9,
              },
              gif: false,
            },
          },
        },
      }),
  ].filter(Boolean),
  splitChunks: {
    chunks: "all",
    minSize: isDev ? 0 : 20000,
    minRemainingSize: 0,
    minChunks: 1,
    maxAsyncRequests: 30,
    maxInitialRequests: 30,
    enforceSizeThreshold: 50000,
    cacheGroups: {
      defaultVendors: {
        test: /[\\/]node_modules[\\/]/,
        name: "vendors",
        chunks: "initial",
        priority: 10,
        enforce: true,
      },
      common: {
        minChunks: 2,
        name: "common",
        chunks: "initial",
        priority: -10,
        reuseExistingChunk: true,
      },
      styles: {
        name: (module, chunks, cacheGroupKey) => {
          const moduleFileName = module
            .identifier()
            .split("/")
            .reduceRight((item) => item);
          const allChunksNames = chunks.map((item) => item.name).join("~");
          return allChunksNames || "application";
        },
        test: /\.(css|scss)$/,
        type: "css/mini-extract",
        chunks: "all",
        enforce: true,
        priority: 40,
      },
    },
  },
  runtimeChunk: {
    name: "runtime",
  },
});

module.exports = optimizationConfig;
