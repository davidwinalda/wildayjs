// const fs = require("fs");
// const path = require("path");

// function getManifest() {
//   try {
//     const manifestPath = path.join(
//       process.cwd(),
//       "public/assets/.vite/manifest.json"
//     );
//     const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
//     console.log("Loaded manifest:", manifest); // Debug log
//     return manifest;
//   } catch (e) {
//     console.warn("Asset manifest not found or invalid:", e.message);
//     return {};
//   }
// }

// function assetPath(filePath) {
//   console.log("assetPath called with:", filePath); // Debug log

//   if (process.env.NODE_ENV === "development") {
//     return `/assets/${filePath}`;
//   }

//   const manifest = getManifest();
//   const key = filePath.replace(/^\//, ""); // Remove leading slash if present

//   console.log("Looking for key in manifest:", key); // Debug log
//   const entry = manifest[key];

//   if (!entry) {
//     console.warn(`Asset not found in manifest: ${filePath}`);
//     return `/assets/${filePath}`;
//   }

//   const result = `/assets/${entry.file}`;
//   console.log("Resolved asset path:", result); // Debug log
//   return result;
// }

// // Add a test function to verify the helper is loaded
// assetPath.test = () => {
//   console.log("Asset helper is loaded!");
//   return true;
// };

// module.exports = { assetPath };

// const path = require("path");
// const fs = require("fs");

// class AssetHelper {
//   isDevelopment(testEnv) {
//     const env = testEnv || process.env.NODE_ENV;
//     return env === "development";
//   }

//   javascript(name, testEnv) {
//     const isDev = this.isDevelopment(testEnv);

//     if (isDev) {
//       return `<script type="module" src="/assets/javascript/${name}.js"></script>`;
//     }

//     const manifest = this.getManifest();
//     const key = `javascript/${name}.js`;
//     const entry = manifest[key];

//     if (entry && entry.file) {
//       const url = `/assets/${entry.file}`;
//       console.log("🔍 Generated JS URL:", url); // Debug log
//       return `<script type="module" src="${url}"></script>`;
//     }

//     return `<script type="module" src="/assets/javascript/${name}.js"></script>`;
//   }

//   stylesheet(name, testEnv) {
//     const isDev = this.isDevelopment(testEnv);

//     if (isDev) {
//       return `<link rel="stylesheet" type="text/css" href="/assets/stylesheets/${name}.scss" />`;
//     }

//     const manifest = this.getManifest();
//     const key = `stylesheets/${name}.scss`;
//     const entry = manifest[key];

//     if (entry && entry.file) {
//       const url = `/assets/${entry.file}`;
//       console.log("🔍 Generated CSS URL:", url);
//       return `<link rel="stylesheet" href="${url}" />`;
//     }

//     return `<link rel="stylesheet" href="/assets/stylesheets/${name}.css" />`;
//   }

//   viteClient() {
//     if (this.isDevelopment()) {
//       return '<script type="module" src="/@vite/client"></script>';
//     }
//     return "";
//   }

//   assetPath(filePath, testEnv) {
//     const isDev = this.isDevelopment(testEnv);

//     if (isDev) {
//       return `/assets/${filePath}`;
//     }

//     const manifest = this.getManifest();
//     const entry = manifest[filePath];
//     return entry ? `/assets/${entry.file}` : `/assets/${filePath}`;
//   }

//   getManifest() {
//     if (this.manifest) return this.manifest;

//     try {
//       const manifestPath = path.join(
//         process.cwd(),
//         "public/assets/.vite/manifest.json"
//       );
//       this.manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
//       return this.manifest;
//     } catch (err) {
//       console.warn("Warning: Could not load manifest file");
//       return {};
//     }
//   }
// }

// module.exports = new AssetHelper();

const path = require("path");
const fs = require("fs");

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
        console.log("📁 Loading manifest from:", this.manifestPath);
        this.manifest = JSON.parse(fs.readFileSync(this.manifestPath, "utf8"));
        console.log("📦 Loaded manifest:", this.manifest);
        return this.manifest;
      }
    } catch (err) {
      console.warn("⚠️ Warning: Could not load manifest file:", err.message);
    }
    return null;
  }

  getAssetPath(assetPath) {
    const isDev = this.isDevelopment();
    if (!isDev) {
      const manifest = this.loadManifest();
      if (manifest && manifest[assetPath]) {
        console.log("🔍 Found in manifest:", manifest[assetPath]);
        return manifest[assetPath];
      } else {
        console.warn("⚠️ Asset not found in manifest:", assetPath);
      }
    }
    return `/assets/${assetPath}`;
  }

  javascript(name, testEnv) {
    console.log("🔍 javascript generating URL for:", {
      name,
      isDev: this.isDevelopment(testEnv),
    });
    const path = `javascript/${name}.js`;
    const url = this.getAssetPath(path);
    console.log("🔍 Generated JS URL:", url);
    return `<script type="module" src="${url}"></script>`;
  }

  stylesheet(name, testEnv) {
    console.log("🔍 stylesheet generating URL for:", {
      name,
      isDev: this.isDevelopment(testEnv),
    });
    const path = `stylesheets/${name}.css`;
    const url = this.getAssetPath(path);
    console.log("🔍 Generated CSS URL:", url);
    return `<link rel="stylesheet" href="${url}" />`;
  }

  assetPath(filePath, testEnv) {
    console.log("🔍 assetPath generating URL for:", {
      filePath,
      isDev: this.isDevelopment(testEnv),
    });

    if (filePath.endsWith(".scss")) {
      const cssPath = filePath.replace(".scss", ".css");
      console.log("🔍 Converting SCSS path to CSS:", cssPath);
      return this.getAssetPath(cssPath);
    }

    return this.getAssetPath(filePath);
  }
}

const assetHelper = new AssetHelper();

module.exports = {
  javascript: assetHelper.javascript.bind(assetHelper),
  stylesheet: assetHelper.stylesheet.bind(assetHelper),
  assetPath: assetHelper.assetPath.bind(assetHelper),
};
