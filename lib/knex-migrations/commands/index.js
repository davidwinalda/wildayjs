const { createMigrationCommand } = require("./create");
const { runMigrationsCommand } = require("./up");
const { rollbackMigrationsCommand } = require("./down");
const { getMigrationStatus } = require("./status");
const { runSingleMigration } = require("./upSingle");
const { rollbackSingleMigration } = require("./downSingle");
const { redoMigration } = require("./redo");
const { getCurrentVersion } = require("./version");
const { resetMigrations } = require("./reset");
const { createSeedCommand } = require("./seeds/create");
const { runSeedsCommand } = require("./seeds/run");

module.exports = {
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
};
