const { createMigrationCommand } = require("./create");
const { runMigrationsCommand } = require("./up");
const { rollbackMigrationsCommand } = require("./down");
const { getMigrationStatus } = require("./status");
const { listMigrations } = require("./list");
const { runSingleMigration } = require("./upSingle");
const { rollbackSingleMigration } = require("./downSingle");
const { redoMigration } = require("./redo");
const { getCurrentVersion } = require("./version");
const { resetMigrations } = require("./reset");

module.exports = {
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
};
