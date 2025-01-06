const knexManager = require("../knexManager");
const { log } = require("../utils/logger");

async function runMigrationsCommand(options = {}) {
  const knex = knexManager.getInstance();

  try {
    log.info("Running migrations...");

    // Get pending migrations
    const [, pendingMigrations] = await knex.migrate.list();

    if (pendingMigrations.length === 0) {
      log.info("No pending migrations");
      return { executed: 0, migrations: [] };
    }

    // Run migrations
    const [batchNo, migrations] = await knex.migrate.latest();

    log.success(
      `Batch ${batchNo}: Successfully ran ${migrations.length} migrations`
    );
    migrations.forEach((name) => log.info(`- ${name}`));

    return {
      batch: batchNo,
      executed: migrations.length,
      migrations,
    };
  } catch (error) {
    log.error("Migration failed:", error.message);
    throw error;
  }
}

module.exports = { runMigrationsCommand };
