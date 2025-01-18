const knexManager = require("../../knexManager");
const { log } = require("../../utils/logger");

async function runSeedsCommand(options = {}) {
  const wildayjs = knexManager.getInstance();

  try {
    if (options.file) {
      log.info(`Running seed file: ${options.file}`);
      await wildayjs.seed.run({
        specific: options.file,
      });
      log.success(`Successfully ran seed: ${options.file}`);
    } else if (options.migration) {
      // When seed is part of migration, it's handled by the migration itself
      log.info("Seeds will be run as part of migration");
    } else {
      log.info("Running all seed files...");
      await wildayjs.seed.run();
      log.success("Successfully ran all seeds");
    }
  } catch (error) {
    log.error("Failed to run seeds:", error.message);
    throw error;
  }
}

module.exports = { runSeedsCommand };
