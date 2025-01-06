const knexManager = require("../knexManager");
const { log } = require("../utils/logger");

async function rollbackMigrationsCommand(options = {}) {
  const knex = knexManager.getInstance();

  try {
    log.info("Rolling back migrations...");

    const { all = false, steps = 1 } = options;

    let result;
    if (all) {
      result = await knex.migrate.rollback(undefined, true);
    } else {
      result = await knex.migrate.rollback(undefined, steps);
    }

    const [batchNo, migrations] = result;

    if (migrations.length === 0) {
      log.info("No migrations to rollback");
      return { rolledBack: 0, migrations: [] };
    }

    log.success(
      `Rolled back ${migrations.length} migrations from batch ${batchNo}`
    );
    migrations.forEach((name) => log.info(`- ${name}`));

    return {
      batch: batchNo,
      rolledBack: migrations.length,
      migrations,
    };
  } catch (error) {
    log.error("Rollback failed:", error.message);
    throw error;
  }
}

module.exports = { rollbackMigrationsCommand };
