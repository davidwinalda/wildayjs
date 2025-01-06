const knexManager = require("../knexManager");
const { log } = require("../utils/logger");

async function runSingleMigration(name) {
  const knex = knexManager.getInstance();
  try {
    log.info(`Running migration: ${name}`);
    await knex.migrate.up({ name });
    log.success(`Successfully ran migration: ${name}`);
  } catch (error) {
    log.error(`Failed to run migration ${name}:`, error.message);
    throw error;
  }
}

module.exports = { runSingleMigration };
