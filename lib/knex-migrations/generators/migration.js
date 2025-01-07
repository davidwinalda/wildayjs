// const path = require("path");
// const fs = require("fs").promises;
// const { log } = require("../utils/logger");
// const {
//   createTableTemplate,
//   addColumnsTemplate,
//   removeColumnsTemplate,
//   renameColumnTemplate,
//   changeColumnTemplate,
//   dropTableTemplate,
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
// };

// class ColumnBuilder {
//   constructor(name, type, options = {}) {
//     this.name = name;
//     this.type = type;
//     this.options = options;
//   }

//   build() {
//     const typeInfo = COLUMN_TYPES[this.type.toLowerCase()];
//     if (!typeInfo) {
//       throw new Error(`Unknown column type: ${this.type}`);
//     }

//     let definition = `table.${typeInfo.name}('${this.name}')`;

//     // Add type parameters if any
//     if (typeInfo.params && this.options.typeParams) {
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

//     if (this.options.references) {
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
//     };
//   }
// }

// class MigrationGenerator {
//   constructor() {
//     this.migrationsDir = path.join(process.cwd(), "db", "migrate");
//   }

//   async createMigration(name, columns = [], options = {}) {
//     await this.ensureMigrationsDir();

//     const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
//     const filename = `${timestamp}_${name}.js`;
//     const filepath = path.join(this.migrationsDir, filename);

//     // Parse migration type from name
//     const migrationInfo = this.parseMigrationName(name);

//     // Build columns
//     const builtColumns = columns.map((col) => {
//       const builder = new ColumnBuilder(col.name, col.type, col.options);
//       return builder.build();
//     });

//     // Generate content based on migration type
//     let content;
//     switch (migrationInfo.action) {
//       case "create":
//         content = createTableTemplate(
//           migrationInfo.tableName,
//           builtColumns,
//           options
//         );
//         break;
//       case "add":
//         content = addColumnsTemplate(migrationInfo.tableName, builtColumns);
//         break;
//       case "remove":
//         content = removeColumnsTemplate(
//           migrationInfo.tableName,
//           migrationInfo.columnName
//         );
//         break;
//       case "rename":
//         content = renameColumnTemplate(
//           migrationInfo.tableName,
//           migrationInfo.fromColumn,
//           migrationInfo.toColumn
//         );
//         break;
//       case "change":
//         content = changeColumnTemplate(
//           migrationInfo.tableName,
//           migrationInfo.columnName,
//           builtColumns[0]
//         );
//         break;
//       case "drop":
//         content = dropTableTemplate(migrationInfo.tableName);
//         break;
//       default:
//         throw new Error("Invalid migration name format");
//     }

//     // Write migration file
//     await fs.writeFile(filepath, content);
//     log.success(`Created migration: ${filename}`);

//     return filepath;
//   }

//   parseMigrationName(name) {
//     const patterns = {
//       create: /^[Cc]reate_?(\w+)$/,
//       add: /^[Aa]dd_?(\w+)_?[Tt]o_?(\w+)$/,
//       remove: /^[Rr]emove_?(\w+)_?[Ff]rom_?(\w+)$/,
//       rename: /^[Rr]ename_?(\w+)_?[Tt]o_?(\w+)_?[Ii]n_?(\w+)$/,
//       change: /^[Cc]hange_?(\w+)_?[Ii]n_?(\w+)$/,
//       drop: /^[Dd]rop_?(\w+)$/,
//     };

//     for (const [action, pattern] of Object.entries(patterns)) {
//       const match = name.match(pattern);
//       if (match) {
//         switch (action) {
//           case "create":
//             return { action, tableName: match[1].toLowerCase() };
//           case "add":
//             return {
//               action,
//               columnName: match[1].toLowerCase(),
//               tableName: match[2].toLowerCase(),
//             };
//           case "remove":
//             return {
//               action,
//               columnName: match[1].toLowerCase(),
//               tableName: match[2].toLowerCase(),
//             };
//           case "rename":
//             return {
//               action,
//               fromColumn: match[1].toLowerCase(),
//               toColumn: match[2].toLowerCase(),
//               tableName: match[3].toLowerCase(),
//             };
//           case "change":
//             return {
//               action,
//               columnName: match[1].toLowerCase(),
//               tableName: match[2].toLowerCase(),
//             };
//           case "drop":
//             return { action, tableName: match[1].toLowerCase() };
//         }
//       }
//     }

//     // Legacy support for old format
//     if (name.startsWith("create_")) {
//       return {
//         action: "create",
//         tableName: name.replace("create_", ""),
//       };
//     } else if (name.startsWith("add_") && name.includes("_to_")) {
//       return {
//         action: "add",
//         tableName: name.match(/to_(\w+)/)[1],
//         columnName: name.match(/add_(\w+)_to/)[1],
//       };
//     }

//     throw new Error("Invalid migration name format");
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

//   static parseColumnString(columnStr) {
//     const [name, type, ...options] = columnStr.split(":");
//     const columnOptions = {};

//     options.forEach((opt) => {
//       switch (opt) {
//         case "required":
//           columnOptions.nullable = false;
//           break;
//         case "unique":
//           columnOptions.unique = true;
//           break;
//         case "index":
//           columnOptions.index = true;
//           break;
//         case "unsigned":
//           columnOptions.unsigned = true;
//           break;
//         default:
//           if (opt.startsWith("default=")) {
//             columnOptions.defaultValue = opt.split("=")[1];
//           } else if (opt.startsWith("ref=")) {
//             const [table, column = "id"] = opt.split("=")[1].split(".");
//             columnOptions.references = {
//               table,
//               column,
//               onDelete: "CASCADE",
//               onUpdate: "CASCADE",
//             };
//           }
//       }
//     });

//     return {
//       name,
//       type,
//       options: columnOptions,
//     };
//   }
// }

// module.exports = {
//   MigrationGenerator,
//   COLUMN_TYPES,
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

class ColumnBuilder {
  constructor(name, type, options = {}) {
    this.name = name;
    this.type = type;
    this.options = options;
  }

  build() {
    // Special handling for references type
    if (this.type === "references") {
      this.name = `${this.name}_id`;
      this.type = "integer";
      this.options.unsigned = true;
    }

    const typeInfo = COLUMN_TYPES[this.type.toLowerCase()];
    if (!typeInfo) {
      throw new Error(`Unknown column type: ${this.type}`);
    }

    // Handle decimal type differently
    if (this.type === "decimal") {
      let definition = `table.${typeInfo.name}('${this.name}', ${
        this.options.typeParams?.[0] || 10
      }, ${this.options.typeParams?.[1] || 2})`;

      // Add modifiers
      if (this.options.nullable === false) definition += ".notNullable()";
      if (this.options.unique) definition += ".unique()";
      if (this.options.index) definition += ".index()";
      if (this.options.primary) definition += ".primary()";
      if (this.options.unsigned) definition += ".unsigned()";

      if (this.options.defaultValue !== undefined) {
        if (typeof this.options.defaultValue === "string") {
          definition += `.defaultTo('${this.options.defaultValue}')`;
        } else {
          definition += `.defaultTo(${this.options.defaultValue})`;
        }
      }

      return {
        name: this.name,
        definition: definition + ";",
      };
    }

    // Handle other types
    let definition = `table.${typeInfo.name}('${this.name}')`;

    // Add type parameters if any (for non-decimal types)
    if (typeInfo.params && this.options.typeParams && this.type !== "decimal") {
      const params = Array.isArray(this.options.typeParams)
        ? this.options.typeParams
        : [this.options.typeParams];
      definition += `(${params.join(", ")})`;
    }

    // Add modifiers
    if (this.options.nullable === false) definition += ".notNullable()";
    if (this.options.unique) definition += ".unique()";
    if (this.options.index) definition += ".index()";
    if (this.options.primary) definition += ".primary()";
    if (this.options.unsigned) definition += ".unsigned()";

    if (this.options.defaultValue !== undefined) {
      if (typeof this.options.defaultValue === "string") {
        definition += `.defaultTo('${this.options.defaultValue}')`;
      } else {
        definition += `.defaultTo(${this.options.defaultValue})`;
      }
    }

    // Enhanced references handling
    if (this.options.references) {
      if (!this.options.unsigned) {
        definition += `.unsigned()`; // Always unsigned for foreign keys
      }

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

    return {
      name: this.name,
      definition: definition + ";",
    };
  }
}

class MigrationGenerator {
  constructor() {
    this.migrationsDir = path.join(process.cwd(), "db", "migrate");
  }

  async createMigration(name, columns = [], options = {}) {
    await this.ensureMigrationsDir();

    const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
    const filename = `${timestamp}_${name}.js`;
    const filepath = path.join(this.migrationsDir, filename);

    // Parse migration type from name
    const migrationInfo = this.parseMigrationName(name);

    console.log("Migration Info:", migrationInfo); // Debug log

    // Build columns
    const builtColumns = columns.map((col) => {
      const builder = new ColumnBuilder(col.name, col.type, col.options);
      return builder.build();
    });

    // Generate content based on migration type
    let content;
    switch (migrationInfo.action) {
      case "create":
        content = createTableTemplate(
          migrationInfo.tableName,
          builtColumns,
          options
        );
        break;
      case "add":
        content = addColumnsTemplate(migrationInfo.tableName, builtColumns);
        break;
      case "remove":
        console.log("Entering remove case");
        console.log("Columns to remove:", columns);

        // Handle multiple columns
        const columnsToRemove =
          columns.length > 0
            ? columns.map((col) => ({
                name: col.name,
                type: col.type || "string",
                constraints: this.getConstraintsFromOptions(col.options || {}),
              }))
            : [
                {
                  name: migrationInfo.columnName,
                  type: "string",
                  constraints: [],
                },
              ];

        console.log("Processed columns:", columnsToRemove);

        content = removeColumnsTemplate(
          migrationInfo.tableName,
          columnsToRemove
        );
        break;
      case "rename_column":
        content = renameColumnTemplate(
          migrationInfo.tableName,
          migrationInfo.fromColumn,
          migrationInfo.toColumn
        );
        break;
      case "rename_table":
        content = renameTableTemplate(
          migrationInfo.fromTable,
          migrationInfo.toTable
        );
        break;
      case "change":
        content = changeColumnTemplate(
          migrationInfo.tableName,
          migrationInfo.columnName,
          builtColumns[0]
        );
        break;
      case "drop":
        content = dropTableTemplate(migrationInfo.tableName);
        break;
      case "add_index":
        content = addIndexTemplate(
          migrationInfo.tableName,
          [migrationInfo.columnName],
          `index_${migrationInfo.tableName}_on_${migrationInfo.columnName}`
        );
        break;
      case "add_foreign_key":
        const foreignKeyInfo = builtColumns[0]?.options?.references;
        if (!foreignKeyInfo) {
          throw new Error("Foreign key information is required");
        }
        content = addForeignKeyTemplate(
          migrationInfo.tableName,
          migrationInfo.columnName,
          foreignKeyInfo.table,
          foreignKeyInfo.column
        );
        break;
      case "create_has_one":
        console.log("Using create_has_one template");
        content = createHasOneTemplate(
          migrationInfo.tableName,
          migrationInfo.parentTable,
          { columns: builtColumns, ...options }
        );
        break;
      case "add_belongs_to":
        content = addBelongsToTemplate(
          migrationInfo.tableName,
          migrationInfo.parentTable,
          options
        );
        break;
      case "create_join":
        content = createJoinTableTemplate(
          migrationInfo.table1,
          migrationInfo.table2,
          { columns: builtColumns, ...options }
        );
        break;
      case "add_polymorphic":
        content = addPolymorphicTemplate(
          migrationInfo.tableName,
          migrationInfo.polymorphicName,
          { columns: builtColumns, ...options }
        );
        break;
      case "create_through":
        content = createThroughTableTemplate(
          migrationInfo.throughTable,
          migrationInfo.sourceTable,
          migrationInfo.targetTable,
          { columns: builtColumns, ...options }
        );
        break;
      default:
        throw new Error("Invalid migration type");
    }

    // Write migration file
    await fs.writeFile(filepath, content);
    log.success(`Created migration: ${filename}`);

    return filepath;
  }

  parseMigrationName(name) {
    const patterns = {
      create_has_one:
        /^[Cc]reate_?([A-Z]\w+|[a-z]\w+)_?[Ff]or_?([A-Z]\w+|[a-z]\w+)$/,
      create: /^[Cc]reate_?([A-Z]\w+|[a-z]\w+)_?([A-Z]\w+|[a-z]\w+)?$/,
      add: /^[Aa]dd_?([A-Z]\w+|[a-z]\w+)_?[Tt]o_?([A-Z]\w+|[a-z]\w+)$/,
      remove: /^[Rr]emove_?([A-Z]\w+|[a-z]\w+)_?[Ff]rom_?([A-Z]\w+|[a-z]\w+)$/,
      rename_column:
        /^[Rr]ename_?([A-Z]\w+|[a-z]\w+)_?[Tt]o_?([A-Z]\w+|[a-z]\w+)_?[Ii]n_?([A-Z]\w+|[a-z]\w+)$/,
      rename_table:
        /^[Rr]ename_?([A-Z]\w+|[a-z]\w+)_?[Tt]o_?([A-Z]\w+|[a-z]\w+)$/,
      change: /^[Cc]hange_?([A-Z]\w+|[a-z]\w+)_?[Ii]n_?([A-Z]\w+|[a-z]\w+)$/,
      drop: /^[Dd]rop_?([A-Z]\w+|[a-z]\w+)$/,
      add_index:
        /^[Aa]dd_?[Ii]ndex_?[Tt]o_?([A-Z]\w+|[a-z]\w+)_?([A-Z]\w+|[a-z]\w+)$/,
      add_foreign_key:
        /^[Aa]dd_?[Ff]oreign_?[Kk]ey_?([A-Z]\w+|[a-z]\w+)_?[Tt]o_?([A-Z]\w+|[a-z]\w+)$/,
      add_belongs_to:
        /^[Aa]dd_?([A-Z]\w+|[a-z]\w+)_?[Tt]o_?([A-Z]\w+|[a-z]\w+)$/,
      create_join: /^[Cc]reate_?([A-Z]\w+|[a-z]\w+)_?([A-Z]\w+|[a-z]\w+)$/,
      add_polymorphic:
        /^[Aa]dd_?([A-Z]\w+|[a-z]\w+)able_?[Tt]o_?([A-Z]\w+|[a-z]\w+)$/,
      create_through:
        /^[Cc]reate_?([A-Z]\w+|[a-z]\w+)_?[Ff]or_?([A-Z]\w+|[a-z]\w+)_?[Aa]nd_?([A-Z]\w+|[a-z]\w+)$/,
    };

    for (const [action, pattern] of Object.entries(patterns)) {
      const match = name.match(pattern);
      if (match) {
        // Helper function to handle naming convention
        const handleName = (str) =>
          /[A-Z]/.test(str) ? toSnakeCase(str) : str.toLowerCase();

        switch (action) {
          case "create_has_one":
            return {
              action: "create_has_one",
              tableName: handleName(match[1]) + "s",
              parentTable: handleName(match[2]) + "s",
            };
          case "create":
            // Handle both single and compound names
            const tableName = match[2]
              ? handleName(match[1] + match[2]) // CreateUserProfile -> user_profiles
              : handleName(match[1]); // CreateUser -> users
            return { action, tableName };
          case "add":
            return {
              action:
                match[1].includes("_id") || /ID$/.test(match[1])
                  ? "add_foreign_key"
                  : "add",
              columnName: handleName(match[1]),
              tableName: handleName(match[2]),
            };
          case "remove":
            return {
              action: "remove",
              columnName: handleName(match[1]),
              tableName: handleName(match[2]),
            };
          case "rename_column":
            return {
              action: "rename_column",
              fromColumn: handleName(match[1]),
              toColumn: handleName(match[2]),
              tableName: handleName(match[3]),
            };
          case "rename_table":
            return {
              action: "rename_table",
              fromTable: handleName(match[1]),
              toTable: handleName(match[2]),
            };
          case "change":
            return {
              action: "change",
              columnName: handleName(match[1]),
              tableName: handleName(match[2]),
            };
          case "drop":
            return {
              action: "drop",
              tableName: handleName(match[1]),
            };
          case "add_index":
            return {
              action: "add_index",
              tableName: handleName(match[1]),
              columnName: handleName(match[2]),
            };
          case "add_belongs_to":
            if (match[1].toLowerCase().endsWith("able")) {
              return {
                action: "add_polymorphic",
                polymorphicName: handleName(match[1]),
                tableName: handleName(match[2]),
              };
            }
            return {
              action: "add_belongs_to",
              parentTable: handleName(match[1]),
              tableName: handleName(match[2]),
            };
          case "create_join":
            return {
              action: "create_join",
              table1: handleName(match[1]),
              table2: handleName(match[2]),
            };
          case "create_through":
            return {
              action: "create_through",
              throughTable: handleName(match[1]),
              sourceTable: handleName(match[2]),
              targetTable: handleName(match[3]),
            };
        }
      }
    }

    throw new Error("Invalid migration name format");
  }

  async ensureMigrationsDir() {
    try {
      await fs.mkdir(this.migrationsDir, { recursive: true });
    } catch (error) {
      throw new Error(
        `Failed to create migrations directory: ${error.message}`
      );
    }
  }

  static parseColumnString(columnStr) {
    const [name, type = "string", ...options] = columnStr.split(":");
    const columnOptions = {};

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

    // Handle decimal precision
    if (type === "decimal") {
      columnOptions.typeParams = [10, 2]; // Default: 10 digits with 2 decimal places
    }

    options.forEach((opt) => {
      switch (opt) {
        case "required":
          columnOptions.nullable = false;
          break;
        case "unique":
          columnOptions.unique = true;
          break;
        case "index":
          columnOptions.index = true;
          break;
        case "unsigned":
          columnOptions.unsigned = true;
          break;
        case "foreign":
          // Convert 'foreign' to proper references format
          const tableName = name.replace(/_id$/, "s"); // Convert user_id to users
          columnOptions.unsigned = true;
          columnOptions.references = {
            table: tableName,
            column: "id",
            onDelete: "RESTRICT",
            onUpdate: "RESTRICT",
          };
          break;
        case "references":
        case "belongs_to":
          columnOptions.unsigned = true;
          columnOptions.references = {
            table: type, // In this case, type is the table name
            column: "id",
            onDelete: "RESTRICT",
            onUpdate: "RESTRICT",
          };
          break;
        case "polymorphic":
          columnOptions.polymorphic = true;
          break;
        case "through":
          columnOptions.through = true;
          break;
        default:
          if (opt.startsWith("default=")) {
            const value = opt.split("=")[1];
            // Convert numeric strings to numbers
            if (!isNaN(value) && value !== "") {
              columnOptions.defaultValue = Number(value);
            } else {
              columnOptions.defaultValue = value;
            }
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

    return {
      name,
      type,
      options: columnOptions,
    };
  }

  getConstraintsFromOptions(options) {
    const constraints = [];
    if (options.nullable === false) constraints.push("required");
    if (options.unique) constraints.push("unique");
    if (options.index) constraints.push("index");
    return constraints;
  }
}

module.exports = {
  MigrationGenerator,
  COLUMN_TYPES,
};
