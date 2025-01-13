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

// ------------------------------------------------------------------------------------------------

// const repl = require("repl");
// const fs = require("fs");
// const path = require("path");
// const Model = require("./model");
// const ModelLoader = require("./modelLoader");
// const Validations = require("./validations");
// const connectionManager = require("./database/connectionManager");
// const { addKnexCommands } = require("./knex-migrations/console");

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

//   // Create REPL server first
//   const r = repl.start({
//     prompt: "wildayjs > ",
//     useColors: true,
//     terminal: true,
//     ignoreUndefined: true,
//     eval: async (cmd, context, filename, callback) => {
//       try {
//         console.log("\n=== REPL Eval Start ===");
//         console.log("Original command:", cmd);

//         // Clean command
//         cmd = cmd
//           .replace(/\/\/.*/g, "")
//           .replace(/\/\*[\s\S]*?\*\//g, "")
//           .trim()
//           .replace(/;$/, "");
//         console.log("Cleaned command:", cmd);

//         // Check if input is complete
//         if (!isCompleteInput(cmd)) {
//           console.log("Incomplete input detected");
//           return callback(new repl.Recoverable());
//         }

//         // Handle assignment statements
//         const isAssignment = cmd.includes("=");
//         if (isAssignment) {
//           console.log("Processing assignment statement");
//           const [varName, expression] = cmd.split("=").map((p) => p.trim());
//           console.log("Variable name:", varName);
//           console.log("Expression:", expression);

//           cmd = `
//             (async () => {
//               let result = await Promise.resolve().then(() => ${expression});
//               if (result && result.then) {
//                 result = await result;
//               }
//               global["${varName}"] = result;
//               return result;
//             })()
//           `;
//         } else {
//           // Handle special commands
//           const skipWrapping = [
//             "help()",
//             "debug(",
//             "dbInfo()",
//             "currentDb()",
//             "reload()",
//           ].some((c) => cmd.includes(c));

//           if (!skipWrapping) {
//             // Handle method chaining
//             if (cmd.includes(".") && !cmd.startsWith("console.")) {
//               console.log("Processing method chain");
//               const parts = cmd.split(".");
//               console.log("Chain parts:", parts);

//               cmd = `
//                 (async () => {
//                   try {
//                     const parts = ${JSON.stringify(parts)};
//                     console.log("=== Chain Execution Start ===");
//                     let result = ${parts[0]};
//                     let chainable = result;
//                     let currentModel = ${parts[0]};
//                     let knexQuery = null;
//                     let lastResult = null;
//                     let associationConditions = null;
//                     let queryState = {
//                       conditions: [],
//                       includes: [],
//                       associations: new Map()
//                     };

//                     // Helper function to handle Knex operations
//                     const applyKnexOperation = (operation, args) => {
//                       console.log(\`Applying \${operation}:\`, args);
//                       switch(operation) {
//                         case 'select':
//                           return knexQuery.select(...(Array.isArray(args[0]) ? args[0] : args));
//                         case 'where':
//                           if (typeof args[0] === 'function') {
//                             return knexQuery.where(function() {
//                               args[0].call(this);
//                             });
//                           }
//                           return knexQuery.where(...args);
//                         case 'whereNot':
//                           return knexQuery.whereNot(...args);
//                         case 'whereIn':
//                           return knexQuery.whereIn(...args);
//                         case 'whereNotIn':
//                           return knexQuery.whereNotIn(...args);
//                         case 'whereNull':
//                           return knexQuery.whereNull(args[0]);
//                         case 'whereNotNull':
//                           return knexQuery.whereNotNull(args[0]);
//                         case 'whereBetween':
//                           return knexQuery.whereBetween(...args);
//                         case 'whereNotBetween':
//                           return knexQuery.whereNotBetween(...args);
//                         case 'whereRaw':
//                           return knexQuery.whereRaw(...args);
//                         case 'orWhere':
//                           return knexQuery.orWhere(...args);
//                         case 'orderBy':
//                         case 'order':
//                           const [column, direction] = (typeof args[0] === 'string' ? args[0].split(' ') : args);
//                           return knexQuery.orderBy(column, direction?.toLowerCase() || 'asc');
//                         case 'groupBy':
//                           return knexQuery.groupBy(...args);
//                         case 'having':
//                           return knexQuery.having(...args);
//                         case 'limit':
//                           return knexQuery.limit(args[0]);
//                         case 'offset':
//                           return knexQuery.offset(args[0]);
//                         case 'join':
//                           return knexQuery.join(...args);
//                         case 'leftJoin':
//                           return knexQuery.leftJoin(...args);
//                         case 'rightJoin':
//                           return knexQuery.rightJoin(...args);
//                         case 'innerJoin':
//                           return knexQuery.innerJoin(...args);
//                         case 'fullOuterJoin':
//                           return knexQuery.fullOuterJoin(...args);
//                         case 'crossJoin':
//                           return knexQuery.crossJoin(...args);
//                         case 'distinct':
//                           return knexQuery.distinct(...args);
//                         case 'count':
//                           return knexQuery.count(...args);
//                         case 'min':
//                           return knexQuery.min(...args);
//                         case 'max':
//                           return knexQuery.max(...args);
//                         case 'sum':
//                           return knexQuery.sum(...args);
//                         case 'avg':
//                           return knexQuery.avg(...args);
//                         default:
//                           if (typeof knexQuery[operation] === 'function') {
//                             return knexQuery[operation](...args);
//                           }
//                           throw new Error(\`Unknown operation: \${operation}\`);
//                       }
//                     };

//                     // Helper function to process method chains
//                     const processMethod = async (methodName, args) => {
//                       console.log(\`Processing method: \${methodName} with args:\`, args);

//                       // Initialize knexQuery if it's null and the method is a query operation
//                       if (!knexQuery && ['where', 'whereNot', 'count', 'sum', 'avg', 'min', 'max'].includes(methodName)) {
//                         knexQuery = currentModel.knex()(currentModel.tableName());
//                       }

//                       if (knexQuery && typeof knexQuery[methodName] === 'function') {
//                       // Special handling for aggregation methods
//                       if (['count', 'sum', 'avg', 'min', 'max'].includes(methodName)) {
//                         const column = args[0] || '*';
//                         knexQuery = knexQuery[methodName](column + \` as \${methodName}\`);
//                         const result = await knexQuery;
//                         return {
//                           type: 'aggregation',
//                           result: result[0]?.[methodName] || 0
//                         };
//                       }

//                       knexQuery = applyKnexOperation(methodName, args);
//                       return { type: 'query', result: knexQuery };
//                     }

//                       const isAssociation = chainable._associations?.get(methodName);
//                       if (isAssociation) {
//                         const result = await chainable[methodName](...args);
//                         if (!knexQuery && result) {
//                           const associationModel = isAssociation.model;
//                           knexQuery = associationModel.knex().from(associationModel.tableName);

//                           if (Array.isArray(result)) {
//                             knexQuery = knexQuery.whereIn('id', result.map(r => r.id));
//                           } else if (result) {
//                             knexQuery = knexQuery.where({ id: result.id });
//                           }

//                           currentModel = associationModel;
//                         }
//                         return { type: 'association', result };
//                       }

//                       if (typeof chainable[methodName] === 'function') {
//                         const result = await chainable[methodName](...args);
//                         return { type: 'model', result };
//                       }

//                       return { type: 'property', result: chainable[methodName] };
//                     };

//                     for (let i = 1; i < parts.length; i++) {
//                       const methodPart = parts[i];
//                       const methodMatch = methodPart.match(/^([^(]+)\\((.*)\\)$/);
//                       let methodName, args = [];

//                       if (methodMatch) {
//                         [, methodName, args] = methodMatch;
//                         args = parseArguments(args.trim());
//                       } else {
//                         methodName = methodPart;
//                       }

//                       const { type, result } = await processMethod(methodName, args);
//                       lastResult = result;
//                       chainable = result;

//                       if (type === 'query') {
//                         queryState.conditions.push({ method: methodName, args });
//                       } else if (type === 'association') {
//                         queryState.associations.set(methodName, {
//                           args,
//                           conditions: [...queryState.conditions]
//                         });
//                         queryState.conditions = [];
//                       }
//                     }

//                     if (knexQuery) {
//                       const sql = knexQuery.toString();
//                       console.log("Final SQL:", sql);
//                       result = await knexQuery;

//                       if (lastResult?.type === 'aggregation') {
//                         result = lastResult.result;
//                       } else if (Array.isArray(result)) {
//                         result = result.map(record => {
//                           const instance = new currentModel(record);
//                           if (instance._initializeAssociations) {
//                             instance._initializeAssociations();
//                           }
//                           return instance;
//                         });
//                       }
//                     } else {
//                       result = lastResult?.result || lastResult;
//                     }

//                     return result;
//                   } catch (error) {
//                     console.error("Chain execution error:", error);
//                     throw error;
//                   }
//                 })()
//               `;
//             } else {
//               console.log("Wrapping in Promise.resolve()");
//               cmd = `Promise.resolve().then(() => ${cmd})`;
//             }
//           } else {
//             console.log("Skipping wrapper for special command");
//           }
//         }

//         console.log("\nFinal command to evaluate:", cmd);
//         let result = eval(cmd);

//         if (result && typeof result.then === "function") {
//           result
//             .then((value) => handleResult(value, callback))
//             .catch((err) => callback(err));
//         } else {
//           handleResult(result, callback);
//         }
//       } catch (err) {
//         console.error("REPL Eval Error:", err);
//         if (isRecoverableError(err)) {
//           callback(new repl.Recoverable(err));
//         } else {
//           callback(err);
//         }
//       }
//     },
//   });

//   // Helper functions remain the same
//   function handleResult(value, callback) {
//     try {
//       if (Array.isArray(value)) {
//         Object.defineProperty(value, "constructor", {
//           value: value[0]?.constructor || Object,
//           writable: true,
//           enumerable: false,
//           configurable: true,
//         });

//         value.forEach((item) => {
//           if (item?.constructor?.prototype instanceof Model) {
//             Object.setPrototypeOf(item, item.constructor.prototype);
//           }
//         });
//       } else if (value?.constructor?.prototype instanceof Model) {
//         Object.setPrototypeOf(value, value.constructor.prototype);
//       }

//       callback(null, value);
//     } catch (error) {
//       console.error("Error in handleResult:", error);
//       callback(error);
//     }
//   }

//   function parseArguments(argsStr) {
//     if (!argsStr) return [];

//     let args = [];
//     let currentArg = "";
//     let inString = false;
//     let stringChar = "";
//     let inObject = 0;
//     let inArray = 0;

//     for (let i = 0; i < argsStr.length; i++) {
//       const char = argsStr[i];

//       if (char === '"' || char === "'") {
//         if (!inString) {
//           inString = true;
//           stringChar = char;
//         } else if (char === stringChar) {
//           inString = false;
//         }
//         currentArg += char;
//       } else if (char === "{") {
//         inObject++;
//         currentArg += char;
//       } else if (char === "}") {
//         inObject--;
//         currentArg += char;
//       } else if (char === "[") {
//         inArray++;
//         currentArg += char;
//       } else if (char === "]") {
//         inArray--;
//         currentArg += char;
//       } else if (char === "," && !inString && !inObject && !inArray) {
//         args.push(currentArg.trim());
//         currentArg = "";
//       } else {
//         currentArg += char;
//       }
//     }

//     if (currentArg.trim()) {
//       args.push(currentArg.trim());
//     }

//     return args.map((arg) => {
//       try {
//         if (arg.startsWith("{") || arg.startsWith("[")) {
//           return eval(`(${arg})`);
//         }
//         if (/^-?\d+$/.test(arg)) return parseInt(arg);
//         if (/^-?\d*\.\d+$/.test(arg)) return parseFloat(arg);
//         if (arg === "true") return true;
//         if (arg === "false") return false;
//         if (arg === "null") return null;
//         if (arg === "undefined") return undefined;
//         if (/^["'].*["']$/.test(arg)) return arg.slice(1, -1);
//         return arg;
//       } catch {
//         return arg;
//       }
//     });
//   }

//   function isCompleteInput(code) {
//     try {
//       Function(code);
//       return true;
//     } catch (e) {
//       return !/^(Unexpected end of input|Unexpected token|Missing [)\]}])/.test(
//         e.message
//       );
//     }
//   }

//   function isRecoverableError(error) {
//     return (
//       error.name === "SyntaxError" &&
//       /^(Unexpected end of input|Unexpected token|Missing [)\]}])/.test(
//         error.message
//       )
//     );
//   }

//   addKnexCommands(r);

//   // Define helper functions
//   const helpFunction = () => {
//     originalConsoleLog("\nAvailable Commands:");
//     originalConsoleLog("\nBasic Operations:");
//     originalConsoleLog("- Model.all()                : Get all records");
//     originalConsoleLog("- Model.find(1)              : Find record by ID");
//     originalConsoleLog("- Model.where({ ... })       : Find by conditions");
//     originalConsoleLog("- Model.first()              : Get first record");
//     originalConsoleLog("- Model.last()               : Get last record");

//     originalConsoleLog("\nAdvanced Queries:");
//     originalConsoleLog(
//       "- Model.select('name, email') : Select specific columns"
//     );
//     originalConsoleLog("- Model.limit(5)              : Limit results");
//     originalConsoleLog("- Model.offset(10)            : Skip records");
//     originalConsoleLog("- Model.order('created_at DESC'): Order results");

//     originalConsoleLog("\nData Manipulation:");
//     originalConsoleLog("- Model.create({...})         : Create new record");
//     originalConsoleLog("- record.update({...})        : Update record");
//     originalConsoleLog("- record.save()               : Save changes");
//     originalConsoleLog("- record.destroy()            : Delete record");

//     originalConsoleLog("\nBatch Operations:");
//     originalConsoleLog("- Model.updateAll({where}, {set}) : Update multiple");
//     originalConsoleLog("- Model.destroyAll({where})       : Delete multiple");

//     originalConsoleLog("\nSchema & Validation:");
//     originalConsoleLog("- Model.columnInfo()           : Show table columns");
//     originalConsoleLog("- Model.schemaInfo()           : Show table schema");
//     originalConsoleLog("- record.isValid()             : Check validity");
//     originalConsoleLog(
//       "- record.errors                : Show validation errors"
//     );

//     originalConsoleLog("\nDatabase Commands:");
//     originalConsoleLog("- dbInfo()                     : Show database info");
//     originalConsoleLog(
//       "- dbDebug()                    : Show detailed DB info"
//     );
//     originalConsoleLog(
//       "- reconnect()                  : Reconnect to database"
//     );
//     originalConsoleLog(
//       "- currentDb()                  : Show current database type"
//     );

//     originalConsoleLog("\nDebug Commands:");
//     originalConsoleLog("- debug()                      : Enable debug mode");
//     originalConsoleLog("- reload()                     : Reload all models");

//     return "Type any of the commands above to interact with your models";
//   };

//   const debugFunction = (enable = true) => {
//     global.DEBUG = enable;
//     if (enable) {
//       console.log = originalConsoleLog;
//     } else {
//       console.log = function (...args) {
//         const message = args[0]?.toString() || "";
//         if (
//           global.DEBUG ||
//           (!message.includes("validations") &&
//             !message.includes("Initializing"))
//         ) {
//           originalConsoleLog.apply(console, args);
//         }
//       };
//     }
//     return `Debug mode ${enable ? "enabled" : "disabled"}`;
//   };

//   const dbInfoFunction = () => {
//     const config = connectionManager.config;
//     const activeDb = connectionManager.getCurrentDatabaseType();
//     const dbConfig = connectionManager.getDatabaseConfig(activeDb);

//     originalConsoleLog("\nDatabase Information:");
//     originalConsoleLog(`Active Database Type: ${activeDb}`);
//     originalConsoleLog(`Database: ${dbConfig?.database || "unknown"}`);
//     originalConsoleLog(`Host: ${dbConfig?.host || "local"}`);
//     originalConsoleLog(`Port: ${dbConfig?.port || "default"}`);
//     originalConsoleLog(
//       `Status: ${
//         connectionManager.isConnected() ? "Connected" : "Disconnected"
//       }`
//     );
//     return "End of database information";
//   };

//   const currentDbFunction = () => {
//     const dbType = connectionManager.getCurrentDatabaseType();
//     return `Current database type: ${dbType}`;
//   };

//   const dbDebugFunction = async () => {
//     try {
//       const conn = await connectionManager.getConnection();
//       const dbType = connectionManager.getCurrentDatabaseType();

//       let result;
//       if (dbType === "postgresql") {
//         result = await conn.query("SELECT current_database() as database");
//         result = result.rows;
//       } else if (dbType === "mysql") {
//         const [rows] = await conn.query("SELECT database() as database");
//         result = rows;
//       } else {
//         result = [{ database: connectionManager.getDbPath() }];
//       }

//       originalConsoleLog("\nDatabase Connection Details:");
//       originalConsoleLog({
//         type: dbType,
//         database: result[0].database,
//         connected: await connectionManager.isConnected(),
//         config: connectionManager.getDatabaseConfig(dbType),
//       });

//       return "End of database debug info";
//     } catch (error) {
//       return `Database debug error: ${error.message}`;
//     }
//   };

//   const reconnectFunction = async () => {
//     try {
//       await connectionManager.closeAll();
//       await connectionManager.getConnection();
//       const dbType = connectionManager.getCurrentDatabaseType();
//       return `Database connection reestablished (${dbType})`;
//     } catch (error) {
//       return `Failed to reconnect: ${error.message}`;
//     }
//   };

//   // Add functions to both global and REPL context
//   global.help = helpFunction;
//   global.debug = debugFunction;
//   global.dbInfo = dbInfoFunction;
//   global.dbDebug = dbDebugFunction;
//   global.reconnect = reconnectFunction;
//   global.currentDb = currentDbFunction;

//   r.context.help = helpFunction;
//   r.context.debug = debugFunction;
//   r.context.dbInfo = dbInfoFunction;
//   r.context.dbDebug = dbDebugFunction;
//   r.context.reconnect = reconnectFunction;
//   r.context.currentDb = currentDbFunction;

//   // Load models after REPL starts
//   process.nextTick(async () => {
//     try {
//       // Initialize database connection
//       try {
//         await connectionManager.getConnection();
//         const dbType = connectionManager.getCurrentDatabaseType();
//         originalConsoleLog(`Database connection established (${dbType})`);
//       } catch (error) {
//         originalConsoleLog(
//           "Warning: Database connection failed:",
//           error.message
//         );
//       }

//       // Dynamically load all models
//       const modelsPath = path.join(process.cwd(), "app", "models");

//       if (!fs.existsSync(modelsPath)) {
//         originalConsoleLog("No models directory found at:", modelsPath);
//         originalConsoleLog("Creating models directory...");
//         fs.mkdirSync(modelsPath, { recursive: true });
//         r.displayPrompt();
//         return;
//       }

//       const modelFiles = fs.readdirSync(modelsPath);

//       if (modelFiles.length === 0) {
//         originalConsoleLog("No model files found in:", modelsPath);
//         r.displayPrompt();
//         return;
//       }

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
//             global[className] = ModelClass;

//             if (global.DEBUG) {
//               console.log(`Loaded model: ${className}`);
//             }
//           } catch (err) {
//             console.error(`Error loading model ${className}:`, err.message);
//           }
//         }
//       });

//       // Add reload command
//       const reloadFunction = async () => {
//         try {
//           await connectionManager.closeAll();
//           await connectionManager.getConnection();
//           const dbType = connectionManager.getCurrentDatabaseType();
//           originalConsoleLog(`Database connection reestablished (${dbType})`);

//           modelFiles.forEach((file) => {
//             if (file.endsWith(".js")) {
//               const modelName = file.replace(".js", "");
//               const className =
//                 modelName.charAt(0).toUpperCase() +
//                 modelName
//                   .slice(1)
//                   .replace(/_([a-z])/g, (g) => g[1].toUpperCase());
//               try {
//                 const modelPath = path.join(modelsPath, file);
//                 delete require.cache[require.resolve(modelPath)];
//                 const ModelClass = require(modelPath);

//                 if (typeof ModelClass.initializeAssociations === "function") {
//                   ModelClass.initializeAssociations();
//                 }
//                 if (typeof ModelClass.initializeValidations === "function") {
//                   ModelClass.initializeValidations();
//                 }

//                 r.context[className] = ModelClass;
//                 global[className] = ModelClass;

//                 if (global.DEBUG) {
//                   console.log(`Reloaded model: ${className}`);
//                 }
//               } catch (err) {
//                 console.error(
//                   `Error reloading model ${className}:`,
//                   err.message
//                 );
//               }
//             }
//           });
//           return "✓ All models have been reloaded and database reconnected successfully!";
//         } catch (error) {
//           return `Failed to reload: ${error.message}`;
//         }
//       };

//       // Add reload function to both contexts
//       global.reload = reloadFunction;
//       r.context.reload = reloadFunction;

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

//   // Handle REPL exit with database cleanup
//   r.on("exit", async () => {
//     console.log = originalConsoleLog;
//     console.log("\nClosing database connections...");
//     try {
//       await connectionManager.closeAll();
//       console.log("All database connections closed");
//     } catch (error) {
//       console.error("Error closing database connections:", error.message);
//     }
//     console.log("Exiting WildayJS Console");
//     process.exit();
//   });
// }

// module.exports = startConsole;

// const repl = require("repl");
// const fs = require("fs");
// const path = require("path");
// const { Model: ObjectionModel } = require("objection");
// const ModelLoader = require("./modelLoader");
// const Validations = require("./validations");
// const connectionManager = require("./database/connectionManager");
// const knexManager = require("./knex-migrations/knexManager");
// const BaseModel = require("./model");

// // Helper function to check if input is complete
// function isCompleteInput(code) {
//   try {
//     Function(code);
//     return true;
//   } catch (e) {
//     return !/^(Unexpected end of input|Unexpected token|Missing [)\]}])/.test(
//       e.message
//     );
//   }
// }

// // Helper function to check if error is recoverable
// function isRecoverableError(error) {
//   return (
//     error.name === "SyntaxError" &&
//     /^(Unexpected end of input|Unexpected token|Missing [)\]}])/.test(
//       error.message
//     )
//   );
// }

// // Helper function to handle REPL results
// function handleResult(value, callback) {
//   try {
//     if (Array.isArray(value)) {
//       value.forEach((item) => {
//         if (item?.constructor?.prototype instanceof ObjectionModel) {
//           Object.setPrototypeOf(item, item.constructor.prototype);
//         }
//       });
//     } else if (value?.constructor?.prototype instanceof ObjectionModel) {
//       Object.setPrototypeOf(value, value.constructor.prototype);
//     }
//     callback(null, value);
//   } catch (error) {
//     console.error("Error in handleResult:", error);
//     callback(error);
//   }
// }

// // Main console function
// function startConsole() {
//   // Initialize globals
//   global.DEBUG = false;
//   global.Model = BaseModel;
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

//   // Initialize database connection
//   const initializeDatabase = async () => {
//     try {
//       const knex = knexManager.getInstance();
//       if (!knex) throw new Error("Failed to initialize database connection");

//       // Test connection
//       await knex.raw("SELECT 1");

//       // Bind Knex instance
//       ObjectionModel.knex(knex);
//       global.knex = knex;

//       const currentType = knexManager.getCurrentType();
//       const env = process.env.NODE_ENV || "development";
//       console.log(`Database connected (${currentType} - ${env})`);

//       return true;
//     } catch (error) {
//       console.error("Database initialization error:", error);
//       throw error;
//     }
//   };

//   // Helper Functions
//   const debugFunction = (enabled = true) => {
//     global.DEBUG = enabled;
//     console.log(`Debug mode ${enabled ? "enabled" : "disabled"}`);

//     if (enabled && global.knex) {
//       global.knex.on("query", (data) => {
//         console.log("SQL Query:", data.sql);
//         if (data.bindings?.length > 0) {
//           console.log("Bindings:", data.bindings);
//         }
//       });
//     }

//     return `Debug mode is now ${enabled ? "on" : "off"}`;
//   };

//   const dbInfoFunction = async () => {
//     try {
//       const knex = global.knex;
//       const config = connectionManager.getConfig();
//       const env = process.env.NODE_ENV || "development";

//       console.log("\nDatabase Information:");
//       console.log("Type:", config.active);
//       console.log("Environment:", env);
//       console.log("Database:", knex.client.config.connection.database);

//       let tables;
//       if (config.active === "postgresql") {
//         tables = await knex.raw(
//           "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
//         );
//         console.log("Tables:", tables.rows.map((r) => r.tablename).join(", "));
//       } else if (config.active === "mysql") {
//         tables = await knex.raw("SHOW TABLES");
//         console.log(
//           "Tables:",
//           tables[0].map((r) => Object.values(r)[0]).join(", ")
//         );
//       } else if (config.active === "sqlite") {
//         tables = await knex.raw(
//           "SELECT name FROM sqlite_master WHERE type='table'"
//         );
//         console.log("Tables:", tables.map((r) => r.name).join(", "));
//       }

//       return "Database info displayed above";
//     } catch (error) {
//       console.error("Error fetching database info:", error.message);
//       return "Failed to fetch database info";
//     }
//   };

//   // Model loading function
//   const loadModels = async () => {
//     const modelsPath = path.join(process.cwd(), "app", "models");
//     console.log("Loading models from:", modelsPath);

//     if (!fs.existsSync(modelsPath)) {
//       console.log("Creating models directory...");
//       fs.mkdirSync(modelsPath, { recursive: true });
//       return;
//     }

//     const modelFiles = fs
//       .readdirSync(modelsPath)
//       .filter((file) => file.endsWith(".js"));
//     console.log("Found model files:", modelFiles);

//     for (const file of modelFiles) {
//       const modelName = file.replace(".js", "");
//       const className =
//         modelName.charAt(0).toUpperCase() +
//         modelName.slice(1).replace(/_([a-z])/g, (g) => g[1].toUpperCase());

//       console.log(`\nLoading model: ${className}`);
//       const modelPath = path.join(modelsPath, file);
//       console.log("Model path:", modelPath);

//       try {
//         // Clear require cache
//         delete require.cache[require.resolve(modelPath)];

//         // Load model class
//         const ModelClass = require(modelPath);
//         console.log("Loaded ModelClass:", ModelClass);
//         console.log("ModelClass prototype:", ModelClass.prototype);
//         console.log(
//           "Is extending Model?",
//           ModelClass.prototype instanceof BaseModel
//         );

//         // Initialize model
//         if (typeof ModelClass.initialize === "function") {
//           await ModelClass.initialize();
//         }

//         // Make model available globally
//         global[className] = ModelClass;

//         console.log(`Successfully loaded model: ${className}`);
//       } catch (err) {
//         console.error(`Error loading model ${className}:`, err);
//         console.error("Stack trace:", err.stack);
//       }
//     }
//   };

//   // REPL setup and initialization
//   initializeDatabase().then(async () => {
//     // Load models before starting REPL
//     await loadModels();

//     const r = repl.start({
//       prompt: "wildayjs > ",
//       useColors: true,
//       terminal: true,
//       ignoreUndefined: true,
//       eval: async (cmd, context, filename, callback) => {
//         try {
//           if (global.DEBUG) console.log("\n=== REPL Eval Start ===");

//           // Clean command
//           cmd = cmd
//             .replace(/\/\/.*/g, "")
//             .replace(/\/\*[\s\S]*?\*\//g, "")
//             .trim()
//             .replace(/;$/, "");

//           // Check if input is complete
//           if (!isCompleteInput(cmd)) {
//             return callback(
//               new repl.Recoverable(new Error("Incomplete input"))
//             );
//           }

//           // Handle special commands
//           const specialCommands = [
//             "help()",
//             "debug(",
//             "dbInfo()",
//             "modelInfo(",
//             "reload()",
//           ];
//           const isSpecialCommand = specialCommands.some((c) => cmd.includes(c));

//           if (!isSpecialCommand) {
//             cmd = `(async () => {
//               try {
//                 return await ${cmd};
//               } catch(e) {
//                 console.error("Execution error:", e);
//                 throw e;
//               }
//             })()`;
//           }

//           if (global.DEBUG) console.log("Executing command:", cmd);

//           // Evaluate and handle result
//           let result = eval(cmd);

//           // Handle promises
//           if (result && typeof result.then === "function") {
//             result
//               .then((value) => handleResult(value, callback))
//               .catch((err) => callback(err));
//           } else {
//             handleResult(result, callback);
//           }
//         } catch (err) {
//           if (isRecoverableError(err)) {
//             callback(new repl.Recoverable(err));
//           } else {
//             callback(err);
//           }
//         }
//       },
//     });

//     // Help command
//     const helpFunction = () => {
//       originalConsoleLog("\nAvailable Commands:");

//       originalConsoleLog("\nSystem Commands:");
//       originalConsoleLog(
//         "- help()                    : Show this help message"
//       );
//       originalConsoleLog("- debug()                   : Toggle debug mode");
//       originalConsoleLog(
//         "- dbInfo()                  : Show database information"
//       );
//       originalConsoleLog("- reload()                  : Reload all models");

//       originalConsoleLog("\nQuery Methods:");
//       originalConsoleLog("- Model.query()              : Start a new query");
//       originalConsoleLog("- Model.findById(1)          : Find by ID");
//       originalConsoleLog(
//         "- Model.findOne({...})       : Find one by conditions"
//       );
//       originalConsoleLog("- Model.find({...})          : Find all matching");
//       originalConsoleLog("- Model.first()              : Get first record");
//       originalConsoleLog("- Model.last()               : Get last record");

//       originalConsoleLog("\nRelationships:");
//       originalConsoleLog(
//         "- Model.withGraphFetched('relation')  : Eager load relations"
//       );
//       originalConsoleLog(
//         "- Model.joinRelated('relation')       : Join related table"
//       );
//       originalConsoleLog(
//         "- record.$relatedQuery('relation')    : Query related records"
//       );

//       originalConsoleLog("\nModifications:");
//       originalConsoleLog("- Model.create({...})        : Create new record");
//       originalConsoleLog("- Model.insert({...})        : Insert new record");
//       originalConsoleLog("- record.$query().patch({...}): Update record");
//       originalConsoleLog("- record.$query().delete()   : Delete record");

//       originalConsoleLog("\nAggregations:");
//       originalConsoleLog("- Model.count()              : Count records");
//       originalConsoleLog("- Model.avg('column')        : Average of column");
//       originalConsoleLog("- Model.sum('column')        : Sum of column");
//       originalConsoleLog("- Model.min('column')        : Minimum value");
//       originalConsoleLog("- Model.max('column')        : Maximum value");

//       originalConsoleLog("\nFilters and Ordering:");
//       originalConsoleLog("- .where({...})              : Add conditions");
//       originalConsoleLog("- .whereNot({...})           : Negative conditions");
//       originalConsoleLog(
//         "- .whereIn('column', [...])  : Match array of values"
//       );
//       originalConsoleLog("- .orderBy('column')         : Order results");
//       originalConsoleLog("- .limit(n)                  : Limit results");
//       originalConsoleLog("- .offset(n)                 : Skip results");

//       return "Type any of the commands above to interact with your models";
//     };

//     // Reload function
//     const reloadFunction = async () => {
//       try {
//         console.log("Reloading models...");

//         // Reinitialize database connection
//         await initializeDatabase();

//         // Reload all models
//         await loadModels();

//         return "✓ All models have been reloaded successfully!";
//       } catch (error) {
//         console.error("Failed to reload:", error);
//         return `Failed to reload: ${error.message}`;
//       }
//     };

//     // Register helper functions
//     global.help = helpFunction;
//     global.debug = debugFunction;
//     global.dbInfo = dbInfoFunction;
//     global.reload = reloadFunction;

//     r.context.help = helpFunction;
//     r.context.debug = debugFunction;
//     r.context.dbInfo = dbInfoFunction;
//     r.context.reload = reloadFunction;

//     // Display initial help message
//     console.log("Type help() for available commands and models");
//     r.displayPrompt();

//     // Handle REPL cleanup
//     r.on("exit", async () => {
//       console.log = originalConsoleLog;
//       console.log("\nClosing database connections...");

//       try {
//         if (global.knex) {
//           await global.knex.destroy();
//         }
//         console.log("All database connections closed");
//       } catch (error) {
//         console.error("Error closing database connections:", error.message);
//       }

//       console.log("Exiting WildayJS Console");
//       process.exit();
//     });
//   });
// }

// module.exports = startConsole;

const repl = require("repl");
const fs = require("fs");
const path = require("path");
const { Model: ObjectionModel } = require("objection");
const ModelLoader = require("./modelLoader");
const Validations = require("./validations");
const knexManager = require("./knex-migrations/knexManager");
const BaseModel = require("./model");
const util = require("util");

// Helper function to check if input is complete
function isCompleteInput(code) {
  try {
    Function(code);
    return true;
  } catch (e) {
    return !/^(Unexpected end of input|Unexpected token|Missing [)\]}])/.test(
      e.message
    );
  }
}

// Helper function to check if error is recoverable
function isRecoverableError(error) {
  return (
    error.name === "SyntaxError" &&
    /^(Unexpected end of input|Unexpected token|Missing [)\]}])/.test(
      error.message
    )
  );
}

// Helper function to handle REPL results
function handleResult(value, callback) {
  try {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item?.constructor?.prototype instanceof ObjectionModel) {
          Object.setPrototypeOf(item, item.constructor.prototype);
        }
      });
    } else if (value?.constructor?.prototype instanceof ObjectionModel) {
      Object.setPrototypeOf(value, value.constructor.prototype);
    }
    callback(null, value);
  } catch (error) {
    console.error("Error in handleResult:", error);
    callback(error);
  }
}

// Buffer to store multi-line input
let inputBuffer = "";
let isMultilineMode = false;

// Main console function
function startConsole() {
  // Initialize globals
  global.DEBUG = false;
  global.Model = BaseModel;
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

  // Initialize database connection
  const initializeDatabase = async () => {
    try {
      const knex = knexManager.getInstance();
      if (!knex) throw new Error("Failed to initialize database connection");

      // Test connection
      await knex.raw("SELECT 1");

      // Bind Knex instance
      ObjectionModel.knex(knex);
      global.knex = knex;

      const currentType = knexManager.getCurrentType();
      const env = process.env.NODE_ENV || "development";
      console.log(`Database connected (${currentType} - ${env})`);

      return true;
    } catch (error) {
      console.error("Database initialization error:", error);
      throw error;
    }
  };

  // Helper Functions
  const debugFunction = (enabled = true) => {
    global.DEBUG = enabled;

    // Store original console.log if not already stored
    if (!global._originalConsoleLog) {
      global._originalConsoleLog = console.log;
    }

    // Get all extension names from query builder
    const extensions = [
      "OrderingExtensions",
      "PaginationExtensions",
      "PatternMatchingExtensions",
      "TimeBasedExtensions",
      "WhereClauseExtensions",
    ].map((name) => name.toLowerCase());

    // Override console.log to show debug messages with colors
    console.log = function (...args) {
      const message = args[0]?.toString() || "";

      if (enabled) {
        // When debug is enabled, format different types of messages
        if (message.startsWith("Debug:")) {
          // Check if message contains any extension name
          const hasExtension = extensions.some((ext) =>
            message.toLowerCase().includes(ext.toLowerCase())
          );

          if (hasExtension) {
            // Extension-related debug messages in magenta
            global._originalConsoleLog("\x1b[35m%s\x1b[0m", ...args);
          } else {
            // Other debug messages in cyan
            global._originalConsoleLog("\x1b[36m%s\x1b[0m", ...args);
          }
        } else if (message.startsWith("SQL Query:")) {
          // SQL queries in yellow
          global._originalConsoleLog("\x1b[33m%s\x1b[0m", ...args);
        } else {
          // Other messages in default color
          global._originalConsoleLog(...args);
        }
      } else {
        // When debug is disabled, filter out debug messages
        if (
          !message.startsWith("Debug:") &&
          !message.includes("Initializing")
        ) {
          global._originalConsoleLog(...args);
        }
      }
    };

    if (enabled && global.knex) {
      // Remove any existing query listeners
      global.knex.removeAllListeners("query");

      // Add query logging
      global.knex.on("query", (data) => {
        console.log("SQL Query:", data.sql);
        if (data.bindings?.length > 0) {
          console.log("Bindings:", data.bindings);
        }
      });
    }

    return `Debug mode is now ${enabled ? "on" : "off"}`;
  };

  const dbInfoFunction = async () => {
    try {
      const knex = global.knex;
      const config = knexManager.getConfig();
      const env = process.env.NODE_ENV || "development";

      console.log("\nDatabase Information:");
      console.log("Type:", config.active);
      console.log("Environment:", env);
      console.log("Database:", knex.client.config.connection.database);

      let tables;
      if (config.active === "postgresql") {
        tables = await knex.raw(
          "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
        );
        console.log("Tables:", tables.rows.map((r) => r.tablename).join(", "));
      } else if (config.active === "mysql") {
        tables = await knex.raw("SHOW TABLES");
        console.log(
          "Tables:",
          tables[0].map((r) => Object.values(r)[0]).join(", ")
        );
      } else if (config.active === "sqlite3") {
        tables = await knex.raw(
          "SELECT name FROM sqlite_master WHERE type='table'"
        );
        console.log("Tables:", tables.map((r) => r.name).join(", "));
      }

      return "Database info displayed above";
    } catch (error) {
      console.error("Error getting database info:", error);
      return "Failed to get database info";
    }
  };

  // REPL setup and initialization
  initializeDatabase().then(async () => {
    // Load models before starting REPL
    await ModelLoader.loadModels();

    const r = repl.start({
      prompt: "wildayjs > ",
      useColors: true,
      ignoreUndefined: true,
      eval: async function (cmd, context, filename, callback) {
        // Clean up the input
        const originalCmd = cmd;
        cmd = cmd.trim();

        // Helper function to wrap code in async execution context
        const wrapAsync = (code) => {
          return `(async () => { 
            try { 
              return await ${code}
            } catch(e) { 
              console.error(e);
              throw e;
            } 
          })()`;
        };

        // Helper function to execute code and handle results
        const executeCode = async (code) => {
          const originalLog = console.log;
          try {
            // Only suppress non-debug logs
            console.log = (...args) => {
              const message = args[0]?.toString() || "";
              if (
                global.DEBUG &&
                (message.startsWith("Debug:") ||
                  message.startsWith("SQL Query:") ||
                  message.includes("OrderingExtensions") ||
                  message.includes("QueryBuilder"))
              ) {
                originalLog(...args);
              }
            };

            // Check if this is a stored query being executed
            let result;
            if (typeof code === "string" && !code.includes("=")) {
              const storedQuery = eval(code);
              if (typeof storedQuery === "function") {
                const queryResult = storedQuery(); // Execute the stored function
                result = eval(wrapAsync("queryResult")); // Wrap in async context
              } else {
                result = eval(wrapAsync(code));
              }
            } else {
              result = eval(wrapAsync(code));
            }

            console.log = originalLog;

            if (result && typeof result.then === "function") {
              try {
                const value = await result;
                handleResult(value, callback);
              } catch (err) {
                callback(err);
              }
            } else {
              handleResult(result, callback);
            }
          } catch (err) {
            console.log = originalLog;
            callback(err);
          }
        };

        // Helper function to handle assignments
        const handleAssignment = (code) => {
          const assignmentMatch = code.match(
            /^(let|const|var)?\s*([a-zA-Z_$][0-9a-zA-Z_$]*)\s*=\s*(.+)$/
          );
          if (assignmentMatch) {
            const [, declarationType, varName, expression] = assignmentMatch;

            // If it's a query builder expression, store it as a function
            if (
              expression.match(/^[A-Z][a-zA-Z0-9]*\s*\./) ||
              expression.match(/^[A-Z][a-zA-Z0-9]*$/)
            ) {
              const wrappedExpression = `(() => ${expression})`;
              const assignment = declarationType
                ? `${declarationType} ${varName} = ${wrappedExpression}`
                : `${varName} = ${wrappedExpression}`;

              eval(assignment);
              return { isAssignment: true, varName };
            }
          }
          return { isAssignment: false };
        };

        // Check if this is the start of a multi-line input (Model name)
        if (!isMultilineMode && cmd.match(/^[A-Z][a-zA-Z0-9]*$/)) {
          isMultilineMode = true;
          inputBuffer = cmd;
          r.setPrompt("... ");
          return callback(new repl.Recoverable());
        }

        // Continue collecting multi-line input
        if (isMultilineMode) {
          const lines = originalCmd.split("\n");
          const currentLine = lines[lines.length - 2];

          if (!currentLine || currentLine.trim() === "") {
            const tempBuffer = inputBuffer;
            inputBuffer = "";
            isMultilineMode = false;
            r.setPrompt("wildayjs > ");

            if (tempBuffer.includes("=")) {
              const { isAssignment, varName } = handleAssignment(tempBuffer);
              if (isAssignment) {
                return callback(null, `Query stored in variable: ${varName}`);
              }
            }

            return await executeCode(tempBuffer);
          }

          if (currentLine && currentLine.trim().startsWith(".")) {
            inputBuffer += currentLine.trim();
          }
          return callback(new repl.Recoverable());
        }

        // Handle single line execution
        try {
          // Remove explicit async/await syntax if present
          cmd = cmd.replace(/^await\s+/, "");
          cmd = cmd.replace(
            /^(let|const|var)?\s*(\w+)\s*=\s*await\s+/,
            "$1 $2 = "
          );

          const { isAssignment, varName } = handleAssignment(cmd);
          if (isAssignment) {
            return callback(null, `Query stored in variable: ${varName}`);
          }

          return await executeCode(cmd);
        } catch (err) {
          if (isRecoverableError(err)) {
            callback(new repl.Recoverable(err));
          } else {
            callback(err);
          }
        }
      },
      writer: function (output) {
        if (output === undefined) return "undefined";
        return util.inspect(output, { colors: true, depth: null });
      },
    });

    // Add special handling for Ctrl+C to reset multi-line mode
    r.on("SIGINT", () => {
      if (isMultilineMode) {
        isMultilineMode = false;
        inputBuffer = "";
        r.setPrompt("wildayjs > ");
        r.write("\n");
        r.displayPrompt();
      } else {
        r.close();
      }
    });

    // Help command
    const helpFunction = () => {
      originalConsoleLog("\nAvailable Models:");
      ModelLoader.listModels().forEach((model) => {
        originalConsoleLog(`- ${model.className} (table: ${model.tableName})`);
      });

      originalConsoleLog("\nSystem Commands:");
      originalConsoleLog(
        "- help()                    : Show this help message"
      );
      originalConsoleLog("- debug()                   : Toggle debug mode");
      originalConsoleLog(
        "- dbInfo()                  : Show database information"
      );
      originalConsoleLog("- reload()                  : Reload all models");

      originalConsoleLog("\nQuery Methods:");
      originalConsoleLog("- Model.query()              : Start a new query");
      originalConsoleLog("- Model.findById(1)          : Find by ID");
      originalConsoleLog(
        "- Model.findOne({...})       : Find one by conditions"
      );
      originalConsoleLog("- Model.find({...})          : Find all matching");
      originalConsoleLog("- Model.first()              : Get first record");
      originalConsoleLog("- Model.last()               : Get last record");

      originalConsoleLog("\nRelationships:");
      originalConsoleLog(
        "- Model.withGraphFetched('relation')  : Eager load relations"
      );
      originalConsoleLog(
        "- Model.joinRelated('relation')       : Join related table"
      );
      originalConsoleLog(
        "- record.$relatedQuery('relation')    : Query related records"
      );

      originalConsoleLog("\nModifications:");
      originalConsoleLog("- Model.create({...})        : Create new record");
      originalConsoleLog("- Model.insert({...})        : Insert new record");
      originalConsoleLog("- record.$query().patch({...}): Update record");
      originalConsoleLog("- record.$query().delete()   : Delete record");

      originalConsoleLog("\nAggregations:");
      originalConsoleLog("- Model.count()              : Count records");
      originalConsoleLog("- Model.avg('column')        : Average of column");
      originalConsoleLog("- Model.sum('column')        : Sum of column");
      originalConsoleLog("- Model.min('column')        : Minimum value");
      originalConsoleLog("- Model.max('column')        : Maximum value");

      originalConsoleLog("\nFilters and Ordering:");
      originalConsoleLog("- .where({...})              : Add conditions");
      originalConsoleLog("- .whereNot({...})           : Negative conditions");
      originalConsoleLog(
        "- .whereIn('column', [...])  : Match array of values"
      );
      originalConsoleLog("- .orderBy('column')         : Order results");
      originalConsoleLog("- .limit(n)                  : Limit results");
      originalConsoleLog("- .offset(n)                 : Skip results");

      return "Type any of the commands above to interact with your models";
    };

    // Reload function
    const reloadFunction = async () => {
      try {
        console.log("Reloading models...");
        await initializeDatabase();
        await ModelLoader.reloadModels();
        return "✓ All models have been reloaded successfully!";
      } catch (error) {
        console.error("Failed to reload:", error);
        return `Failed to reload: ${error.message}`;
      }
    };

    // Register helper functions
    global.help = helpFunction;
    global.debug = debugFunction;
    global.dbInfo = dbInfoFunction;
    global.reload = reloadFunction;

    r.context.help = helpFunction;
    r.context.debug = debugFunction;
    r.context.dbInfo = dbInfoFunction;
    r.context.reload = reloadFunction;

    // Display initial help message
    console.log("Type help() for available commands and models");
    r.displayPrompt();

    // Handle REPL cleanup
    r.on("exit", async () => {
      console.log = originalConsoleLog;
      console.log("\nClosing database connections...");

      try {
        if (global.knex) {
          await global.knex.destroy();
        }
        console.log("All database connections closed");
      } catch (error) {
        console.error("Error closing database connections:", error.message);
      }

      console.log("Exiting WildayJS Console");
      process.exit();
    });
  });
}

module.exports = startConsole;
