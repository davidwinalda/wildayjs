// const path = require("path");
// const fs = require("fs").promises;
// const render = require("./render");
// const { errorTemplates } = require("./config/paths");
// const Router = require("./router");
// const RequestHandler = require("./requestHandler");
// const helpers = require("./helpers");
// const StaticFileHandler = require("./staticFileHandler");
// const CssBundler = require("./asset-pipeline/cssBundler");

// class WildayJS {
//   constructor() {
//     this.routes = {};
//     this.render = render;
//     this.errorTemplates = errorTemplates;
//     this.router = new Router(this);
//     this.staticFileHandler = new StaticFileHandler();
//     this.requestHandler = new RequestHandler(this);
//     this.cssBundler = new CssBundler(process.cwd());

//     // Bind methods
//     this.handler = this.handler.bind(this);
//     this.start = this.start.bind(this);

//     // Initialize built-in helpers
//     this._helpers = {
//       ...helpers,
//       assetPath: this._assetPath.bind(this),
//     };
//   }

//   async start() {
//     console.log("\n🚀 Starting WildayJS...");
//     try {
//       console.log("\n🔍 Starting asset pipeline...");
//       await this.cssBundler.bundle();
//       if (process.env.NODE_ENV !== "production") {
//         await this.cssBundler.watch();
//       }
//     } catch (err) {
//       console.error("Failed to start asset pipeline:", err);
//       throw err;
//     }
//   }

//   draw(callback) {
//     callback(this.router.routes);
//   }

//   handler() {
//     return this.requestHandler.handle.bind(this.requestHandler);
//   }

//   // Built-in asset helper
//   _assetPath(filePath) {
//     if (process.env.NODE_ENV === "development") {
//       return `/assets/${filePath}`;
//     }

//     try {
//       const manifestPath = path.join(
//         process.cwd(),
//         "public/assets/.vite/manifest.json"
//       );
//       const manifest = JSON.parse(
//         require("fs").readFileSync(manifestPath, "utf8")
//       );
//       const key = filePath.replace(/^\//, "");
//       const entry = manifest[key];

//       if (!entry) {
//         console.warn(`Asset not found in manifest: ${filePath}`);
//         return `/assets/${filePath}`;
//       }

//       return `/assets/${entry.file}`;
//     } catch (e) {
//       console.warn("Asset manifest not found:", e.message);
//       return `/assets/${filePath}`;
//     }
//   }

//   // Allow users to add custom helpers
//   helpers(customHelpers = {}) {
//     this._helpers = {
//       ...this._helpers,
//       ...customHelpers,
//     };
//     return this;
//   }

//   getHelpers() {
//     return this._helpers;
//   }
// }

// module.exports = WildayJS;

// const path = require("path");
// const fs = require("fs").promises;
// const render = require("./render");
// const { errorTemplates } = require("./config/paths");
// const Router = require("./router");
// const RequestHandler = require("./requestHandler");
// const StaticFileHandler = require("./staticFileHandler");
// const assetHelper = require("./helpers/asset_helper");

// class WildayJS {
//   constructor() {
//     this.routes = {};
//     this.render = render;
//     this.errorTemplates = errorTemplates;
//     this.router = new Router(this);
//     this.staticFileHandler = new StaticFileHandler();
//     this.requestHandler = new RequestHandler(this);
//     this.environment = process.env.NODE_ENV || "development";

//     // Initialize built-in helpers
//     this._helpers = {
//       javascript: assetHelper.javascript.bind(assetHelper),
//       stylesheet: assetHelper.stylesheet.bind(assetHelper),
//       assetPath: assetHelper.assetPath.bind(assetHelper),
//       // viteClient: assetHelper.viteClient.bind(assetHelper),
//     };

//     // Bind methods
//     this.handler = this.handler.bind(this);
//     this.start = this.start.bind(this);
//     this.getHelpers = this.getHelpers.bind(this);
//   }

//   async start() {
//     console.log("\n🚀 Starting WildayJS...");

//     // Log environment info
//     console.log(`Environment: ${this.environment}`);

//     // Test asset helpers
//     if (this.isDevelopment()) {
//       console.log("\n🔍 Testing Asset Helpers:");
//       console.log(
//         "- javascript('application'):",
//         this._helpers.javascript("application")
//       );
//       console.log(
//         "- stylesheet('application'):",
//         this._helpers.stylesheet("application")
//       );
//       console.log("- viteClient():", this._helpers.viteClient());
//     }

//     // Log registered helpers
//     console.log("\n🔧 Registered Helpers:");
//     console.log(Object.keys(this._helpers));
//   }

//   draw(callback) {
//     callback(this.router.routes);
//   }

//   handler() {
//     return this.requestHandler.handle.bind(this.requestHandler);
//   }

//   // Helper management
//   helpers(customHelpers = {}) {
//     this._helpers = {
//       ...this._helpers,
//       ...customHelpers,
//     };
//     return this;
//   }

//   getHelpers() {
//     return {
//       ...this._helpers,
//       isDevelopment: () => this.isDevelopment(),
//     };
//   }

//   isDevelopment() {
//     return this.environment === "development";
//   }
// }

// module.exports = WildayJS;

const path = require("path");
const fs = require("fs").promises;
const render = require("./render");
const { errorTemplates } = require("./config/paths");
const Router = require("./router");
const RequestHandler = require("./requestHandler");
const StaticFileHandler = require("./staticFileHandler");
const helpers = require("./helpers");

class WildayJS {
  constructor() {
    // console.log("🔍 Initializing WildayJS with helpers:", Object.keys(helpers));

    this.routes = {};
    this.render = render;
    this.errorTemplates = errorTemplates;
    this.router = new Router(this);
    this.staticFileHandler = new StaticFileHandler();
    this.requestHandler = new RequestHandler(this);
    this.environment = process.env.NODE_ENV || "development";

    // Initialize built-in helpers
    this._helpers = {
      ...helpers, // Spread all helpers from the helpers module
      isDevelopment: () => this.isDevelopment(),
    };

    // Bind methods
    this.handler = this.handler.bind(this);
    this.start = this.start.bind(this);
    this.getHelpers = this.getHelpers.bind(this);
  }

  async start() {
    console.log("\n🚀 Starting WildayJS...");
    console.log(`Environment: ${this.environment}`);

    // Test asset helpers
    // if (this.isDevelopment()) {
    //   console.log("\n🔍 Testing Asset Helpers:");
    //   console.log("Available helpers:", Object.keys(this._helpers));
    // }
  }

  draw(callback) {
    callback(this.router.routes);
  }

  handler() {
    return this.requestHandler.handle.bind(this.requestHandler);
  }

  // Helper management
  helpers(customHelpers = {}) {
    this._helpers = {
      ...this._helpers,
      ...customHelpers,
    };
    return this;
  }

  getHelpers() {
    return this._helpers;
  }

  isDevelopment() {
    return this.environment === "development";
  }
}

module.exports = WildayJS;
