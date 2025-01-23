const knexManager = require("./knexManager");
const {
  MigrationGenerator,
  SeedGenerator,
  COLUMN_TYPES,
} = require("./generators");
const {
  createMigrationCommand,
  runMigrationsCommand,
  rollbackMigrationsCommand,
  getMigrationStatus,
  runSingleMigration,
  rollbackSingleMigration,
  redoMigration,
  getCurrentVersion,
  resetMigrations,
  createSeedCommand,
  runSeedsCommand,
} = require("./commands");
const { addKnexCommands } = require("./console");
const { log } = require("./utils/logger");

class KnexMigrationSystem {
  constructor() {
    this.knexManager = knexManager;
    this.generator = new MigrationGenerator();
    this.seedGenerator = new SeedGenerator();
  }

  async create(name, columns = [], options = {}) {
    return createMigrationCommand(name, columns, options);
  }

  async up(options = {}) {
    return runMigrationsCommand(options);
  }

  async down(options = {}) {
    return rollbackMigrationsCommand(options);
  }

  async upSingle(name) {
    return runSingleMigration(name);
  }

  async downSingle(name) {
    return rollbackSingleMigration(name);
  }

  async redo(name) {
    return redoMigration(name);
  }

  async reset(options = {}) {
    return resetMigrations(options);
  }

  async status() {
    return getMigrationStatus();
  }

  async version() {
    return getCurrentVersion();
  }

  async createSeed(name, options = {}) {
    return createSeedCommand(name, options);
  }

  async createTableWithSeed(name, columns = [], seedData = [], options = {}) {
    const tableName = name.replace(/^Create/, "").toLowerCase();

    // Parse columns into proper format
    const parsedColumns = columns.map((col) => {
      if (typeof col === "string") {
        const [name, type, ...modifiers] = col.split(":");
        let definition = `table.${type}('${name}')`;

        if (modifiers.includes("required") || modifiers.includes("notNull")) {
          definition += ".notNullable()";
        }
        if (modifiers.includes("unique")) {
          definition += ".unique()";
        }
        if (modifiers.includes("references")) {
          const refTable = name.replace(/_id$/, "s");
          definition += `.unsigned().references('id').inTable('${refTable}').onDelete('CASCADE').onUpdate('CASCADE')`;
        }

        return { name, definition };
      }
      return col;
    });

    return createSeedCommand(name, {
      withMigration: true,
      table: tableName,
      columns: parsedColumns,
      data: JSON.stringify(seedData),
      options: {
        softDeletes: options.softDeletes,
        timestamps: options.timestamps !== false,
      },
    });
  }

  async createHasOneWithSeed(name, columns = [], seedData = [], options = {}) {
    // Parse columns into proper format
    const parsedColumns = columns.map((col) => {
      if (typeof col === "string") {
        const [name, type, ...modifiers] = col.split(":");
        let definition = `table.${type}('${name}')`;

        if (modifiers.includes("required") || modifiers.includes("notNull")) {
          definition += ".notNullable()";
        }
        if (modifiers.includes("unique")) {
          definition += ".unique()";
        }
        if (modifiers.includes("references")) {
          const refTable = name.replace(/_id$/, "s");
          definition += `.unsigned().references('id').inTable('${refTable}').onDelete('CASCADE').onUpdate('CASCADE')`;
        }

        return { name, definition };
      }
      return col;
    });

    return createSeedCommand(name, {
      hasOne: true,
      columns: parsedColumns,
      data: JSON.stringify(seedData),
      options: {
        softDeletes: options.softDeletes,
        timestamps: options.timestamps !== false,
      },
    });
  }

  async addColumnWithSeed(name, columns = [], seedData = [], options = {}) {
    // Parse columns into proper format
    const parsedColumns = columns.map((col) => {
      if (typeof col === "string") {
        const [name, type, ...modifiers] = col.split(":");
        let definition = `table.${type}('${name}')`;

        if (modifiers.includes("required") || modifiers.includes("notNull")) {
          definition += ".notNullable()";
        }
        if (modifiers.includes("unique")) {
          definition += ".unique()";
        }

        return { name, definition };
      }
      return col;
    });

    return createSeedCommand(name, {
      addColumn: true,
      columns: parsedColumns,
      data: JSON.stringify(seedData),
      options: {
        timestamps: options.timestamps !== false,
      },
    });
  }

  async runSeeds(options = {}) {
    return runSeedsCommand(options);
  }

  async getSeedStatus() {
    const knex = this.getKnex();
    const seeds = await knex.seed.list();
    return {
      total: seeds.length,
      files: seeds.map((file) => file.split("/").pop()),
    };
  }

  async close() {
    return this.knexManager.closeConnection();
  }

  getKnex() {
    return this.knexManager.getInstance();
  }
}

module.exports = {
  KnexMigrationSystem,
  COLUMN_TYPES,
  addKnexCommands,
  createMigration: createMigrationCommand,
  runMigrations: runMigrationsCommand,
  rollbackMigrations: rollbackMigrationsCommand,
  getMigrationStatus,
  runSingleMigration,
  rollbackSingleMigration,
  redoMigration,
  getCurrentVersion,
  resetMigrations,
  getKnex: () => knexManager.getInstance(),
  MigrationGenerator,
  createSeed: createSeedCommand,
  runSeeds: runSeedsCommand,
  SeedGenerator,
  createTableWithSeed: (name, columns, seedData, options) => {
    const system = new KnexMigrationSystem();
    return system.createTableWithSeed(name, columns, seedData, options);
  },
  createHasOneWithSeed: (name, columns, seedData, options) => {
    const system = new KnexMigrationSystem();
    return system.createHasOneWithSeed(name, columns, seedData, options);
  },
  addColumnWithSeed: (name, columns, seedData, options) => {
    const system = new KnexMigrationSystem();
    return system.addColumnWithSeed(name, columns, seedData, options);
  },
};
