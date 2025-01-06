// const path = require("path");
// const { AdapterFactory } = require("./adapters");
// const { getTypeMappings } = require("./config/typeMapping");
// const { getDatabaseConfig } = require("./config/database");
// const SQLTemplates = require("./helpers/sqlTemplates");
// const {
//   addColumnsMigration,
// } = require("./generators/sqlGenerators/addColumnsMigration");
// const {
//   renameColumnMigration,
// } = require("./generators/sqlGenerators/renameColumnMigration");
// const {
//   changeColumnMigration,
// } = require("./generators/sqlGenerators/changeColumnMigration");
// const { parseMigrationName } = require("./utils/migrationNameParser");
// const connectionManager = require("../database/connectionManager");

// class MigrationGenerator {
//   constructor(migrationName, columns, options = {}) {
//     this.originalName = migrationName;
//     this.migrationName = this.extractTableName(migrationName);
//     this.columns = columns;

//     // Get database configuration first
//     this.dbConfig = getDatabaseConfig();

//     this.options = {
//       dbType: this.dbConfig.database?.development?.client || "sqlite",
//       connection: null,
//       ...options,
//     };
//   }

//   async initialize() {
//     console.log("Initializing MigrationGenerator...");

//     try {
//       // Get database connection
//       const connection =
//         this.options.connection || (await connectionManager.getConnection());

//       // Determine the correct database type
//       const dbType =
//         this.dbConfig.database?.development?.client || this.options.dbType;
//       console.log("Database type:", dbType);

//       // Initialize adapter with connection and config
//       this.adapter = await AdapterFactory.create(dbType, connection);

//       if (!this.adapter) {
//         throw new Error(
//           `Failed to create adapter for database type: ${dbType}`
//         );
//       }

//       // Set adapter type explicitly
//       this.adapter.type = dbType;

//       console.log("Adapter created successfully:", {
//         type: dbType,
//         adapterName: this.adapter.constructor.name,
//         methods: Object.getOwnPropertyNames(
//           Object.getPrototypeOf(this.adapter)
//         ),
//       });

//       // Initialize helpers after adapter is created
//       this.typeMappings = getTypeMappings(this.adapter);
//       this.sqlTemplates = new SQLTemplates(this.adapter);
//     } catch (error) {
//       console.error("Error initializing MigrationGenerator:", error);
//       throw error;
//     }
//   }

//   extractTableName(migrationName) {
//     // Parse migration format
//     const parsedInfo = parseMigrationName(migrationName);
//     if (parsedInfo) {
//       return parsedInfo.table;
//     }

//     // Handle AddXXXToYYY format
//     if (migrationName.startsWith("Add") && migrationName.includes("To")) {
//       const matches = migrationName.match(/Add(.+)To(.+)/);
//       if (matches) {
//         return matches[2].toLowerCase();
//       }
//     }

//     // Handle CreateXXX format
//     if (migrationName.startsWith("Create")) {
//       return migrationName.substring(6).toLowerCase();
//     }

//     return migrationName.toLowerCase();
//   }

//   getMigrationType() {
//     const parsedInfo = parseMigrationName(this.originalName);
//     if (parsedInfo) return parsedInfo.type; // Return the exact type from parser
//     if (this.originalName.startsWith("Add")) return "add";
//     if (this.originalName.startsWith("Create")) return "create";
//     return "unknown";
//   }

//   async generate() {
//     try {
//       // Initialize before generating
//       await this.initialize();

//       const migrationType = this.getMigrationType();
//       console.log(`\nMigration Type: ${migrationType}`);
//       console.log(`Target Table: ${this.migrationName}`);
//       console.log("Columns:", this.columns);

//       // Generate migration based on type
//       switch (migrationType) {
//         case "add":
//           return await addColumnsMigration(
//             this.migrationName,
//             this.columns,
//             this.adapter,
//             {
//               typeMappings: this.typeMappings,
//               sqlTemplates: this.sqlTemplates,
//               dbConfig: this.dbConfig,
//             }
//           );

//         case "rename_column": {
//           const parsedInfo = parseMigrationName(this.originalName);
//           const { up, down } = await renameColumnMigration(
//             parsedInfo.table,
//             parsedInfo.oldName,
//             parsedInfo.newName,
//             this.adapter
//           );

//           // Generate timestamp
//           const timestamp = new Date()
//             .toISOString()
//             .replace(/[^0-9]/g, "")
//             .slice(0, 14);

//           const migrationFileName = `${timestamp}_rename_${parsedInfo.oldName}_to_${parsedInfo.newName}_in_${parsedInfo.table}`;

//           // Write migration files
//           const migrationsDir = path.join(process.cwd(), "db", "migrate");
//           const migrationsDownDir = path.join(migrationsDir, "down");

//           require("fs").mkdirSync(migrationsDir, { recursive: true });
//           require("fs").mkdirSync(migrationsDownDir, { recursive: true });

//           const upPath = path.join(migrationsDir, `${migrationFileName}.sql`);
//           const downPath = path.join(
//             migrationsDownDir,
//             `${migrationFileName}.sql`
//           );

//           require("fs").writeFileSync(upPath, up, "utf8");
//           require("fs").writeFileSync(downPath, down, "utf8");

//           return {
//             upStatements: [up],
//             downStatements: [down],
//           };
//         }

//         case "change_column": {
//           const parsedInfo = parseMigrationName(this.originalName);
//           const { up, down } = await changeColumnMigration(
//             parsedInfo.table,
//             parsedInfo.columnName,
//             parsedInfo.newType,
//             this.adapter
//           );

//           // Generate timestamp
//           const timestamp = new Date()
//             .toISOString()
//             .replace(/[^0-9]/g, "")
//             .slice(0, 14);

//           const migrationFileName = `${timestamp}_change_${parsedInfo.columnName}_type_to_${parsedInfo.newType}_in_${parsedInfo.table}`;

//           // Write migration files
//           const migrationsDir = path.join(process.cwd(), "db", "migrate");
//           const migrationsDownDir = path.join(migrationsDir, "down");

//           require("fs").mkdirSync(migrationsDir, { recursive: true });
//           require("fs").mkdirSync(migrationsDownDir, { recursive: true });

//           const upPath = path.join(migrationsDir, `${migrationFileName}.sql`);
//           const downPath = path.join(
//             migrationsDownDir,
//             `${migrationFileName}.sql`
//           );

//           require("fs").writeFileSync(upPath, up, "utf8");
//           require("fs").writeFileSync(downPath, down, "utf8");

//           return {
//             upStatements: [up],
//             downStatements: [down],
//           };
//         }

//         case "create":
//           throw new Error("Create table migrations not yet implemented");

//         default:
//           throw new Error(`Unknown migration type: ${migrationType}`);
//       }
//     } catch (error) {
//       console.error("\nError generating migration:", error.message);
//       throw error;
//     }
//   }

//   static async generateMigration(migrationName, columns, options = {}) {
//     if (!migrationName) {
//       throw new Error("Migration name is required");
//     }

//     const generator = new MigrationGenerator(migrationName, columns, options);
//     return await generator.generate();
//   }
// }

// // Command-line interface
// if (require.main === module) {
//   const args = process.argv.slice(2);
//   if (args.length < 2) {
//     console.error(require("./config/helpText"));
//     process.exit(1);
//   }

//   const migrationName = args[0];
//   const columns = args.slice(1);

//   MigrationGenerator.generateMigration(migrationName, columns).catch(
//     (error) => {
//       console.error("Migration generation failed:", error.message);
//       process.exit(1);
//     }
//   );
// }

// module.exports = MigrationGenerator.generateMigration;

const path = require("path");
const { AdapterFactory } = require("./adapters");
const { getTypeMappings } = require("./config/typeMapping");
const { getDatabaseConfig } = require("./config/database");
const SQLTemplates = require("./helpers/sqlTemplates");
const {
  addColumnMigration,
} = require("./generators/sqlGenerators/addColumnMigration");
const {
  renameColumnMigration,
} = require("./generators/sqlGenerators/renameColumnMigration");
const {
  changeColumnMigration,
} = require("./generators/sqlGenerators/changeColumnMigration");
const {
  removeColumnMigration,
} = require("./generators/sqlGenerators/removeColumnMigration");
const {
  createTableMigration,
} = require("./generators/sqlGenerators/createTableMigration");
const {
  addIndexMigration,
} = require("./generators/sqlGenerators/addIndexMigration");
const {
  addForeignKeyMigration,
} = require("./generators/sqlGenerators/addForeignKeyMigration");
const {
  dropTableMigration,
} = require("./generators/sqlGenerators/dropTableMigration");
const { parseMigrationName } = require("./utils/migrationNameParser");
const connectionManager = require("../database/connectionManager");

class MigrationGenerator {
  constructor(migrationName, columns, options = {}) {
    this.originalName = migrationName;
    this.migrationName = this.extractTableName(migrationName);
    this.columns = columns;
    this.dbConfig = getDatabaseConfig();
    this.options = {
      dbType: this.dbConfig.database?.development?.client || "sqlite",
      connection: null,
      ...options,
    };
  }

  async initialize() {
    console.log("Initializing MigrationGenerator...");

    try {
      const connection =
        this.options.connection || (await connectionManager.getConnection());
      const dbType =
        this.dbConfig.database?.development?.client || this.options.dbType;
      console.log("\ngetConnection called with type:", this.options.type);
      console.log("Using database type:", dbType);

      this.adapter = await AdapterFactory.create(dbType, connection);
      if (!this.adapter) {
        throw new Error(
          `Failed to create adapter for database type: ${dbType}`
        );
      }

      this.adapter.type = dbType;
      this.typeMappings = getTypeMappings(this.adapter);
      this.sqlTemplates = new SQLTemplates(this.adapter);
    } catch (error) {
      console.error("Error initializing MigrationGenerator:", error);
      throw error;
    }
  }

  extractTableName(migrationName) {
    const parsedInfo = parseMigrationName(migrationName);
    if (parsedInfo) {
      return parsedInfo.table;
    }

    // Handle direct format commands (e.g., rename:column, add:index, etc.)
    const directMatch = migrationName.match(/^(\w+):(\w+)\s+(\w+)/);
    if (directMatch) {
      return directMatch[3].toLowerCase(); // The table name is always the third capture group
    }

    if (migrationName.startsWith("Add") && migrationName.includes("To")) {
      const matches = migrationName.match(/Add(.+)To(.+)/);
      if (matches) {
        return matches[2].toLowerCase();
      }
    }

    if (migrationName.startsWith("Create")) {
      return migrationName.substring(6).toLowerCase();
    }

    return migrationName.toLowerCase();
  }

  getMigrationType() {
    const parsedInfo = parseMigrationName(this.originalName);
    if (parsedInfo) return parsedInfo.type;
    if (this.originalName.startsWith("Add")) return "add";
    if (this.originalName.startsWith("Create")) return "create";
    return "unknown";
  }

  async cleanup() {
    try {
      if (this.adapter) {
        if (this.adapter.pool) {
          await this.adapter.pool.end();
          console.log("Database pool closed");
        }
        if (this.adapter.connection) {
          await this.adapter.connection.end();
          console.log("Database connection closed");
        }
      }
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }

  async generate() {
    try {
      await this.initialize();

      const migrationType = this.getMigrationType();
      console.log(`\nMigration Type: ${migrationType}`);
      console.log(`Target Table: ${this.migrationName}`);
      console.log("Columns:", this.columns);

      let result;
      const timestamp = new Date()
        .toISOString()
        .replace(/[^0-9]/g, "")
        .slice(0, 14);
      let migrationFileName;

      switch (migrationType) {
        case "add_column":
          const info = parseMigrationName(this.originalName);
          result = await addColumnMigration(info, this.adapter);
          migrationFileName = `${timestamp}_add_column_to_${info.table}`;
          break;

        case "rename_column": {
          const parsedInfo = parseMigrationName(this.originalName);
          result = await renameColumnMigration(
            parsedInfo.table,
            parsedInfo.oldName,
            parsedInfo.newName,
            this.adapter
          );
          migrationFileName = `${timestamp}_rename_${parsedInfo.oldName}_to_${parsedInfo.newName}_in_${parsedInfo.table}`;
          break;
        }

        case "change_column": {
          const parsedInfo = parseMigrationName(this.originalName);
          result = await changeColumnMigration(
            parsedInfo.table,
            parsedInfo.columnName,
            parsedInfo.newType,
            this.adapter
          );
          migrationFileName = `${timestamp}_change_${parsedInfo.columnName}_type_to_${parsedInfo.newType}_in_${parsedInfo.table}`;
          break;
        }

        case "remove_column": {
          const parsedInfo = parseMigrationName(this.originalName);
          result = await removeColumnMigration(
            parsedInfo.table,
            parsedInfo.columnName,
            this.adapter
          );
          migrationFileName = `${timestamp}_remove_${parsedInfo.columnName}_from_${parsedInfo.table}`;
          break;
        }

        case "create_table": {
          const parsedInfo = parseMigrationName(this.originalName);
          result = await createTableMigration(
            parsedInfo.table,
            this.columns,
            this.adapter
          );
          migrationFileName = `${timestamp}_create_${parsedInfo.table}`;
          break;
        }

        case "drop_table": {
          const parsedInfo = parseMigrationName(this.originalName);
          result = await dropTableMigration(parsedInfo, this.adapter);
          migrationFileName = `${timestamp}_drop_table_${parsedInfo.table}`;
          break;
        }

        case "add_index": {
          // For direct format (add:index users email)
          if (this.originalName.startsWith("add:")) {
            const parts = this.originalName.split(/\s+/);
            const [command, table, column] = parts;
            const isUnique = command === "add:unique_index";

            result = await addIndexMigration(
              {
                type: "add_index",
                table: table,
                column: column,
                isUnique: isUnique,
              },
              this.adapter
            );

            migrationFileName = `${timestamp}_add_${
              isUnique ? "unique_" : ""
            }index_to_${table}_${column}`;
          } else {
            // Legacy format
            result = await addIndexMigration(this.originalName, this.adapter);
            migrationFileName = `${timestamp}_${this.originalName.toLowerCase()}`;
          }
          break;
        }

        case "add_foreign_key": {
          const info = parseMigrationName(this.originalName);

          result = await addForeignKeyMigration(info, this.adapter);

          // Generate consistent filename format regardless of input format
          migrationFileName = `${timestamp}_add_foreign_key_to_${info.table}_${info.column}`;
          break;
        }

        case "create":
          throw new Error("Create table migrations not yet implemented");

        default:
          throw new Error(`Unknown migration type: ${migrationType}`);
      }

      // Write migration files
      const migrationsDir = path.join(process.cwd(), "db", "migrate");
      const migrationsDownDir = path.join(migrationsDir, "down");

      require("fs").mkdirSync(migrationsDir, { recursive: true });
      require("fs").mkdirSync(migrationsDownDir, { recursive: true });

      const upPath = path.join(migrationsDir, `${migrationFileName}.sql`);
      const downPath = path.join(migrationsDownDir, `${migrationFileName}.sql`);

      require("fs").writeFileSync(upPath, result.up, "utf8");
      require("fs").writeFileSync(downPath, result.down, "utf8");

      console.log("\nMigration files created successfully!");
      return result;
    } catch (error) {
      console.error("\nError generating migration:", error.message);
      throw error;
    } finally {
      await this.cleanup();
      // Force exit after cleanup
      process.exit(0);
    }
  }

  // static async generateMigration(migrationName, columns, options = {}) {
  //   if (!migrationName) {
  //     throw new Error("Migration name is required");
  //   }

  //   const generator = new MigrationGenerator(migrationName, columns, options);
  //   return await generator.generate().catch(async (error) => {
  //     await generator.cleanup();
  //     console.error("Migration generation failed:", error.message);
  //     process.exit(1);
  //   });
  // }

  static async generateMigration(migrationName, columns, options = {}) {
    if (!migrationName) {
      throw new Error("Migration name is required");
    }

    // Parse migration info first
    const parsedInfo = parseMigrationName(migrationName);

    // Use parsed columns if available, otherwise use provided columns
    const finalColumns = parsedInfo.columns || columns || [];

    const generator = new MigrationGenerator(
      migrationName,
      finalColumns,
      options
    );
    return await generator.generate().catch(async (error) => {
      await generator.cleanup();
      console.error("Migration generation failed:", error.message);
      process.exit(1);
    });
  }
}

// Command-line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error(require("./config/helpText"));
    process.exit(1);
  }

  const migrationName = args[0];
  const columns = args.slice(1);

  MigrationGenerator.generateMigration(migrationName, columns);
}

module.exports = MigrationGenerator.generateMigration;
