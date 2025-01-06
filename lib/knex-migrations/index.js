const knexManager = require("./knexManager");
const { MigrationGenerator, COLUMN_TYPES } = require("./generators");
const {
  createMigrationCommand,
  runMigrationsCommand,
  rollbackMigrationsCommand,
  getMigrationStatus,
  listMigrations,
  runSingleMigration,
  rollbackSingleMigration,
  redoMigration,
  getCurrentVersion,
  resetMigrations,
} = require("./commands");
const { addKnexCommands } = require("./console");
const { log } = require("./utils/logger");

class KnexMigrationSystem {
  constructor() {
    this.knexManager = knexManager;
    this.generator = new MigrationGenerator();
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

  async list() {
    return listMigrations();
  }

  async version() {
    return getCurrentVersion();
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
  listMigrations,
  runSingleMigration,
  rollbackSingleMigration,
  redoMigration,
  getCurrentVersion,
  resetMigrations,
  getKnex: () => knexManager.getInstance(),
  MigrationGenerator,
};
