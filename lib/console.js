const repl = require("repl");
const fs = require("fs");
const path = require("path");
const Model = require("./model");
const ModelLoader = require("./modelLoader");
const Validations = require("./validations");

function startConsole() {
  // Add debug flag and make classes available globally
  global.DEBUG = false;
  global.Model = Model;
  global.ModelLoader = ModelLoader;
  global.Validations = Validations;

  // Store original console.log
  const originalConsoleLog = console.log;

  // Override console.log to respect DEBUG mode
  console.log = function (...args) {
    const message = args[0]?.toString() || "";
    if (
      global.DEBUG ||
      (!message.includes("validations") && !message.includes("Initializing"))
    ) {
      originalConsoleLog.apply(console, args);
    }
  };

  originalConsoleLog("Welcome to WildayJS Console");

  // Initialize REPL
  const r = repl.start({
    prompt: "wildayjs > ",
    useColors: true,
  });

  // Load models after REPL starts
  process.nextTick(async () => {
    try {
      // Dynamically load all models
      const modelsPath = path.join(process.cwd(), "app", "models");
      const modelFiles = fs.readdirSync(modelsPath);

      // Load each model dynamically
      modelFiles.forEach((file) => {
        if (file.endsWith(".js")) {
          const modelName = file.replace(".js", "");
          const className =
            modelName.charAt(0).toUpperCase() +
            modelName.slice(1).replace(/_([a-z])/g, (g) => g[1].toUpperCase());

          try {
            // Clear require cache first
            const modelPath = path.join(modelsPath, file);
            delete require.cache[require.resolve(modelPath)];

            // Import and initialize the model
            const ModelClass = require(modelPath);

            // Initialize associations if they exist
            if (typeof ModelClass.initializeAssociations === "function") {
              ModelClass.initializeAssociations();
            }

            // Initialize validations if they exist
            if (typeof ModelClass.initializeValidations === "function") {
              ModelClass.initializeValidations();
            }

            r.context[className] = ModelClass;
            if (global.DEBUG) {
              console.log(`Loaded model: ${className}`);
            }
          } catch (err) {
            console.error(`Error loading model ${className}:`, err.message);
          }
        }
      });

      // Add debug command
      r.context.debug = (enable = true) => {
        global.DEBUG = enable;
        if (enable) {
          console.log = originalConsoleLog;
        } else {
          console.log = function (...args) {
            const message = args[0]?.toString() || "";
            if (
              global.DEBUG ||
              (!message.includes("validations") &&
                !message.includes("Initializing"))
            ) {
              originalConsoleLog.apply(console, args);
            }
          };
        }
        return `Debug mode ${enable ? "enabled" : "disabled"}`;
      };

      // Add validation info command
      r.context.showValidations = (modelName) => {
        if (!modelName) {
          originalConsoleLog("\nAvailable models:");
          // Fix: Use direct context access
          const modelNames = [];
          const context = r.context;
          for (let key in context) {
            try {
              const value = context[key];
              if (
                value &&
                typeof value === "function" &&
                value.prototype &&
                value.prototype.constructor &&
                value.prototype.constructor.name !== "Model" &&
                value.prototype instanceof Model
              ) {
                modelNames.push(key);
              }
            } catch (e) {
              // Skip any problematic properties
              continue;
            }
          }

          // Sort and display models
          modelNames.sort().forEach((name) => {
            originalConsoleLog(`- ${name}`);
          });

          return "Use showValidations('ModelName') to see specific model validations";
        }

        const ModelClass = r.context[modelName];
        if (!ModelClass || !(ModelClass.prototype instanceof Model)) {
          return `Model ${modelName} not found`;
        }

        originalConsoleLog(`\nValidations for ${modelName}:`);
        const modelValidations = {};
        if (ModelClass.validations && ModelClass.validations[modelName]) {
          modelValidations[modelName] = ModelClass.validations[modelName];
        }
        originalConsoleLog(JSON.stringify(modelValidations, null, 2));
        return `End of ${modelName} validations`;
      };

      // Add reload command
      r.context.reload = () => {
        if (global.DEBUG) console.log("Reloading models...");
        modelFiles.forEach((file) => {
          if (file.endsWith(".js")) {
            const modelName = file.replace(".js", "");
            const className =
              modelName.charAt(0).toUpperCase() +
              modelName
                .slice(1)
                .replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            try {
              const modelPath = path.join(modelsPath, file);
              delete require.cache[require.resolve(modelPath)];
              const ModelClass = require(modelPath);

              // Re-initialize associations and validations
              if (typeof ModelClass.initializeAssociations === "function") {
                ModelClass.initializeAssociations();
              }
              if (typeof ModelClass.initializeValidations === "function") {
                ModelClass.initializeValidations();
              }

              r.context[className] = ModelClass;
              if (global.DEBUG) {
                console.log(`Reloaded model: ${className}`);
              }
            } catch (err) {
              console.error(`Error reloading model ${className}:`, err.message);
            }
          }
        });
        return "✓ All models have been reloaded successfully!";
      };

      // Add help command
      r.context.help = () => {
        originalConsoleLog("\nAvailable Models:");
        modelFiles
          .filter((file) => file.endsWith(".js"))
          .forEach((file) => {
            const modelName = file.replace(".js", "");
            const className =
              modelName.charAt(0).toUpperCase() +
              modelName
                .slice(1)
                .replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            originalConsoleLog(`- ${className}`);
          });

        originalConsoleLog("\nAvailable Commands:");
        originalConsoleLog("\nBasic Operations:");
        originalConsoleLog("- User.all()                : Get all users");
        originalConsoleLog("- User.find(1)              : Find user by ID");
        originalConsoleLog(
          "- User.where({ ... })       : Find users by conditions"
        );
        originalConsoleLog("- User.first()              : Get first record");
        originalConsoleLog("- User.last()               : Get last record");

        originalConsoleLog("\nAdvanced Queries:");
        originalConsoleLog(
          "- User.select('name, email') : Select specific columns"
        );
        originalConsoleLog("- User.limit(5)              : Limit results");
        originalConsoleLog("- User.offset(10)            : Skip records");
        originalConsoleLog("- User.order('created_at DESC'): Order results");

        originalConsoleLog("\nAssociations:");
        originalConsoleLog(
          "- user.posts                 : Get associated posts"
        );
        originalConsoleLog(
          "- user.posts.create({...})   : Create associated post"
        );
        originalConsoleLog(
          "- user.addRole(role)         : Add to many-to-many"
        );
        originalConsoleLog(
          "- user.removeRole(role)      : Remove from many-to-many"
        );
        originalConsoleLog("- user.hasRole(role)         : Check association");

        originalConsoleLog("\nData Manipulation:");
        originalConsoleLog("- User.create({...})         : Create new record");
        originalConsoleLog("- user.update({...})         : Update record");
        originalConsoleLog("- user.save()                : Save changes");
        originalConsoleLog("- user.destroy()             : Delete record");

        originalConsoleLog("\nBatch Operations:");
        originalConsoleLog(
          "- User.updateAll({where}, {set}) : Update multiple"
        );
        originalConsoleLog(
          "- User.destroyAll({where})       : Delete multiple"
        );

        originalConsoleLog("\nSchema & Validation:");
        originalConsoleLog(
          "- User.columnInfo             : Show table columns"
        );
        originalConsoleLog("- User.schemaInfo             : Show table schema");
        originalConsoleLog("- user.isValid()              : Check validity");
        originalConsoleLog(
          "- user.errors                 : Show validation errors"
        );

        originalConsoleLog("\nDebug & Validation Commands:");
        originalConsoleLog("- debug()                     : Enable debug mode");
        originalConsoleLog(
          "- debug(false)                : Disable debug mode"
        );
        originalConsoleLog(
          "- showValidations()           : List models with validations"
        );
        originalConsoleLog(
          "- showValidations('User')     : Show User model validations"
        );

        originalConsoleLog("\nExample Usage:");
        originalConsoleLog("\n# Basic CRUD:");
        originalConsoleLog(
          'user = User.create({ name: "John", email: "john@example.com" })'
        );
        originalConsoleLog("users = User.where({ active: true })");
        originalConsoleLog("user = User.find(1)");
        originalConsoleLog('user.name = "Johnny"');
        originalConsoleLog("user.save()");

        originalConsoleLog("\n# Advanced Queries:");
        originalConsoleLog(
          'User.select("name, email").limit(5).order("created_at DESC")'
        );
        originalConsoleLog("User.where({ active: true }).offset(10).limit(5)");

        originalConsoleLog("\n# Working with Associations:");
        originalConsoleLog("user = User.find(1)");
        originalConsoleLog("user.posts                    // Get all posts");
        originalConsoleLog('post = user.posts.create({ title: "Hello" })');
        originalConsoleLog("role = Role.find(1)");
        originalConsoleLog("user.addRole(role)");
        originalConsoleLog("user.hasRole(role)           // => true");

        originalConsoleLog("\n# Schema Information:");
        originalConsoleLog(
          "User.columnInfo              // Show column details"
        );
        originalConsoleLog("User.schemaInfo              // Show table schema");

        originalConsoleLog("\nFind or Create:");
        originalConsoleLog(
          "- User.findOrCreate({ email: 'john@example.com' })"
        );
        originalConsoleLog(
          "- User.findOrCreateBy({ email: 'john@example.com' }, { name: 'John' })"
        );
        originalConsoleLog("- User.findBy({ email: 'john@example.com' })");

        originalConsoleLog("\nComplex Associations:");
        originalConsoleLog("# Has Many Through");
        originalConsoleLog(
          "user.projects()               // Get projects through teams"
        );

        originalConsoleLog("\n# Many-to-Many Operations:");
        originalConsoleLog("user = User.find(1)");
        originalConsoleLog("role = Role.find(1)");
        originalConsoleLog("user.roles()                 // Get all roles");
        originalConsoleLog("user.addRole(role)           // Add role");
        originalConsoleLog("user.removeRole(role)        // Remove role");
        originalConsoleLog("user.hasRole(role)           // Check if has role");
        originalConsoleLog("user.clearRoles()            // Remove all roles");

        originalConsoleLog("\nConsole Commands:");
        originalConsoleLog("- help()    : Show this help message");
        originalConsoleLog("- reload()  : Reload all models");

        return "Type any of the commands above to interact with your models";
      };

      console.log("Type help() for available commands and models");
      r.displayPrompt();
    } catch (err) {
      if (err.code === "ENOENT") {
        console.error("Models directory not found:", modelsPath);
      } else {
        console.error("Error loading models:", err.message);
      }
      r.displayPrompt();
    }
  });

  // Handle REPL exit
  r.on("exit", () => {
    console.log = originalConsoleLog;
    console.log("\nExiting WildayJS Console");
    process.exit();
  });
}

module.exports = startConsole;
