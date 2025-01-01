const fs = require("fs");
const path = require("path");

class ControllerLoader {
  static controllers = {};

  static loadControllers() {
    const controllersPath = path.join(process.cwd(), "controllers");

    // Check if controllers directory exists
    if (!fs.existsSync(controllersPath)) {
      console.warn("No controllers directory found at:", controllersPath);
      return this.controllers;
    }

    // Load regular controllers
    this._loadControllersInDir(controllersPath);

    // Load API controllers
    const apiPath = path.join(controllersPath, "api");
    if (fs.existsSync(apiPath)) {
      this._loadControllersInDir(apiPath, "api/");
    }

    return this.controllers;
  }

  static _loadControllersInDir(dirPath, prefix = "") {
    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
      if (file.endsWith("Controller.js")) {
        const controllerName = path.basename(file, ".js");
        const controllerPath = path.join(dirPath, file);
        const controller = require(controllerPath);

        // Store with optional prefix for API controllers
        this.controllers[prefix + controllerName] = controller;
      }
    });
  }

  static getController(controllerName) {
    return this.controllers[controllerName];
  }
}

module.exports = ControllerLoader;
