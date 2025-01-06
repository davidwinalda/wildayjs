// const fs = require("fs");
// const path = require("path");
// const { AdapterFactory } = require("./migration/adapters");
// const connectionManager = require("./database/connectionManager");
// const { log } = require("./utils/chalkUtils");

// // Helper function to get version from filename
// const getVersionFromFilename = (filename) => {
//   console.log("Getting version from filename:", filename);
//   const match = filename.match(/^(\d+)/);
//   const version = match ? match[1] : null;
//   console.log("Extracted version:", version);
//   return version;
// };

// // Helper function to convert SQLite syntax to MySQL
// const convertToMySQLSyntax = (sql) => {
//   // First clean up the SQL
//   let cleanedSql = sql.trim();

//   // Remove any existing engine/charset definitions to prevent duplication
//   cleanedSql = cleanedSql.replace(/ENGINE.*$/m, "");

//   // Apply syntax conversions
//   cleanedSql = cleanedSql
//     .replace(
//       /INTEGER PRIMARY KEY AUTOINCREMENT/gi,
//       "BIGINT AUTO_INCREMENT PRIMARY KEY"
//     )
//     // Remove TEXT conversion to preserve the type
//     .replace(/DATETIME/gi, "TIMESTAMP")
//     .replace(/datetime\('now'\)/gi, "CURRENT_TIMESTAMP")
//     .replace(/PRAGMA foreign_keys=off;/gi, "SET FOREIGN_KEY_CHECKS=0;")
//     .replace(/PRAGMA foreign_keys=on;/gi, "SET FOREIGN_KEY_CHECKS=1;");

//   // Add MySQL-specific table options only for CREATE TABLE statements
//   if (cleanedSql.toLowerCase().includes("create table")) {
//     cleanedSql = cleanedSql.replace(/;?\s*$/, "");
//     cleanedSql +=
//       " ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
//   }

//   return cleanedSql;
// };

// // Initialize the migrations table
// const initializeMigrationsTable = async (adapter) => {
//   console.log("\n=== Initializing Migrations Table ===");

//   try {
//     // Step 1: Test connection
//     console.log("\nStep 1: Testing database connection...");
//     try {
//       const result = await adapter.query("SELECT 1 AS connection_test");
//       console.log("Connection test result:", result);
//     } catch (error) {
//       console.error("Connection test failed:", error);
//       throw new Error(`Connection test failed: ${error.message}`);
//     }

//     // Step 2: Get database type
//     console.log("\nStep 2: Getting database type...");
//     const dbType = connectionManager.getCurrentDatabaseType();
//     console.log("Database type:", dbType);

//     // Step 3: Create migrations table
//     console.log("\nStep 3: Creating migrations table...");
//     const createMigrationsSQL = `
//       CREATE TABLE IF NOT EXISTS migrations (
//         id BIGINT AUTO_INCREMENT PRIMARY KEY,
//         filename VARCHAR(255) NOT NULL UNIQUE,
//         version VARCHAR(255) NOT NULL,
//         applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         reverted_at TIMESTAMP NULL
//       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
//     `;

//     try {
//       console.log("Executing migrations table creation...");
//       const migrationResult = await adapter.execute(createMigrationsSQL);
//       console.log("Migrations table creation result:", migrationResult);
//     } catch (error) {
//       console.error("Failed to create migrations table:", error);
//       throw new Error(`Failed to create migrations table: ${error.message}`);
//     }

//     // Step 4: Create schema_migrations table
//     console.log("\nStep 4: Creating schema_migrations table...");
//     const createSchemaSQL = `
//       CREATE TABLE IF NOT EXISTS schema_migrations (
//         version VARCHAR(255) PRIMARY KEY,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
//     `;

//     try {
//       console.log("Executing schema_migrations table creation...");
//       const schemaResult = await adapter.execute(createSchemaSQL);
//       console.log("Schema migrations table creation result:", schemaResult);
//     } catch (error) {
//       console.error("Failed to create schema_migrations table:", error);
//       throw new Error(
//         `Failed to create schema_migrations table: ${error.message}`
//       );
//     }

//     // Step 5: Verify tables exist
//     console.log("\nStep 5: Verifying tables...");
//     try {
//       console.log("Checking migrations table...");
//       const migrationsExists = await adapter.query(
//         "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'migrations'"
//       );
//       console.log("Migrations table check result:", migrationsExists);

//       console.log("\nChecking schema_migrations table...");
//       const schemaExists = await adapter.query(
//         "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'schema_migrations'"
//       );
//       console.log("Schema migrations table check result:", schemaExists);

//       if (!migrationsExists.length || !schemaExists.length) {
//         throw new Error("Tables verification failed");
//       }
//     } catch (error) {
//       console.error("Table verification failed:", error);
//       throw new Error(`Table verification failed: ${error.message}`);
//     }

//     // Step 6: Verify table structures
//     console.log("\nStep 6: Verifying table structures...");
//     try {
//       console.log("Checking migrations table structure...");
//       const migrationStructure = await adapter.query("DESCRIBE migrations");
//       console.log("Migrations table structure:", migrationStructure);

//       console.log("\nChecking schema_migrations table structure...");
//       const schemaStructure = await adapter.query("DESCRIBE schema_migrations");
//       console.log("Schema migrations table structure:", schemaStructure);

//       // Verify required columns exist
//       const migrationColumns = migrationStructure.map((col) => col.Field);
//       const schemaColumns = schemaStructure.map((col) => col.Field);

//       const requiredMigrationColumns = [
//         "id",
//         "filename",
//         "version",
//         "applied_at",
//         "reverted_at",
//       ];
//       const requiredSchemaColumns = ["version", "created_at"];

//       const missingMigrationColumns = requiredMigrationColumns.filter(
//         (col) => !migrationColumns.includes(col)
//       );
//       const missingSchemaColumns = requiredSchemaColumns.filter(
//         (col) => !schemaColumns.includes(col)
//       );

//       if (missingMigrationColumns.length || missingSchemaColumns.length) {
//         throw new Error(
//           `Missing columns - Migrations: ${missingMigrationColumns.join(
//             ", "
//           )}, Schema: ${missingSchemaColumns.join(", ")}`
//         );
//       }
//     } catch (error) {
//       console.error("Structure verification failed:", error);
//       throw new Error(`Structure verification failed: ${error.message}`);
//     }

//     console.log("\n=== Migration Tables Initialized Successfully ===");
//     return true;
//   } catch (error) {
//     console.error("\n=== Migration Table Error ===");
//     console.error("Error type:", error.constructor.name);
//     console.error("Error message:", error.message);
//     console.error("Full error:", error);
//     if (error.original) {
//       console.error("Original error:", error.original);
//     }
//     throw error;
//   } finally {
//     console.log("=== End Migration Table Initialization ===\n");
//   }
// };

// // Apply a single migration
// const applyMigration = async (adapter, file, direction = "up") => {
//   console.log(`\n=== Applying Migration: ${file} (${direction}) ===`);
//   const migrationDir = path.join(process.cwd(), "db", "migrate");
//   const downMigrationDir = path.join(migrationDir, "down");

//   const filePath =
//     direction === "up"
//       ? path.join(migrationDir, file)
//       : path.join(downMigrationDir, file);

//   console.log("Migration file path:", filePath);

//   if (!fs.existsSync(filePath)) {
//     log.error(`Migration file not found: ${filePath}`);
//     return false;
//   }

//   const version = getVersionFromFilename(file);
//   console.log("Getting version from filename:", file);
//   console.log("Extracted version:", version);
//   console.log("Migration version:", version);

//   let sql = fs.readFileSync(filePath, "utf8");
//   console.log("\nOriginal SQL content:", sql);

//   // Convert syntax if using MySQL
//   const dbType = connectionManager.getCurrentDatabaseType();
//   if (dbType === "mysql") {
//     sql = convertToMySQLSyntax(sql);
//     console.log("\nConverted MySQL SQL:", sql);
//   }

//   let connection;
//   try {
//     // Start a transaction
//     console.log("\nStarting transaction");
//     connection = await adapter.beginTransaction();
//     console.log("Transaction started with connection");

//     // Split SQL into individual statements
//     console.log("\nSplitting SQL into statements");
//     const statements = sql
//       .split(";")
//       .map((stmt) => stmt.trim())
//       .filter((stmt) => stmt.length > 0);

//     console.log(`Found ${statements.length} SQL statements to execute`);

//     // Execute each statement
//     for (let i = 0; i < statements.length; i++) {
//       const statement = statements[i];
//       if (!statement.trim()) continue;

//       console.log(
//         `\nExecuting statement ${i + 1}/${statements.length}:`,
//         statement
//       );
//       try {
//         await adapter.execute(statement, [], connection);
//         console.log("Statement executed successfully");
//       } catch (stmtError) {
//         console.error(`Failed to execute statement ${i + 1}:`, statement);
//         console.error("Error:", stmtError);
//         throw stmtError;
//       }
//     }

//     // Update migrations table
//     console.log("\nUpdating migrations table");
//     if (direction === "up") {
//       await adapter.execute(
//         `INSERT INTO migrations (filename, version) VALUES (?, ?)`,
//         [file, version],
//         connection
//       );

//       // Also update schema_migrations
//       await adapter.execute(
//         `INSERT INTO schema_migrations (version) VALUES (?)`,
//         [version],
//         connection
//       );

//       log.success(`Applied migration: ${file}`);
//     } else {
//       await adapter.execute(
//         `UPDATE migrations SET reverted_at = CURRENT_TIMESTAMP WHERE filename = ?`,
//         [file],
//         connection
//       );
//       log.warn(`Reverted migration: ${file}`);
//     }

//     console.log("Committing transaction");
//     await adapter.commit(connection);
//     console.log("Transaction committed successfully");
//     return true;
//   } catch (err) {
//     console.error("\nError occurred, rolling back transaction");
//     if (connection) {
//       await adapter.rollback(connection);
//       console.log("Transaction rolled back");
//     }
//     log.error(
//       `Failed to ${direction === "up" ? "apply" : "revert"} migration: ${file}`
//     );
//     log.error(err.message);
//     console.error("Full error:", err);
//     return false;
//   }
// };

// // Main migration function
// const applyMigrations = async (options = {}) => {
//   console.log("\n=== Starting Migration Process ===");
//   console.log("Options:", options);

//   const { version, reset = false, command = "migrate", steps = 1 } = options;
//   const migrationDir = path.join(process.cwd(), "db", "migrate");

//   try {
//     console.log("Creating database adapter");
//     const adapter = await AdapterFactory.create();

//     if (reset) {
//       console.log("\n=== Resetting Migrations ===");

//       // Drop existing tables
//       console.log("Dropping existing tables...");
//       await adapter.execute("SET FOREIGN_KEY_CHECKS = 0");

//       // Drop migrations tracking tables
//       await adapter.execute("DROP TABLE IF EXISTS migrations");
//       await adapter.execute("DROP TABLE IF EXISTS schema_migrations");

//       // Drop application tables
//       await adapter.execute("DROP TABLE IF EXISTS users");

//       await adapter.execute("SET FOREIGN_KEY_CHECKS = 1");

//       console.log("All tables dropped successfully");
//     }

//     console.log("Initializing migrations table");
//     await initializeMigrationsTable(adapter);

//     // Add debug information
//     console.log("\n=== Debug Information ===");
//     console.log("Current working directory:", process.cwd());
//     console.log("Migration directory:", migrationDir);
//     console.log("Directory exists:", fs.existsSync(migrationDir));

//     try {
//       if (fs.existsSync(migrationDir)) {
//         const files = fs.readdirSync(migrationDir);
//         console.log("Files in migration directory:", files);
//       } else {
//         console.log("Creating migration directory");
//         fs.mkdirSync(migrationDir, { recursive: true });
//       }
//     } catch (err) {
//       console.error("Error with migration directory:", err);
//     }

//     console.log("Command:", command);
//     console.log("=== End Debug Information ===\n");

//     switch (command) {
//       case "rollback": {
//         console.log(`\nRolling back ${steps} migration(s)`);
//         const migrationsToRevert = await adapter.query(
//           `SELECT filename FROM migrations
//            WHERE reverted_at IS NULL
//            ORDER BY version DESC
//            LIMIT ?`,
//           [steps]
//         );

//         console.log("Migrations to revert:", migrationsToRevert);

//         if (migrationsToRevert.length === 0) {
//           log.warn("No migrations to rollback");
//           return;
//         }

//         for (const migration of migrationsToRevert) {
//           await applyMigration(adapter, migration.filename, "down");
//         }
//         log.success(`Rolled back ${migrationsToRevert.length} migration(s)`);
//         break;
//       }

//       case "migrate:down": {
//         console.log("\nExecuting migrate:down command");
//         if (!version) {
//           log.error("Version is required for migrate:down");
//           return;
//         }

//         console.log("Looking for migration with version:", version);
//         const migration = await adapter.query(
//           `SELECT filename FROM migrations
//            WHERE version = ? AND reverted_at IS NULL`,
//           [version]
//         );

//         if (!migration || migration.length === 0) {
//           log.error(
//             `Migration version ${version} not found or already reverted`
//           );
//           return;
//         }

//         await applyMigration(adapter, migration[0].filename, "down");
//         log.success(`Reverted migration version ${version}`);
//         break;
//       }

//       default: {
//         console.log("\nExecuting default migrate command");
//         console.log("Migration directory:", migrationDir);

//         // Get all migration files with detailed logging
//         console.log("\nReading migration directory...");
//         const files = fs.readdirSync(migrationDir);
//         console.log("All files in migration directory:", files);

//         // Filter and sort migrations by timestamp
//         const migrations = files
//           .filter((file) => {
//             const isSql = file.endsWith(".sql");
//             const isUpMigration =
//               !file.includes("_down") && !file.startsWith(".");
//             console.log(`Checking file: ${file}`);
//             console.log(`- Is SQL: ${isSql}`);
//             console.log(`- Is Up Migration: ${isUpMigration}`);
//             return isSql && isUpMigration;
//           })
//           .sort((a, b) => {
//             const versionA = parseInt(getVersionFromFilename(a));
//             const versionB = parseInt(getVersionFromFilename(b));
//             return versionA - versionB;
//           });

//         console.log("\nFiltered and sorted migration files:", migrations);

//         if (migrations.length === 0) {
//           log.warn("No migration files found!");
//           console.log("Expected migration files in:", migrationDir);
//           return;
//         }

//         console.log("\nApplying pending migrations");
//         for (const file of migrations) {
//           console.log(`\nProcessing migration file: ${file}`);
//           const fileVersion = getVersionFromFilename(file);
//           console.log(`Version extracted: ${fileVersion}`);

//           if (version && parseInt(fileVersion) > parseInt(version)) {
//             console.log(`Skipping migration ${file} (version > ${version})`);
//             continue;
//           }

//           console.log("Checking if migration was already applied...");
//           const [isApplied] = await adapter.query(
//             `SELECT COUNT(*) as count
//              FROM migrations
//              WHERE filename = ?
//              AND reverted_at IS NULL`,
//             [file]
//           );

//           console.log("Migration applied status:", isApplied);

//           if (!isApplied.count) {
//             console.log(`Applying migration: ${file}`);
//             try {
//               const success = await applyMigration(adapter, file, "up");
//               if (success) {
//                 log.success(`Successfully applied migration: ${file}`);
//               } else {
//                 log.error(`Failed to apply migration: ${file}`);
//                 throw new Error(`Migration failed: ${file}`);
//               }
//             } catch (error) {
//               console.error("Migration error:", error);
//               throw error;
//             }
//           } else {
//             log.warn(`Skipping already applied migration: ${file}`);
//           }
//         }

//         // Log final status
//         console.log("\nMigration Summary:");
//         const [appliedCount] = await adapter.query(
//           `SELECT COUNT(*) as count FROM migrations WHERE reverted_at IS NULL`
//         );
//         console.log(`Total applied migrations: ${appliedCount.count}`);

//         const appliedMigrations = await adapter.query(
//           `SELECT filename, version, applied_at
//            FROM migrations
//            WHERE reverted_at IS NULL
//            ORDER BY version ASC`
//         );

//         if (appliedMigrations.length > 0) {
//           console.log("\nApplied migrations:");
//           appliedMigrations.forEach((migration) => {
//             console.log(
//               `- ${migration.filename} (${new Date(
//                 migration.applied_at
//               ).toLocaleString()})`
//             );
//           });
//         }
//       }
//     }
//   } catch (error) {
//     console.error("\n=== Migration Error ===");
//     console.error("Error details:", error);
//     log.error("Migration failed:", error.message);
//     throw error;
//   } finally {
//     console.log("\nClosing database connection");
//     await connectionManager.closeConnection();
//   }
// };

// // Command-line interface
// if (require.main === module) {
//   const args = process.argv.slice(2);
//   const options = {};

//   console.log("\n=== Migration CLI ===");
//   console.log("Arguments:", args);

//   for (let i = 0; i < args.length; i++) {
//     switch (args[i]) {
//       case "rollback":
//         options.command = "rollback";
//         break;
//       case "migrate:down":
//         options.command = "migrate:down";
//         break;
//       case "--version":
//         options.version = args[++i];
//         break;
//       case "--step":
//         options.steps = parseInt(args[++i], 10);
//         break;
//       case "--reset":
//         options.reset = true;
//         break;
//     }
//   }

//   console.log("Parsed options:", options);

//   applyMigrations(options).catch((error) => {
//     console.error("Migration failed:", error);
//     process.exit(1);
//   });
// }

// module.exports = applyMigrations;

// ----------------------------------------------------------

// const fs = require("fs");
// const path = require("path");
// const { AdapterFactory } = require("./migration/adapters");
// const connectionManager = require("./database/connectionManager");
// const { log } = require("./utils/chalkUtils");
// const { getTypeMappings } = require("./migration/config/typeMapping");
// const SQLConverter = require("./migration/converters/sqlConverter");

// // Database-specific syntax mappings
// const syntaxMap = {
//   mysql: {
//     autoIncrement: "BIGINT AUTO_INCREMENT PRIMARY KEY",
//     timestamp: "TIMESTAMP",
//     currentTimestamp: "CURRENT_TIMESTAMP",
//     engine: "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
//     foreignKeyChecks: {
//       disable: "SET FOREIGN_KEY_CHECKS=0;",
//       enable: "SET FOREIGN_KEY_CHECKS=1;",
//     },
//     tableExistsQuery:
//       "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
//     describeTable: "DESCRIBE",
//   },
//   postgresql: {
//     autoIncrement: "BIGSERIAL PRIMARY KEY",
//     timestamp: "TIMESTAMP",
//     currentTimestamp: "CURRENT_TIMESTAMP",
//     engine: "",
//     foreignKeyChecks: {
//       disable: "",
//       enable: "",
//     },
//     tableExistsQuery:
//       "SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = ?",
//     describeTable:
//       "SELECT column_name as Field, data_type as Type, is_nullable as Null FROM information_schema.columns WHERE table_name = ?",
//   },
//   sqlite: {
//     autoIncrement: "INTEGER PRIMARY KEY AUTOINCREMENT",
//     timestamp: "DATETIME",
//     currentTimestamp: "datetime('now')",
//     engine: "",
//     foreignKeyChecks: {
//       disable: "PRAGMA foreign_keys=off;",
//       enable: "PRAGMA foreign_keys=on;",
//     },
//     tableExistsQuery:
//       "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",
//     describeTable: "PRAGMA table_info",
//   },
// };

// // Helper function to get version from filename
// const getVersionFromFilename = (filename) => {
//   console.log("Getting version from filename:", filename);
//   const match = filename.match(/^(\d+)/);
//   const version = match ? match[1] : null;
//   console.log("Extracted version:", version);
//   return version;
// };

// // Database-agnostic SQL syntax converter
// // Add this function after the getVersionFromFilename function and before initializeMigrationsTable
// function convertSQLSyntax(sql, dbType) {
//   console.log("\n=== Converting SQL Syntax ===");
//   console.log("Original SQL:", sql);
//   console.log("Target database type:", dbType);

//   let statements = [];
//   let convertedSql = sql;

//   const syntax = syntaxMap[dbType.toLowerCase()];
//   const typeMappings = getTypeMappings({ type: dbType });

//   if (!syntax) {
//     console.warn(`Unknown database type: ${dbType}, using SQL as-is`);
//     return [sql];
//   }

//   // Define type conversion map
//   const typeConversions = {
//     postgresql: {
//       LONGTEXT: "TEXT",
//       "BIGINT AUTO_INCREMENT PRIMARY KEY": syntax.autoIncrement,
//       "INTEGER PRIMARY KEY AUTOINCREMENT": syntax.autoIncrement,
//       DATETIME: syntax.timestamp,
//     },
//     mysql: {
//       TEXT: "LONGTEXT",
//       "INTEGER PRIMARY KEY AUTOINCREMENT": syntax.autoIncrement,
//       "SERIAL PRIMARY KEY": syntax.autoIncrement,
//       TIMESTAMP: syntax.timestamp,
//     },
//     sqlite: {
//       "BIGINT AUTO_INCREMENT PRIMARY KEY": syntax.autoIncrement,
//       "SERIAL PRIMARY KEY": syntax.autoIncrement,
//       TIMESTAMP: syntax.timestamp,
//       LONGTEXT: "TEXT",
//     },
//   };

//   const sqlKeywords = [
//     "CREATE",
//     "TABLE",
//     "PRIMARY",
//     "KEY",
//     "DEFAULT",
//     "NOT",
//     "NULL",
//     "UNIQUE",
//     "AUTO_INCREMENT",
//     "BIGINT",
//     "VARCHAR",
//     "TIMESTAMP",
//     "ON",
//     "UPDATE",
//     "CURRENT_TIMESTAMP",
//     "ENGINE",
//     "CHARSET",
//     "COLLATE",
//   ];

//   switch (dbType.toLowerCase()) {
//     case "postgresql": {
//       const sqlStatements = convertedSql
//         .split(";")
//         .filter((stmt) => stmt.trim());

//       for (const stmt of sqlStatements) {
//         const trimmedStmt = stmt.trim();

//         if (trimmedStmt.toUpperCase().startsWith("CREATE TRIGGER")) {
//           const triggerMatch = trimmedStmt.match(
//             /CREATE TRIGGER (\w+) BEFORE INSERT ON (\w+)/i
//           );
//           if (triggerMatch) {
//             const [_, triggerName, tableName] = triggerMatch;

//             statements.push(`
// CREATE OR REPLACE FUNCTION ${triggerName}_function()
// RETURNS TRIGGER AS $$
// BEGIN
//   IF NEW.token IS NULL THEN
//     NEW.token = 'TKN_' || substr(md5(random()::text), 1, 8) || '_' || to_char(now(), 'YYYYMMDDHH24MISS');
//   END IF;
//   RETURN NEW;
// END;
// $$ LANGUAGE plpgsql;`);

//             statements.push(`
// CREATE TRIGGER ${triggerName}
//   BEFORE INSERT ON "${tableName}"
//   FOR EACH ROW
//   EXECUTE FUNCTION ${triggerName}_function();`);
//           }
//         } else if (trimmedStmt.toUpperCase().startsWith("UPDATE")) {
//           let converted = trimmedStmt
//             .replace(/`([^`]+)`/g, '"$1"')
//             .replace(
//               /CONCAT\('TKN_', SUBSTRING\(MD5\(RAND\(\)\), \d+, \d+\), '_', DATE_FORMAT\(NOW\(\), '[^']+'\)\)/gi,
//               "'TKN_' || substr(md5(random()::text), 1, 8) || '_' || to_char(now(), 'YYYYMMDDHH24MISS')"
//             );

//           statements.push(converted + ";");
//         } else if (
//           trimmedStmt.toUpperCase().startsWith("ALTER TABLE") ||
//           trimmedStmt.toUpperCase().startsWith("CREATE TABLE")
//         ) {
//           let converted = trimmedStmt;

//           // Convert quotes
//           converted = converted.replace(/`([^`]+)`/g, '"$1"');

//           // Convert data types using typeConversions
//           Object.entries(typeConversions[dbType.toLowerCase()]).forEach(
//             ([fromType, toType]) => {
//               const regex = new RegExp(`\\b${fromType}\\b`, "gi");
//               converted = converted.replace(regex, toType);
//             }
//           );

//           // Convert data types using type mappings
//           Object.entries(typeMappings).forEach(([fromType, toType]) => {
//             const regex = new RegExp(`\\b${fromType}\\b`, "gi");
//             converted = converted.replace(regex, toType);
//           });

//           // Remove MySQL engine
//           converted = converted.replace(/ENGINE.*COLLATE.*?$/gi, "").trim();

//           if (converted.includes("ON UPDATE CURRENT_TIMESTAMP")) {
//             const tableNameMatch = converted.match(/CREATE TABLE "(\w+)"/i);
//             const tableName = tableNameMatch ? tableNameMatch[1] : null;

//             converted = converted.replace(/ON UPDATE CURRENT_TIMESTAMP/gi, "");
//             statements.push(converted + ";");

//             if (tableName) {
//               statements.push(`
// CREATE OR REPLACE FUNCTION update_timestamp()
// RETURNS TRIGGER AS $$
// BEGIN
//     NEW.updated_at = ${syntax.currentTimestamp};
//     RETURN NEW;
// END;
// $$ LANGUAGE plpgsql;`);

//               statements.push(`
// CREATE TRIGGER update_${tableName}_timestamp
//     BEFORE UPDATE ON "${tableName}"
//     FOR EACH ROW
//     EXECUTE FUNCTION update_timestamp();`);
//             }
//           } else {
//             statements.push(converted + ";");
//           }
//         }
//       }
//       break;
//     }

//     case "mysql": {
//       console.log("\n=== MySQL Conversion Debug ===");
//       console.log("Input SQL:", convertedSql);

//       const sqlStatements = convertedSql
//         .split(";")
//         .filter((stmt) => stmt.trim());

//       console.log("Split statements:", sqlStatements);

//       for (const stmt of sqlStatements) {
//         const trimmedStmt = stmt.trim();
//         console.log("\nProcessing statement:", trimmedStmt);

//         if (trimmedStmt.toUpperCase().startsWith("CREATE TABLE")) {
//           console.log("Handling CREATE TABLE statement");

//           // Convert the SQL to MySQL format
//           let converted = trimmedStmt;
//           console.log("Converting standard SQL to MySQL format");

//           // Add IF NOT EXISTS
//           converted = converted.replace(
//             /CREATE TABLE/i,
//             "CREATE TABLE IF NOT EXISTS"
//           );

//           // Convert quoted identifiers to backticks
//           converted = converted.replace(/"([^"]+)"/g, "`$1`");

//           // Add backticks to unquoted table names
//           converted = converted.replace(
//             /CREATE TABLE IF NOT EXISTS (\w+)/i,
//             "CREATE TABLE IF NOT EXISTS `$1`"
//           );

//           // Handle column definitions
//           converted = converted.replace(/\(([\s\S]+)\)/, (match, columns) => {
//             const quotedColumns = columns
//               .split(",")
//               .map((col) => {
//                 col = col.trim();
//                 // Skip if it's a constraint or already has backticks
//                 if (
//                   col.toUpperCase().startsWith("CONSTRAINT") ||
//                   col.toUpperCase().startsWith("PRIMARY KEY") ||
//                   col.toUpperCase().startsWith("FOREIGN KEY") ||
//                   col.includes("`")
//                 ) {
//                   return col;
//                 }
//                 // Handle normal column definitions
//                 const [name, ...rest] = col.split(/\s+/);
//                 return `\`${name}\` ${rest.join(" ")}`;
//               })
//               .join(",\n  ");
//             return `(\n  ${quotedColumns}\n)`;
//           });

//           // Convert data types using typeConversions
//           Object.entries(typeConversions.mysql).forEach(
//             ([fromType, toType]) => {
//               const regex = new RegExp(`\\b${fromType}\\b`, "gi");
//               converted = converted.replace(regex, toType);
//             }
//           );

//           // Add MySQL-specific table options if not present
//           if (!converted.toLowerCase().includes("engine=")) {
//             converted +=
//               " ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
//           }

//           statements.push(converted + ";");
//           console.log("Final converted CREATE TABLE SQL:", converted + ";");
//         } else if (
//           trimmedStmt.toUpperCase().includes("INSERT INTO MIGRATIONS") ||
//           trimmedStmt.toUpperCase().includes("INSERT INTO `MIGRATIONS`")
//         ) {
//           console.log("Handling migrations table insert");

//           let converted = trimmedStmt;

//           // Convert PostgreSQL-style parameters to MySQL-style
//           converted = converted.replace(/\$\d+/g, "?");

//           // Convert quoted identifiers to backticks
//           converted = converted.replace(/"([^"]+)"/g, "`$1`");

//           // Add backticks to unquoted table and column names
//           converted = converted.replace(
//             /INSERT INTO (\w+)/i,
//             "INSERT INTO `$1`"
//           );

//           // Handle column names
//           converted = converted.replace(/\(([^)]+)\)/, (match, columns) => {
//             const quotedColumns = columns
//               .split(",")
//               .map((col) => {
//                 col = col.trim();
//                 if (col.toUpperCase() === "CURRENT_TIMESTAMP") {
//                   return col;
//                 }
//                 return col.startsWith("`") ? col : `\`${col}\``;
//               })
//               .join(", ");
//             return `(${quotedColumns})`;
//           });

//           // Handle VALUES clause
//           if (converted.includes("VALUES")) {
//             converted = converted.replace(
//               /VALUES\s*\([^)]+\)/i,
//               "VALUES (?, ?, ?, CURRENT_TIMESTAMP)"
//             );
//           }

//           statements.push(converted + ";");
//           console.log("Converted migrations SQL:", converted + ";");
//         } else {
//           console.log("Handling other statement type");

//           let converted = trimmedStmt;

//           // Add backticks to identifiers if not present
//           if (!converted.includes("`")) {
//             converted = converted.replace(/"([^"]+)"/g, "`$1`");
//           }

//           // Convert PostgreSQL-style parameters to MySQL-style
//           converted = converted.replace(/\$\d+/g, "?");

//           if (converted.trim()) {
//             statements.push(converted + ";");
//             console.log("Converted SQL:", converted + ";");
//           }
//         }
//       }

//       console.log("\n=== Final Converted Statements ===");
//       console.log(statements);
//       break;
//     }

//     case "sqlite": {
//       const converter = new SQLiteConverter();
//       const convertedStatements = converter.convert(sql);

//       console.log("\n=== Final Statements to Execute ===");
//       convertedStatements.forEach((stmt, i) => {
//         console.log(`\nStatement ${i + 1}:`);
//         console.log(stmt);
//       });

//       return convertedStatements;
//     }

//     default:
//       console.warn(`Unknown database type: ${dbType}, using SQL as-is`);
//       statements.push(sql);
//   }

//   console.log("\n=== Converted SQL Statements ===");
//   statements.forEach((stmt, i) => {
//     console.log(`\nStatement ${i + 1}:`);
//     console.log(stmt);
//   });

//   return statements;
// }

// function convertSQLSyntax(sql, dbType) {
//   console.log("\n=== Converting SQL Syntax ===");
//   console.log("Original SQL:", sql);
//   console.log("Target database type:", dbType);

//   try {
//     // Split SQL into statements
//     const statements = sql
//       .split(";")
//       .map((stmt) => stmt.trim())
//       .filter(Boolean);

//     // Convert each statement
//     const convertedStatements = statements.map((stmt) => {
//       let converted = stmt;

//       if (dbType.toLowerCase() === "postgresql") {
//         // Convert backticks to double quotes
//         converted = converted.replace(/`([^`]+)`/g, '"$1"');

//         // Convert AUTO_INCREMENT to SERIAL
//         converted = converted.replace(/BIGINT AUTO_INCREMENT/gi, "BIGSERIAL");
//         converted = converted.replace(/INT AUTO_INCREMENT/gi, "SERIAL");

//         // Remove ON UPDATE CURRENT_TIMESTAMP
//         converted = converted.replace(/ON UPDATE CURRENT_TIMESTAMP/gi, "");

//         // Remove MySQL specific engine and charset
//         converted = converted.replace(/ENGINE.*COLLATE.*$/i, "");

//         // Add semicolon if missing
//         if (!converted.trim().endsWith(";")) {
//           converted = converted + ";";
//         }
//       }

//       return converted;
//     });

//     console.log("\n=== Final Converted Statements ===");
//     convertedStatements.forEach((stmt, i) => {
//       console.log(`\nStatement ${i + 1}:`);
//       console.log(stmt);
//     });

//     return convertedStatements;
//   } catch (error) {
//     console.error("\n=== Conversion Error ===");
//     console.error("Error details:", error);
//     throw new Error(`Failed to convert SQL for ${dbType}: ${error.message}`);
//   }
// }

// async function getAllTables(adapter) {
//   console.log("\n=== Getting All Tables ===");

//   // Get database type from adapter instead of config
//   const dbType = adapter.type || connectionManager.getActiveDatabase();
//   console.log("Database type:", dbType);

//   let query;
//   let results;

//   try {
//     switch (dbType) {
//       case "mysql":
//         query = `
//           SELECT table_name
//           FROM information_schema.tables
//           WHERE table_schema = DATABASE()
//         `;
//         results = await adapter.query(query);
//         console.log("MySQL tables query results:", results);
//         return results.map((row) => row.table_name || row.TABLE_NAME);

//       case "postgresql":
//         query = `
//           SELECT tablename as table_name
//           FROM pg_catalog.pg_tables
//           WHERE schemaname = 'public'
//           AND tablename NOT LIKE 'pg_%'
//           AND tablename NOT LIKE 'sql_%'
//         `;
//         results = await adapter.query(query);
//         console.log("PostgreSQL tables query results:", results);
//         return results.map((row) => row.table_name);

//       case "sqlite":
//         query = `
//           SELECT name as table_name
//           FROM sqlite_master
//           WHERE type = 'table'
//           AND name NOT LIKE 'sqlite_%'
//         `;
//         results = await adapter.query(query);
//         console.log("SQLite tables query results:", results);
//         return results.map((row) => row.table_name);

//       default:
//         throw new Error(`Unsupported database type: ${dbType}`);
//     }
//   } catch (error) {
//     console.error("\n=== Error Getting Tables ===");
//     console.error("Database type:", dbType);
//     console.error("Query attempted:", query);
//     console.error("Error details:", {
//       message: error.message,
//       code: error.code,
//       severity: error.severity,
//       detail: error.detail,
//       hint: error.hint,
//       position: error.position,
//       where: error.where,
//       schema: error.schema,
//       table: error.table,
//       column: error.column,
//       dataType: error.dataType,
//       constraint: error.constraint,
//       file: error.file,
//       line: error.line,
//       routine: error.routine,
//     });

//     // Provide more helpful error message
//     let errorMessage = `Failed to get tables for ${dbType} database: ${error.message}`;

//     if (dbType === "postgresql" && error.code === "42P01") {
//       errorMessage +=
//         "\nHint: Make sure you have the necessary permissions to access system catalogs.";
//     }

//     throw new Error(errorMessage);
//   }
// }

// // Initialize the migrations table
// async function initializeMigrationsTable(adapter) {
//   console.log("\n=== Initializing Migrations Table ===");

//   try {
//     console.log("\nStep 1: Testing database connection...");
//     const connectionTest = await adapter.query("SELECT 1 AS connection_test");
//     console.log("Connection test result:", connectionTest);

//     console.log("\nStep 2: Getting database type...");
//     const dbType = adapter.type || connectionManager.getActiveDatabase();
//     console.log("Database type:", dbType);

//     console.log("\nStep 3: Creating migrations table...");
//     console.log("Executing migrations table creation...");

//     // Database-specific SQL for migrations table
//     let migrationsSQL;
//     let tableCheckSQL;
//     let describeTableSQL;

//     switch (dbType) {
//       case "postgresql":
//         migrationsSQL = `
//           CREATE TABLE IF NOT EXISTS migrations (
//             id SERIAL PRIMARY KEY,
//             filename VARCHAR(255) NOT NULL UNIQUE,
//             version VARCHAR(255) NOT NULL,
//             batch INTEGER NOT NULL DEFAULT 1,
//             applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//             reverted_at TIMESTAMP NULL
//           );
//         `;
//         tableCheckSQL = `
//           SELECT EXISTS (
//             SELECT FROM information_schema.tables
//             WHERE table_schema = 'public'
//             AND table_name = $1
//           );
//         `;
//         describeTableSQL = `
//           SELECT column_name as "Field",
//                  data_type as "Type",
//                  is_nullable as "Null",
//                  column_default as "Default"
//           FROM information_schema.columns
//           WHERE table_name = $1
//           ORDER BY ordinal_position;
//         `;
//         break;

//       case "mysql":
//         migrationsSQL = `
//           CREATE TABLE IF NOT EXISTS migrations (
//             id BIGINT AUTO_INCREMENT PRIMARY KEY,
//             filename VARCHAR(255) NOT NULL UNIQUE,
//             version VARCHAR(255) NOT NULL,
//             batch INT NOT NULL DEFAULT 1,
//             applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//             reverted_at TIMESTAMP NULL
//           ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
//         `;
//         tableCheckSQL =
//           "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?";
//         describeTableSQL = "DESCRIBE ??";
//         break;

//       case "sqlite":
//       default:
//         migrationsSQL = `
//           CREATE TABLE IF NOT EXISTS migrations (
//             id INTEGER PRIMARY KEY AUTOINCREMENT,
//             filename TEXT NOT NULL UNIQUE,
//             version TEXT NOT NULL,
//             batch INTEGER NOT NULL DEFAULT 1,
//             applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//             reverted_at TIMESTAMP NULL
//           );
//         `;
//         tableCheckSQL =
//           "SELECT name FROM sqlite_master WHERE type='table' AND name=?";
//         describeTableSQL = "PRAGMA table_info(?);";
//         break;
//     }

//     console.log("SQL:", migrationsSQL);
//     await adapter.execute(migrationsSQL);

//     // Create schema_migrations table with database-specific SQL
//     let schemaMigrationsSQL;
//     switch (dbType) {
//       case "postgresql":
//         schemaMigrationsSQL = `
//           CREATE TABLE IF NOT EXISTS schema_migrations (
//             version VARCHAR(255) PRIMARY KEY,
//             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//           );
//         `;
//         break;

//       case "mysql":
//         schemaMigrationsSQL = `
//           CREATE TABLE IF NOT EXISTS schema_migrations (
//             version VARCHAR(255) PRIMARY KEY,
//             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//           ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
//         `;
//         break;

//       case "sqlite":
//       default:
//         schemaMigrationsSQL = `
//           CREATE TABLE IF NOT EXISTS schema_migrations (
//             version TEXT PRIMARY KEY,
//             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//           );
//         `;
//         break;
//     }

//     console.log("\nStep 4: Creating schema_migrations table...");
//     console.log("SQL:", schemaMigrationsSQL);
//     await adapter.execute(schemaMigrationsSQL);

//     console.log("\nStep 5: Verifying tables...");

//     // Check tables exist
//     const migrationsExists = await adapter.query(tableCheckSQL, ["migrations"]);
//     const schemaExists = await adapter.query(tableCheckSQL, [
//       "schema_migrations",
//     ]);

//     console.log("Migrations table check result:", migrationsExists);
//     console.log("Schema migrations table check result:", schemaExists);

//     if (dbType === "postgresql") {
//       if (!migrationsExists[0].exists || !schemaExists[0].exists) {
//         throw new Error("Tables were not created successfully");
//       }
//     }

//     return true;
//   } catch (error) {
//     console.error("\n=== Migration Table Error ===");
//     console.error("Error type:", error.constructor.name);
//     console.error("Error message:", error.message);
//     throw new Error(`Structure verification failed: ${error.message}`);
//   }
// }

// async function applyMigration(adapter, file, direction = "up", batch = 1) {
//   console.log(`\n=== Applying Migration: ${file} (${direction}) ===`);
//   console.log("Adapter type:", adapter.type);

//   const version = getVersionFromFilename(file);
//   console.log("Migration version:", version);

//   let transaction = null;
//   try {
//     const migrationPath =
//       direction === "up"
//         ? path.join(process.cwd(), "db", "migrate", file)
//         : path.join(process.cwd(), "db", "migrate", "down", file);

//     console.log(`Reading migration from: ${migrationPath}`);

//     if (!fs.existsSync(migrationPath)) {
//       throw new Error(`Migration file not found: ${migrationPath}`);
//     }

//     const originalSql = fs.readFileSync(migrationPath, "utf8");
//     console.log("\n=== Original SQL ===");
//     console.log(originalSql);

//     const statements = convertSQLSyntax(originalSql, adapter.type);
//     console.log("\n=== Converted Statements ===");
//     console.log(statements);

//     // Start transaction
//     console.log("\n=== Starting Transaction ===");
//     transaction = await adapter.beginTransaction();
//     console.log("Transaction started:", transaction ? "success" : "failed");

//     try {
//       // Execute each statement separately
//       console.log("\n=== Executing Migration SQL Statements ===");
//       console.log("Using transaction:", !!transaction);

//       for (const [index, statement] of statements.entries()) {
//         console.log(`\nExecuting statement ${index + 1}/${statements.length}:`);
//         console.log(statement);
//         await adapter.execute(statement, [], transaction);
//         console.log(`Statement ${index + 1} executed successfully`);
//       }

//       console.log("All SQL statements executed successfully");

//       // Update migrations table
//       console.log("\n=== Updating Migrations Table ===");

//       // Prepare migrations table SQL based on database type
//       let migrationsSQL;
//       if (direction === "up") {
//         if (adapter.type === "mysql") {
//           migrationsSQL =
//             "INSERT INTO `migrations` (`filename`, `version`, `batch`, `applied_at`) VALUES (?, ?, ?, CURRENT_TIMESTAMP)";
//         } else {
//           migrationsSQL =
//             "INSERT INTO migrations (filename, version, batch, applied_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)";
//         }

//         await adapter.execute(
//           migrationsSQL,
//           [file, version, batch],
//           transaction
//         );
//         console.log("Migration record inserted with batch:", batch);
//       } else {
//         if (adapter.type === "mysql") {
//           migrationsSQL =
//             "UPDATE `migrations` SET `reverted_at` = CURRENT_TIMESTAMP WHERE `filename` = ? AND `reverted_at` IS NULL";
//         } else {
//           migrationsSQL =
//             "UPDATE migrations SET reverted_at = CURRENT_TIMESTAMP WHERE filename = $1 AND reverted_at IS NULL";
//         }

//         await adapter.execute(migrationsSQL, [file], transaction);
//         console.log("Migration record updated");
//       }

//       // Commit transaction
//       console.log("\n=== Committing Transaction ===");
//       await adapter.commit(transaction);
//       console.log("Transaction committed successfully");

//       log.success(
//         `Successfully ${
//           direction === "up" ? "applied" : "reverted"
//         } migration: ${file}`
//       );
//       return true;
//     } catch (error) {
//       // Rollback transaction on error
//       console.error("\n=== Error During Migration ===");
//       console.error("Error details:", {
//         message: error.message,
//         stack: error.stack,
//         code: error.code,
//       });

//       if (transaction) {
//         console.log("Rolling back transaction");
//         await adapter.rollback(transaction);
//         console.log("Transaction rolled back");
//       }
//       throw error;
//     }
//   } catch (error) {
//     console.error(`\n=== Migration Failed: ${file} ===`);
//     console.error("Error type:", error.constructor.name);
//     console.error("Error message:", error.message);
//     console.error("Stack trace:", error.stack);
//     throw error;
//   }
// }

// const applyMigrations = async (options = {}) => {
//   console.log("\n=== Starting Migration Process ===");
//   console.log("Options:", options);

//   const { version, reset = false, command = "migrate", steps = 1 } = options;
//   const migrationDir = path.join(process.cwd(), "db", "migrate");

//   try {
//     // Get active database type from connection manager
//     const dbType = connectionManager.getActiveDatabase();
//     console.log("Active database type:", dbType);

//     // Create adapter using factory
//     console.log("Creating database adapter using factory");
//     const adapter = await AdapterFactory.create(dbType);
//     console.log("Adapter created:", {
//       type: adapter.type,
//       dialect: adapter.dialect,
//       hasPool: !!adapter.pool,
//       hasClient: !!adapter.client,
//       methods: Object.keys(adapter),
//     });

//     const syntax = syntaxMap[dbType] || syntaxMap.sqlite;

//     // Add escapeIdentifier function to adapter if it doesn't exist
//     if (!adapter.escapeIdentifier) {
//       adapter.escapeIdentifier = (identifier) => {
//         switch (dbType) {
//           case "postgresql":
//             return '"' + identifier.replace(/"/g, '""') + '"';
//           case "mysql":
//             return "`" + identifier.replace(/`/g, "``") + "`";
//           default:
//             return '"' + identifier.replace(/"/g, '""') + '"';
//         }
//       };
//     }

//     if (reset) {
//       console.log("\n=== Resetting Migrations ===");
//       try {
//         // For PostgreSQL, we need to handle foreign keys differently
//         if (dbType === "postgresql") {
//           console.log("Using PostgreSQL reset strategy");
//           await adapter.execute(`
//             DO $$ DECLARE
//               r RECORD;
//             BEGIN
//               FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
//                 EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
//               END LOOP;
//             END $$;
//           `);
//           console.log(
//             "All tables dropped successfully using PostgreSQL strategy"
//           );
//         } else {
//           // For other databases, use the original strategy
//           console.log("Using standard reset strategy");
//           // Disable foreign key checks
//           if (syntax.foreignKeyChecks?.disable) {
//             console.log("Disabling foreign key checks");
//             await adapter.execute(syntax.foreignKeyChecks.disable);
//           }

//           // Get all tables
//           const tables = await getAllTables(adapter);
//           console.log("Tables to drop:", tables);

//           // Drop all tables
//           for (const table of tables) {
//             if (!table) continue;
//             console.log(`Dropping table: ${table}`);
//             await adapter.execute(
//               `DROP TABLE IF EXISTS ${adapter.escapeIdentifier(table)}`
//             );
//           }

//           // Enable foreign key checks
//           if (syntax.foreignKeyChecks?.enable) {
//             console.log("Enabling foreign key checks");
//             await adapter.execute(syntax.foreignKeyChecks.enable);
//           }
//         }

//         console.log("Database reset completed successfully");
//       } catch (error) {
//         console.error("Error during reset:", error);
//         if (syntax.foreignKeyChecks?.enable && dbType !== "postgresql") {
//           await adapter.execute(syntax.foreignKeyChecks.enable);
//         }
//         throw error;
//       }
//     }

//     // Initialize migrations table
//     console.log("Initializing migrations table");
//     await initializeMigrationsTable(adapter);

//     switch (command) {
//       case "rollback": {
//         console.log("\nExecuting rollback command");
//         const [lastBatch] = await adapter.query(
//           `SELECT MAX(batch) as batch FROM migrations WHERE reverted_at IS NULL`
//         );

//         if (!lastBatch.batch) {
//           log.warn("No migrations to rollback");
//           return;
//         }

//         const migrationsToRevert = await adapter.query(
//           dbType === "postgresql"
//             ? `SELECT filename FROM migrations
//                WHERE batch = $1 AND reverted_at IS NULL
//                ORDER BY id DESC
//                LIMIT $2`
//             : `SELECT filename FROM migrations
//                WHERE batch = ? AND reverted_at IS NULL
//                ORDER BY id DESC
//                LIMIT ?`,
//           [lastBatch.batch, steps]
//         );

//         if (migrationsToRevert.length === 0) {
//           log.warn("No migrations to rollback");
//           return;
//         }

//         for (const migration of migrationsToRevert) {
//           await applyMigration(adapter, migration.filename, "down");
//         }
//         log.success(`Rolled back ${migrationsToRevert.length} migration(s)`);
//         break;
//       }

//       case "migrate:down": {
//         console.log("\nExecuting migrate:down command");
//         if (!version) {
//           log.error("Version is required for migrate:down");
//           return;
//         }

//         console.log("Looking for migration with version:", version);
//         const migration = await adapter.query(
//           dbType === "postgresql"
//             ? `SELECT filename FROM migrations
//                WHERE version = $1 AND reverted_at IS NULL`
//             : `SELECT filename FROM migrations
//                WHERE version = ? AND reverted_at IS NULL`,
//           [version]
//         );

//         if (!migration || migration.length === 0) {
//           log.error(
//             `Migration version ${version} not found or already reverted`
//           );
//           return;
//         }

//         await applyMigration(adapter, migration[0].filename, "down");
//         log.success(`Reverted migration version ${version}`);
//         break;
//       }

//       default: {
//         console.log("\nExecuting default migrate command");
//         console.log("Migration directory:", migrationDir);

//         // Get all migration files
//         console.log("\nReading migration directory...");
//         const files = fs.readdirSync(migrationDir);
//         console.log("All files in migration directory:", files);

//         // Filter for .sql files and sort by version
//         const migrations = files
//           .filter((f) => f.endsWith(".sql"))
//           .sort((a, b) => {
//             const versionA = getVersionFromFilename(a);
//             const versionB = getVersionFromFilename(b);
//             return versionA.localeCompare(versionB);
//           });

//         console.log("Filtered and sorted migrations:", migrations);

//         if (migrations.length === 0) {
//           log.warn("No migration files found!");
//           console.log("Expected migration files in:", migrationDir);
//           return;
//         }

//         let currentBatch = 1;
//         // Get the current batch number
//         const [lastBatch] = await adapter.query(
//           `SELECT COALESCE(MAX(batch), 0) as batch FROM migrations`
//         );
//         if (lastBatch && lastBatch.batch) {
//           currentBatch = parseInt(lastBatch.batch) + 1;
//         }
//         console.log("Current batch number:", currentBatch);

//         for (const file of migrations) {
//           console.log(`\nProcessing migration file: ${file}`);
//           const fileVersion = getVersionFromFilename(file);
//           console.log(`Version extracted: ${fileVersion}`);

//           if (version && parseInt(fileVersion) > parseInt(version)) {
//             console.log(`Skipping migration ${file} (version > ${version})`);
//             continue;
//           }

//           console.log("Checking if migration was already applied...");
//           const [isApplied] = await adapter.query(
//             dbType === "postgresql"
//               ? `SELECT COUNT(*) as count
//                  FROM migrations
//                  WHERE filename = $1
//                  AND reverted_at IS NULL`
//               : `SELECT COUNT(*) as count
//                  FROM migrations
//                  WHERE filename = ?
//                  AND reverted_at IS NULL`,
//             [file]
//           );

//           console.log("Migration applied status:", isApplied);

//           if (parseInt(isApplied.count) === 0) {
//             console.log(`Applying migration: ${file}`);
//             await applyMigration(adapter, file, "up", currentBatch);
//           } else {
//             log.warn(`Skipping already applied migration: ${file}`);
//           }
//         }

//         // Log final status
//         console.log("\nMigration Summary:");
//         const [appliedCount] = await adapter.query(
//           `SELECT COUNT(*) as count FROM migrations WHERE reverted_at IS NULL`
//         );
//         console.log(
//           `Total applied migrations: ${parseInt(appliedCount.count)}`
//         );

//         const appliedMigrations = await adapter.query(
//           `SELECT filename, version, applied_at
//            FROM migrations
//            WHERE reverted_at IS NULL
//            ORDER BY version ASC`
//         );

//         if (appliedMigrations.length > 0) {
//           console.log("\nApplied migrations:");
//           appliedMigrations.forEach((migration) => {
//             console.log(
//               `- ${migration.filename} (${new Date(
//                 migration.applied_at
//               ).toLocaleString()})`
//             );
//           });
//         }
//         break;
//       }
//     }
//   } catch (error) {
//     console.error("\n=== Migration Error ===");
//     console.error("Error details:", {
//       message: error.message,
//       code: error.code,
//       stack: error.stack,
//       detail: error.detail,
//       hint: error.hint,
//     });
//     throw error;
//   } finally {
//     console.log("\nClosing database connection");
//     await connectionManager.closeConnection();
//   }
// };

// // Command-line interface
// if (require.main === module) {
//   const args = process.argv.slice(2);
//   const options = {};

//   console.log("\n=== Migration CLI ===");
//   console.log("Arguments:", args);

//   for (let i = 0; i < args.length; i++) {
//     switch (args[i]) {
//       case "rollback":
//         options.command = "rollback";
//         break;
//       case "migrate:down":
//         options.command = "migrate:down";
//         break;
//       case "--version":
//         options.version = args[++i];
//         break;
//       case "--step":
//         options.steps = parseInt(args[++i], 10);
//         break;
//       case "--reset":
//         options.reset = true;
//         break;
//     }
//   }

//   console.log("Parsed options:", options);

//   applyMigrations(options).catch((error) => {
//     console.error("Migration failed:", error);
//     process.exit(1);
//   });
// }

// module.exports = applyMigrations;
