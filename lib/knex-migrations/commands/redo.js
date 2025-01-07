const knexManager = require("../knexManager");
const { log } = require("../utils/logger");

async function redoMigration(name) {
  const wildayjs = knexManager.getInstance();
  try {
    log.info("Starting migration redo...");

    if (name) {
      // Redo specific migration
      await wildayjs.migrate.down({ name });
      await wildayjs.migrate.up({ name });
      log.success(`Successfully redid migration: ${name}`);
    } else {
      // Redo last batch
      await wildayjs.migrate.rollback();
      await wildayjs.migrate.latest();
      log.success("Successfully redid last batch of migrations");
    }
  } catch (error) {
    log.error("Failed to redo migrations:", error.message);
    throw error;
  }
}

module.exports = { redoMigration };
