const connectionManager = require("./connectionManager");
const { log } = require("../utils/chalkUtils");

const dbStatus = async () => {
  try {
    const activeType = connectionManager.getActiveDatabase();
    const connection = await connectionManager.getConnection();
    const config = connectionManager.getDatabaseConfig(activeType);

    // Create migrations table if it doesn't exist
    await createMigrationsTableIfNeeded(activeType, connection);

    // Get all migrations based on database type
    let migrations;

    try {
      switch (activeType) {
        case "sqlite":
          migrations = connection
            .prepare(
              `
              SELECT version, created_at, batch,
                     CASE WHEN reverted_at IS NULL THEN 'active' ELSE 'reverted' END as status
              FROM migrations 
              ORDER BY version DESC
            `
            )
            .all();
          break;

        case "mysql":
          [migrations] = await connection.query(`
            SELECT version, created_at, batch,
                   CASE WHEN reverted_at IS NULL THEN 'active' ELSE 'reverted' END as status
            FROM migrations 
            ORDER BY version DESC
          `);
          break;

        case "postgresql":
          const { rows } = await connection.query(`
            SELECT version, created_at, batch,
                   CASE WHEN reverted_at IS NULL THEN 'active' ELSE 'reverted' END as status
            FROM migrations 
            ORDER BY version DESC
          `);
          migrations = rows;
          break;
      }

      // Display database information
      log.info("\nDatabase Configuration Status:");
      log.info("---------------------------");
      log.success(`Active Database: ${activeType.toUpperCase()}`);
      log.info(
        `Available Databases: ${Object.keys(
          connectionManager.config.databases
        ).join(", ")}`
      );

      log.info("\nConnection Details:");
      log.info("-----------------");
      if (activeType === "sqlite") {
        log.success(`File: ${connectionManager.getDbPath()}`);
      } else {
        log.success(`Database: ${config.database}`);
        log.success(`Host: ${config.host || "localhost"}`);
        log.success(`Port: ${config.port}`);
        log.success(`User: ${config.user}`);
      }

      // Display migration status
      log.info("\nMigration Status:");
      log.info("----------------");

      if (!migrations || migrations.length === 0) {
        log.warn("No migrations have been run.");
      } else {
        // Calculate statistics
        const active = migrations.filter((m) => m.status === "active").length;
        const reverted = migrations.filter(
          (m) => m.status === "reverted"
        ).length;
        const latestBatch = Math.max(...migrations.map((m) => m.batch || 0));

        // Display summary
        log.info(`Total Migrations: ${migrations.length}`);
        log.success(`Active: ${active}`);
        log.warn(`Reverted: ${reverted}`);
        log.info(`Latest Batch: ${latestBatch || "None"}`);

        log.info("\nMigration History:");
        log.info("----------------");

        // Group migrations by batch
        const migrationsByBatch = migrations.reduce((acc, migration) => {
          const batch = migration.batch || 0;
          acc[batch] = acc[batch] || [];
          acc[batch].push(migration);
          return acc;
        }, {});

        // Display migrations grouped by batch
        Object.entries(migrationsByBatch)
          .sort(([a], [b]) => b - a) // Sort batches in descending order
          .forEach(([batch, batchMigrations]) => {
            log.info(`\nBatch ${batch || "Unassigned"}:`);
            batchMigrations.forEach((migration) => {
              const timestamp = new Date(migration.created_at).toLocaleString();
              const statusColor =
                migration.status === "active" ? "success" : "warn";

              log[statusColor](
                `[${migration.status.toUpperCase()}] ${migration.version}`
              );
              console.log(`          Applied at: ${timestamp}`);
            });
          });
      }

      // Display pending migrations if any
      const pendingMigrations = await getPendingMigrations(
        activeType,
        connection
      );
      if (pendingMigrations.length > 0) {
        log.info("\nPending Migrations:");
        log.info("-----------------");
        pendingMigrations.forEach((file) => {
          log.warn(`• ${file}`);
        });

        log.info("\nTo apply pending migrations:");
        log.info("$ wildayjs db:migrate");
      }

      // Display database switching info
      log.info("\nDatabase Management:");
      log.info("------------------");
      log.info("Switch active database:");
      log.info("$ wildayjs db:switch <type>");
      log.info("\nSupported types: sqlite, mysql, postgresql");
    } catch (error) {
      log.error(`Error querying migrations: ${error.message}`);
      if (error.code === "ECONNREFUSED") {
        log.error("Could not connect to database server");
      }
      throw error;
    }

    await connectionManager.closeConnection();
  } catch (error) {
    log.error(`Failed to check database status: ${error.message}`);

    // Database-specific error handling
    const activeType = connectionManager.getActiveDatabase();
    console.log("\nTroubleshooting steps:");

    switch (activeType) {
      case "sqlite":
        console.log("1. Check if database file exists");
        console.log(`   Path: ${connectionManager.getDbPath()}`);
        console.log("2. Verify file permissions");
        console.log(
          "3. Run 'wildayjs db:init' if database hasn't been initialized"
        );
        break;

      case "mysql":
      case "postgresql":
        console.log("1. Verify database server is running");
        console.log("2. Check connection credentials in config/database.js");
        console.log("3. Ensure network connectivity to database server");
        console.log(
          "4. Verify database exists and user has proper permissions"
        );
        break;
    }

    process.exit(1);
  }
};

// Helper function to create migrations table
async function createMigrationsTableIfNeeded(dbType, connection) {
  try {
    switch (dbType) {
      case "sqlite":
        connection.exec(`
          CREATE TABLE IF NOT EXISTS migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version VARCHAR(255) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            reverted_at DATETIME,
            batch INTEGER
          )
        `);
        break;

      case "mysql":
        await connection.query(`
          CREATE TABLE IF NOT EXISTS migrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            version VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reverted_at TIMESTAMP NULL,
            batch INT
          )
        `);
        break;

      case "postgresql":
        await connection.query(`
          CREATE TABLE IF NOT EXISTS migrations (
            id SERIAL PRIMARY KEY,
            version VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reverted_at TIMESTAMP,
            batch INTEGER
          )
        `);
        break;
    }
  } catch (error) {
    log.error(`Failed to create migrations table: ${error.message}`);
    throw error;
  }
}

// Helper function to get pending migrations
async function getPendingMigrations(activeType, connection) {
  const fs = require("fs");
  const path = require("path");

  const migrateDir = path.join(process.cwd(), "db", "migrate");

  if (!fs.existsSync(migrateDir)) {
    return [];
  }

  const files = fs
    .readdirSync(migrateDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  let appliedMigrations;

  switch (activeType) {
    case "sqlite":
      appliedMigrations = connection
        .prepare("SELECT version FROM migrations")
        .all()
        .map((m) => m.version);
      break;

    case "mysql":
      [appliedMigrations] = await connection.query(
        "SELECT version FROM migrations"
      );
      appliedMigrations = appliedMigrations.map((m) => m.version);
      break;

    case "postgresql":
      const { rows } = await connection.query("SELECT version FROM migrations");
      appliedMigrations = rows.map((m) => m.version);
      break;
  }

  return files.filter((file) => !appliedMigrations.includes(file));
}

module.exports = dbStatus;
