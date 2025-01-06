const knexManager = require("./knexManager");
const { MigrationGenerator, COLUMN_TYPES } = require("./generators");
const { log } = require("./utils/logger");

function addKnexCommands(repl) {
  // Knex instance
  repl.context.knex = () => knexManager.getInstance();

  // Show available column types
  repl.context.showColumnTypes = () => {
    log.info("\nAvailable Column Types:");
    Object.keys(COLUMN_TYPES).forEach((type) => {
      const info = COLUMN_TYPES[type];
      const params = info.params ? ` (params: ${info.params.join(", ")})` : "";
      log.info(`- ${type}${params}`);
    });
    return "Use these types when creating migrations";
  };

  // Migration commands
  repl.context.createMigration = async (name, columns = [], options = {}) => {
    try {
      const generator = new MigrationGenerator();
      const filepath = await generator.createMigration(name, columns, options);
      return `Migration created at: ${filepath}`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  };

  repl.context.migrate = async () => {
    try {
      const knex = knexManager.getInstance();
      const [batchNo, migrations] = await knex.migrate.latest();

      if (migrations.length === 0) {
        return "No pending migrations";
      }

      return `Completed ${migrations.length} migrations (Batch ${batchNo})`;
    } catch (error) {
      return `Migration failed: ${error.message}`;
    }
  };

  repl.context.rollback = async (all = false) => {
    try {
      const knex = knexManager.getInstance();
      const [batchNo, migrations] = await knex.migrate.rollback(undefined, all);

      if (migrations.length === 0) {
        return "No migrations to rollback";
      }

      return `Rolled back ${migrations.length} migrations from batch ${batchNo}`;
    } catch (error) {
      return `Rollback failed: ${error.message}`;
    }
  };

  repl.context.migrationStatus = async () => {
    try {
      const knex = knexManager.getInstance();
      const [completed, pending] = await knex.migrate.list();

      return {
        completed: completed.length,
        pending: pending.length,
        completedMigrations: completed,
        pendingMigrations: pending,
      };
    } catch (error) {
      return `Failed to get migration status: ${error.message}`;
    }
  };

  // Helper commands
  repl.context.createTable = async (tableName, columnDefs = []) => {
    return repl.context.createMigration(`create_${tableName}`, columnDefs);
  };

  repl.context.addColumns = async (tableName, columnDefs = []) => {
    return repl.context.createMigration(
      `add_columns_to_${tableName}`,
      columnDefs
    );
  };

  // Database info
  repl.context.dbInfo = () => {
    const config = knexManager.getConfig();
    return {
      client: config.client,
      database: config.connection.database,
      migrationsTable: config.migrations.tableName,
      migrationsPath: config.migrations.directory,
    };
  };
}

module.exports = { addKnexCommands };
