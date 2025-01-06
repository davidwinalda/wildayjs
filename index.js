const WildayJS = require("./lib/core");

const Model = require("./lib/model");
const ModelLoader = require("./lib/modelLoader");

const { Controller, ControllerLoader } = require("./lib/controllers");

const render = require("./lib/render");

const Validatable = require("./lib/validatable");
const Validations = require("./lib/validations");

const startConsole = require("./lib/console");

const initDatabase = require("./lib/database/init");
const dbStatus = require("./lib/database/status");
const checkDatabase = require("./lib/database/check");

const newApp = require("./lib/generators/newApp");

module.exports = {
  WildayJS,
  Model,
  ModelLoader,
  Controller,
  ControllerLoader,
  render,
  Validatable,
  Validations,
  startConsole,
  initDatabase,
  dbStatus,
  checkDatabase,
  newApp,
};
