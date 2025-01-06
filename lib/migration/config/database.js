const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const databaseConfig = {
  sqlite: {
    foreignKeys: {
      disable: "PRAGMA foreign_keys=off;",
      enable: "PRAGMA foreign_keys=on;",
    },
    autoIncrement: "AUTOINCREMENT",
    dateTimeFormat: "datetime('now')",
    identifierQuote: '"',
    defaultPath: path.join(process.cwd(), "db", "development.sqlite3"),
  },
  mysql: {
    foreignKeys: {
      disable: "SET FOREIGN_KEY_CHECKS=0;",
      enable: "SET FOREIGN_KEY_CHECKS=1;",
    },
    autoIncrement: "AUTO_INCREMENT",
    dateTimeFormat: "CURRENT_TIMESTAMP",
    identifierQuote: "`",
  },
  postgresql: {
    foreignKeys: {
      disable: "", // PostgreSQL doesn't support disabling foreign keys
      enable: "",
    },
    autoIncrement: "GENERATED ALWAYS AS IDENTITY",
    dateTimeFormat: "CURRENT_TIMESTAMP",
    identifierQuote: '"',
  },
};

function getDatabaseConfig(adapter = null) {
  let config;
  let dbType = "sqlite"; // Default to SQLite

  // If adapter is provided, get the database type from it
  if (adapter) {
    dbType = adapter.constructor.name.toLowerCase().replace("adapter", "");
  }

  // Try to load from environment variables first
  if (process.env.DATABASE_URL) {
    config = parseDatabaseUrl(process.env.DATABASE_URL);
    dbType = config.type;
  } else {
    // Try to load from config/database.yml
    const ymlPath = path.join(process.cwd(), "config", "database.yml");
    if (fs.existsSync(ymlPath)) {
      try {
        const fileContents = fs.readFileSync(ymlPath, "utf8");
        config = yaml.load(fileContents);
      } catch (error) {
        console.error("Error reading database.yml:", error);
      }
    }

    // If no YML config, try to load from config/database.js
    if (!config) {
      const jsPath = path.join(process.cwd(), "config", "database.js");
      if (fs.existsSync(jsPath)) {
        try {
          config = require(jsPath);
        } catch (error) {
          console.error("Error reading database.js:", error);
        }
      }
    }

    // If still no config, use default SQLite configuration
    if (!config) {
      config = {
        development: {
          type: "sqlite",
          database: databaseConfig.sqlite.defaultPath,
        },
      };
    }

    // Get configuration for current environment
    const env = process.env.NODE_ENV || "development";
    config = config[env] || config;
  }

  // Merge database-specific configuration with user config
  return {
    ...config,
    ...databaseConfig[dbType],
  };
}

function parseDatabaseUrl(url) {
  const parsed = new URL(url);
  const [username, password] = (parsed.auth || ":").split(":");
  const database = parsed.pathname.slice(1);
  const type = parsed.protocol.slice(0, -1);

  return {
    type,
    host: parsed.hostname,
    port: parsed.port,
    database,
    username,
    password,
    ...databaseConfig[type], // Merge with database-specific configuration
  };
}

module.exports = {
  databaseConfig,
  getDatabaseConfig,
  parseDatabaseUrl,
};
