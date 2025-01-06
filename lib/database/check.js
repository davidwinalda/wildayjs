const connectionManager = require("./connectionManager");
const { log } = require("../utils/chalkUtils");

const checkDatabase = async () => {
  try {
    const activeType = connectionManager.getActiveDatabase();
    const connection = await connectionManager.getConnection();
    const config = connectionManager.getDatabaseConfig(activeType);

    // Header section
    log.success("\nDatabase Configuration Status:");
    console.log("---------------------------");
    log.success(`Active Database: ${activeType.toUpperCase()}`);
    log.info(
      `Available Databases: ${Object.keys(
        connectionManager.config.databases
      ).join(", ")}`
    );

    // Connection details
    console.log("\nConnection Details:");
    console.log("-----------------");
    if (activeType === "sqlite") {
      console.log(`📁 Database path: ${connectionManager.getDbPath()}`);
    } else {
      console.log(`📁 Database: ${config.database}`);
      console.log(`🌐 Host: ${config.host}`);
      console.log(`🔌 Port: ${config.port}`);
      console.log(`👤 User: ${config.user}`);
    }

    // Database version
    switch (activeType) {
      case "sqlite": {
        const version = connection.prepare("SELECT sqlite_version()").get();
        console.log(`📊 SQLite version: ${version["sqlite_version()"]}`);

        // Tables section
        console.log("\nDatabase Tables:");
        console.log("---------------");

        const tables = connection
          .prepare(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
          )
          .all();

        await displayTables(tables, async (tableName) => {
          const columns = connection
            .prepare(`PRAGMA table_info(${tableName})`)
            .all();
          return columns.map((col) => ({
            name: col.name,
            type: tableName === "sqlite_sequence" ? "" : col.type,
          }));
        });

        // Migration status
        await displayMigrationStatus(async () => {
          try {
            const result = connection
              .prepare(
                "SELECT version, created_at, batch FROM migrations WHERE reverted_at IS NULL ORDER BY created_at DESC"
              )
              .all();
            return { migrations: result };
          } catch (error) {
            return { error: "No migrations table found" };
          }
        });
        break;
      }

      case "mysql": {
        const [versionResult] = await connection.query(
          "SELECT VERSION() as version"
        );
        console.log(`📊 MySQL version: ${versionResult[0].version}`);

        // Tables section
        console.log("\nDatabase Tables:");
        console.log("---------------");

        const [tables] = await connection.query(
          "SELECT table_name as name FROM information_schema.tables WHERE table_schema = DATABASE()"
        );

        await displayTables(tables, async (tableName) => {
          const [columns] = await connection.query("SHOW COLUMNS FROM ??", [
            tableName,
          ]);
          return columns.map((col) => ({
            name: col.Field,
            type: col.Type,
          }));
        });

        // Migration status
        await displayMigrationStatus(async () => {
          try {
            const [result] = await connection.query(
              "SELECT version, created_at, batch FROM migrations WHERE reverted_at IS NULL ORDER BY created_at DESC"
            );
            return { migrations: result };
          } catch (error) {
            return { error: "No migrations table found" };
          }
        });
        break;
      }

      case "postgresql": {
        const {
          rows: [version],
        } = await connection.query("SELECT version()");
        console.log(`📊 PostgreSQL version: ${version.version.split(" ")[1]}`);

        // Tables section
        console.log("\nDatabase Tables:");
        console.log("---------------");

        const { rows: tables } = await connection.query(
          "SELECT tablename as name FROM pg_tables WHERE schemaname = 'public'"
        );

        await displayTables(tables, async (tableName) => {
          const { rows: columns } = await connection.query(
            `
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = $1
            ORDER BY ordinal_position
          `,
            [tableName]
          );
          return columns.map((col) => ({
            name: col.column_name,
            type: col.data_type,
          }));
        });

        // Migration status
        await displayMigrationStatus(async () => {
          try {
            const { rows } = await connection.query(
              "SELECT version, created_at, batch FROM migrations WHERE reverted_at IS NULL ORDER BY created_at DESC"
            );
            return { migrations: rows };
          } catch (error) {
            return { error: "No migrations table found" };
          }
        });
        break;
      }
    }

    // Database management commands
    console.log("\nDatabase Management:");
    console.log("------------------");
    console.log("1. Switch database:");
    console.log("   $ wildayjs db:switch <type>");
    console.log("2. Run migrations:");
    console.log("   $ wildayjs db:migrate");
    console.log("3. Check status:");
    console.log("   $ wildayjs db:status");

    await connectionManager.closeConnection();
    return true;
  } catch (error) {
    log.error("\nDatabase Connection Error:");
    console.log("------------------------");
    log.error(`✗ ${error.message}`);

    const activeType = connectionManager.getActiveDatabase();
    console.log("\nPossible solutions:");

    switch (activeType) {
      case "sqlite":
        console.log("1. Run 'wildayjs db:init' to initialize the database");
        console.log("2. Check if the database file exists at:");
        console.log(`   ${connectionManager.getDbPath()}`);
        console.log("3. Verify file permissions");
        break;

      case "mysql":
      case "postgresql":
        console.log("1. Verify database credentials in config/database.js");
        console.log("2. Ensure database server is running");
        console.log("3. Check if database exists");
        console.log("4. Verify network connectivity to database server");
        break;
    }

    console.log("\nTo switch to a different database:");
    console.log("$ wildayjs db:switch <type>");
    console.log("Available types: sqlite, mysql, postgresql");

    return false;
  }
};

// Helper function to display tables and their columns
async function displayTables(tables, getColumns) {
  if (tables.length === 0) {
    log.warn("No tables found in database.");
  } else {
    for (const table of tables) {
      log.success(`✓ ${table.name}`);
      const columns = await getColumns(table.name);
      columns.forEach((col) => {
        console.log(`  └─ ${col.name} (${col.type})`);
      });
    }
  }
}

// Helper function to display migration status
async function displayMigrationStatus(getMigrationStats) {
  console.log("\nMigration Status:");
  console.log("----------------");

  try {
    const result = await getMigrationStats();

    if (result.error) {
      log.warn(result.error);
      return;
    }

    if (result.migrations.length === 0) {
      log.info("No migrations found");
      return;
    }

    // Group migrations by batch
    const migrationsByBatch = result.migrations.reduce((acc, migration) => {
      acc[migration.batch] = acc[migration.batch] || [];
      acc[migration.batch].push(migration);
      return acc;
    }, {});

    // Display migrations grouped by batch
    Object.entries(migrationsByBatch)
      .sort(([a], [b]) => b - a) // Sort batches in descending order
      .forEach(([batch, batchMigrations]) => {
        log.info(`\nBatch ${batch}:`);
        batchMigrations.forEach((migration) => {
          const date = new Date(migration.created_at).toLocaleString();
          log.success(`✓ ${migration.version} (${date})`);
        });
      });
  } catch (error) {
    log.warn("Unable to fetch migration status");
  }
}

module.exports = checkDatabase;
