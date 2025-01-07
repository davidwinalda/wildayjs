const knexManager = require("../knexManager");
const { log } = require("../utils/logger");

async function rollbackMigrationsCommand(options = {}) {
  const wildayjs = knexManager.getInstance();

  try {
    log.info("Rolling back migrations...");

    const { all = false, steps = 1 } = options;

    let result;
    if (all) {
      // Rollback all migrations
      result = await wildayjs.migrate.rollback(null, true);
    } else if (steps > 1) {
      // Rollback multiple steps
      const allBatches = await wildayjs.migrate.rollback(null, steps);
      result = allBatches;
    } else {
      // Rollback just the last batch (default)
      result = await wildayjs.migrate.rollback();
    }

    const [batchNo, migrations] = result;

    if (migrations.length === 0) {
      log.info("No migrations to rollback");
      return { rolledBack: 0, migrations: [] };
    }

    if (all) {
      log.success(`Rolled back all migrations (${migrations.length} total)`);
    } else if (steps > 1) {
      log.success(
        `Rolled back ${migrations.length} migrations from last ${steps} batches`
      );
    } else {
      log.success(
        `Rolled back ${migrations.length} migrations from batch ${batchNo}`
      );
    }

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
