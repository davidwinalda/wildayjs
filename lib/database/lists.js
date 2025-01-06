const path = require("path");
const { log } = require("../utils/chalkUtils");
const { DATABASE_TYPES } = require("./init");

const listDatabases = () => {
  try {
    const config = require(path.join(process.cwd(), "config", "database.js"));

    // Check if we're using the old or new config format
    const isLegacyFormat = config.database && !config.databases;

    if (isLegacyFormat) {
      displayLegacyConfig(config);
    } else {
      displayMultiDatabaseConfig(config);
    }

    displayAvailableCommands();
  } catch (error) {
    handleError(error);
  }
};

function displayLegacyConfig(config) {
  const dbType = config.database.development.client;
  log.info("\nCurrent Database Configuration (Legacy Format):");
  log.info("-------------------------------------------");
  log.success(`Active Database: ${dbType.toUpperCase()}`);

  const devConfig = config.database.development.connection;
  if (dbType === "sqlite") {
    console.log(`\nFile: ${devConfig.filename}`);
  } else {
    console.log(`\nConnection Details:`);
    console.log(`Host: ${devConfig.host}`);
    console.log(`Port: ${devConfig.port}`);
    console.log(`Database: ${devConfig.database}`);
    console.log(`User: ${devConfig.user}`);
  }

  log.warn("\nNote: You're using the legacy configuration format.");
  console.log("To upgrade to multi-database support, run:");
  console.log(`$ wildayjs db:init --type ${dbType} --force`);
}

function displayMultiDatabaseConfig(config) {
  const active = config.active || "sqlite";

  log.info("\nConfigured Databases:");
  log.info("-------------------");
  log.success(`Active Database: ${active.toUpperCase()}`);

  Object.entries(config.databases || {}).forEach(([type, dbConfig]) => {
    const isActive = type === active;
    log[isActive ? "success" : "info"](
      `\n${isActive ? "* " : "  "}${type.toUpperCase()}:`
    );

    const devConfig = dbConfig.development.connection;
    if (type === "sqlite") {
      console.log(`   File: ${devConfig.filename}`);
    } else {
      console.log(`   Host: ${devConfig.host}`);
      console.log(`   Port: ${devConfig.port}`);
      console.log(`   Database: ${devConfig.database}`);
      console.log(`   User: ${devConfig.user}`);
    }
  });
}

function displayAvailableCommands() {
  log.info("\nAvailable Commands:");
  log.info("------------------");
  console.log("1. Initialize multi-database:  wildayjs db:init --type <type>");
  console.log("2. Switch active database:     wildayjs db:switch <type>");
  console.log("3. Check database status:      wildayjs db:status");
  console.log("4. Check database connection:  wildayjs db:check");

  log.info(`\nSupported database types: ${DATABASE_TYPES.join(", ")}`);
}

function handleError(error) {
  log.error("\nError reading database configuration:", error.message);
  log.info("\nTroubleshooting steps:");
  console.log("1. Check if config/database.js exists");
  console.log("2. Run 'wildayjs db:init' to create a new configuration");
  console.log("3. Verify the configuration file format");
  process.exit(1);
}

module.exports = listDatabases;
