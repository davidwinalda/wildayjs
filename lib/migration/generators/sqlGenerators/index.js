const { createTableMigration } = require("./createTableMigration");
const { addColumnsMigration } = require("./addColumnsMigration");
const { changeColumnsMigration } = require("./changeColumnsMigration");
const { removeColumnsMigration } = require("./removeColumnsMigration");

module.exports = {
  createTableMigration,
  addColumnsMigration,
  changeColumnsMigration,
  removeColumnsMigration,
};
