const fs = require("fs");
const path = require("path");
const connectionManager = require("./connectionManager");
const { log } = require("../utils/chalkUtils");

const DATABASE_TYPES = ["sqlite", "mysql", "postgresql"];

// Function to get app name from package.json
function getAppName() {
  try {
    const packagePath = path.join(process.cwd(), "package.json");
    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
      return packageJson.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
    }
  } catch (error) {
    console.log("Warning: Could not read package.json, using default name");
  }
  return "myapp";
}

// Function to generate config template
function generateConfigTemplate(activeType) {
  const appName = getAppName();

  // Create base config with active database setting
  const config = {
    active: activeType,
    databases: {},
  };

  // Generate configurations for all database types
  DATABASE_TYPES.forEach((dbType) => {
    config.databases[dbType] = {
      development: {
        client: dbType,
        connection:
          dbType === "sqlite"
            ? { filename: `db/${appName}_development.sqlite3` }
            : {
                host: "localhost",
                port: dbType === "mysql" ? 3306 : 5432,
                database: `${appName}_development`,
                user: dbType === "mysql" ? "root" : "postgres",
                password: "password",
              },
      },
      test: {
        client: dbType,
        connection:
          dbType === "sqlite"
            ? { filename: `db/${appName}_test.sqlite3` }
            : {
                host: "localhost",
                port: dbType === "mysql" ? 3306 : 5432,
                database: `${appName}_test`,
                user: dbType === "mysql" ? "root" : "postgres",
                password: "password",
              },
      },
      production: {
        client: dbType,
        connection:
          dbType === "sqlite"
            ? { filename: `db/${appName}_production.sqlite3` }
            : {
                host: process.env.DB_HOST || "localhost",
                port:
                  dbType === "mysql"
                    ? process.env.DB_PORT || 3306
                    : process.env.DB_PORT || 5432,
                database: process.env.DB_NAME || `${appName}_production`,
                user:
                  dbType === "mysql"
                    ? process.env.DB_USER || "root"
                    : process.env.DB_USER || "postgres",
                password: process.env.DB_PASSWORD || "password",
              },
      },
    };
  });

  return config;
}

// Function to switch active database
async function switchDatabase(newType) {
  console.log(`\n=== Switching Active Database to ${newType} ===`);

  if (!DATABASE_TYPES.includes(newType)) {
    throw new Error(
      `Invalid database type: ${newType}. Supported types: ${DATABASE_TYPES.join(
        ", "
      )}`
    );
  }

  const configPath = path.join(process.cwd(), "config", "database.js");

  if (!fs.existsSync(configPath)) {
    throw new Error("Database configuration file not found");
  }

  try {
    // Read current config
    delete require.cache[require.resolve(configPath)];
    const currentConfig = require(configPath);

    // Update active database
    currentConfig.active = newType;

    // Write updated config
    const configContent = `module.exports = ${JSON.stringify(
      currentConfig,
      null,
      2
    )};`;
    fs.writeFileSync(configPath, configContent, "utf8");

    // Reset connection manager
    await connectionManager.closeAll();
    connectionManager.resetConfig();

    log.success(`Successfully switched active database to: ${newType}`);
    return true;
  } catch (error) {
    throw new Error(`Failed to switch database: ${error.message}`);
  }
}

const initDatabase = async (options = {}) => {
  console.log("\n=== Initializing Database ===");
  console.log("Options received:", options);

  try {
    const activeType = options.type || "sqlite";
    console.log("Active database type:", activeType);

    if (!DATABASE_TYPES.includes(activeType)) {
      throw new Error(
        `Invalid database type: ${activeType}. Supported types: ${DATABASE_TYPES.join(
          ", "
        )}`
      );
    }

    // Create necessary directories
    const dbDir = path.join(process.cwd(), "db");
    const migrateDir = path.join(dbDir, "migrate");
    const downDir = path.join(migrateDir, "down");
    const configDir = path.join(process.cwd(), "config");

    [dbDir, migrateDir, downDir, configDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Create or update database.js config
    const configPath = path.join(configDir, "database.js");
    console.log("\nConfig path:", configPath);

    const shouldUpdateConfig =
      !fs.existsSync(configPath) ||
      options.force ||
      (options.type &&
        connectionManager.getCurrentDatabaseType() !== options.type);

    if (shouldUpdateConfig) {
      console.log(
        `Creating new multi-database config file (active: ${activeType})`
      );
      const configTemplate = generateConfigTemplate(activeType);
      const configContent = `module.exports = ${JSON.stringify(
        configTemplate,
        null,
        2
      )};`;
      fs.writeFileSync(configPath, configContent, "utf8");
      log.info(`Created database configuration file at config/database.js`);

      connectionManager.resetConfig();
      console.log("\nCreated config content:", configContent);
    }

    // Create .gitkeep files
    [migrateDir, downDir].forEach((dir) => {
      const gitkeepPath = path.join(dir, ".gitkeep");
      if (!fs.existsSync(gitkeepPath)) {
        fs.writeFileSync(gitkeepPath, "");
      }
    });

    // Create SQLite database files if needed
    if (activeType === "sqlite") {
      ["development", "test"].forEach((env) => {
        const dbFile = path.join(dbDir, `${env}.sqlite3`);
        if (!fs.existsSync(dbFile)) {
          fs.writeFileSync(dbFile, "");
        }
      });
    }

    // Initialize active database connection
    console.log("\nInitializing database connection...");
    const connection = await connectionManager.getConnection(activeType);
    console.log("Connection established successfully");

    try {
      // Create schema_migrations table
      console.log("\nCreating schema_migrations table...");
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(255) PRIMARY KEY,
          created_at TIMESTAMP ${
            activeType === "sqlite"
              ? "DEFAULT CURRENT_TIMESTAMP"
              : "DEFAULT CURRENT_TIMESTAMP()"
          }
        )
      `;

      if (activeType === "mysql") {
        await connection.query(createTableSQL);
      } else if (activeType === "sqlite") {
        await connection.exec(createTableSQL);
      } else if (activeType === "postgresql") {
        await connection.query(createTableSQL);
      }

      await connectionManager.closeConnection(activeType);

      // Success message
      const currentConfig =
        connectionManager.config.databases[activeType].development.connection;
      log.success(`
Multi-Database Configuration Initialized!

Active Database: ${activeType.toUpperCase()}
Available Databases: ${DATABASE_TYPES.join(", ")}

Configuration:
${
  activeType === "sqlite"
    ? `Location: ${path.join(process.cwd(), "db", "development.sqlite3")}`
    : `Database: ${currentConfig.database}
Host: ${currentConfig.host}
Port: ${currentConfig.port}`
}

Directory Structure:
├── config/
│   └── database.js (multi-database config)
└── db/
    ├── migrate/
    │   └── down/
    ${activeType === "sqlite" ? "└── development.sqlite3" : ""}

Commands:
1. Switch database:
   $ wildayjs db:switch postgresql  # or mysql, sqlite

2. Create a model:
   $ wildayjs generate:model user name:string email:string

3. Run migration:
   $ wildayjs db:migrate

4. Start using your models!`);
    } catch (error) {
      console.error("\nError details:", error);
      log.error(`Failed to create schema_migrations table: ${error.message}`);
      handleDatabaseError(error, activeType);
      process.exit(1);
    }
  } catch (error) {
    console.error("\nInitialization error:", error);
    log.error(`Failed to initialize database: ${error.message}`);
    process.exit(1);
  }
};

function handleDatabaseError(error, dbType) {
  switch (dbType) {
    case "sqlite":
      if (error.code === "SQLITE_CANTOPEN") {
        log.error("Could not create or access SQLite database file");
        console.log("Please check file permissions and directory access");
      }
      break;

    case "mysql":
    case "postgresql":
      if (error.code === "ECONNREFUSED") {
        log.error(`Could not connect to ${dbType} server`);
        console.log("Please check:");
        console.log("1. Database server is running");
        console.log("2. Connection credentials in config/database.js");
        console.log("3. Network connectivity to database server");
      } else if (
        error.code === "ER_ACCESS_DENIED_ERROR" ||
        error.code === "28P01"
      ) {
        log.error("Access denied: Invalid credentials");
        console.log("Please check username and password in config/database.js");
      } else if (error.code === "ER_BAD_DB_ERROR" || error.code === "3D000") {
        log.error("Database does not exist");
        console.log(
          "Please create the database or check database name in config/database.js"
        );
      }
      break;
  }
}

module.exports = {
  initDatabase,
  switchDatabase,
  DATABASE_TYPES,
};
