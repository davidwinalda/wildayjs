// const path = require("path");
// const fs = require("fs").promises;
// const { toSnakeCase, pluralize } = require("../../utils/stringUtils");
// const { log } = require("../utils/logger");
// const {
//   createTableTemplate,
//   addColumnsTemplate,
//   removeColumnsTemplate,
//   renameColumnTemplate,
//   changeColumnTemplate,
//   dropTableTemplate,
//   renameTableTemplate,
//   addIndexTemplate,
//   addForeignKeyTemplate,
//   createHasOneTemplate,
//   addBelongsToTemplate,
//   createJoinTableTemplate,
//   addPolymorphicTemplate,
//   createThroughTableTemplate,
// } = require("./templates");

// const COLUMN_TYPES = {
//   // String types
//   string: { name: "string", params: ["length"] },
//   text: { name: "text" },
//   char: { name: "char", params: ["length"] },
//   varchar: { name: "string", params: ["length"] },

//   // Numeric types
//   integer: { name: "integer" },
//   bigInteger: { name: "bigInteger" },
//   float: { name: "float", params: ["precision", "scale"] },
//   decimal: { name: "decimal", params: ["precision", "scale"] },
//   boolean: { name: "boolean" },

//   // Date/Time types
//   date: { name: "date" },
//   datetime: { name: "datetime" },
//   time: { name: "time" },
//   timestamp: { name: "timestamp" },

//   // Special types
//   binary: { name: "binary" },
//   json: { name: "json" },
//   jsonb: { name: "jsonb" },
//   uuid: { name: "uuid" },
//   enum: { name: "enum", params: ["values"] },

//   // Association types
//   references: {
//     name: "integer",
//     params: ["table", "column"],
//     modifiers: ["unsigned"],
//   },
// };

// // Add safe type changes mapping
// const SAFE_TYPE_CHANGES = {
//   string: ["text", "varchar"],
//   text: ["string", "varchar"],
//   integer: ["bigInteger", "decimal"],
//   float: ["decimal"],
//   decimal: ["float"],
//   // Add more safe type changes as needed
// };

// class ColumnBuilder {
//   constructor(name, type, options = {}) {
//     this.name = name;
//     this.type = type;
//     this.options = options;
//   }

//   build() {
//     // Special handling for references type
//     if (this.type === "references") {
//       this.name = `${this.name}_id`;
//       this.type = "integer";
//       this.options.unsigned = true;
//     }

//     const typeInfo = COLUMN_TYPES[this.type.toLowerCase()];
//     if (!typeInfo) {
//       throw new Error(`Unknown column type: ${this.type}`);
//     }

//     // Handle decimal type differently
//     if (this.type === "decimal") {
//       let definition = `table.${typeInfo.name}('${this.name}', ${
//         this.options.typeParams?.[0] || 10
//       }, ${this.options.typeParams?.[1] || 2})`;

//       // Add modifiers
//       if (this.options.nullable === false) definition += ".notNullable()";
//       if (this.options.unique) definition += ".unique()";
//       if (this.options.index) definition += ".index()";
//       if (this.options.primary) definition += ".primary()";
//       if (this.options.unsigned) definition += ".unsigned()";

//       if (this.options.defaultValue !== undefined) {
//         if (typeof this.options.defaultValue === "string") {
//           definition += `.defaultTo('${this.options.defaultValue}')`;
//         } else {
//           definition += `.defaultTo(${this.options.defaultValue})`;
//         }
//       }

//       return {
//         name: this.name,
//         definition: definition + ";",
//         type: this.type,
//         originalType: this.options.fromType,
//       };
//     }

//     // Handle other types
//     let definition = `table.${typeInfo.name}('${this.name}')`;

//     // Add type parameters if any (for non-decimal types)
//     if (typeInfo.params && this.options.typeParams && this.type !== "decimal") {
//       const params = Array.isArray(this.options.typeParams)
//         ? this.options.typeParams
//         : [this.options.typeParams];
//       definition += `(${params.join(", ")})`;
//     }

//     // Add modifiers
//     if (this.options.nullable === false) definition += ".notNullable()";
//     if (this.options.unique) definition += ".unique()";
//     if (this.options.index) definition += ".index()";
//     if (this.options.primary) definition += ".primary()";
//     if (this.options.unsigned) definition += ".unsigned()";

//     if (this.options.defaultValue !== undefined) {
//       if (typeof this.options.defaultValue === "string") {
//         definition += `.defaultTo('${this.options.defaultValue}')`;
//       } else {
//         definition += `.defaultTo(${this.options.defaultValue})`;
//       }
//     }

//     // Enhanced references handling
//     if (this.options.references) {
//       if (!this.options.unsigned) {
//         definition += `.unsigned()`; // Always unsigned for foreign keys
//       }

//       definition +=
//         `.references('${this.options.references.column}')` +
//         `.inTable('${this.options.references.table}')`;

//       if (this.options.references.onDelete) {
//         definition += `.onDelete('${this.options.references.onDelete}')`;
//       }
//       if (this.options.references.onUpdate) {
//         definition += `.onUpdate('${this.options.references.onUpdate}')`;
//       }
//     }

//     return {
//       name: this.name,
//       definition: definition + ";",
//       type: this.type,
//       originalType: this.options.fromType,
//     };
//   }
// }

// class MigrationGenerator {
//   constructor() {
//     this.migrationsDir = path.join(process.cwd(), "db", "migrate");
//   }
//   // Add static property to track current action
//   static currentAction = null;

//   async createMigration(name, columns = [], options = {}) {
//     await this.ensureMigrationsDir();

//     // Parse migration type from name FIRST
//     const migrationInfo = this.parseMigrationName(name);
//     console.log("[DEBUG] Initial Migration Info:", migrationInfo);

//     try {
//       // Set current action FIRST, before any column parsing
//       MigrationGenerator.currentAction = migrationInfo.action;
//       console.log(
//         "[DEBUG] Setting initial current action to:",
//         MigrationGenerator.currentAction
//       );

//       // Now parse the raw columns to get their structure
//       const initialColumns = columns.map((col) => {
//         if (typeof col === "string") {
//           const [name, type = "string", ...options] = col.split(":");
//           return { name, type, options };
//         }
//         return col;
//       });

//       // Then process the columns with the current action
//       const parsedColumns = initialColumns.map((col, index) => {
//         if (col.name && col.type) {
//           const columnStr = `${col.name}:${col.type}:${
//             Array.isArray(col.options) ? col.options.join(":") : ""
//           }`;
//           console.log(`[DEBUG] Processing column ${index + 1}:`, {
//             columnStr,
//             currentAction: MigrationGenerator.currentAction,
//           });
//           return MigrationGenerator.parseColumnString(columnStr);
//         }
//         return col;
//       });

//       console.log(
//         "[DEBUG] All parsed columns:",
//         JSON.stringify(parsedColumns, null, 2)
//       );

//       // Generate migration content
//       const content = this.generateMigrationContent(
//         migrationInfo,
//         parsedColumns,
//         options
//       );

//       // Write migration file
//       const timestamp = new Date()
//         .toISOString()
//         .replace(/\D/g, "")
//         .slice(0, 14);
//       const filename = `${timestamp}_${name}.js`;
//       const filepath = path.join(this.migrationsDir, filename);
//       await fs.writeFile(filepath, content);

//       log.success(`Created migration: ${filename}`);
//       log.success(`Migration file created at: ${filepath}`);

//       return { filename, filepath };
//     } catch (error) {
//       console.error("[DEBUG] Error creating migration:", error);
//       throw new Error(`Failed to create migration: ${error.message}`);
//     } finally {
//       const previousAction = MigrationGenerator.currentAction;
//       MigrationGenerator.currentAction = null;
//       console.log("[DEBUG] Reset current action in finally block:", {
//         previous: previousAction,
//         current: MigrationGenerator.currentAction,
//       });
//     }
//   }

//   generateMigrationContent(migrationInfo, parsedColumns, options = {}) {
//     switch (migrationInfo.action) {
//       case "create":
//         return createTableTemplate(
//           migrationInfo.tableName,
//           parsedColumns.map((col) =>
//             new ColumnBuilder(col.name, col.type, col.options).build()
//           ),
//           options // Pass options to createTableTemplate
//         );

//       case "change":
//         const column = parsedColumns[0];
//         if (column.fromType) {
//           this.validateTypeChange(column.type, column.fromType);
//         }

//         // Extract constraints from options
//         const { upConstraints = [], downConstraints = [] } = column.options;

//         return changeColumnTemplate(
//           migrationInfo.tableName,
//           migrationInfo.columnName,
//           {
//             type: column.type,
//             typeParams: column.options?.typeParams,
//             upConstraints, // Pass up constraints
//             downConstraints, // Pass down constraints
//           },
//           column.fromType
//         );

//       case "add":
//         return addColumnsTemplate(
//           migrationInfo.tableName,
//           parsedColumns.map((col) =>
//             new ColumnBuilder(col.name, col.type, col.options).build()
//           ),
//           options // Pass options to addColumnsTemplate
//         );

//       case "remove":
//         // If no columns provided, use the column name from migration name
//         const columnsToRemove =
//           parsedColumns.length > 0
//             ? parsedColumns
//             : [{ name: migrationInfo.columnName }];

//         return removeColumnsTemplate(
//           migrationInfo.tableName,
//           columnsToRemove.map((col) => ({
//             name: col.name,
//             type: col.type,
//             fromType: col.fromType,
//             downConstraints: col.options?.downConstraints || [],
//           }))
//         );

//       case "rename":
//         return renameColumnTemplate(
//           migrationInfo.tableName,
//           migrationInfo.oldName,
//           migrationInfo.newName
//         );

//       case "drop":
//         return dropTableTemplate(migrationInfo.tableName);

//       case "rename_table":
//         return renameTableTemplate(
//           migrationInfo.oldTableName,
//           migrationInfo.newTableName
//         );

//       case "add_index":
//         return addIndexTemplate(
//           migrationInfo.tableName,
//           migrationInfo.columnName
//         );

//       case "add_foreign_key":
//         return addForeignKeyTemplate(
//           migrationInfo.tableName,
//           migrationInfo.columnName,
//           migrationInfo.referenceTable
//         );

//       case "has_one":
//       case "belongs_to":
//       case "join_table":
//       case "polymorphic":
//       case "through":
//         return this.handleAssociationMigration(migrationInfo);

//       default:
//         throw new Error(`Unknown migration action: ${migrationInfo.action}`);
//     }
//   }

//   handleAssociationMigration(migrationInfo) {
//     switch (migrationInfo.action) {
//       case "has_one":
//         return createHasOneTemplate(
//           migrationInfo.sourceTable,
//           migrationInfo.targetTable
//         );
//       case "belongs_to":
//         return addBelongsToTemplate(
//           migrationInfo.sourceTable,
//           migrationInfo.targetTable
//         );
//       case "join_table":
//         return createJoinTableTemplate(
//           migrationInfo.sourceTable,
//           migrationInfo.targetTable
//         );
//       case "polymorphic":
//         return addPolymorphicTemplate(
//           migrationInfo.sourceTable,
//           migrationInfo.targetTable
//         );
//       case "through":
//         return createThroughTableTemplate(
//           migrationInfo.throughTable,
//           migrationInfo.sourceTable,
//           migrationInfo.targetTable
//         );
//     }
//   }

//   async ensureMigrationsDir() {
//     try {
//       await fs.mkdir(this.migrationsDir, { recursive: true });
//     } catch (error) {
//       throw new Error(
//         `Failed to create migrations directory: ${error.message}`
//       );
//     }
//   }

//   static parseColumnString(columnStr, action) {
//     console.log("[DEBUG] Starting parseColumnString:", {
//       columnStr,
//       currentAction: MigrationGenerator.currentAction,
//     });

//     const [name, type = "string", ...options] = columnStr.split(":");
//     console.log("[DEBUG] Parsed column parts:", {
//       name,
//       type,
//       options,
//       currentAction: MigrationGenerator.currentAction,
//     });

//     const columnOptions = {};
//     let fromType = null;
//     let upConstraints = [];
//     let downConstraints = [];
//     let beforeFromOptions = [];
//     let afterFromOptions = [];
//     let foundFrom = false;

//     // Special handling for references type
//     if (type === "references") {
//       console.log("[DEBUG] Handling references type for:", name);
//       const referencedTable = options[0] || pluralize(name);
//       console.log("[DEBUG] Referenced table:", referencedTable);
//       return {
//         name: `${name}_id`,
//         type: "integer",
//         options: {
//           unsigned: true,
//           foreign: true,
//           references: {
//             table: referencedTable,
//             column: "id",
//             onDelete: "RESTRICT",
//             onUpdate: "RESTRICT",
//           },
//         },
//       };
//     }

//     // Handle decimal precision
//     if (type === "decimal") {
//       columnOptions.typeParams = [10, 2]; // Default: 10 digits with 2 decimal places
//     }

//     // Special handling for remove migrations
//     if (action === "remove") {
//       console.log("[DEBUG] Processing remove migration constraints");
//       // For remove migrations, treat all options as down constraints
//       options.forEach((opt) => {
//         console.log("[DEBUG] Processing option:", opt);
//         switch (opt) {
//           case "required":
//             columnOptions.nullable = false;
//             downConstraints.push("required");
//             break;
//           case "unique":
//             columnOptions.unique = true;
//             downConstraints.push("unique");
//             break;
//           case "index":
//             columnOptions.index = true;
//             downConstraints.push("index");
//             break;
//           case "unsigned":
//             columnOptions.unsigned = true;
//             break;
//           // Keep other existing cases for compatibility
//           case "foreign":
//             const tableName = name.replace(/_id$/, "s");
//             columnOptions.unsigned = true;
//             columnOptions.references = {
//               table: tableName,
//               column: "id",
//               onDelete: "RESTRICT",
//               onUpdate: "RESTRICT",
//             };
//             break;
//           default:
//             if (opt.startsWith("default=")) {
//               const value = opt.split("=")[1];
//               columnOptions.defaultValue =
//                 !isNaN(value) && value !== "" ? Number(value) : value;
//             } else if (opt.startsWith("ref=")) {
//               const [table, column = "id"] = opt.split("=")[1].split(".");
//               columnOptions.references = {
//                 table,
//                 column,
//                 onDelete: "RESTRICT",
//                 onUpdate: "RESTRICT",
//               };
//             }
//         }
//       });

//       console.log("[DEBUG] Final parsing state:", {
//         name,
//         type,
//         columnOptions,
//         upConstraints,
//         downConstraints,
//         action,
//       });

//       // Return early for remove migrations with downConstraints
//       const result = {
//         name,
//         type,
//         options: {
//           ...columnOptions,
//           upConstraints: [], // Empty upConstraints for remove migrations
//           downConstraints, // Only include downConstraints
//         },
//       };

//       console.log("[DEBUG] Returning remove migration result:", result);
//       return result;
//     }

//     // Separate options before and after 'from'
//     for (let i = 0; i < options.length; i++) {
//       if (options[i] === "from") {
//         foundFrom = true;
//         if (i + 1 < options.length) {
//           fromType = options[i + 1];
//           // Validate fromType
//           if (!COLUMN_TYPES[fromType]) {
//             throw new Error(`Invalid original column type: ${fromType}`);
//           }
//           i++; // Skip the next item (fromType)
//         }
//       } else {
//         if (foundFrom) {
//           afterFromOptions.push(options[i]);
//         } else {
//           beforeFromOptions.push(options[i]);
//         }
//       }
//     }

//     // Process options before 'from'
//     beforeFromOptions.forEach((opt) => {
//       switch (opt) {
//         case "required":
//           columnOptions.nullable = false;
//           upConstraints.push("required");
//           break;
//         case "unique":
//           columnOptions.unique = true;
//           upConstraints.push("unique");
//           break;
//         case "index":
//           columnOptions.index = true;
//           upConstraints.push("index");
//           break;
//         case "unsigned":
//           columnOptions.unsigned = true;
//           break;
//         case "foreign":
//           // Convert 'foreign' to proper references format
//           const tableName = name.replace(/_id$/, "s"); // Convert user_id to users
//           columnOptions.unsigned = true;
//           columnOptions.references = {
//             table: tableName,
//             column: "id",
//             onDelete: "RESTRICT",
//             onUpdate: "RESTRICT",
//           };
//           break;
//         case "references":
//         case "belongs_to":
//           columnOptions.unsigned = true;
//           columnOptions.references = {
//             table: type, // In this case, type is the table name
//             column: "id",
//             onDelete: "RESTRICT",
//             onUpdate: "RESTRICT",
//           };
//           break;
//         case "polymorphic":
//           columnOptions.polymorphic = true;
//           break;
//         case "through":
//           columnOptions.through = true;
//           break;
//         default:
//           if (opt.startsWith("default=")) {
//             const value = opt.split("=")[1];
//             // Convert numeric strings to numbers
//             if (!isNaN(value) && value !== "") {
//               columnOptions.defaultValue = Number(value);
//             } else {
//               columnOptions.defaultValue = value;
//             }
//           } else if (opt.startsWith("ref=")) {
//             const [table, column = "id"] = opt.split("=")[1].split(".");
//             columnOptions.references = {
//               table,
//               column,
//               onDelete: "RESTRICT",
//               onUpdate: "RESTRICT",
//             };
//           }
//       }
//     });

//     // Process options after 'from'
//     afterFromOptions.forEach((opt) => {
//       switch (opt) {
//         case "required":
//           downConstraints.push("required");
//           break;
//         case "unique":
//           downConstraints.push("unique");
//           break;
//         case "index":
//           downConstraints.push("index");
//           break;
//         case "unsigned":
//           columnOptions.unsigned = true;
//           break;
//         case "foreign":
//           // Convert 'foreign' to proper references format
//           const tableName = name.replace(/_id$/, "s"); // Convert user_id to users
//           columnOptions.unsigned = true;
//           columnOptions.references = {
//             table: tableName,
//             column: "id",
//             onDelete: "RESTRICT",
//             onUpdate: "RESTRICT",
//           };
//           break;
//         case "references":
//         case "belongs_to":
//           columnOptions.unsigned = true;
//           columnOptions.references = {
//             table: type, // In this case, type is the table name
//             column: "id",
//             onDelete: "RESTRICT",
//             onUpdate: "RESTRICT",
//           };
//           break;
//         case "polymorphic":
//           columnOptions.polymorphic = true;
//           break;
//         case "through":
//           columnOptions.through = true;
//           break;
//         default:
//           if (opt.startsWith("default=")) {
//             const value = opt.split("=")[1];
//             // Convert numeric strings to numbers
//             if (!isNaN(value) && value !== "") {
//               columnOptions.defaultValue = Number(value);
//             } else {
//               columnOptions.defaultValue = value;
//             }
//           } else if (opt.startsWith("ref=")) {
//             const [table, column = "id"] = opt.split("=")[1].split(".");
//             columnOptions.references = {
//               table,
//               column,
//               onDelete: "RESTRICT",
//               onUpdate: "RESTRICT",
//             };
//           }
//       }
//     });

//     // Validate new type
//     if (!COLUMN_TYPES[type]) {
//       throw new Error(`Invalid new column type: ${type}`);
//     }

//     return {
//       name,
//       type,
//       options: {
//         ...columnOptions,
//         upConstraints,
//         downConstraints,
//       },
//       fromType,
//     };
//   }

//   validateTypeChange(newType, oldType) {
//     if (!oldType || !newType) return true;
//     if (newType === oldType) return true;
//     const safeChanges = SAFE_TYPE_CHANGES[oldType] || [];
//     if (!safeChanges.includes(newType)) {
//       console.warn(
//         `[WARNING] Changing from ${oldType} to ${newType} might result in data loss.`
//       );
//     }
//     return true;
//   }

//   getConstraintsFromOptions(options) {
//     const constraints = [];
//     if (options.nullable === false) constraints.push("required");
//     if (options.unique) constraints.push("unique");
//     if (options.index) constraints.push("index");
//     return constraints;
//   }

//   parseMigrationName(name) {
//     const handleName = (str) => {
//       // Don't pluralize if the string already ends with 's'
//       const snakeCase = toSnakeCase(str);
//       return snakeCase.endsWith("s") ? snakeCase : pluralize(snakeCase);
//     };

//     // Create table migration
//     const createMatch = name.match(/^Create(.+)$/);
//     if (createMatch) {
//       return {
//         action: "create",
//         tableName: handleName(createMatch[1]),
//       };
//     }

//     // Change column migration
//     const changeMatch = name.match(/^Change(.+)In(.+)$/);
//     if (changeMatch) {
//       return {
//         action: "change",
//         columnName: toSnakeCase(changeMatch[1]),
//         tableName: handleName(changeMatch[2]),
//       };
//     }

//     // Add columns migration
//     const addMatch = name.match(/^Add(.+)To(.+)$/);
//     if (addMatch) {
//       return {
//         action: "add",
//         columnName: toSnakeCase(addMatch[1]),
//         tableName: handleName(addMatch[2]),
//       };
//     }

//     // Remove columns migration
//     const removeMatch = name.match(/^Remove(.+)From(.+)$/);
//     if (removeMatch) {
//       return {
//         action: "remove",
//         columnName: toSnakeCase(removeMatch[1]),
//         tableName: handleName(removeMatch[2]),
//       };
//     }

//     // Rename column migration
//     const renameMatch = name.match(/^Rename(.+)To(.+)In(.+)$/);
//     if (renameMatch) {
//       return {
//         action: "rename",
//         oldName: toSnakeCase(renameMatch[1]),
//         newName: toSnakeCase(renameMatch[2]),
//         tableName: handleName(renameMatch[3]),
//       };
//     }

//     // Drop table migration
//     const dropMatch = name.match(/^Drop(.+)$/);
//     if (dropMatch) {
//       return {
//         action: "drop",
//         tableName: handleName(dropMatch[1]),
//       };
//     }

//     throw new Error("Invalid migration name format");
//   }
// }

// module.exports = {
//   MigrationGenerator,
//   COLUMN_TYPES,
//   SAFE_TYPE_CHANGES,
// };

const path = require("path");
const fs = require("fs").promises;
const { toSnakeCase, pluralize } = require("../../utils/stringUtils");
const { log } = require("../utils/logger");
const {
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
} = require("./templates");

const COLUMN_TYPES = {
  // String types
  string: { name: "string", params: ["length"] },
  text: { name: "text" },
  char: { name: "char", params: ["length"] },
  varchar: { name: "string", params: ["length"] },

  // Numeric types
  integer: { name: "integer" },
  bigInteger: { name: "bigInteger" },
  float: { name: "float", params: ["precision", "scale"] },
  decimal: { name: "decimal", params: ["precision", "scale"] },
  boolean: { name: "boolean" },

  // Date/Time types
  date: { name: "date" },
  datetime: { name: "datetime" },
  time: { name: "time" },
  timestamp: { name: "timestamp" },

  // Special types
  binary: { name: "binary" },
  json: { name: "json" },
  jsonb: { name: "jsonb" },
  uuid: { name: "uuid" },
  enum: { name: "enum", params: ["values"] },

  // Association types
  references: {
    name: "integer",
    params: ["table", "column"],
    modifiers: ["unsigned"],
  },
};

const SAFE_TYPE_CHANGES = {
  string: ["text", "varchar"],
  text: ["string", "varchar"],
  integer: ["bigInteger", "decimal"],
  float: ["decimal"],
  decimal: ["float"],
};

const TEMPLATE_TYPES = {
  CREATE_TABLE: "createTable",
  ADD_COLUMNS: "addColumns",
  REMOVE_COLUMNS: "removeColumns",
  RENAME_COLUMN: "renameColumn",
  CHANGE_COLUMN: "changeColumn",
  DROP_TABLE: "dropTable",
  RENAME_TABLE: "renameTable",
  ADD_INDEX: "addIndex",
  ADD_FOREIGN_KEY: "addForeignKey",
  CREATE_HAS_ONE: "createHasOne",
  ADD_BELONGS_TO: "addBelongsTo",
  CREATE_JOIN_TABLE: "createJoinTable",
  ADD_POLYMORPHIC: "addPolymorphic",
  CREATE_THROUGH_TABLE: "createThroughTable",
};

class ColumnBuilder {
  constructor(name, type, options = {}) {
    this.name = name;
    this.type = type;
    this.options = options;
    this.templateType = options.templateType || TEMPLATE_TYPES.ADD_COLUMNS;
  }

  build() {
    const typeInfo = COLUMN_TYPES[this.type.toLowerCase()];
    if (!typeInfo) {
      throw new Error(`Unknown column type: ${this.type}`);
    }

    let definition;

    // Handle special cases
    if (this.type === "references") {
      definition = this.buildForeignKey();
    } else if (this.type === "decimal") {
      definition = this.buildDecimalColumn(typeInfo);
    } else {
      definition = this.buildStandardColumn(typeInfo);
    }

    return {
      name: this.name,
      definition: definition,
      type: this.type,
      options: this.options,
    };
  }

  buildStandardColumn(typeInfo) {
    let definition = `table.${typeInfo.name}('${this.name}')`;

    // Add type parameters if specified
    if (typeInfo.params && this.options.typeParams) {
      const params = Array.isArray(this.options.typeParams)
        ? this.options.typeParams
        : [this.options.typeParams];
      definition += `(${params.join(", ")})`;
    }

    return this.addModifiers(definition) + ";";
  }

  buildDecimalColumn(typeInfo) {
    const precision = this.options.typeParams?.[0] || 10;
    const scale = this.options.typeParams?.[1] || 2;
    let definition = `table.${typeInfo.name}('${this.name}', ${precision}, ${scale})`;
    return this.addModifiers(definition) + ";";
  }

  buildForeignKey() {
    const referencedTable =
      this.options.typeParams?.[0] || pluralize(this.name);
    let definition = `table.integer('${this.name}_id').unsigned()`;
    definition += `.references('id').inTable('${referencedTable}')`;

    if (this.options.onDelete) {
      definition += `.onDelete('${this.options.onDelete}')`;
    }
    if (this.options.onUpdate) {
      definition += `.onUpdate('${this.options.onUpdate}')`;
    }

    return this.addModifiers(definition) + ";";
  }

  addModifiers(definition) {
    // Add basic modifiers
    if (this.options.nullable === false) definition += ".notNullable()";
    if (this.options.unique) definition += ".unique()";
    if (this.options.index) definition += ".index()";
    if (this.options.primary) definition += ".primary()";
    if (this.options.unsigned && !definition.includes(".unsigned()"))
      definition += ".unsigned()";

    // Add default value if specified
    if (this.options.defaultValue !== undefined) {
      if (typeof this.options.defaultValue === "string") {
        definition += `.defaultTo('${this.options.defaultValue}')`;
      } else {
        definition += `.defaultTo(${this.options.defaultValue})`;
      }
    }

    // Add references if specified (for non-foreign key columns)
    if (this.options.references && this.type !== "references") {
      definition +=
        `.references('${this.options.references.column}')` +
        `.inTable('${this.options.references.table}')`;

      if (this.options.references.onDelete) {
        definition += `.onDelete('${this.options.references.onDelete}')`;
      }
      if (this.options.references.onUpdate) {
        definition += `.onUpdate('${this.options.references.onUpdate}')`;
      }
    }

    return definition;
  }
}

class MigrationGenerator {
  constructor() {
    this.migrationsDir = path.join(process.cwd(), "db", "migrate");
  }

  static currentAction = null;

  async createMigration(name, columns = [], options = {}) {
    await this.ensureMigrationsDir();

    // Parse migration type from name and set action
    const migrationInfo = this.parseMigrationName(name, columns);
    MigrationGenerator.currentAction = migrationInfo.action;

    try {
      // Process columns only if they're strings
      const builtColumns = columns.map((col) => {
        if (typeof col === "string") {
          console.log(`[DEBUG] Processing column string:`, col);
          const parsedColumn = MigrationGenerator.parseColumnString(col);
          const builder = new ColumnBuilder(
            parsedColumn.name,
            parsedColumn.type,
            parsedColumn.options
          );
          return builder.build();
        }
        // If it's already a column object, just build it
        return new ColumnBuilder(col.name, col.type, col.options).build();
      });

      console.log("[DEBUG] Built columns:", builtColumns);

      // Generate migration content
      const content = this.generateMigrationContent(
        migrationInfo,
        builtColumns,
        options
      );

      // Create migration file
      const timestamp = new Date()
        .toISOString()
        .replace(/[^0-9]/g, "")
        .slice(0, 14);
      const filename = `${timestamp}_${name}.js`;
      const filepath = path.join(this.migrationsDir, filename);

      await fs.writeFile(filepath, content);
      console.log("[SUCCESS] Created migration:", filename);
      console.log("[SUCCESS] Migration file created at:", filepath);

      return { filename, filepath };
    } finally {
      MigrationGenerator.currentAction = null;
    }
  }

  getTemplateType(action) {
    switch (action) {
      case "create":
        return TEMPLATE_TYPES.CREATE_TABLE;
      case "add":
        return TEMPLATE_TYPES.ADD_COLUMNS;
      case "remove":
        return TEMPLATE_TYPES.REMOVE_COLUMNS;
      case "rename":
        return TEMPLATE_TYPES.RENAME_COLUMN;
      case "change":
        return TEMPLATE_TYPES.CHANGE_COLUMN;
      case "drop":
        return TEMPLATE_TYPES.DROP_TABLE;
      case "addIndex":
        return TEMPLATE_TYPES.ADD_INDEX;
      case "addForeignKey":
        return TEMPLATE_TYPES.ADD_FOREIGN_KEY;
      case "createHasOne":
        return TEMPLATE_TYPES.CREATE_HAS_ONE;
      case "addBelongsTo":
        return TEMPLATE_TYPES.ADD_BELONGS_TO;
      case "createJoinTable":
        return TEMPLATE_TYPES.CREATE_JOIN_TABLE;
      case "addPolymorphic":
        return TEMPLATE_TYPES.ADD_POLYMORPHIC;
      case "createThrough":
        return TEMPLATE_TYPES.CREATE_THROUGH_TABLE;
      default:
        return TEMPLATE_TYPES.ADD_COLUMNS;
    }
  }

  async ensureMigrationsDir() {
    try {
      await fs.mkdir(this.migrationsDir, { recursive: true });
    } catch (error) {
      if (error.code !== "EEXIST") {
        throw new Error(
          `Failed to create migrations directory: ${error.message}`
        );
      }
    }
  }

  async writeMigrationFile(name, content) {
    const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
    const filename = `${timestamp}_${name}.js`;
    const filepath = path.join(this.migrationsDir, filename);

    await fs.writeFile(filepath, content);
    log.success(`Created migration: ${filename}`);
    log.success(`Migration file created at: ${filepath}`);

    return { filename, filepath };
  }

  generateMigrationContent(migrationInfo, columns, options = {}) {
    console.log("[DEBUG] Migration Info:", migrationInfo);

    // For remove migrations, we need to preserve the column type and constraints
    if (migrationInfo.action === "remove") {
      const columnsWithDownInfo = columns.map((col) => ({
        name: col.name,
        type: col.type,
        options: {
          ...col.options,
          // Move upConstraints to downConstraints for remove migrations
          downConstraints: col.options.upConstraints || [],
        },
      }));
      return removeColumnsTemplate(
        migrationInfo.tableName,
        columnsWithDownInfo
      );
    }

    if (migrationInfo.action === "addForeignKey") {
      console.log("[DEBUG] Generating foreign key migration");
      return addForeignKeyTemplate(
        migrationInfo.tableName,
        migrationInfo.columnName,
        migrationInfo.referenceTable
      );
    }

    // Special handling for index migrations
    if (migrationInfo.action === "addIndex") {
      console.log("[DEBUG] Generating index migration");
      console.log("[DEBUG] Table name:", migrationInfo.tableName);
      console.log("[DEBUG] Column name:", migrationInfo.columnName);

      const indexName = `idx_${migrationInfo.tableName}_${migrationInfo.columnName}`;
      console.log("[DEBUG] Index name:", indexName);

      const columnData = [
        {
          name: migrationInfo.columnName,
        },
      ];
      console.log("[DEBUG] Column data:", columnData);

      const content = addIndexTemplate(
        migrationInfo.tableName,
        columnData,
        indexName
      );
      console.log("[DEBUG] Generated content:", content);

      return content;
    }

    if (migrationInfo.action === "createHasOne") {
      console.log("[DEBUG] Generating has-one migration");
      return createHasOneTemplate(
        migrationInfo.tableName,
        migrationInfo.parentModel,
        migrationInfo.foreignKey,
        columns
      );
    }

    if (migrationInfo.action === "addBelongsTo") {
      console.log("[DEBUG] Generating belongs-to migration");
      const constraintName = `fk_${migrationInfo.tableName}_${migrationInfo.columnName}`;

      return addBelongsToTemplate(
        migrationInfo.tableName,
        migrationInfo.columnName,
        migrationInfo.referenceTable,
        {
          constraintName,
          onDelete: "RESTRICT",
          onUpdate: "RESTRICT",
        }
      );
    }

    const validColumns = columns.map((col) => ({
      name: col.name,
      definition: col.definition,
      type: col.type,
      options: col.options || {},
    }));

    switch (migrationInfo.action) {
      case "create":
        return createTableTemplate(
          migrationInfo.tableName,
          validColumns,
          options
        );
      case "add":
        return addColumnsTemplate(migrationInfo.tableName, validColumns);
      case "remove":
        return removeColumnsTemplate(migrationInfo.tableName, validColumns);
      case "rename":
        return renameColumnTemplate(
          migrationInfo.tableName,
          migrationInfo.oldName,
          migrationInfo.newName
        );
      case "change":
        return changeColumnTemplate(migrationInfo.tableName, validColumns[0]);
      case "drop":
        return dropTableTemplate(migrationInfo.tableName);
      case "addIndex":
        return addIndexTemplate(migrationInfo.tableName, validColumns);
      case "addForeignKey":
        return addForeignKeyTemplate(migrationInfo.tableName, validColumns[0]);
      case "createHasOne":
        return createHasOneTemplate(migrationInfo.tableName, validColumns[0]);
      case "addBelongsTo":
        return addBelongsToTemplate(migrationInfo.tableName, validColumns[0]);
      case "createJoinTable":
        return createJoinTableTemplate(migrationInfo.tableName, validColumns);
      case "addPolymorphic":
        return addPolymorphicTemplate(migrationInfo.tableName, validColumns[0]);
      case "createThrough":
        return createThroughTableTemplate(
          migrationInfo.tableName,
          validColumns
        );
      default:
        throw new Error(`Unknown migration action: ${migrationInfo.action}`);
    }
  }

  static parseColumnString(columnStr) {
    console.log("[DEBUG] Starting parseColumnString:", {
      columnStr,
      currentAction: MigrationGenerator.currentAction,
    });

    const [name, type = "string", ...options] = columnStr.split(":");
    console.log("[DEBUG] Parsed column parts:", {
      name,
      type,
      options,
      currentAction: MigrationGenerator.currentAction,
    });

    // Special handling for references type
    if (type === "references") {
      const referencedTable = options[0] || pluralize(name);
      return {
        name: `${name}_id`,
        type: "integer",
        options: {
          unsigned: true,
          references: {
            table: referencedTable,
            column: "id",
            onDelete: "RESTRICT",
            onUpdate: "RESTRICT",
          },
        },
      };
    }

    // Initialize options and constraints
    const columnOptions = {};
    let fromType = null;
    const upConstraints = [];
    const downConstraints = [];
    let beforeFromOptions = [];
    let afterFromOptions = [];
    let foundFrom = false;

    // Separate options before and after 'from' keyword
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      if (!opt) continue;

      if (opt === "from") {
        foundFrom = true;
        if (i + 1 < options.length) {
          fromType = options[i + 1];
          i++; // Skip the next item (fromType)
        }
      } else {
        if (foundFrom) {
          afterFromOptions.push(opt);
        } else {
          beforeFromOptions.push(opt);
        }
      }
    }

    // Process options based on current action
    const optionsToProcess =
      MigrationGenerator.currentAction === "remove"
        ? options // For remove, all options go to down migration
        : beforeFromOptions;

    optionsToProcess.forEach((opt) => {
      switch (opt) {
        case "required":
          columnOptions.nullable = false;
          if (MigrationGenerator.currentAction === "remove") {
            downConstraints.push(opt);
          } else {
            upConstraints.push(opt);
          }
          break;
        case "unique":
          columnOptions.unique = true;
          if (MigrationGenerator.currentAction === "remove") {
            downConstraints.push(opt);
          } else {
            upConstraints.push(opt);
          }
          break;
        case "index":
          columnOptions.index = true;
          if (MigrationGenerator.currentAction === "remove") {
            downConstraints.push(opt);
          } else {
            upConstraints.push(opt);
          }
          break;
        case "unsigned":
          columnOptions.unsigned = true;
          break;
        case "foreign":
          MigrationGenerator.handleForeignOption(name, columnOptions);
          if (MigrationGenerator.currentAction === "remove") {
            downConstraints.push(opt);
          } else {
            upConstraints.push(opt);
          }
          break;
        default:
          if (opt.startsWith("default=")) {
            const value = opt.split("=")[1];
            columnOptions.defaultValue =
              !isNaN(value) && value !== "" ? Number(value) : value;
          } else if (opt.startsWith("ref=")) {
            const [table, column = "id"] = opt.split("=")[1].split(".");
            columnOptions.references = {
              table,
              column,
              onDelete: "RESTRICT",
              onUpdate: "RESTRICT",
            };
          }
      }
    });

    // Process 'after from' options for down constraints in change migrations
    if (MigrationGenerator.currentAction === "change") {
      afterFromOptions.forEach((opt) => {
        switch (opt) {
          case "required":
          case "unique":
          case "index":
            downConstraints.push(opt);
            break;
        }
      });
    }

    // Validate type
    if (!COLUMN_TYPES[type.toLowerCase()]) {
      throw new Error(`Invalid column type: ${type}`);
    }

    return {
      name,
      type,
      options: {
        ...columnOptions,
        upConstraints,
        downConstraints,
      },
      fromType,
    };
  }

  static handleForeignOption(name, columnOptions) {
    const tableName = name.replace(/_id$/, "s");
    columnOptions.unsigned = true;
    columnOptions.references = {
      table: tableName,
      column: "id",
      onDelete: "RESTRICT",
      onUpdate: "RESTRICT",
    };
  }

  validateTypeChange(newType, oldType) {
    if (!oldType || !newType) return true;
    if (newType === oldType) return true;

    const safeChanges = SAFE_TYPE_CHANGES[oldType] || [];
    if (!safeChanges.includes(newType)) {
      console.warn(
        `[WARNING] Changing from ${oldType} to ${newType} might result in data loss.`
      );
    }
    return true;
  }

  // parseMigrationName(name, columns = []) {
  //   console.log("[DEBUG] Parsing migration name:", name);
  //   console.log("[DEBUG] With columns:", columns);

  //   const handleName = (str) => {
  //     // Don't pluralize if the string already ends with 's'
  //     console.log("[DEBUG] Handling name:", str);
  //     const snakeCase = toSnakeCase(str);
  //     console.log("[DEBUG] Snake case:", snakeCase);
  //     const result = snakeCase.endsWith("s") ? snakeCase : pluralize(snakeCase);
  //     console.log("[DEBUG] Final result:", result);
  //     return result;
  //   };

  //   // Create has one migration
  //   const createHasOneMatch = name.match(/^CreateHasOne(.+)For(.+)$/);
  //   if (createHasOneMatch) {
  //     const relationName = toSnakeCase(createHasOneMatch[1]);
  //     const parentModel = toSnakeCase(createHasOneMatch[2]);

  //     console.log("[DEBUG] Has One relationship details:", {
  //       relationName,
  //       parentModel,
  //     });

  //     return {
  //       action: "createHasOne",
  //       tableName: pluralize(relationName), // Use plural form for table name
  //       parentModel: pluralize(parentModel),
  //       foreignKey: `${parentModel}_id`,
  //     };
  //   }

  //   // Create table migration
  //   const createMatch = name.match(/^Create(.+)$/);
  //   if (createMatch) {
  //     return {
  //       action: "create",
  //       tableName: handleName(createMatch[1]),
  //     };
  //   }

  //   // Change column migration
  //   const changeMatch = name.match(/^Change(.+)In(.+)$/);
  //   if (changeMatch) {
  //     return {
  //       action: "change",
  //       columnName: toSnakeCase(changeMatch[1]),
  //       tableName: handleName(changeMatch[2]),
  //     };
  //   }

  //   // Add belongs to migration
  //   const addBelongsToMatch = name.match(/^Add(.+)To(.+)$/);
  //   if (addBelongsToMatch && this.hasReferencesColumn(columns)) {
  //     console.log("[DEBUG] Belongs To match found:", addBelongsToMatch);

  //     const relationName = handleName(addBelongsToMatch[1]); // e.g., "author"
  //     const tableName = handleName(addBelongsToMatch[2]); // e.g., "posts"
  //     const columnName = `${relationName}_id`; // e.g., "author_id"
  //     const referenceTable = columns[0].name + "s"; // e.g., "users"

  //     console.log("[DEBUG] Belongs To relationship details:", {
  //       relationName,
  //       tableName,
  //       columnName,
  //       referenceTable,
  //     });

  //     return {
  //       action: "addBelongsTo",
  //       tableName: pluralize(tableName),
  //       columnName,
  //       referenceTable,
  //     };
  //   }

  //   // Add index migration
  //   const addIndexMatch = name.match(
  //     /^AddIndexTo([A-Z][a-z]+)([A-Z][a-zA-Z]+)$/
  //   );
  //   if (addIndexMatch) {
  //     console.log("[DEBUG] Index match found:", addIndexMatch);

  //     const tableName = handleName(addIndexMatch[1]);
  //     const columnName = toSnakeCase(addIndexMatch[2]);

  //     console.log("[DEBUG] Index migration details:");
  //     console.log("  Table:", tableName);
  //     console.log("  Column:", columnName);

  //     const migrationInfo = {
  //       action: "addIndex",
  //       tableName,
  //       columnName,
  //     };

  //     console.log("[DEBUG] Migration info:", migrationInfo);
  //     return migrationInfo;
  //   }

  //   // Add foreign key migration
  //   const addForeignKeyMatch = name.match(/^AddForeignKeyTo(\w+?)([A-Z]\w+)$/);
  //   if (addForeignKeyMatch) {
  //     const tableName = handleName(addForeignKeyMatch[1]);
  //     const columnName = toSnakeCase(addForeignKeyMatch[2]);
  //     const referenceTable = pluralize(columnName.replace(/_id$/, ""));

  //     console.log("[DEBUG] Foreign key details:", {
  //       tableName,
  //       columnName,
  //       referenceTable,
  //     });

  //     return {
  //       action: "addForeignKey",
  //       tableName,
  //       columnName,
  //       referenceTable,
  //     };
  //   }

  //   // Add columns migration
  //   const addMatch = name.match(/^Add(?!IndexTo)(.+)To(.+)$/);
  //   if (addMatch && !this.hasReferencesColumn(columns)) {
  //     return {
  //       action: "add",
  //       columnName: toSnakeCase(addMatch[1]),
  //       tableName: handleName(addMatch[2]),
  //     };
  //   }

  //   // Remove columns migration
  //   const removeMatch = name.match(/^Remove(.+)From(.+)$/);
  //   if (removeMatch) {
  //     return {
  //       action: "remove",
  //       columnName: toSnakeCase(removeMatch[1]),
  //       tableName: handleName(removeMatch[2]),
  //     };
  //   }

  //   // Rename column migration
  //   const renameMatch = name.match(/^Rename(.+)To(.+)In(.+)$/);
  //   if (renameMatch) {
  //     return {
  //       action: "rename",
  //       oldName: toSnakeCase(renameMatch[1]),
  //       newName: toSnakeCase(renameMatch[2]),
  //       tableName: handleName(renameMatch[3]),
  //     };
  //   }

  //   // Drop table migration
  //   const dropMatch = name.match(/^Drop(.+)$/);
  //   if (dropMatch) {
  //     return {
  //       action: "drop",
  //       tableName: handleName(dropMatch[1]),
  //     };
  //   }

  //   // Create join table migration
  //   const createJoinTableMatch = name.match(/^CreateJoinTable(.+)And(.+)$/);
  //   if (createJoinTableMatch) {
  //     return {
  //       action: "createJoinTable",
  //       table1: handleName(createJoinTableMatch[1]),
  //       table2: handleName(createJoinTableMatch[2]),
  //     };
  //   }

  //   throw new Error("Invalid migration name format");
  // }

  parseMigrationName(name, columns = []) {
    console.log("[DEBUG] Parsing migration name:", name);
    console.log("[DEBUG] With columns:", columns);

    const handleName = (str) => {
      console.log("[DEBUG] Handling name:", str);
      const snakeCase = toSnakeCase(str);
      console.log("[DEBUG] Snake case:", snakeCase);
      const result = snakeCase.endsWith("s") ? snakeCase : pluralize(snakeCase);
      console.log("[DEBUG] Final result:", result);
      return result;
    };

    // Collect all possible matches
    const matches = {
      hasOne: name.match(/^CreateHasOne(.+)For(.+)$/),
      create: name.match(/^Create(.+)$/),
      change: name.match(/^Change(.+)In(.+)$/),
      addBelongsTo: name.match(/^Add(.+)To(.+)$/),
      addIndex: name.match(/^AddIndexTo([A-Z][a-z]+)([A-Z][a-zA-Z]+)$/),
      addForeignKey: name.match(/^AddForeignKeyTo(\w+?)([A-Z]\w+)$/),
      add: name.match(/^Add(?!IndexTo)(.+)To(.+)$/),
      remove: name.match(/^Remove(.+)From(.+)$/),
      rename: name.match(/^Rename(.+)To(.+)In(.+)$/),
      drop: name.match(/^Drop(.+)$/),
      createJoin: name.match(/^CreateJoinTable(.+)And(.+)$/),
    };

    // Check for belongs-to relationship first
    if (matches.addBelongsTo && this.hasReferencesColumn(columns)) {
      console.log("[DEBUG] Belongs To match found:", matches.addBelongsTo);

      const relationName = toSnakeCase(matches.addBelongsTo[1]); // e.g., "author"
      const tableName = handleName(matches.addBelongsTo[2]); // e.g., "posts"
      const columnName = `${relationName}_id`; // e.g., "author_id"

      // Get the reference table from the column definition
      const referenceColumn = columns[0];
      const referenceTable =
        typeof referenceColumn === "string"
          ? pluralize(referenceColumn.split(":")[0])
          : pluralize(referenceColumn.name.replace(/_id$/, ""));

      console.log("[DEBUG] Belongs To relationship details:", {
        relationName,
        tableName,
        columnName,
        referenceTable,
      });

      return {
        action: "addBelongsTo",
        tableName,
        columnName,
        referenceTable,
      };
    }

    // Then check other matches in order of specificity
    if (matches.hasOne) {
      const relationName = toSnakeCase(matches.hasOne[1]);
      const parentModel = toSnakeCase(matches.hasOne[2]);

      console.log("[DEBUG] Has One relationship details:", {
        relationName,
        parentModel,
      });

      return {
        action: "createHasOne",
        tableName: pluralize(relationName),
        parentModel: pluralize(parentModel),
        foreignKey: `${parentModel}_id`,
      };
    }

    if (matches.create) {
      return {
        action: "create",
        tableName: handleName(matches.create[1]),
      };
    }

    if (matches.change) {
      return {
        action: "change",
        columnName: toSnakeCase(matches.change[1]),
        tableName: handleName(matches.change[2]),
      };
    }

    if (matches.addIndex) {
      const tableName = handleName(matches.addIndex[1]);
      const columnName = toSnakeCase(matches.addIndex[2]);

      console.log("[DEBUG] Index migration details:");
      console.log("  Table:", tableName);
      console.log("  Column:", columnName);

      return {
        action: "addIndex",
        tableName,
        columnName,
      };
    }

    if (matches.addForeignKey) {
      const tableName = handleName(matches.addForeignKey[1]);
      const columnName = toSnakeCase(matches.addForeignKey[2]);
      const referenceTable = pluralize(columnName.replace(/_id$/, ""));

      console.log("[DEBUG] Foreign key details:", {
        tableName,
        columnName,
        referenceTable,
      });

      return {
        action: "addForeignKey",
        tableName,
        columnName,
        referenceTable,
      };
    }

    if (matches.add && !this.hasReferencesColumn(columns)) {
      return {
        action: "add",
        columnName: toSnakeCase(matches.add[1]),
        tableName: handleName(matches.add[2]),
      };
    }

    if (matches.remove) {
      return {
        action: "remove",
        columnName: toSnakeCase(matches.remove[1]),
        tableName: handleName(matches.remove[2]),
      };
    }

    if (matches.rename) {
      return {
        action: "rename",
        oldName: toSnakeCase(matches.rename[1]),
        newName: toSnakeCase(matches.rename[2]),
        tableName: handleName(matches.rename[3]),
      };
    }

    if (matches.drop) {
      return {
        action: "drop",
        tableName: handleName(matches.drop[1]),
      };
    }

    if (matches.createJoin) {
      return {
        action: "createJoinTable",
        table1: handleName(matches.createJoin[1]),
        table2: handleName(matches.createJoin[2]),
      };
    }

    throw new Error("Invalid migration name format");
  }

  hasReferencesColumn(columns) {
    return columns.some((col) => {
      if (typeof col === "string") {
        const parts = col.split(":");
        return parts[1] === "references";
      }
      return (
        col.type === "references" ||
        (col.options && col.options.references) ||
        (col.definition && col.definition.includes("references"))
      );
    });
  }
}

// Export the necessary classes and constants
module.exports = {
  MigrationGenerator,
  COLUMN_TYPES,
  SAFE_TYPE_CHANGES,
  TEMPLATE_TYPES,
};
