// const fs = require("fs");
// const path = require("path");

// class ModelLoader {
//   static models = {};

//   static loadModels() {
//     // Try different possible model paths
//     const possiblePaths = [
//       path.join(process.cwd(), "models"),
//       path.join(process.cwd(), "app", "models"),
//     ];

//     let modelsPath = null;
//     for (const possiblePath of possiblePaths) {
//       if (fs.existsSync(possiblePath)) {
//         modelsPath = possiblePath;
//         break;
//       }
//     }

//     if (!modelsPath) {
//       console.warn("No models directory found in:", possiblePaths);
//       return this.models;
//     }

//     try {
//       // Read all files in the models directory
//       const files = fs.readdirSync(modelsPath);

//       // Load each model file
//       files.forEach((file) => {
//         if (file.endsWith(".js")) {
//           const modelName = path.basename(file, ".js").toLowerCase();
//           const modelPath = path.join(modelsPath, file);

//           // Clear require cache for hot reloading
//           delete require.cache[require.resolve(modelPath)];

//           // Load the model
//           const ModelClass = require(modelPath);

//           // Store the model in our models object
//           this.models[modelName] = ModelClass;
//         }
//       });

//       // Initialize all models after loading
//       this.initializeModels();

//       return this.models;
//     } catch (error) {
//       console.error("Error loading models:", error);
//       return this.models;
//     }
//   }

//   static initializeModels() {
//     Object.values(this.models).forEach((model) => {
//       try {
//         // Initialize associations
//         if (typeof model.initializeAssociations === "function") {
//           model.initializeAssociations();
//         }

//         // Initialize validations
//         if (typeof model.initializeValidations === "function") {
//           model.initializeValidations();
//         }
//       } catch (error) {
//         console.error(`Error initializing model ${model.name}:`, error);
//       }
//     });
//   }

//   static getModel(modelName) {
//     const name = modelName.toLowerCase();

//     // If model not loaded, try to load all models
//     if (!this.models[name]) {
//       this.loadModels();
//     }

//     return this.models[name];
//   }

//   static reloadModels() {
//     this.models = {};
//     return this.loadModels();
//   }
// }

// module.exports = ModelLoader;

// ------------------------------------------------------------------------------------------------

// const fs = require("fs");
// const path = require("path");
// const QueryBuilderExtensions = require("./query_builder");
// const { Model: ObjectionModel } = require("objection");

// class ModelLoader {
//   static models = {};

//   // Add this method to create extended QueryBuilder
//   static createExtendedQueryBuilder() {
//     return class ExtendedQueryBuilder extends ObjectionModel.QueryBuilder {
//       constructor(modelClass) {
//         super(modelClass);
//         console.log("Debug: Constructing QueryBuilder for", modelClass.name);
//         QueryBuilderExtensions.extend(this);
//       }
//     };
//   }

//   static loadModels() {
//     console.log("Loading models...");
//     const possiblePaths = [
//       path.join(process.cwd(), "models"),
//       path.join(process.cwd(), "app", "models"),
//     ];

//     let modelsPath = null;
//     for (const possiblePath of possiblePaths) {
//       if (fs.existsSync(possiblePath)) {
//         modelsPath = possiblePath;
//         console.log("Models path found:", modelsPath);
//         break;
//       }
//     }

//     if (!modelsPath) {
//       console.warn("No models directory found in:", possiblePaths);
//       return this.models;
//     }

//     try {
//       const files = fs.readdirSync(modelsPath);
//       console.log("Found model files:", files);

//       // Create extended QueryBuilder class
//       const ExtendedQueryBuilder = this.createExtendedQueryBuilder();

//       files.forEach((file) => {
//         if (file.endsWith(".js")) {
//           const modelName = path.basename(file, ".js");
//           const className =
//             modelName.charAt(0).toUpperCase() +
//             modelName.slice(1).replace(/_([a-z])/g, (g) => g[1].toUpperCase());
//           const modelPath = path.join(modelsPath, file);

//           console.log(`Loading model: ${className}`);

//           try {
//             // Clear require cache for hot reloading
//             delete require.cache[require.resolve(modelPath)];

//             // Load the model
//             let ModelClass = require(modelPath);

//             // Create a new class that extends the model and overrides QueryBuilder
//             const ExtendedModelClass = class extends ModelClass {
//               static get QueryBuilder() {
//                 return ExtendedQueryBuilder;
//               }
//             };

//             // Extend the model with QueryBuilderExtensions
//             console.log("Debug: Extending static methods for", className);
//             ModelClass =
//               QueryBuilderExtensions.extendStatic(ExtendedModelClass);

//             // Store the model in our models object
//             this.models[modelName] = ModelClass;

//             // Make model globally available
//             global[className] = ModelClass;

//             console.log(`Successfully loaded model: ${className}`);
//           } catch (error) {
//             console.error(`Error loading model ${className}:`, error);
//           }
//         }
//       });

//       // Initialize all models after loading
//       this.initializeModels();

//       return this.models;
//     } catch (error) {
//       console.error("Error loading models:", error);
//       return this.models;
//     }
//   }

//   static initializeModels() {
//     console.log("Initializing models...");
//     Object.entries(this.models).forEach(([name, model]) => {
//       try {
//         // Initialize associations if available
//         if (typeof model.initializeAssociations === "function") {
//           console.log(`Initializing associations for ${name}`);
//           model.initializeAssociations();
//         }

//         // Initialize validations if available
//         if (typeof model.initializeValidations === "function") {
//           console.log(`Initializing validations for ${name}`);
//           model.initializeValidations();
//         }

//         // Initialize query builder if available
//         if (
//           model.QueryBuilder &&
//           typeof model.QueryBuilder.extend === "function"
//         ) {
//           console.log(`Initializing query builder for ${name}`);
//           model.QueryBuilder.extend((builder) => {
//             return QueryBuilderExtensions.extend(builder);
//           });
//         }
//       } catch (error) {
//         console.error(`Error initializing model ${name}:`, error);
//       }
//     });
//   }

//   static getModel(modelName) {
//     const name = modelName.toLowerCase();
//     if (!this.models[name]) {
//       this.loadModels();
//     }
//     return this.models[name];
//   }

//   static reloadModels() {
//     console.log("Reloading all models...");
//     this.models = {};
//     return this.loadModels();
//   }

//   static listModels() {
//     return Object.entries(this.models).map(([name, ModelClass]) => ({
//       name,
//       className: ModelClass.name,
//       tableName: ModelClass.tableName || name + "s",
//       hasAssociations: typeof ModelClass.initializeAssociations === "function",
//       hasValidations: typeof ModelClass.initializeValidations === "function",
//       hasQueryBuilder: !!(
//         ModelClass.QueryBuilder &&
//         typeof ModelClass.QueryBuilder.extend === "function"
//       ),
//     }));
//   }
// }

// module.exports = ModelLoader;

const fs = require("fs");
const path = require("path");
const CustomQueryBuilder = require("./query_builder");

class ModelLoader {
  static models = {};

  static loadModels() {
    console.log("Loading models...");
    console.log(
      "CustomQueryBuilder methods:",
      Object.getOwnPropertyNames(CustomQueryBuilder.prototype)
    );
    const possiblePaths = [
      path.join(process.cwd(), "models"),
      path.join(process.cwd(), "app", "models"),
    ];

    let modelsPath = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        modelsPath = possiblePath;
        console.log("Models path found:", modelsPath);
        break;
      }
    }

    if (!modelsPath) {
      console.warn("No models directory found in:", possiblePaths);
      return this.models;
    }

    try {
      const files = fs.readdirSync(modelsPath);
      console.log("Found model files:", files);

      files.forEach((file) => {
        if (file.endsWith(".js")) {
          const modelName = path.basename(file, ".js");
          const className =
            modelName.charAt(0).toUpperCase() +
            modelName.slice(1).replace(/_([a-z])/g, (g) => g[1].toUpperCase());
          const modelPath = path.join(modelsPath, file);

          console.log(`Loading model: ${className}`);

          try {
            // Clear require cache for hot reloading
            delete require.cache[require.resolve(modelPath)];

            // Load the model
            let ModelClass = require(modelPath);

            // Ensure ModelClass is properly loaded
            if (!ModelClass) {
              throw new Error(`Model ${className} failed to load`);
            }

            // Apply the custom query builder to the model
            const descriptor = Object.getOwnPropertyDescriptor(
              ModelClass,
              "QueryBuilder"
            );
            if (descriptor && !descriptor.writable) {
              console.warn(
                `Cannot set QueryBuilder for ${className}: Property is read-only.`
              );
            } else {
              console.log("Debug: Applying custom query builder to", className);
              ModelClass.QueryBuilder = CustomQueryBuilder;
            }

            // // Initialize the model if needed
            if (typeof ModelClass.initialize === "function") {
              console.log(`Initializing ${className}`);
              ModelClass.initialize();
            }

            // // Call the boot method if it exists
            if (ModelClass.boot) {
              console.log(`Booting ${className}`);
              try {
                // Call boot on the class itself
                ModelClass.boot();
              } catch (bootError) {
                console.error(`Error during ${className} boot:`, bootError);
                // Try calling boot on the prototype chain if direct call fails
                const proto = Object.getPrototypeOf(ModelClass);
                if (proto && proto.boot) {
                  console.log(
                    `Attempting to boot ${className} via prototype chain`
                  );
                  proto.boot.call(ModelClass);
                }
              }
            } else {
              console.warn(`Warning: ${className} has no boot method`);
            }

            // Store the model in our models object
            this.models[modelName] = ModelClass;

            // Make model globally available
            global[className] = ModelClass;

            console.log(`Successfully loaded model: ${className}`);
          } catch (error) {
            console.error(`Error loading model ${className}:`, error);
          }
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
    console.log("Initializing models...");
    Object.entries(this.models).forEach(([name, model]) => {
      try {
        // Initialize associations if available
        if (typeof model.initializeAssociations === "function") {
          console.log(`Initializing associations for ${name}`);
          model.initializeAssociations();
        }

        // Initialize validations if available
        if (typeof model.initializeValidations === "function") {
          console.log(`Initializing validations for ${name}`);
          model.initializeValidations();
        }
      } catch (error) {
        console.error(`Error initializing model ${name}:`, error);
      }
    });
  }

  static getModel(modelName) {
    const name = modelName.toLowerCase();
    if (!this.models[name]) {
      this.loadModels();
    }
    return this.models[name];
  }

  static reloadModels() {
    console.log("Reloading all models...");
    this.models = {};
    return this.loadModels();
  }

  static listModels() {
    return Object.entries(this.models).map(([name, ModelClass]) => ({
      name,
      className: ModelClass.name,
      tableName: ModelClass.tableName || name + "s",
      hasAssociations: typeof ModelClass.initializeAssociations === "function",
      hasValidations: typeof ModelClass.initializeValidations === "function",
      hasQueryBuilder: !!(
        ModelClass.QueryBuilder &&
        typeof ModelClass.QueryBuilder.extend === "function"
      ),
    }));
  }

  static setQueryBuilder(modelClass, customQueryBuilder) {
    const descriptor = Object.getOwnPropertyDescriptor(
      modelClass,
      "QueryBuilder"
    );

    if (descriptor && !descriptor.writable) {
      console.warn(
        `Cannot set QueryBuilder for ${modelClass.name}: Property is read-only.`
      );
    } else {
      modelClass.QueryBuilder = customQueryBuilder;
    }
  }
}

module.exports = ModelLoader;
