const knexManager = require("./knexManager");
const {
  MigrationGenerator,
  SeedGenerator,
  COLUMN_TYPES,
} = require("./generators");
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

  // Add Seed Commands
  repl.context.createSeed = async (name, options = {}) => {
    try {
      const generator = new SeedGenerator();

      if (options.withMigration) {
        const result = await generator.generateWithMigration(name, options);
        return {
          seedFile: result.seed.path,
          migrationContent: result.migrationContent,
        };
      }

      const result = await generator.generate(name, options);
      return `Seed file created at: ${result.path}`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  };

  // Add new command for migration with seed
  repl.context.createTableWithSeed = async (
    tableName,
    columns = [],
    seedData = [],
    options = {}
  ) => {
    try {
      return repl.context.createSeed(`Create${tableName}`, {
        withMigration: true,
        table: tableName,
        columns,
        data: seedData,
        ...options,
      });
    } catch (error) {
      return `Error: ${error.message}`;
    }
  };

  repl.context.seed = async (specific = null) => {
    try {
      const knex = knexManager.getInstance();
      const config = specific ? { specific } : undefined;
      const result = await knex.seed.run(config);

      return `Successfully ran ${result.length} seed files`;
    } catch (error) {
      return `Seed failed: ${error.message}`;
    }
  };

  repl.context.seedStatus = async () => {
    try {
      const knex = knexManager.getInstance();
      const seeds = await knex.seed.list();

      return {
        total: seeds.length,
        files: seeds.map((file) => file.split("/").pop()),
      };
    } catch (error) {
      return `Failed to get seed status: ${error.message}`;
    }
  };

  // Database info
  repl.context.dbInfo = () => {
    const config = knexManager.getConfig();
    return {
      client: config.client,
      database: config.connection.database,
      migrationsTable: config.migrations.tableName,
      migrationsPath: config.migrations.directory,
      seedsPath: config.seeds.directory,
    };
  };
}

module.exports = { addKnexCommands };
