// const path = require("path");
// const fs = require("fs");
// const { cli } = require("../utils/chalkUtils");

// class AssetHelper {
//   constructor() {
//     this.manifest = null;
//     this.manifestPath = path.join(process.cwd(), "public/assets/manifest.json");
//   }

//   isDevelopment(testEnv) {
//     if (typeof testEnv === "string") {
//       return testEnv === "development";
//     }
//     return process.env.NODE_ENV === "development";
//   }

//   loadManifest() {
//     if (this.manifest) return this.manifest;

//     try {
//       if (fs.existsSync(this.manifestPath)) {
//         console.log("📁 Loading manifest from:", this.manifestPath);
//         this.manifest = JSON.parse(fs.readFileSync(this.manifestPath, "utf8"));
//         console.log("📦 Loaded manifest:", this.manifest);
//         return this.manifest;
//       }
//     } catch (err) {
//       console.warn("⚠️ Warning: Could not load manifest file:", err.message);
//     }
//     return null;
//   }

//   getAssetPath(assetPath) {
//     const isDev = this.isDevelopment();
//     if (!isDev) {
//       const manifest = this.loadManifest();
//       if (manifest) {
//         // Look for exact match first
//         if (manifest[assetPath]) {
//           console.log("🔍 Found in manifest:", manifest[assetPath]);
//           return manifest[assetPath];
//         }

//         // Look for matching path without extension
//         const baseAssetPath = assetPath.replace(/\.[^/.]+$/, "");
//         const matchingAsset = Object.keys(manifest).find(
//           (key) => key.startsWith(baseAssetPath) && !key.endsWith(".map")
//         );

//         if (matchingAsset) {
//           console.log(
//             "🔍 Found matching asset in manifest:",
//             manifest[matchingAsset]
//           );
//           return manifest[matchingAsset];
//         }

//         console.warn("⚠️ Asset not found in manifest:", assetPath);
//       }
//     }
//     return `/assets/${assetPath}`;
//   }

//   javascript(name, testEnv) {
//     const isDev = this.isDevelopment(testEnv);
//     console.log("🔍 javascript generating URL for:", { name, isDev });

//     if (isDev) {
//       return `
//       <script src="/assets/javascript/runtime.js"></script>
//       <script src="/assets/javascript/vendors.js"></script>
//       <script src="/assets/javascript/${name}.js"></script>
//     `.trim();
//     }

//     const manifest = this.loadManifest();
//     if (!manifest) {
//       return `<script src="/assets/javascript/${name}.js"></script>`;
//     }

//     const chunks = Object.entries(manifest)
//       .filter(
//         ([key]) =>
//           key.startsWith("javascript/") &&
//           !key.endsWith(".map") &&
//           (key.includes(name) ||
//             key.includes("runtime") ||
//             key.includes("vendors"))
//       )
//       .sort(([keyA], [keyB]) => {
//         if (keyA.includes("runtime")) return -1;
//         if (keyB.includes("runtime")) return 1;
//         if (keyA.includes("vendors")) return -1;
//         if (keyB.includes("vendors")) return 1;
//         return 0;
//       });

//     return chunks
//       .map(([_, value]) => `<script src="${value}"></script>`)
//       .join("\n    ");
//   }

//   stylesheet(name, testEnv) {
//     const isDev = this.isDevelopment(testEnv);
//     console.log("🔍 stylesheet generating URL for:", { name, isDev });

//     if (isDev) {
//       return `<link rel="stylesheet" href="/assets/stylesheets/${name}.css" media="screen" />`;
//     }

//     const manifest = this.loadManifest();
//     if (!manifest) {
//       return `<link rel="stylesheet" href="/assets/stylesheets/${name}.css" />`;
//     }

//     // Fix: Change how we look for stylesheet entries
//     const styleChunks = Object.entries(manifest).filter(([key]) => {
//       // Look for both .scss and .css entries
//       return (
//         (key.startsWith("stylesheets/") || key.includes("/stylesheets/")) &&
//         (key.includes(`${name}.scss`) || key.includes(`${name}.css`))
//       );
//     });

//     console.log("🔍 Found style chunks:", styleChunks);

//     if (styleChunks.length === 0) {
//       console.warn(`⚠️ No stylesheet found for ${name}`);
//       return `<link rel="stylesheet" href="/assets/stylesheets/${name}.css" />`;
//     }

//     return styleChunks
//       .map(([_, value]) => `<link rel="stylesheet" href="${value}" />`)
//       .join("\n    ");
//   }

//   assetPath(filePath, testEnv) {
//     console.log("🔍 assetPath generating URL for:", {
//       filePath,
//       isDev: this.isDevelopment(testEnv),
//     });

//     if (filePath.endsWith(".scss")) {
//       const cssPath = filePath.replace(".scss", ".css");
//       console.log("🔍 Converting SCSS path to CSS:", cssPath);
//       return this.getAssetPath(cssPath);
//     }

//     return this.getAssetPath(filePath);
//   }

//   image(name, options = {}) {
//     const isDev = this.isDevelopment();
//     console.log(cli.info("🖼️ Image generating URL for:"), {
//       name,
//       isDev,
//       options,
//     });

//     const ext = path.extname(name);
//     const baseName = path.basename(name, ext);
//     const basePath = `images/${name}`;

//     // Basic attributes
//     const attrs = {
//       alt: options.alt || baseName.replace(/-/g, " "),
//       class: options.class || "",
//       loading: options.loading || "lazy",
//       ...options,
//     };

//     // Remove special attributes that shouldn't be in the HTML
//     delete attrs.sizes;
//     delete attrs.srcset;
//     delete attrs.placeholder;
//     delete attrs.formats;
//     delete attrs.format;
//     delete attrs.quality;
//     delete attrs.sizesAttr;

//     // Convert attributes to HTML string
//     const htmlAttrs = Object.entries(attrs)
//       .filter(([_, value]) => value !== "")
//       .map(([key, value]) => `${key}="${value}"`)
//       .join(" ");

//     // In development, handle dynamic optimization
//     if (isDev) {
//       const devUrl = `/assets/${basePath}`;
//       const params = new URLSearchParams();

//       // Add size parameters if specified
//       if (options.width) params.append("w", options.width);
//       if (options.height) params.append("h", options.height);

//       // Add format if specified
//       if (options.format) params.append("format", options.format);

//       // Add quality if specified
//       if (options.quality) params.append("q", options.quality);

//       // If using responsive sizes, use the largest size for development
//       if (options.sizes && Array.isArray(options.sizes)) {
//         const maxSize = Math.max(...options.sizes);
//         params.append("w", maxSize);
//       }

//       // If formats specified, use the first format
//       if (
//         options.formats &&
//         Array.isArray(options.formats) &&
//         options.formats.length > 0
//       ) {
//         params.append("format", options.formats[0]);
//       }

//       const queryString = params.toString();
//       const imageUrl = queryString ? `${devUrl}?${queryString}` : devUrl;

//       return `<img src="${imageUrl}" ${htmlAttrs}>`;
//     }

//     // For production, use responsive images with picture element
//     const sizes = Array.isArray(options.sizes)
//       ? options.sizes
//       : [400, 800, 1200];
//     const formats = Array.isArray(options.formats) ? options.formats : ["webp"];
//     const sizesAttr = options.sizesAttr || "100vw";

//     // Generate srcset URLs for each format
//     const srcsetUrls = [];

//     // Original format
//     sizes.forEach((size) => {
//       const sizePath = `images/${baseName}-${size}w${ext}`;
//       const url = this.getAssetPath(sizePath);
//       srcsetUrls.push(`${url} ${size}w`);
//     });

//     // Additional formats
//     formats.forEach((format) => {
//       sizes.forEach((size) => {
//         const sizePath = `images/${baseName}-${size}w.${format}`;
//         const url = this.getAssetPath(sizePath);
//         srcsetUrls.push(`${url} ${size}w`);
//       });
//     });

//     // Generate picture element with sources
//     const picture = `
//       <picture>
//         ${formats
//           .map(
//             (format) => `
//         <source
//           type="image/${format}"
//           srcset="${srcsetUrls
//             .filter((url) => url.includes(`.${format}`))
//             .join(", ")}"
//           sizes="${sizesAttr}"
//         >`
//           )
//           .join("\n        ")}
//         <source
//           type="image/${ext.slice(1)}"
//           srcset="${srcsetUrls.filter((url) => url.includes(ext)).join(", ")}"
//           sizes="${sizesAttr}"
//         >
//         <img
//           src="${this.getAssetPath(basePath)}"
//           ${htmlAttrs}
//           ${
//             options.placeholder
//               ? `data-placeholder="${this.getAssetPath(
//                   `images/${baseName}-placeholder${ext}`
//                 )}"`
//               : ""
//           }
//         >
//       </picture>
//     `;

//     return picture.trim();
//   }
// }

// const assetHelper = new AssetHelper();

// module.exports = {
//   javascript: assetHelper.javascript.bind(assetHelper),
//   stylesheet: assetHelper.stylesheet.bind(assetHelper),
//   assetPath: assetHelper.assetPath.bind(assetHelper),
//   image: assetHelper.image.bind(assetHelper),
// };

const path = require("path");
const fs = require("fs");
const { cli } = require("../utils/chalkUtils");

class AssetHelper {
  constructor() {
    this.manifest = null;
    this.manifestPath = path.join(process.cwd(), "public/assets/manifest.json");
  }

  isDevelopment(testEnv) {
    if (typeof testEnv === "string") {
      return testEnv === "development";
    }
    return process.env.NODE_ENV === "development";
  }

  loadManifest() {
    if (this.manifest) return this.manifest;

    try {
      if (fs.existsSync(this.manifestPath)) {
        this.manifest = JSON.parse(fs.readFileSync(this.manifestPath, "utf8"));
        return this.manifest;
      }
    } catch (err) {
      console.warn("⚠️  Manifest not found");
    }
    return null;
  }

  getAssetPath(assetPath) {
    const isDev = this.isDevelopment();
    if (!isDev) {
      const manifest = this.loadManifest();
      if (manifest) {
        // Look for exact match first
        if (manifest[assetPath]) {
          return manifest[assetPath];
        }

        // Look for matching path without extension
        const baseAssetPath = assetPath.replace(/\.[^/.]+$/, "");
        const matchingAsset = Object.keys(manifest).find(
          (key) => key.startsWith(baseAssetPath) && !key.endsWith(".map")
        );

        if (matchingAsset) {
          return manifest[matchingAsset];
        }
      }
    }
    return `/assets/${assetPath}`;
  }

  javascript(name, testEnv) {
    const isDev = this.isDevelopment(testEnv);

    if (isDev) {
      return `
      <script src="/assets/javascript/runtime.js"></script>
      <script src="/assets/javascript/vendors.js"></script>
      <script src="/assets/javascript/${name}.js"></script>
    `.trim();
    }

    const manifest = this.loadManifest();
    if (!manifest) {
      return `<script src="/assets/javascript/${name}.js"></script>`;
    }

    const chunks = Object.entries(manifest)
      .filter(
        ([key]) =>
          key.startsWith("javascript/") &&
          !key.endsWith(".map") &&
          (key.includes(name) ||
            key.includes("runtime") ||
            key.includes("vendors"))
      )
      .sort(([keyA], [keyB]) => {
        if (keyA.includes("runtime")) return -1;
        if (keyB.includes("runtime")) return 1;
        if (keyA.includes("vendors")) return -1;
        if (keyB.includes("vendors")) return 1;
        return 0;
      });

    return chunks
      .map(([_, value]) => `<script src="${value}"></script>`)
      .join("\n    ");
  }

  stylesheet(name, testEnv) {
    const isDev = this.isDevelopment(testEnv);

    if (isDev) {
      return `<link rel="stylesheet" href="/assets/stylesheets/${name}.css" media="screen" />`;
    }

    const manifest = this.loadManifest();
    if (!manifest) {
      return `<link rel="stylesheet" href="/assets/stylesheets/${name}.css" />`;
    }

    const styleChunks = Object.entries(manifest).filter(([key]) => {
      return (
        (key.startsWith("stylesheets/") || key.includes("/stylesheets/")) &&
        (key.includes(`${name}.scss`) || key.includes(`${name}.css`))
      );
    });

    if (styleChunks.length === 0) {
      return `<link rel="stylesheet" href="/assets/stylesheets/${name}.css" />`;
    }

    return styleChunks
      .map(([_, value]) => `<link rel="stylesheet" href="${value}" />`)
      .join("\n    ");
  }

  assetPath(filePath, testEnv) {
    if (filePath.endsWith(".scss")) {
      const cssPath = filePath.replace(".scss", ".css");
      return this.getAssetPath(cssPath);
    }

    return this.getAssetPath(filePath);
  }

  image(name, options = {}) {
    const isDev = this.isDevelopment();
    console.log(`🖼️  Processing: ${name}`);

    const ext = path.extname(name);
    const baseName = path.basename(name, ext);
    const basePath = `images/${name}`;

    // Basic attributes
    const attrs = {
      alt: options.alt || baseName.replace(/-/g, " "),
      class: options.class || "",
      loading: options.loading || "lazy",
      ...options,
    };

    // Remove special attributes that shouldn't be in the HTML
    delete attrs.sizes;
    delete attrs.srcset;
    delete attrs.placeholder;
    delete attrs.formats;
    delete attrs.format;
    delete attrs.quality;
    delete attrs.sizesAttr;

    // Convert attributes to HTML string
    const htmlAttrs = Object.entries(attrs)
      .filter(([_, value]) => value !== "")
      .map(([key, value]) => `${key}="${value}"`)
      .join(" ");

    // In development, handle dynamic optimization
    if (isDev) {
      const devUrl = `/assets/${basePath}`;
      const params = new URLSearchParams();

      if (options.width) params.append("w", options.width);
      if (options.height) params.append("h", options.height);
      if (options.format) params.append("format", options.format);
      if (options.quality) params.append("q", options.quality);

      if (options.sizes && Array.isArray(options.sizes)) {
        const maxSize = Math.max(...options.sizes);
        params.append("w", maxSize);
      }

      if (
        options.formats &&
        Array.isArray(options.formats) &&
        options.formats.length > 0
      ) {
        params.append("format", options.formats[0]);
      }

      const queryString = params.toString();
      const imageUrl = queryString ? `${devUrl}?${queryString}` : devUrl;

      return `<img src="${imageUrl}" ${htmlAttrs}>`;
    }

    // For production, use responsive images with picture element
    const sizes = Array.isArray(options.sizes)
      ? options.sizes
      : [400, 800, 1200];
    const formats = Array.isArray(options.formats) ? options.formats : ["webp"];
    const sizesAttr = options.sizesAttr || "100vw";

    // Generate srcset URLs for each format
    const srcsetUrls = [];

    // Original format
    sizes.forEach((size) => {
      const sizePath = `images/${baseName}-${size}w${ext}`;
      const url = this.getAssetPath(sizePath);
      srcsetUrls.push(`${url} ${size}w`);
    });

    // Additional formats
    formats.forEach((format) => {
      sizes.forEach((size) => {
        const sizePath = `images/${baseName}-${size}w.${format}`;
        const url = this.getAssetPath(sizePath);
        srcsetUrls.push(`${url} ${size}w`);
      });
    });

    // Generate picture element with sources
    const picture = `
      <picture>
        ${formats
          .map(
            (format) => `
        <source
          type="image/${format}"
          srcset="${srcsetUrls
            .filter((url) => url.includes(`.${format}`))
            .join(", ")}"
          sizes="${sizesAttr}"
        >`
          )
          .join("\n        ")}
        <source
          type="image/${ext.slice(1)}"
          srcset="${srcsetUrls.filter((url) => url.includes(ext)).join(", ")}"
          sizes="${sizesAttr}"
        >
        <img 
          src="${this.getAssetPath(basePath)}"
          ${htmlAttrs}
          ${
            options.placeholder
              ? `data-placeholder="${this.getAssetPath(
                  `images/${baseName}-placeholder${ext}`
                )}"`
              : ""
          }
        >
      </picture>
    `;

    return picture.trim();
  }
}

const assetHelper = new AssetHelper();

module.exports = {
  javascript: assetHelper.javascript.bind(assetHelper),
  stylesheet: assetHelper.stylesheet.bind(assetHelper),
  assetPath: assetHelper.assetPath.bind(assetHelper),
  image: assetHelper.image.bind(assetHelper),
};
