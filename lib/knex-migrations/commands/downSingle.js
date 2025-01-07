const knexManager = require("../knexManager");
const { log } = require("../utils/logger");

async function rollbackSingleMigration(name) {
  const wildayjs = knexManager.getInstance();
  try {
    log.info(`Rolling back migration: ${name}`);
    await wildayjs.migrate.down({ name });
    log.success(`Successfully rolled back migration: ${name}`);
  } catch (error) {
    log.error(`Failed to rollback migration ${name}:`, error.message);
    throw error;
  }
}

module.exports = { rollbackSingleMigration };
