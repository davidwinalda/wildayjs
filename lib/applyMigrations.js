const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { log } = require("./utils/chalkUtils");

// Paths
const dbPath = path.join(process.cwd(), "db", "development.sqlite3");
const migrationDir = path.join(process.cwd(), "db", "migrate");
const downMigrationDir = path.join(migrationDir, "down");

// Initialize the migrations table
const initializeMigrationsTable = (db) => {
  // First create table if not exists
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      version TEXT NOT NULL,
      applied_at DATETIME DEFAULT (datetime('now')),
      reverted_at DATETIME DEFAULT NULL
    );
  `;
  db.exec(createTableSQL);

  // Then check if reverted_at column exists
  const hasRevertedAt =
    db
      .prepare(
        `
    SELECT COUNT(*) as count 
    FROM pragma_table_info('migrations') 
    WHERE name='reverted_at'
  `
      )
      .get().count > 0;

  // Add reverted_at column if it doesn't exist
  if (!hasRevertedAt) {
    db.exec(
      "ALTER TABLE migrations ADD COLUMN reverted_at DATETIME DEFAULT NULL;"
    );
  }
};

// Helper to extract version from filename
const getVersionFromFilename = (filename) => {
  const match = filename.match(/^(\d{14})_/);
  return match ? match[1] : null;
};

// Apply a single migration
const applyMigration = (db, file, direction = "up") => {
  const filePath =
    direction === "up"
      ? path.join(migrationDir, file)
      : path.join(downMigrationDir, file.replace(".sql", "_down.sql"));

  if (!fs.existsSync(filePath)) {
    log.error(`Migration file not found: ${filePath}`);
    return false;
  }

  const version = getVersionFromFilename(file);
  const sql = fs.readFileSync(filePath, "utf8");

  try {
    // Execute the migration SQL directly (it already contains transaction statements)
    db.exec(sql);

    // Record the migration status
    if (direction === "up") {
      // Check if migration exists but was reverted
      const existingMigration = db
        .prepare(`SELECT id FROM migrations WHERE filename = ?`)
        .get(file);

      if (existingMigration) {
        // Update existing record
        const updateStmt = db.prepare(
          `UPDATE migrations 
           SET reverted_at = NULL, 
               applied_at = datetime('now') 
           WHERE filename = ?`
        );
        updateStmt.run(file);
      } else {
        // Insert new record
        const insertStmt = db.prepare(
          `INSERT INTO migrations (filename, version) VALUES (?, ?)`
        );
        insertStmt.run(file, version);
      }
      log.success(`Applied migration: ${file}`);
    } else {
      const updateStmt = db.prepare(
        `UPDATE migrations SET reverted_at = datetime('now') WHERE filename = ?`
      );
      updateStmt.run(file);
      log.warn(`Reverted migration: ${file}`);
    }

    return true;
  } catch (err) {
    log.error(
      `Failed to ${direction === "up" ? "apply" : "revert"} migration: ${file}`
    );
    log.error(err.message);
    return false;
  }
};

// Main migration function
const applyMigrations = (options = {}) => {
  const { version, reset = false, command = "migrate", steps = 1 } = options;
  const db = new Database(dbPath);

  try {
    db.exec("PRAGMA foreign_keys = OFF;");
    initializeMigrationsTable(db);

    switch (command) {
      case "rollback":
        // Get the last 'steps' number of applied migrations
        const migrationsToRevert = db
          .prepare(
            `SELECT filename FROM migrations 
             WHERE reverted_at IS NULL 
             ORDER BY version DESC 
             LIMIT ?`
          )
          .all(steps);

        if (migrationsToRevert.length === 0) {
          log.warn("No migrations to rollback");
          return;
        }

        for (const migration of migrationsToRevert) {
          applyMigration(db, migration.filename, "down");
        }
        log.success(`Rolled back ${migrationsToRevert.length} migration(s)`);
        break;

      case "migrate:down":
        if (!version) {
          log.error("Version is required for migrate:down");
          return;
        }

        const migration = db
          .prepare(
            `SELECT filename FROM migrations 
             WHERE version = ? AND reverted_at IS NULL`
          )
          .get(version);

        if (!migration) {
          log.error(
            `Migration version ${version} not found or already reverted`
          );
          return;
        }

        applyMigration(db, migration.filename, "down");
        log.success(`Reverted migration version ${version}`);
        break;

      default:
        // Get all migration files
        const migrations = fs
          .readdirSync(migrationDir)
          .filter((file) => file.endsWith(".sql"))
          .sort();

        if (reset) {
          // Revert all migrations in reverse order
          const appliedMigrations = db
            .prepare(
              `SELECT filename FROM migrations WHERE reverted_at IS NULL ORDER BY version DESC`
            )
            .all();

          for (const migration of appliedMigrations) {
            applyMigration(db, migration.filename, "down");
          }

          // Then apply all migrations again
          for (const migration of migrations) {
            applyMigration(db, migration, "up");
          }
        } else {
          // Apply pending migrations up to specified version
          for (const file of migrations) {
            const fileVersion = getVersionFromFilename(file);

            // Skip if file version is greater than target version
            if (version && fileVersion > version) {
              continue;
            }

            const isApplied =
              db
                .prepare(
                  `SELECT COUNT(*) as count 
                 FROM migrations 
                 WHERE filename = ? 
                 AND reverted_at IS NULL`
                )
                .get(file).count > 0;

            if (!isApplied) {
              applyMigration(db, file, "up");
            } else {
              log.warn(`Skipping already applied migration: ${file}`);
            }
          }
        }
    }
  } finally {
    db.exec("PRAGMA foreign_keys = ON;");
    db.close();
  }
};

// Command-line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "rollback":
        options.command = "rollback";
        break;
      case "migrate:down":
        options.command = "migrate:down";
        break;
      case "--version":
        options.version = args[++i];
        break;
      case "--step":
        options.steps = parseInt(args[++i], 10);
        break;
      case "--reset":
        options.reset = true;
        break;
    }
  }

  applyMigrations(options);
}

module.exports = applyMigrations;
