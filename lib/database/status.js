const Database = require("better-sqlite3");
const path = require("path");
const { log } = require("../utils/chalkUtils");

const dbStatus = () => {
  const dbPath = path.join(process.cwd(), "db", "development.sqlite3");

  try {
    const db = new Database(dbPath);

    // Get all migrations
    const migrations = db
      .prepare(
        `
      SELECT version, created_at 
      FROM schema_migrations 
      ORDER BY version DESC
    `
      )
      .all();

    log.info("\nDatabase Migration Status:");
    log.info("------------------------");

    if (migrations.length === 0) {
      log.warn("No migrations have been run.");
    } else {
      migrations.forEach((migration) => {
        log.success(
          `Version ${migration.version} (applied at ${migration.created_at})`
        );
      });
    }

    db.close();
  } catch (error) {
    log.error(`Failed to check migration status: ${error.message}`);
    process.exit(1);
  }
};

module.exports = dbStatus;
