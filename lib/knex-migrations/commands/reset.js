const knexManager = require("../knexManager");
const { log } = require("../utils/logger");

async function resetMigrations(options = {}) {
  const wildayjs = knexManager.getInstance();
  try {
    if (!options.force) {
      log.warn(
        "\nWARNING: This will rollback all migrations and reapply them."
      );
      log.warn("This operation cannot be undone.");
      const readline = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise((resolve) => {
        readline.question("Are you sure you want to continue? (y/N) ", resolve);
      });
      readline.close();

      if (answer.toLowerCase() !== "y") {
        log.info("Operation cancelled");
        return;
      }
    }

    log.info("Resetting all migrations...");

    // First rollback all migrations
    log.info("Rolling back all migrations...");
    await wildayjs.migrate.rollback(null, true);

    // Then run all migrations
    log.info("Running all migrations...");
    const [batchNo, log] = await wildayjs.migrate.latest();

    log.success("Migration reset completed successfully");
    log.info(`Reapplied ${log.length} migrations`);

    return { batchNo, migrations: log };
  } catch (error) {
    log.error("Reset failed:", error.message);
    throw error;
  }
}

module.exports = { resetMigrations };
