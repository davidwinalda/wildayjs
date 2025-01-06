const fs = require("fs");
const path = require("path");
const { log } = require("../utils/chalkUtils");

function loadConfig() {
  const configPath = path.join(process.cwd(), "config", "database.js");

  try {
    if (fs.existsSync(configPath)) {
      return require(configPath);
    }

    // Return default config if no config file exists
    return {
      database: {
        client: "sqlite",
        connection: {
          filename: path.join(process.cwd(), "db", "development.sqlite3"),
        },
      },
    };
  } catch (error) {
    log.error(`Error loading database config: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { loadConfig };
