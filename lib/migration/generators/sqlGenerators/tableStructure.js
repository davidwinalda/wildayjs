// const fs = require("fs");
// const path = require("path");

// async function getTableStructure(table, adapter, migrationsDir) {
//   console.log(`Getting table structure for ${table}`);

//   // Get all migrations affecting this table
//   const migrations = fs
//     .readdirSync(migrationsDir)
//     .filter((file) => file.endsWith(".sql") && !file.endsWith("_down.sql"))
//     .sort((a, b) => a.localeCompare(b));

//   // First find the create table migration
//   const createMigration = migrations.find(
//     (file) =>
//       file.toLowerCase().includes(`create_${table.toLowerCase()}`) ||
//       file.toLowerCase().includes(`create_${table.toLowerCase().slice(0, -1)}`)
//   );

//   if (!createMigration) {
//     throw new Error(`Could not find create table migration for ${table}`);
//   }

//   // Get initial table structure from create migration
//   const createContent = fs.readFileSync(
//     path.join(migrationsDir, createMigration),
//     "utf8"
//   );
//   const createMatch = createContent.match(/CREATE TABLE [^(]+\(([\s\S]+?)\);/);

//   if (!createMatch) {
//     throw new Error(
//       `Could not parse CREATE TABLE statement in ${createMigration}`
//     );
//   }

//   // Parse initial columns
//   let tableInfo = createMatch[1]
//     .split(",")
//     .map((col) => col.trim())
//     .filter((col) => col)
//     .map((colDef, index) => {
//       const parts = colDef.match(/[^\s"'()]+|"([^"]*)"|'([^']*)'|\([^)]+\)/g);
//       const name = parts[0];
//       const type = parts[1];
//       const constraints = parts.slice(2).join(" ");

//       const dflt_value = (() => {
//         const defaultMatch = constraints.match(
//           /DEFAULT\s+(?:\()?([^,\s)]+(?:\s*\|\|\s*[^,\s)]+)*)\)?/
//         );
//         if (!defaultMatch) return null;
//         const value = defaultMatch[1];
//         // Special handling for datetime defaults
//         if (name === "created_at" || name === "updated_at") {
//           return adapter.getDatetimeNowSql();
//         }
//         return value;
//       })();

//       return {
//         cid: index,
//         name,
//         type,
//         notnull: constraints.includes("NOT NULL") ? 1 : 0,
//         dflt_value,
//         pk: constraints.includes("PRIMARY KEY") ? 1 : 0,
//         unique: constraints.includes("UNIQUE"),
//       };
//     });

//   // Get subsequent migrations that affect this table
//   const relevantMigrations = migrations.filter(
//     (file) =>
//       file > createMigration &&
//       (file.toLowerCase().includes(`_${table.toLowerCase()}_`) ||
//         file.toLowerCase().includes(`_${table.toLowerCase().slice(0, -1)}_`) ||
//         file.toLowerCase().includes(`_in_${table.toLowerCase()}`) ||
//         file.toLowerCase().includes(`_to_${table.toLowerCase()}`))
//   );

//   console.log("Found migrations:", relevantMigrations);

//   let columnMappings = new Map();
//   let currentColumns = new Set(tableInfo.map((col) => col.name));

//   // Process each migration in order
//   for (const migration of relevantMigrations) {
//     console.log(`Processing migration: ${migration}`);
//     const content = fs.readFileSync(
//       path.join(migrationsDir, migration),
//       "utf8"
//     );

//     // Handle renames by checking INSERT statement
//     if (migration.includes("rename_")) {
//       const insertMatch = content.match(
//         /INSERT INTO [^(]+\(([^)]+)\)[^S]+SELECT ([^)]+)\s+FROM/
//       );
//       if (insertMatch) {
//         const [, targetCols, sourceCols] = insertMatch;
//         const targets = targetCols.split(",").map((c) => c.trim());
//         const sources = sourceCols.split(",").map((c) => c.trim());

//         targets.forEach((target, i) => {
//           const source = sources[i];
//           if (target !== source && currentColumns.has(source)) {
//             const colIndex = tableInfo.findIndex((col) => col.name === source);
//             if (colIndex !== -1) {
//               currentColumns.delete(source);
//               currentColumns.add(target);
//               tableInfo[colIndex].name = target;
//               columnMappings.set(target, source);
//             }
//           }
//         });
//       }
//     }

//     // Extract the CREATE TABLE statement to get the latest column definitions
//     const createTableMatch = content.match(/CREATE TABLE [^(]+\(([\s\S]+?)\);/);
//     if (createTableMatch) {
//       const columnDefs = createTableMatch[1]
//         .split(",")
//         .map((col) => col.trim())
//         .filter((col) => col);

//       // Update existing columns with any changes
//       columnDefs.forEach((colDef) => {
//         const parts = colDef.match(/[^\s"'()]+|"([^"]*)"|'([^']*)'|\([^)]+\)/g);
//         const name = parts[0];
//         const type = parts[1];
//         const constraints = parts.slice(2).join(" ");

//         const dflt_value = (() => {
//           const defaultMatch = constraints.match(
//             /DEFAULT\s+(?:\()?([^,\s)]+(?:\s*\|\|\s*[^,\s)]+)*)\)?/
//           );
//           if (!defaultMatch) return null;
//           const value = defaultMatch[1];
//           if (name === "created_at" || name === "updated_at") {
//             return adapter.getDatetimeNowSql();
//           }
//           return value;
//         })();

//         // Find existing column or add new one
//         const existingCol = tableInfo.find((col) => col.name === name);
//         if (existingCol && currentColumns.has(name)) {
//           // Update existing column
//           existingCol.type = type;
//           existingCol.notnull = constraints.includes("NOT NULL") ? 1 : 0;
//           existingCol.dflt_value = dflt_value;
//           existingCol.pk = constraints.includes("PRIMARY KEY") ? 1 : 0;
//           existingCol.unique = constraints.includes("UNIQUE");
//         } else if (!currentColumns.has(name)) {
//           // Add new column
//           currentColumns.add(name);
//           tableInfo.push({
//             cid: tableInfo.length,
//             name,
//             type,
//             notnull: constraints.includes("NOT NULL") ? 1 : 0,
//             dflt_value,
//             pk: constraints.includes("PRIMARY KEY") ? 1 : 0,
//             unique: constraints.includes("UNIQUE"),
//           });
//         }
//       });
//     }
//   }

//   // Get existing triggers from database if available
//   let triggers = [];
//   if (adapter) {
//     triggers = await adapter.getTriggers(table);
//   }

//   // Clean up any duplicate columns
//   tableInfo = tableInfo.filter((col, index) => {
//     const firstIndex = tableInfo.findIndex((c) => c.name === col.name);
//     return firstIndex === index;
//   });

//   // Reassign cids
//   tableInfo.forEach((col, index) => {
//     col.cid = index;
//   });

//   console.log("Final table structure:", tableInfo);
//   console.log("Column mappings:", columnMappings);

//   return { tableInfo, columnMappings, triggers };
// }

// module.exports = {
//   getTableStructure,
// };

const fs = require("fs");
const path = require("path");
const { log } = require("../../../utils/chalkUtils");

function getVersionFromFilename(filename) {
  const match = filename.match(/^(\d{14})/);
  return match ? match[1] : null;
}

async function getTableStructure(table, adapter, migrationsDir) {
  console.log(`\nGetting table structure for ${table}`);

  // 1. Get structure from migrations
  const migrationStructure = await getMigrationStructure(
    table,
    adapter,
    migrationsDir
  );
  console.log("\nStructure from migrations:", migrationStructure);

  // 2. Get structure from database
  const dbStructure = await getDatabaseStructure(table, adapter);
  console.log("\nStructure from database:", dbStructure);

  // 3. Validate and merge structures
  return validateAndMergeStructures(migrationStructure, dbStructure, table);
}

async function getMigrationStructure(table, adapter, migrationsDir) {
  // Get all migrations affecting this table
  const migrations = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql") && !file.endsWith("_down.sql"))
    .sort((a, b) => {
      // Sort by timestamp in filename
      const versionA = parseInt(getVersionFromFilename(a));
      const versionB = parseInt(getVersionFromFilename(b));
      return versionA - versionB;
    });

  console.log("Processing migrations:", migrations);

  // First find the create table migration
  const createMigration = migrations.find(
    (file) =>
      file.toLowerCase().includes(`create_${table.toLowerCase()}`) ||
      file.toLowerCase().includes(`create_${table.toLowerCase().slice(0, -1)}`)
  );

  if (!createMigration) {
    throw new Error(`Could not find create table migration for ${table}`);
  }

  console.log("Found create migration:", createMigration);

  // Get initial table structure from create migration
  const createContent = fs.readFileSync(
    path.join(migrationsDir, createMigration),
    "utf8"
  );

  console.log("Migration content:", createContent);

  // Updated regex to handle both MySQL and SQLite CREATE TABLE statements
  const createMatch = createContent.match(
    /CREATE\s+TABLE\s+(?:`?\w+`?)\s*\(([\s\S]+?)\)(?:\s*ENGINE.*)?;/i
  );

  if (!createMatch) {
    console.error("Failed to parse CREATE TABLE statement");
    console.log("Content being parsed:", createContent);
    console.log(
      "Regex used:",
      /CREATE\s+TABLE\s+(?:`?\w+`?)\s*\(([\s\S]+?)\)(?:\s*ENGINE.*)?;/i
    );
    throw new Error(
      `Could not parse CREATE TABLE statement in ${createMigration}`
    );
  }

  console.log("Matched CREATE TABLE content:", createMatch[1]);

  // Parse initial columns with improved splitting
  let tableInfo = createMatch[1]
    .split(/,(?![^(]*\))/) // Split on commas not inside parentheses
    .map((col) => col.trim())
    .filter((col) => col);

  console.log("Split columns:", tableInfo);

  tableInfo = tableInfo
    .map((colDef, index) => {
      console.log(`\nProcessing column definition: "${colDef}"`);

      // Improved regex to handle both MySQL and SQLite column definitions
      const parts = colDef.match(/`?(\w+)`?\s+([^\s(]+(?:\([^)]+\))?)\s*(.*)/i);

      if (!parts) {
        console.error("Failed to parse column definition:", colDef);
        return null;
      }

      const [, name, type, constraints] = parts;

      console.log("Column details:", {
        name,
        type,
        constraints,
      });

      const dflt_value = (() => {
        const defaultMatch = constraints.match(
          /DEFAULT\s+(?:'([^']+)'|(\w+)|(\([^)]+\)))/i
        );
        if (!defaultMatch) return null;
        return defaultMatch[1] || defaultMatch[2] || defaultMatch[3];
      })();

      const columnInfo = {
        cid: index,
        name,
        type: normalizeColumnType(type, adapter),
        notnull: constraints.toUpperCase().includes("NOT NULL") ? 1 : 0,
        dflt_value,
        pk: constraints.toUpperCase().includes("PRIMARY KEY") ? 1 : 0,
        unique: constraints.toUpperCase().includes("UNIQUE"),
        auto_increment:
          constraints.toUpperCase().includes("AUTO_INCREMENT") ||
          constraints.toUpperCase().includes("AUTOINCREMENT"),
      };

      console.log("Processed column info:", columnInfo);
      return columnInfo;
    })
    .filter(Boolean); // Remove any null entries from failed parsing

  // Get subsequent migrations that affect this table
  const relevantMigrations = migrations.filter(
    (file) =>
      file > createMigration &&
      (file.toLowerCase().includes(`_${table.toLowerCase()}_`) ||
        file.toLowerCase().includes(`_${table.toLowerCase().slice(0, -1)}_`) ||
        file.toLowerCase().includes(`_in_${table.toLowerCase()}`) ||
        file.toLowerCase().includes(`_to_${table.toLowerCase()}`))
  );

  log.info("Found migrations:", relevantMigrations);

  let columnMappings = new Map();
  let currentColumns = new Set(tableInfo.map((col) => col.name));

  // Process each migration in order
  for (const migration of relevantMigrations) {
    log.info(`Processing migration: ${migration}`);
    const content = fs.readFileSync(
      path.join(migrationsDir, migration),
      "utf8"
    );

    // Handle renames by checking INSERT statement
    if (migration.includes("rename_")) {
      const insertMatch = content.match(
        /INSERT INTO [^(]+\(([^)]+)\)[^S]+SELECT ([^)]+)\s+FROM/
      );
      if (insertMatch) {
        const [, targetCols, sourceCols] = insertMatch;
        const targets = targetCols.split(",").map((c) => c.trim());
        const sources = sourceCols.split(",").map((c) => c.trim());

        targets.forEach((target, i) => {
          const source = sources[i];
          if (target !== source && currentColumns.has(source)) {
            const colIndex = tableInfo.findIndex((col) => col.name === source);
            if (colIndex !== -1) {
              currentColumns.delete(source);
              currentColumns.add(target);
              tableInfo[colIndex].name = target;
              columnMappings.set(target, source);
            }
          }
        });
      }
    }

    // Extract ALTER TABLE statements to get column changes
    const alterTableStatements = content.match(/ALTER TABLE [^;]+/g) || [];
    alterTableStatements.forEach((statement) => {
      // Handle ADD COLUMN
      const addMatch = statement.match(
        /ADD (?:COLUMN\s+)?`?(\w+)`?\s+([^,\s(]+(?:\([^)]+\))?)(.*)/i
      );
      if (addMatch) {
        const [, name, type, constraints] = addMatch;
        if (!currentColumns.has(name)) {
          currentColumns.add(name);
          tableInfo.push({
            cid: tableInfo.length,
            name,
            type: normalizeColumnType(type, adapter),
            notnull: constraints.toUpperCase().includes("NOT NULL") ? 1 : 0,
            dflt_value: extractDefaultValue(constraints),
            pk: constraints.toUpperCase().includes("PRIMARY KEY") ? 1 : 0,
            unique: constraints.toUpperCase().includes("UNIQUE"),
            auto_increment:
              constraints.toUpperCase().includes("AUTO_INCREMENT") ||
              constraints.toUpperCase().includes("AUTOINCREMENT"),
          });
        }
      }

      // Handle MODIFY COLUMN
      const modifyMatch = statement.match(
        /MODIFY (?:COLUMN\s+)?`?(\w+)`?\s+([^,\s(]+(?:\([^)]+\))?)(.*)/i
      );
      if (modifyMatch) {
        const [, name, type, constraints] = modifyMatch;
        const existingCol = tableInfo.find((col) => col.name === name);
        if (existingCol) {
          existingCol.type = normalizeColumnType(type, adapter);
          existingCol.notnull = constraints.toUpperCase().includes("NOT NULL")
            ? 1
            : 0;
          existingCol.dflt_value = extractDefaultValue(constraints);
          existingCol.pk = constraints.toUpperCase().includes("PRIMARY KEY")
            ? 1
            : 0;
          existingCol.unique = constraints.toUpperCase().includes("UNIQUE");
          existingCol.auto_increment =
            constraints.toUpperCase().includes("AUTO_INCREMENT") ||
            constraints.toUpperCase().includes("AUTOINCREMENT");
        }
      }

      // Handle CHANGE COLUMN (MySQL specific)
      const changeMatch = statement.match(
        /CHANGE (?:COLUMN\s+)?`?(\w+)`?\s+`?(\w+)`?\s+([^,\s(]+(?:\([^)]+\))?)(.*)/i
      );
      if (changeMatch) {
        const [, oldName, newName, type, constraints] = changeMatch;
        const existingCol = tableInfo.find((col) => col.name === oldName);
        if (existingCol) {
          currentColumns.delete(oldName);
          currentColumns.add(newName);
          existingCol.name = newName;
          existingCol.type = normalizeColumnType(type, adapter);
          existingCol.notnull = constraints.toUpperCase().includes("NOT NULL")
            ? 1
            : 0;
          existingCol.dflt_value = extractDefaultValue(constraints);
          existingCol.pk = constraints.toUpperCase().includes("PRIMARY KEY")
            ? 1
            : 0;
          existingCol.unique = constraints.toUpperCase().includes("UNIQUE");
          existingCol.auto_increment =
            constraints.toUpperCase().includes("AUTO_INCREMENT") ||
            constraints.toUpperCase().includes("AUTOINCREMENT");
          columnMappings.set(newName, oldName);
        }
      }
    });
  }

  // Get existing triggers from database if available
  let triggers = [];
  try {
    if (adapter && typeof adapter.getTriggers === "function") {
      triggers = await adapter.getTriggers(table);
    }
  } catch (error) {
    log.warn(`Could not fetch triggers: ${error.message}`);
  }

  // Clean up any duplicate columns
  tableInfo = tableInfo.filter((col, index) => {
    const firstIndex = tableInfo.findIndex((c) => c.name === col.name);
    return firstIndex === index;
  });

  // Reassign cids
  tableInfo.forEach((col, index) => {
    col.cid = index;
  });

  log.info("Final table structure:", tableInfo);
  log.info("Column mappings:", columnMappings);

  return { tableInfo, columnMappings, triggers };
}

async function getDatabaseStructure(table, adapter) {
  console.log("\n=== getDatabaseStructure Called ===");
  console.log("Getting structure for table:", table);

  try {
    // Get table info from database
    const tableInfo = await adapter.getTableInfo(table);
    console.log(
      "Raw table info from adapter:",
      JSON.stringify(tableInfo, null, 2)
    );

    if (!tableInfo || !Array.isArray(tableInfo)) {
      console.warn("No table info returned from adapter");
      return { tableInfo: [], triggers: [] };
    }

    // Validate and process each column
    const processedInfo = tableInfo
      .map((col, index) => {
        console.log(`\nProcessing database column ${index}:`, col);

        if (!col || typeof col !== "object") {
          console.warn("Invalid column data:", col);
          return null;
        }

        // Ensure required properties exist
        const columnInfo = {
          cid: index,
          name: col.name || null,
          type: col.type || "VARCHAR(255)",
          notnull: typeof col.notnull === "number" ? col.notnull : 0,
          dflt_value: col.dflt_value || null,
          pk: typeof col.pk === "number" ? col.pk : 0,
          unique: !!col.unique,
          auto_increment: !!col.auto_increment,
        };

        console.log("Processed column info:", columnInfo);
        return columnInfo;
      })
      .filter(Boolean); // Remove null entries

    console.log(
      "\nProcessed table info:",
      JSON.stringify(processedInfo, null, 2)
    );

    // Get triggers if available
    const triggers = (await adapter.getTriggers?.(table)) || [];
    console.log("Triggers:", triggers);

    return {
      tableInfo: processedInfo,
      triggers,
    };
  } catch (error) {
    console.error("Error in getDatabaseStructure:", {
      message: error.message,
      stack: error.stack,
      table,
    });
    throw error;
  }
}

function validateAndMergeStructures(migrationStructure, dbStructure, table) {
  console.log("\nValidating and merging structures...");

  const { tableInfo: migrationColumns, triggers: migrationTriggers } =
    migrationStructure;
  const { tableInfo: dbColumns, triggers: dbTriggers } = dbStructure;

  // Compare columns
  const differences = findStructureDifferences(migrationColumns, dbColumns);
  if (differences.length > 0) {
    console.warn(
      "\nWarning: Differences found between migrations and database:"
    );
    differences.forEach((diff) => console.warn(`- ${diff}`));
  }

  // Merge structures (prefer database structure but keep migration history)
  const mergedColumns = dbColumns.map((dbCol) => {
    const migrationCol = migrationColumns.find(
      (col) => col.name === dbCol.name
    );
    return {
      ...dbCol,
      migration_history: migrationCol ? true : false,
    };
  });

  // Merge triggers
  const mergedTriggers = [...new Set([...dbTriggers, ...migrationTriggers])];

  return {
    tableInfo: mergedColumns,
    triggers: mergedTriggers,
    columnMappings: migrationStructure.columnMappings,
  };
}

function findStructureDifferences(migrationColumns, dbColumns) {
  const differences = [];

  // Check for columns in migrations but not in database
  migrationColumns.forEach((migCol) => {
    const dbCol = dbColumns.find((col) => col.name === migCol.name);
    if (!dbCol) {
      differences.push(
        `Column '${migCol.name}' exists in migrations but not in database`
      );
    } else {
      // Check for type differences
      if (normalizeType(migCol.type) !== normalizeType(dbCol.type)) {
        differences.push(
          `Column '${migCol.name}' has different types: migration=${migCol.type}, db=${dbCol.type}`
        );
      }
      // Check for null constraint differences
      if (migCol.notnull !== dbCol.notnull) {
        differences.push(
          `Column '${migCol.name}' has different NULL constraints`
        );
      }
      // Check for primary key differences
      if (migCol.pk !== dbCol.pk) {
        differences.push(
          `Column '${migCol.name}' has different PRIMARY KEY status`
        );
      }
    }
  });

  // Check for columns in database but not in migrations
  dbColumns.forEach((dbCol) => {
    if (!migrationColumns.find((col) => col.name === dbCol.name)) {
      differences.push(
        `Column '${dbCol.name}' exists in database but not in migrations`
      );
    }
  });

  return differences;
}

function normalizeType(type) {
  return type.toLowerCase().replace(/\s+/g, "");
}

function extractDefaultValue(constraints) {
  const defaultMatch = constraints.match(
    /DEFAULT\s+(?:\()?([^,\s)]+(?:\s*\|\|\s*[^,\s)]+)*)\)?/
  );
  return defaultMatch ? defaultMatch[1] : null;
}

function normalizeColumnType(type, adapter) {
  if (!type) return "VARCHAR(255)";

  // Handle string format with colons (e.g., "string:null:false:unique")
  if (type.includes(":")) {
    const [baseType, ...params] = type.split(":");
    type = baseType;
  }

  // Extract base type and parameters
  const typeMatch = type.match(/([^\s(]+)(?:\(([^)]+)\))?/i);
  if (!typeMatch) return "VARCHAR(255)";

  const [, baseType, params] = typeMatch;
  const normalizedType = baseType.toUpperCase();

  // Use adapter.type instead of constructor.name for more reliable type checking
  switch (adapter.type) {
    case "sqlite":
      switch (normalizedType) {
        case "STRING":
        case "TEXT":
        case "VARCHAR":
        case "CHAR":
          return "TEXT";
        case "INTEGER":
        case "INT":
        case "BIGINT":
        case "SMALLINT":
          return "INTEGER";
        case "FLOAT":
        case "DOUBLE":
        case "DECIMAL":
        case "NUMERIC":
        case "REAL":
          return "REAL";
        case "BOOLEAN":
        case "TINYINT":
          return "INTEGER";
        case "DATE":
        case "DATETIME":
        case "TIMESTAMP":
          return "DATETIME";
        case "BLOB":
        case "BINARY":
          return "BLOB";
        default:
          return "TEXT";
      }

    case "mysql":
      switch (normalizedType) {
        case "STRING":
        case "VARCHAR":
          return `VARCHAR(${params || "255"})`;
        case "CHAR":
          return `CHAR(${params || "255"})`;
        case "TEXT":
          if (params) {
            const length = parseInt(params);
            if (length <= 255) return "TINYTEXT";
            if (length <= 65535) return "TEXT";
            if (length <= 16777215) return "MEDIUMTEXT";
            return "LONGTEXT";
          }
          return "TEXT";
        case "INT":
        case "INTEGER":
          if (params) return `INT(${params})`;
          return "INT";
        case "BIGINT":
          if (params) return `BIGINT(${params})`;
          return "BIGINT";
        case "SMALLINT":
          if (params) return `SMALLINT(${params})`;
          return "SMALLINT";
        case "TINYINT":
          if (params) return `TINYINT(${params})`;
          return "TINYINT";
        case "FLOAT":
          if (params) return `FLOAT(${params})`;
          return "FLOAT";
        case "DOUBLE":
          if (params) return `DOUBLE(${params})`;
          return "DOUBLE";
        case "DECIMAL":
        case "NUMERIC":
          return `DECIMAL(${params || "10,2"})`;
        case "BOOLEAN":
          return "TINYINT(1)";
        case "DATE":
          return "DATE";
        case "DATETIME":
          return "DATETIME";
        case "TIMESTAMP":
          return "TIMESTAMP";
        case "TIME":
          return "TIME";
        case "YEAR":
          return "YEAR";
        case "BLOB":
          if (params) {
            const length = parseInt(params);
            if (length <= 255) return "TINYBLOB";
            if (length <= 65535) return "BLOB";
            if (length <= 16777215) return "MEDIUMBLOB";
            return "LONGBLOB";
          }
          return "BLOB";
        case "BINARY":
        case "VARBINARY":
          return `${normalizedType}(${params || "255"})`;
        case "BIT":
          if (params) return `BIT(${params})`;
          return "BIT";
        case "ENUM":
        case "SET":
          if (params) return `${normalizedType}(${params})`;
          return `${normalizedType}('')`;
        case "JSON":
          return "JSON";
        default:
          return "VARCHAR(255)";
      }

    case "postgresql":
      switch (normalizedType) {
        case "STRING":
        case "VARCHAR":
          return `VARCHAR(${params || "255"})`;
        case "CHAR":
          return `CHAR(${params || "255"})`;
        case "TEXT":
          return "TEXT";
        case "INT":
        case "INTEGER":
          return "INTEGER";
        case "BIGINT":
          return "BIGINT";
        case "SMALLINT":
          return "SMALLINT";
        case "FLOAT":
          return "REAL";
        case "DOUBLE":
          return "DOUBLE PRECISION";
        case "DECIMAL":
        case "NUMERIC":
          return `DECIMAL(${params || "10,2"})`;
        case "BOOLEAN":
          return "BOOLEAN";
        case "DATE":
          return "DATE";
        case "DATETIME":
        case "TIMESTAMP":
          if (params && params.toLowerCase().includes("timezone")) {
            return "TIMESTAMP WITH TIME ZONE";
          }
          return "TIMESTAMP";
        case "TIME":
          if (params && params.toLowerCase().includes("timezone")) {
            return "TIME WITH TIME ZONE";
          }
          return "TIME";
        case "INTERVAL":
          if (params) return `INTERVAL ${params}`;
          return "INTERVAL";
        case "JSON":
          return "JSON";
        case "JSONB":
          return "JSONB";
        case "UUID":
          return "UUID";
        case "BYTEA":
        case "BLOB":
        case "BINARY":
          return "BYTEA";
        case "MONEY":
          return "MONEY";
        case "CIDR":
          return "CIDR";
        case "INET":
          return "INET";
        case "MACADDR":
          return "MACADDR";
        case "BIT":
        case "VARBIT":
          if (params) return `${normalizedType}(${params})`;
          return normalizedType;
        case "TSVECTOR":
          return "TSVECTOR";
        case "TSQUERY":
          return "TSQUERY";
        case "POINT":
          return "POINT";
        case "LINE":
          return "LINE";
        case "LSEG":
          return "LSEG";
        case "BOX":
          return "BOX";
        case "PATH":
          return "PATH";
        case "POLYGON":
          return "POLYGON";
        case "CIRCLE":
          return "CIRCLE";
        default:
          return "VARCHAR(255)";
      }

    default:
      return type;
  }
}

module.exports = {
  getTableStructure,
};
