const knexManager = require("../knexManager");
const { log } = require("../utils/logger");

async function redoMigration(name) {
  const knex = knexManager.getInstance();
  try {
    log.info("Starting migration redo...");

    if (name) {
      // Redo specific migration
      await knex.migrate.down({ name });
      await knex.migrate.up({ name });
      log.success(`Successfully redid migration: ${name}`);
    } else {
      // Redo last batch
      await knex.migrate.rollback();
      await knex.migrate.latest();
      log.success("Successfully redid last batch of migrations");
    }
  } catch (error) {
    log.error("Failed to redo migrations:", error.message);
    throw error;
  }
}

module.exports = { redoMigration };
