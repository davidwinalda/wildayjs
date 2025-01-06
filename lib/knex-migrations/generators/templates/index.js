const createTableTemplate = require("./create_table");
const addColumnsTemplate = require("./add_columns");
const removeColumnsTemplate = require("./remove_columns");
const renameColumnTemplate = require("./rename_column");
const changeColumnTemplate = require("./change_column");
const dropTableTemplate = require("./drop_table");
const renameTableTemplate = require("./rename_table");
const addIndexTemplate = require("./add_index");
const addForeignKeyTemplate = require("./add_foreign_key");
const createHasOneTemplate = require("./create_has_one");
const addBelongsToTemplate = require("./add_belongs_to");
const createJoinTableTemplate = require("./create_join_table");
const addPolymorphicTemplate = require("./add_polymorphic");
const createThroughTableTemplate = require("./create_through_table");

module.exports = {
  createTableTemplate,
  addColumnsTemplate,
  removeColumnsTemplate,
  renameColumnTemplate,
  changeColumnTemplate,
  dropTableTemplate,
  renameTableTemplate,
  addIndexTemplate,
  addForeignKeyTemplate,
  createHasOneTemplate,
  addBelongsToTemplate,
  createJoinTableTemplate,
  addPolymorphicTemplate,
  createThroughTableTemplate,
};
