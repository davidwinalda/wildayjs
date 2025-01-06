const { MigrationGenerator } = require("../generators");
const { log } = require("../utils/logger");

async function createMigrationCommand(name, columnDefs = [], options = {}) {
  try {
    const generator = new MigrationGenerator();

    // Parse column definitions if they're strings
    const columns = columnDefs.map((col) => {
      if (typeof col === "string") {
        return MigrationGenerator.parseColumnString(col);
      }
      return col;
    });

    const filepath = await generator.createMigration(name, columns, options);
    // Remove this log since we'll log from the CLI command
    return filepath;
  } catch (error) {
    log.error("Failed to create migration:", error.message);
    throw error;
  }
}

module.exports = { createMigrationCommand };
