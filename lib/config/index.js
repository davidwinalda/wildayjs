const fs = require("fs");
const path = require("path");
const { log, cli } = require("../utils/chalkUtils");

const defaultConfig = {
  database: {
    client: "sqlite",
    connection: {
      filename: path.join(process.cwd(), "db", "development.sqlite3"),
    },
  },
  webpack: {
    entry: {
      application: ["./app/assets/javascript/application.js"],
    },
    paths: {
      assets: "app/assets",
      public: "public/assets",
    },
    optimization: {
      imageQuality: 80,
      splitChunks: {
        minSize: 20000,
      },
    },
    devServer: {
      port: 3000,
      host: "localhost",
    },
    images: {
      preOptimize: false,
      dynamicOptimize: false,
      sizes: [400, 800, 1200],
      formats: ["webp"],
      quality: 80,
      placeholder: true,
      cacheDir: "storage/image-cache",
      debug: false,
      sourceDir: "app/assets/images",
      outputDir: "public/assets/images",
    },
  },
};

let configDisplayed = false;

function loadDatabaseConfig() {
  const configPath = path.join(process.cwd(), "config", "database.js");

  try {
    if (fs.existsSync(configPath)) {
      return require(configPath);
    }
    return defaultConfig.database;
  } catch (error) {
    log.error("❌ Database config error:", error.message);
    process.exit(1);
  }
}

function loadWildayConfig() {
  const configPath = path.join(process.cwd(), "wilday.config.js");

  try {
    if (fs.existsSync(configPath)) {
      const userConfig = require(configPath);
      const mergedConfig = { ...defaultConfig };

      if (userConfig.webpack) {
        mergedConfig.webpack = {
          ...defaultConfig.webpack,
          ...userConfig.webpack,
        };

        if (userConfig.webpack.images) {
          mergedConfig.webpack.images = {
            ...defaultConfig.webpack.images,
            ...userConfig.webpack.images,
          };
        }
      }

      // Only display config once
      if (!configDisplayed) {
        console.log(cli.info("\n📦 Configuration"));
        console.log(
          cli.info(
            `- Image optimization: ${
              mergedConfig.webpack.images.preOptimize
                ? "enabled (pre-build)"
                : mergedConfig.webpack.images.dynamicOptimize
                ? "enabled (dynamic)"
                : "disabled"
            }`
          )
        );
        console.log(
          cli.info(
            `- Formats: ${mergedConfig.webpack.images.formats.join(", ")}`
          )
        );
        console.log(
          cli.info(
            `- Sizes: ${mergedConfig.webpack.images.sizes.join("px, ")}px`
          )
        );
        configDisplayed = true;
      }

      return mergedConfig;
    }
    log.warn("⚠️  Using default configuration");
    return defaultConfig;
  } catch (error) {
    log.error("❌ Config error:", error.message);
    return defaultConfig;
  }
}

module.exports = {
  loadConfig: loadDatabaseConfig,
  loadDatabaseConfig,
  loadWildayConfig,
  defaultConfig,
};
