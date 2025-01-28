const path = require("path");
const { loadWildayConfig } = require("../../config");
const { cli } = require("../../utils/chalkUtils");

// Default config
const defaults = {
  preOptimize: false,
  dynamicOptimize: true,
  debug: false,
  placeholder: true,
  sizes: [400, 800, 1200],
  formats: ["webp"],
  quality: 80,
  cacheDir: "storage/image-cache",
  sourceDir: "app/assets/images",
  outputDir: "public/assets/images",
};

function getConfig(options = {}) {
  // Load user config
  const wildayConfig = loadWildayConfig();
  const userConfig = wildayConfig.webpack?.images || {};

  // Use user config as the base, fall back to defaults
  const config = {
    ...defaults, // Start with defaults
    ...userConfig, // Override with user config
    ...options, // Override with passed options
  };

  if (config.debug) {
    console.log(cli.info("\n🔧 Image Config:"), config);
  }

  return Object.freeze(config);
}

module.exports = { getConfig };
