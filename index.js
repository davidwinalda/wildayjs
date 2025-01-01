const WildayJS = require("./lib/core");
const Model = require("./lib/model");
const ModelLoader = require("./lib/modelLoader");
const { Controller, ControllerLoader } = require("./lib/controllers");
const render = require("./lib/render");
const applyMigrations = require("./lib/applyMigrations");
const generateMigration = require("./lib/generateMigration");
const Validations = require("./lib/validations");
const Validatable = require("./lib/validatable");
const startConsole = require("./lib/console");

module.exports = {
  WildayJS,
  Model,
  ModelLoader,
  Controller,
  ControllerLoader,
  render,
  applyMigrations,
  generateMigration,
  Validations,
  Validatable,
  startConsole,
};
