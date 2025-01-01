const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { log } = require("../utils/chalkUtils");

const initDatabase = () => {
  const dbDir = path.join(process.cwd(), "db");
  const migrateDir = path.join(dbDir, "migrate");
  const downDir = path.join(migrateDir, "down");
  const dbPath = path.join(dbDir, "development.sqlite3");

  try {
    // Create directories
    [dbDir, migrateDir, downDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Initialize database
    const db = new Database(dbPath);

    // Create schema_migrations table
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    db.close();

    log.success(`Database initialized successfully!

Your database is ready at: db/development.sqlite3

Next steps:
1. Create a model:
   $ wildayjs generate:model user name:string email:string

2. Run the migration:
   $ wildayjs db:migrate

3. Start using your models!
    `);
  } catch (error) {
    log.error(`Failed to initialize database: ${error.message}`);
    process.exit(1);
  }
};

module.exports = initDatabase;
