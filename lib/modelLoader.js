const fs = require("fs");
const path = require("path");

class ModelLoader {
  static models = {};

  static loadModels() {
    // Try different possible model paths
    const possiblePaths = [
      path.join(process.cwd(), "models"),
      path.join(process.cwd(), "app", "models"),
    ];

    let modelsPath = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        modelsPath = possiblePath;
        break;
      }
    }

    if (!modelsPath) {
      console.warn("No models directory found in:", possiblePaths);
      return this.models;
    }

    try {
      // Read all files in the models directory
      const files = fs.readdirSync(modelsPath);

      // Load each model file
      files.forEach((file) => {
        if (file.endsWith(".js")) {
          const modelName = path.basename(file, ".js").toLowerCase();
          const modelPath = path.join(modelsPath, file);

          // Clear require cache for hot reloading
          delete require.cache[require.resolve(modelPath)];

          // Load the model
          const ModelClass = require(modelPath);

          // Store the model in our models object
          this.models[modelName] = ModelClass;
        }
      });

      // Initialize all models after loading
      this.initializeModels();

      return this.models;
    } catch (error) {
      console.error("Error loading models:", error);
      return this.models;
    }
  }

  static initializeModels() {
    Object.values(this.models).forEach((model) => {
      try {
        // Initialize associations
        if (typeof model.initializeAssociations === "function") {
          model.initializeAssociations();
        }

        // Initialize validations
        if (typeof model.initializeValidations === "function") {
          model.initializeValidations();
        }
      } catch (error) {
        console.error(`Error initializing model ${model.name}:`, error);
      }
    });
  }

  static getModel(modelName) {
    const name = modelName.toLowerCase();

    // If model not loaded, try to load all models
    if (!this.models[name]) {
      this.loadModels();
    }

    return this.models[name];
  }

  static reloadModels() {
    this.models = {};
    return this.loadModels();
  }
}

module.exports = ModelLoader;
