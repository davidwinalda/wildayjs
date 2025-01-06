// const repl = require("repl");
// const fs = require("fs");
// const path = require("path");
// const Model = require("./model");
// const ModelLoader = require("./modelLoader");
// const Validations = require("./validations");

// function startConsole() {
//   // Add debug flag and make classes available globally
//   global.DEBUG = false;
//   global.Model = Model;
//   global.ModelLoader = ModelLoader;
//   global.Validations = Validations;

//   // Store original console.log
//   const originalConsoleLog = console.log;

//   // Override console.log to respect DEBUG mode
//   console.log = function (...args) {
//     const message = args[0]?.toString() || "";
//     if (
//       global.DEBUG ||
//       (!message.includes("validations") && !message.includes("Initializing"))
//     ) {
//       originalConsoleLog.apply(console, args);
//     }
//   };

//   originalConsoleLog("Welcome to WildayJS Console");

//   // Initialize REPL
//   const r = repl.start({
//     prompt: "wildayjs > ",
//     useColors: true,
//   });

//   // Load models after REPL starts
//   process.nextTick(async () => {
//     try {
//       // Dynamically load all models
//       const modelsPath = path.join(process.cwd(), "app", "models");
//       const modelFiles = fs.readdirSync(modelsPath);

//       // Load each model dynamically
//       modelFiles.forEach((file) => {
//         if (file.endsWith(".js")) {
//           const modelName = file.replace(".js", "");
//           const className =
//             modelName.charAt(0).toUpperCase() +
//             modelName.slice(1).replace(/_([a-z])/g, (g) => g[1].toUpperCase());

//           try {
//             // Clear require cache first
//             const modelPath = path.join(modelsPath, file);
//             delete require.cache[require.resolve(modelPath)];

//             // Import and initialize the model
//             const ModelClass = require(modelPath);

//             // Initialize associations if they exist
//             if (typeof ModelClass.initializeAssociations === "function") {
//               ModelClass.initializeAssociations();
//             }

//             // Initialize validations if they exist
//             if (typeof ModelClass.initializeValidations === "function") {
//               ModelClass.initializeValidations();
//             }

//             r.context[className] = ModelClass;
//             if (global.DEBUG) {
//               console.log(`Loaded model: ${className}`);
//             }
//           } catch (err) {
//             console.error(`Error loading model ${className}:`, err.message);
//           }
//         }
//       });

//       // Add debug command
//       r.context.debug = (enable = true) => {
//         global.DEBUG = enable;
//         if (enable) {
//           console.log = originalConsoleLog;
//         } else {
//           console.log = function (...args) {
//             const message = args[0]?.toString() || "";
//             if (
//               global.DEBUG ||
//               (!message.includes("validations") &&
//                 !message.includes("Initializing"))
//             ) {
//               originalConsoleLog.apply(console, args);
//             }
//           };
//         }
//         return `Debug mode ${enable ? "enabled" : "disabled"}`;
//       };

//       // Add validation info command
//       r.context.showValidations = (modelName) => {
//         if (!modelName) {
//           originalConsoleLog("\nAvailable models:");
//           // Fix: Use direct context access
//           const modelNames = [];
//           const context = r.context;
//           for (let key in context) {
//             try {
//               const value = context[key];
//               if (
//                 value &&
//                 typeof value === "function" &&
//                 value.prototype &&
//                 value.prototype.constructor &&
//                 value.prototype.constructor.name !== "Model" &&
//                 value.prototype instanceof Model
//               ) {
//                 modelNames.push(key);
//               }
//             } catch (e) {
//               // Skip any problematic properties
//               continue;
//             }
//           }

//           // Sort and display models
//           modelNames.sort().forEach((name) => {
//             originalConsoleLog(`- ${name}`);
//           });

//           return "Use showValidations('ModelName') to see specific model validations";
//         }

//         const ModelClass = r.context[modelName];
//         if (!ModelClass || !(ModelClass.prototype instanceof Model)) {
//           return `Model ${modelName} not found`;
//         }

//         originalConsoleLog(`\nValidations for ${modelName}:`);
//         const modelValidations = {};
//         if (ModelClass.validations && ModelClass.validations[modelName]) {
//           modelValidations[modelName] = ModelClass.validations[modelName];
//         }
//         originalConsoleLog(JSON.stringify(modelValidations, null, 2));
//         return `End of ${modelName} validations`;
//       };

//       // Add reload command
//       r.context.reload = () => {
//         if (global.DEBUG) console.log("Reloading models...");
//         modelFiles.forEach((file) => {
//           if (file.endsWith(".js")) {
//             const modelName = file.replace(".js", "");
//             const className =
//               modelName.charAt(0).toUpperCase() +
//               modelName
//                 .slice(1)
//                 .replace(/_([a-z])/g, (g) => g[1].toUpperCase());
//             try {
//               const modelPath = path.join(modelsPath, file);
//               delete require.cache[require.resolve(modelPath)];
//               const ModelClass = require(modelPath);

//               // Re-initialize associations and validations
//               if (typeof ModelClass.initializeAssociations === "function") {
//                 ModelClass.initializeAssociations();
//               }
//               if (typeof ModelClass.initializeValidations === "function") {
//                 ModelClass.initializeValidations();
//               }

//               r.context[className] = ModelClass;
//               if (global.DEBUG) {
//                 console.log(`Reloaded model: ${className}`);
//               }
//             } catch (err) {
//               console.error(`Error reloading model ${className}:`, err.message);
//             }
//           }
//         });
//         return "✓ All models have been reloaded successfully!";
//       };

//       // Add help command
//       r.context.help = () => {
//         originalConsoleLog("\nAvailable Models:");
//         modelFiles
//           .filter((file) => file.endsWith(".js"))
//           .forEach((file) => {
//             const modelName = file.replace(".js", "");
//             const className =
//               modelName.charAt(0).toUpperCase() +
//               modelName
//                 .slice(1)
//                 .replace(/_([a-z])/g, (g) => g[1].toUpperCase());
//             originalConsoleLog(`- ${className}`);
//           });

//         originalConsoleLog("\nAvailable Commands:");
//         originalConsoleLog("\nBasic Operations:");
//         originalConsoleLog("- User.all()                : Get all users");
//         originalConsoleLog("- User.find(1)              : Find user by ID");
//         originalConsoleLog(
//           "- User.where({ ... })       : Find users by conditions"
//         );
//         originalConsoleLog("- User.first()              : Get first record");
//         originalConsoleLog("- User.last()               : Get last record");

//         originalConsoleLog("\nAdvanced Queries:");
//         originalConsoleLog(
//           "- User.select('name, email') : Select specific columns"
//         );
//         originalConsoleLog("- User.limit(5)              : Limit results");
//         originalConsoleLog("- User.offset(10)            : Skip records");
//         originalConsoleLog("- User.order('created_at DESC'): Order results");

//         originalConsoleLog("\nAssociations:");
//         originalConsoleLog(
//           "- user.posts                 : Get associated posts"
//         );
//         originalConsoleLog(
//           "- user.posts.create({...})   : Create associated post"
//         );
//         originalConsoleLog(
//           "- user.addRole(role)         : Add to many-to-many"
//         );
//         originalConsoleLog(
//           "- user.removeRole(role)      : Remove from many-to-many"
//         );
//         originalConsoleLog("- user.hasRole(role)         : Check association");

//         originalConsoleLog("\nData Manipulation:");
//         originalConsoleLog("- User.create({...})         : Create new record");
//         originalConsoleLog("- user.update({...})         : Update record");
//         originalConsoleLog("- user.save()                : Save changes");
//         originalConsoleLog("- user.destroy()             : Delete record");

//         originalConsoleLog("\nBatch Operations:");
//         originalConsoleLog(
//           "- User.updateAll({where}, {set}) : Update multiple"
//         );
//         originalConsoleLog(
//           "- User.destroyAll({where})       : Delete multiple"
//         );

//         originalConsoleLog("\nSchema & Validation:");
//         originalConsoleLog(
//           "- User.columnInfo             : Show table columns"
//         );
//         originalConsoleLog("- User.schemaInfo             : Show table schema");
//         originalConsoleLog("- user.isValid()              : Check validity");
//         originalConsoleLog(
//           "- user.errors                 : Show validation errors"
//         );

//         originalConsoleLog("\nDebug & Validation Commands:");
//         originalConsoleLog("- debug()                     : Enable debug mode");
//         originalConsoleLog(
//           "- debug(false)                : Disable debug mode"
//         );
//         originalConsoleLog(
//           "- showValidations()           : List models with validations"
//         );
//         originalConsoleLog(
//           "- showValidations('User')     : Show User model validations"
//         );

//         originalConsoleLog("\nExample Usage:");
//         originalConsoleLog("\n# Basic CRUD:");
//         originalConsoleLog(
//           'user = User.create({ name: "John", email: "john@example.com" })'
//         );
//         originalConsoleLog("users = User.where({ active: true })");
//         originalConsoleLog("user = User.find(1)");
//         originalConsoleLog('user.name = "Johnny"');
//         originalConsoleLog("user.save()");

//         originalConsoleLog("\n# Advanced Queries:");
//         originalConsoleLog(
//           'User.select("name, email").limit(5).order("created_at DESC")'
//         );
//         originalConsoleLog("User.where({ active: true }).offset(10).limit(5)");

//         originalConsoleLog("\n# Working with Associations:");
//         originalConsoleLog("user = User.find(1)");
//         originalConsoleLog("user.posts                    // Get all posts");
//         originalConsoleLog('post = user.posts.create({ title: "Hello" })');
//         originalConsoleLog("role = Role.find(1)");
//         originalConsoleLog("user.addRole(role)");
//         originalConsoleLog("user.hasRole(role)           // => true");

//         originalConsoleLog("\n# Schema Information:");
//         originalConsoleLog(
//           "User.columnInfo              // Show column details"
//         );
//         originalConsoleLog("User.schemaInfo              // Show table schema");

//         originalConsoleLog("\nFind or Create:");
//         originalConsoleLog(
//           "- User.findOrCreate({ email: 'john@example.com' })"
//         );
//         originalConsoleLog(
//           "- User.findOrCreateBy({ email: 'john@example.com' }, { name: 'John' })"
//         );
//         originalConsoleLog("- User.findBy({ email: 'john@example.com' })");

//         originalConsoleLog("\nComplex Associations:");
//         originalConsoleLog("# Has Many Through");
//         originalConsoleLog(
//           "user.projects()               // Get projects through teams"
//         );

//         originalConsoleLog("\n# Many-to-Many Operations:");
//         originalConsoleLog("user = User.find(1)");
//         originalConsoleLog("role = Role.find(1)");
//         originalConsoleLog("user.roles()                 // Get all roles");
//         originalConsoleLog("user.addRole(role)           // Add role");
//         originalConsoleLog("user.removeRole(role)        // Remove role");
//         originalConsoleLog("user.hasRole(role)           // Check if has role");
//         originalConsoleLog("user.clearRoles()            // Remove all roles");

//         originalConsoleLog("\nConsole Commands:");
//         originalConsoleLog("- help()    : Show this help message");
//         originalConsoleLog("- reload()  : Reload all models");

//         return "Type any of the commands above to interact with your models";
//       };

//       console.log("Type help() for available commands and models");
//       r.displayPrompt();
//     } catch (err) {
//       if (err.code === "ENOENT") {
//         console.error("Models directory not found:", modelsPath);
//       } else {
//         console.error("Error loading models:", err.message);
//       }
//       r.displayPrompt();
//     }
//   });

//   // Handle REPL exit
//   r.on("exit", () => {
//     console.log = originalConsoleLog;
//     console.log("\nExiting WildayJS Console");
//     process.exit();
//   });
// }

// module.exports = startConsole;

const repl = require("repl");
const fs = require("fs");
const path = require("path");
const Model = require("./model");
const ModelLoader = require("./modelLoader");
const Validations = require("./validations");
const connectionManager = require("./database/connectionManager");

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

  // Create REPL server first
  const r = repl.start({
    prompt: "wildayjs > ",
    useColors: true,
    eval: async (cmd, context, filename, callback) => {
      try {
        let result = eval(cmd);
        if (result && typeof result.then === "function") {
          result
            .then((value) => callback(null, value))
            .catch((err) => callback(err));
        } else {
          callback(null, result);
        }
      } catch (err) {
        callback(err);
      }
    },
  });

  // Define helper functions
  const helpFunction = () => {
    originalConsoleLog("\nAvailable Commands:");
    originalConsoleLog("\nBasic Operations:");
    originalConsoleLog("- Model.all()                : Get all records");
    originalConsoleLog("- Model.find(1)              : Find record by ID");
    originalConsoleLog("- Model.where({ ... })       : Find by conditions");
    originalConsoleLog("- Model.first()              : Get first record");
    originalConsoleLog("- Model.last()               : Get last record");

    originalConsoleLog("\nAdvanced Queries:");
    originalConsoleLog(
      "- Model.select('name, email') : Select specific columns"
    );
    originalConsoleLog("- Model.limit(5)              : Limit results");
    originalConsoleLog("- Model.offset(10)            : Skip records");
    originalConsoleLog("- Model.order('created_at DESC'): Order results");

    originalConsoleLog("\nData Manipulation:");
    originalConsoleLog("- Model.create({...})         : Create new record");
    originalConsoleLog("- record.update({...})        : Update record");
    originalConsoleLog("- record.save()               : Save changes");
    originalConsoleLog("- record.destroy()            : Delete record");

    originalConsoleLog("\nBatch Operations:");
    originalConsoleLog("- Model.updateAll({where}, {set}) : Update multiple");
    originalConsoleLog("- Model.destroyAll({where})       : Delete multiple");

    originalConsoleLog("\nSchema & Validation:");
    originalConsoleLog("- Model.columnInfo()           : Show table columns");
    originalConsoleLog("- Model.schemaInfo()           : Show table schema");
    originalConsoleLog("- record.isValid()             : Check validity");
    originalConsoleLog(
      "- record.errors                : Show validation errors"
    );

    originalConsoleLog("\nDatabase Commands:");
    originalConsoleLog("- dbInfo()                     : Show database info");
    originalConsoleLog(
      "- dbDebug()                    : Show detailed DB info"
    );
    originalConsoleLog(
      "- reconnect()                  : Reconnect to database"
    );
    originalConsoleLog(
      "- currentDb()                  : Show current database type"
    );

    originalConsoleLog("\nDebug Commands:");
    originalConsoleLog("- debug()                      : Enable debug mode");
    originalConsoleLog("- reload()                     : Reload all models");

    return "Type any of the commands above to interact with your models";
  };

  const debugFunction = (enable = true) => {
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

  const dbInfoFunction = () => {
    const config = connectionManager.config;
    const activeDb = connectionManager.getCurrentDatabaseType();
    const dbConfig = connectionManager.getDatabaseConfig(activeDb);

    originalConsoleLog("\nDatabase Information:");
    originalConsoleLog(`Active Database Type: ${activeDb}`);
    originalConsoleLog(`Database: ${dbConfig?.database || "unknown"}`);
    originalConsoleLog(`Host: ${dbConfig?.host || "local"}`);
    originalConsoleLog(`Port: ${dbConfig?.port || "default"}`);
    originalConsoleLog(
      `Status: ${
        connectionManager.isConnected() ? "Connected" : "Disconnected"
      }`
    );
    return "End of database information";
  };

  const currentDbFunction = () => {
    const dbType = connectionManager.getCurrentDatabaseType();
    return `Current database type: ${dbType}`;
  };

  const dbDebugFunction = async () => {
    try {
      const conn = await connectionManager.getConnection();
      const dbType = connectionManager.getCurrentDatabaseType();

      let result;
      if (dbType === "postgresql") {
        result = await conn.query("SELECT current_database() as database");
        result = result.rows;
      } else if (dbType === "mysql") {
        const [rows] = await conn.query("SELECT database() as database");
        result = rows;
      } else {
        result = [{ database: connectionManager.getDbPath() }];
      }

      originalConsoleLog("\nDatabase Connection Details:");
      originalConsoleLog({
        type: dbType,
        database: result[0].database,
        connected: await connectionManager.isConnected(),
        config: connectionManager.getDatabaseConfig(dbType),
      });

      return "End of database debug info";
    } catch (error) {
      return `Database debug error: ${error.message}`;
    }
  };

  const reconnectFunction = async () => {
    try {
      await connectionManager.closeAll();
      await connectionManager.getConnection();
      const dbType = connectionManager.getCurrentDatabaseType();
      return `Database connection reestablished (${dbType})`;
    } catch (error) {
      return `Failed to reconnect: ${error.message}`;
    }
  };

  // Add functions to both global and REPL context
  global.help = helpFunction;
  global.debug = debugFunction;
  global.dbInfo = dbInfoFunction;
  global.dbDebug = dbDebugFunction;
  global.reconnect = reconnectFunction;
  global.currentDb = currentDbFunction;

  r.context.help = helpFunction;
  r.context.debug = debugFunction;
  r.context.dbInfo = dbInfoFunction;
  r.context.dbDebug = dbDebugFunction;
  r.context.reconnect = reconnectFunction;
  r.context.currentDb = currentDbFunction;

  // Load models after REPL starts
  process.nextTick(async () => {
    try {
      // Initialize database connection
      try {
        await connectionManager.getConnection();
        const dbType = connectionManager.getCurrentDatabaseType();
        originalConsoleLog(`Database connection established (${dbType})`);
      } catch (error) {
        originalConsoleLog(
          "Warning: Database connection failed:",
          error.message
        );
      }

      // Dynamically load all models
      const modelsPath = path.join(process.cwd(), "app", "models");

      if (!fs.existsSync(modelsPath)) {
        originalConsoleLog("No models directory found at:", modelsPath);
        originalConsoleLog("Creating models directory...");
        fs.mkdirSync(modelsPath, { recursive: true });
        r.displayPrompt();
        return;
      }

      const modelFiles = fs.readdirSync(modelsPath);

      if (modelFiles.length === 0) {
        originalConsoleLog("No model files found in:", modelsPath);
        r.displayPrompt();
        return;
      }

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
            global[className] = ModelClass;

            if (global.DEBUG) {
              console.log(`Loaded model: ${className}`);
            }
          } catch (err) {
            console.error(`Error loading model ${className}:`, err.message);
          }
        }
      });

      // Add reload command
      const reloadFunction = async () => {
        try {
          await connectionManager.closeAll();
          await connectionManager.getConnection();
          const dbType = connectionManager.getCurrentDatabaseType();
          originalConsoleLog(`Database connection reestablished (${dbType})`);

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

                if (typeof ModelClass.initializeAssociations === "function") {
                  ModelClass.initializeAssociations();
                }
                if (typeof ModelClass.initializeValidations === "function") {
                  ModelClass.initializeValidations();
                }

                r.context[className] = ModelClass;
                global[className] = ModelClass;

                if (global.DEBUG) {
                  console.log(`Reloaded model: ${className}`);
                }
              } catch (err) {
                console.error(
                  `Error reloading model ${className}:`,
                  err.message
                );
              }
            }
          });
          return "✓ All models have been reloaded and database reconnected successfully!";
        } catch (error) {
          return `Failed to reload: ${error.message}`;
        }
      };

      // Add reload function to both contexts
      global.reload = reloadFunction;
      r.context.reload = reloadFunction;

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

  // Handle REPL exit with database cleanup
  r.on("exit", async () => {
    console.log = originalConsoleLog;
    console.log("\nClosing database connections...");
    try {
      await connectionManager.closeAll();
      console.log("All database connections closed");
    } catch (error) {
      console.error("Error closing database connections:", error.message);
    }
    console.log("Exiting WildayJS Console");
    process.exit();
  });
}

module.exports = startConsole;
