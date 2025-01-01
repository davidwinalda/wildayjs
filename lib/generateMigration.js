const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
// const dbPath = path.join(process.cwd(), "db", "development.sqlite3");
// const db = new Database(dbPath);
const {
  processDefaultValue,
  validateDefaultValue,
} = require("./utils/defaultValueHelper");

// Helper to generate timestamp-based migration file names
const generateTimestamp = () => {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(
    2,
    "0"
  )}${String(now.getMinutes()).padStart(2, "0")}${String(
    now.getSeconds()
  ).padStart(2, "0")}`;
};

// Map Rails-like DSL to SQLite types
const typeMappings = {
  // String types
  string: "TEXT",
  text: "TEXT",
  binary: "BLOB",

  // Numeric types
  integer: "INTEGER",
  bigint: "INTEGER",
  decimal: "DECIMAL",
  float: "REAL",
  number: "NUMERIC",

  // Date/Time types
  datetime: "DATETIME",
  timestamp: "DATETIME",
  date: "DATE",
  time: "TIME",

  // Boolean type
  boolean: "BOOLEAN",

  // Other types
  json: "TEXT", // SQLite stores JSON as TEXT
  references: "INTEGER", // For foreign keys
  belongs_to: "INTEGER", // Alias for references

  // Primary key type
  primary_key: "INTEGER PRIMARY KEY AUTOINCREMENT",
};

const parseColumns = (columns) => {
  const regularColumns = [];
  const foreignKeys = [];

  columns.forEach((column) => {
    const parts = column.split(":");
    const name = parts[0];
    const type = parts[1];
    const modifiers = parts.slice(2);

    // Handle references (foreign keys) like Rails
    if (type === "references" || type === "belongs_to") {
      const targetTable = name + "s"; // pluralize the table name
      const columnName = `${name}_id`;
      // Add the column definition
      regularColumns.push(`${columnName} ${typeMappings["integer"]} NOT NULL`);
      // Add the foreign key constraint
      foreignKeys.push(
        `FOREIGN KEY (${columnName}) REFERENCES ${targetTable} (id)`
      );
    } else {
      // Handle regular columns with Rails-style modifiers
      let constraints = [];

      if (modifiers.includes("null") && modifiers.includes("false")) {
        constraints.push("NOT NULL");
      }
      if (modifiers.includes("unique")) {
        constraints.push("UNIQUE");
      }

      regularColumns.push(
        `${name} ${typeMappings[type]} ${constraints.join(" ")}`.trim()
      );
    }
  });

  return { regularColumns, foreignKeys };
};

// Add this function to detect join tables
function isJoinTable(tableName, columns) {
  const references = columns.filter(
    (col) => col.split(":")[1] === "references"
  );
  return references.length === 2;
}

// Update the toSnakeCase function to handle join tables
function toSnakeCase(str, columns = []) {
  // Remove 'Create' prefix
  str = str.replace(/Create/, "");

  // If this is a join table, order the parts alphabetically
  if (isJoinTable(str, columns)) {
    // Split CamelCase into words and remove any existing 's' at the end
    const parts = str.match(/[A-Z][a-z]+/g).map(
      (part) => part.replace(/s$/, "") // Remove trailing 's' if it exists
    );

    if (parts.length === 2) {
      return parts
        .map((part) => part.toLowerCase() + "s") // Add single 's' to each part
        .sort() // sort alphabetically
        .join("_"); // join with underscore
    }
  }

  // Regular table name conversion for non-join tables
  return str
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}

// New function to parse migration action
function parseMigrationAction(migrationName) {
  const actions = {
    Add: "add",
    Change: "change",
    Remove: "remove",
  };

  let action, table, fields;

  // Match pattern like "AddXXXToYYY" or "ChangeXXXInYYY" or "RemoveXXXFromYYY"
  const addMatch = migrationName.match(/^Add(.+)To(\w+)$/);
  const changeMatch = migrationName.match(/^Change(.+)In(\w+)$/);
  const removeMatch = migrationName.match(/^Remove(.+)From(\w+)$/);

  if (addMatch) {
    action = "add";
    fields = addMatch[1].split("And");
    table = addMatch[2].toLowerCase();
  } else if (changeMatch) {
    action = "change";
    fields = changeMatch[1].split("And");
    table = changeMatch[2].toLowerCase();
  } else if (removeMatch) {
    action = "remove";
    fields = removeMatch[1].split("And");
    table = removeMatch[2].toLowerCase();
  }

  return {
    action,
    table,
    fields: fields ? fields.map((f) => f.toLowerCase()) : [],
  };
}

function parseColumnDefinition(column) {
  const parts = column.split(":");
  const name = parts[0];
  const type = parts[1];
  const modifiers = parts.slice(2);

  let columnDef = `${name} ${typeMappings[type] || "TEXT"}`;
  let constraints = [];
  let defaultValue = null;

  // Parse default value if exists
  const defaultModifier = modifiers.find((mod) => mod.startsWith("default="));
  if (defaultModifier) {
    const rawDefaultValue = defaultModifier.split("=")[1];

    // Validate default value pattern
    if (!validateDefaultValue(rawDefaultValue)) {
      throw new Error(`Invalid default value pattern for column ${name}`);
    }

    // Process the default value
    defaultValue = `DEFAULT '${processDefaultValue(rawDefaultValue)}'`;

    // Remove default from modifiers
    modifiers.splice(modifiers.indexOf(defaultModifier), 1);
  }

  if (modifiers.includes("null") && modifiers.includes("false")) {
    constraints.push("NOT NULL");
  }
  if (modifiers.includes("unique")) {
    constraints.push("UNIQUE");
  }
  if (modifiers.includes("primary")) {
    constraints.push("PRIMARY KEY");
  }

  // Combine all parts (renamed to columnParts to avoid conflict)
  const columnParts = [columnDef];
  if (constraints.length > 0) {
    columnParts.push(constraints.join(" "));
  }
  if (defaultValue) {
    columnParts.push(defaultValue);
  }

  return { columnDef: columnParts.join(" "), constraints };
}

const generateMigration = (migrationName, columns) => {
  const migrationDir = path.join(process.cwd(), "db", "migrate");
  const downDir = path.join(migrationDir, "down");
  const dbPath = path.join(process.cwd(), "db", "development.sqlite3");

  // Create directories if they don't exist
  if (!fs.existsSync(migrationDir)) {
    fs.mkdirSync(migrationDir, { recursive: true });
  }
  if (!fs.existsSync(downDir)) {
    fs.mkdirSync(downDir, { recursive: true });
  }

  const timestamp = generateTimestamp();
  const { action, table, fields } = parseMigrationAction(migrationName);

  let db;
  try {
    // Only try to connect to database if it exists
    if (fs.existsSync(dbPath)) {
      db = new Database(dbPath);
    }

    if (action) {
      // Handle ALTER TABLE migrations
      let upSql = "";
      let downSql = "";

      switch (action) {
        case "add":
          try {
            // Get existing table structure
            const tableInfo = db
              ? db.prepare(`PRAGMA table_info(${table})`).all()
              : [];
            const existingColumns = tableInfo.map((col) => col.name);

            // Generate UP migration
            upSql = `-- Add new columns to ${table}\n`;
            upSql += `PRAGMA foreign_keys=off;\n\n`;
            upSql += `BEGIN TRANSACTION;\n\n`;

            // Step 1: Create temporary table with existing data
            upSql += `-- Create temporary table with existing structure and data\n`;
            upSql += `CREATE TABLE ${table}_temp AS\n`;
            upSql += `SELECT ${existingColumns.join(", ")}\n`;
            upSql += `FROM ${table};\n\n`;

            // Step 2: Drop original table
            upSql += `-- Drop original table\n`;
            upSql += `DROP TABLE ${table};\n\n`;

            // Step 3: Create new table with all columns
            upSql += `-- Create new table with all columns\n`;
            upSql += `CREATE TABLE ${table} (\n`;

            // Add existing columns with their original constraints
            tableInfo.forEach((col) => {
              upSql += `  ${col.name} ${col.type}`;
              if (col.pk) upSql += ` PRIMARY KEY AUTOINCREMENT`;
              if (col.notnull) upSql += ` NOT NULL`;
              if (col.dflt_value) {
                if (col.dflt_value.includes("datetime('now')")) {
                  upSql += ` DEFAULT (datetime('now'))`;
                } else {
                  upSql += ` DEFAULT ${col.dflt_value}`;
                }
              }
              upSql += `,\n`;
            });

            // Add new columns
            columns.forEach((column, index) => {
              const parts = column.split(":");
              const name = parts[0];
              const type = parts[1];
              const modifiers = parts.slice(2);

              let constraints = [];
              if (modifiers.includes("null") && modifiers.includes("false")) {
                constraints.push("NOT NULL");
              }
              if (modifiers.includes("unique")) {
                constraints.push("UNIQUE");
              }

              // Handle default values in column definition
              const defaultModifier = modifiers.find((mod) =>
                mod.startsWith("default=")
              );
              if (defaultModifier) {
                constraints.push("DEFAULT NULL");
              }

              upSql += `  ${name} ${typeMappings[type]} ${constraints.join(
                " "
              )}`;
              upSql += index === columns.length - 1 ? "\n" : ",\n";
            });

            upSql += `);\n\n`;

            // Step 4: Copy data from temp to new table with default values
            const DEFAULT_PATTERNS = {
              id: "id",
              timestamp: "strftime('%Y%m%d%H%M%S', 'now')",
              date: "strftime('%Y%m%d', 'now')",
              time: "strftime('%H%M%S', 'now')",
              random: "substr(hex(randomblob(4)), 1, 8)",
              year: "strftime('%Y', 'now')",
              month: "strftime('%m', 'now')",
              day: "strftime('%d', 'now')",
              hour: "strftime('%H', 'now')",
              minute: "strftime('%M', 'now')",
              second: "strftime('%S', 'now')",
            };

            const processDefaultValue = (value) => {
              if (!value.includes("{")) return value;

              const parts = value.split(/(\{[^}]+\})/);
              const sqlParts = parts
                .map((part) => {
                  const pattern = part.match(/\{([^}]+)\}/);
                  if (pattern) {
                    const patternName = pattern[1];
                    return DEFAULT_PATTERNS[patternName] || `'${part}'`;
                  }
                  return part.trim() ? `'${part}'` : null;
                })
                .filter(Boolean);

              return sqlParts.join(" || ");
            };

            const newColumnValues = columns.map((column) => {
              const name = column.split(":")[0];
              const defaultModifier = column
                .split(":")
                .find((part) => part.startsWith("default="));

              if (defaultModifier) {
                const defaultValue = defaultModifier.split("=")[1];
                const processedValue = processDefaultValue(defaultValue);
                return `${processedValue} AS ${name}`;
              }
              return `NULL AS ${name}`;
            });

            upSql += `-- Copy data with default values for new columns\n`;
            upSql += `INSERT INTO ${table} (${[
              ...existingColumns,
              ...columns.map((c) => c.split(":")[0]),
            ].join(", ")})\n`;
            upSql += `SELECT ${[...existingColumns, ...newColumnValues].join(
              ", "
            )}\n`;
            upSql += `FROM ${table}_temp;\n\n`;

            // Step 5: Drop temporary table
            upSql += `-- Drop temporary table\n`;
            upSql += `DROP TABLE ${table}_temp;\n\n`;

            upSql += `COMMIT;\n\n`;
            upSql += `PRAGMA foreign_keys=on;\n`;

            // Generate DOWN migration
            downSql = `-- Remove added columns from ${table}\n`;
            downSql += `PRAGMA foreign_keys=off;\n\n`;
            downSql += `BEGIN TRANSACTION;\n\n`;

            // Step 1: Create temp table without new columns
            downSql += `-- Create temporary table without new columns\n`;
            downSql += `CREATE TABLE ${table}_temp (\n`;
            tableInfo.forEach((col, index) => {
              downSql += `  ${col.name} ${col.type}`;
              if (col.pk) downSql += ` PRIMARY KEY AUTOINCREMENT`;
              if (col.notnull) downSql += ` NOT NULL`;
              if (col.dflt_value) {
                if (col.dflt_value.includes("datetime('now')")) {
                  downSql += ` DEFAULT (datetime('now'))`;
                } else {
                  downSql += ` DEFAULT ${col.dflt_value}`;
                }
              }
              downSql += index < tableInfo.length - 1 ? ",\n" : "\n";
            });
            downSql += `);\n\n`;

            // Step 2: Copy data excluding new columns
            downSql += `-- Copy data excluding new columns\n`;
            downSql += `INSERT INTO ${table}_temp (${existingColumns.join(
              ", "
            )})\n`;
            downSql += `SELECT ${existingColumns.join(
              ", "
            )} FROM ${table};\n\n`;

            // Step 3: Drop and rename
            downSql += `-- Drop original table\n`;
            downSql += `DROP TABLE ${table};\n\n`;
            downSql += `-- Rename temp table\n`;
            downSql += `ALTER TABLE ${table}_temp RENAME TO ${table};\n\n`;

            downSql += `COMMIT;\n\n`;
            downSql += `PRAGMA foreign_keys=on;\n`;
          } finally {
            if (db) db.close();
          }
          break;

        case "change":
          upSql = `-- Modify columns in ${table}\n`;
          upSql += `PRAGMA foreign_keys=off;\n\n`;
          upSql += `BEGIN TRANSACTION;\n\n`;
          upSql += `-- Create new table with modified schema\n`;
          upSql += `CREATE TABLE ${table}_new (\n`;
          columns.forEach((column) => {
            const { columnDef } = parseColumnDefinition(column);
            upSql += `  ${columnDef},\n`;
          });
          upSql += `);\n\n`;
          upSql += `-- Copy data to new table\n`;
          upSql += `INSERT INTO ${table}_new SELECT * FROM ${table};\n\n`;
          upSql += `-- Drop old table\n`;
          upSql += `DROP TABLE ${table};\n\n`;
          upSql += `-- Rename new table\n`;
          upSql += `ALTER TABLE ${table}_new RENAME TO ${table};\n\n`;
          upSql += `COMMIT;\n\n`;
          upSql += `PRAGMA foreign_keys=on;\n`;

          // Generate DOWN migration
          downSql = `-- Revert column modifications in ${table}\n`;
          downSql += `PRAGMA foreign_keys=off;\n\n`;
          downSql += `BEGIN TRANSACTION;\n\n`;
          downSql += `-- Implement the reverse schema changes here\n`;
          downSql += `COMMIT;\n\n`;
          downSql += `PRAGMA foreign_keys=on;\n`;
          break;

        case "remove":
          upSql = `-- Remove columns from ${table}\n`;
          upSql += `PRAGMA foreign_keys=off;\n\n`;
          upSql += `BEGIN TRANSACTION;\n\n`;
          upSql += `-- Create new table without specified columns\n`;
          upSql += `CREATE TABLE ${table}_new AS\n`;
          upSql += `SELECT * EXCEPT (${fields.join(", ")}) FROM ${table};\n\n`;
          upSql += `-- Drop original table\n`;
          upSql += `DROP TABLE ${table};\n\n`;
          upSql += `-- Rename new table\n`;
          upSql += `ALTER TABLE ${table}_new RENAME TO ${table};\n\n`;
          upSql += `COMMIT;\n\n`;
          upSql += `PRAGMA foreign_keys=on;\n`;

          // Generate DOWN migration
          downSql = `-- Restore removed columns in ${table}\n`;
          downSql += `PRAGMA foreign_keys=off;\n\n`;
          downSql += `BEGIN TRANSACTION;\n\n`;
          downSql += `ALTER TABLE ${table} ADD COLUMN `;
          downSql += fields
            .map((field) => `${field} TEXT`)
            .join(`;\nALTER TABLE ${table} ADD COLUMN `);
          downSql += `;\n\nCOMMIT;\n\n`;
          downSql += `PRAGMA foreign_keys=on;\n`;
          break;
      }

      const upFileName = `${timestamp}_${toSnakeCase(migrationName)}.sql`;
      const downFileName = `${timestamp}_${toSnakeCase(
        migrationName
      )}_down.sql`;

      fs.writeFileSync(path.join(migrationDir, upFileName), upSql);
      fs.writeFileSync(path.join(downDir, downFileName), downSql);

      console.log(`Migration created: ${upFileName}`);
      console.log(`Down migration created: ${downFileName}`);
    } else {
      // Handle CREATE TABLE migrations
      const fileName = `${timestamp}_create_${toSnakeCase(migrationName)}.sql`;
      const { regularColumns, foreignKeys } = parseColumns(columns);

      const parts = ["id INTEGER PRIMARY KEY AUTOINCREMENT"];
      parts.push(...regularColumns);
      parts.push(
        "created_at DATETIME DEFAULT (datetime('now'))",
        "updated_at DATETIME DEFAULT (datetime('now'))"
      );
      if (foreignKeys.length > 0) {
        parts.push(...foreignKeys);
      }

      const sql = `CREATE TABLE ${toSnakeCase(migrationName)} (\n  ${parts.join(
        ",\n  "
      )}\n);`;

      // Generate DOWN migration with proper foreign key handling
      const downSql =
        `-- Remove table ${toSnakeCase(migrationName)}\n` +
        `PRAGMA foreign_keys=off;\n\n` +
        `DROP TABLE IF EXISTS ${toSnakeCase(migrationName)};\n\n` +
        `PRAGMA foreign_keys=on;`;

      fs.writeFileSync(path.join(migrationDir, fileName), sql);
      fs.writeFileSync(
        path.join(downDir, fileName.replace(".sql", "_down.sql")),
        downSql
      );

      console.log(`Migration created: ${fileName}`);
      console.log(
        `Down migration created: ${fileName.replace(".sql", "_down.sql")}`
      );
    }
  } finally {
    if (db) db.close();
  }
};

// Command-line interface for the script
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error(`
      Usage: 
        Create new table:
          wildayjs generate:migration CreateUsers name:string email:string:null:false:unique
      
        Add columns:
          wildayjs generate:migration AddPasswordToUsers password:string:null:false
          wildayjs generate:migration AddAgeAndPhoneToUsers age:integer phone:string
      
        Change columns:
          wildayjs generate:migration ChangeEmailInUsers email:string:null:false:unique
      
        Remove columns:
          wildayjs generate:migration RemovePhoneFromUsers phone

       Available column types:
        String types:
          string     : TEXT - For short strings
          text       : TEXT - For longer text
          binary     : BLOB - For binary data
        
        Numeric types:
          integer    : INTEGER - Standard integers
          bigint     : INTEGER - Large integers
          decimal    : DECIMAL - Precise decimal numbers
          float      : REAL - Floating point numbers
          number     : NUMERIC - Generic numeric type
        
        Date/Time types:
          datetime   : DATETIME - Date and time
          timestamp  : DATETIME - Alias for datetime
          date       : DATE - Just date
          time       : TIME - Just time
        
        Other types:
          boolean    : BOOLEAN - True/False values
          json       : TEXT - JSON data
          references : INTEGER - Creates a foreign key column - Creates INTEGER column with foreign key constraint (e.g., user:references → user_id INTEGER + FOREIGN KEY)
          belongs_to : INTEGER - Alias for references - Alias for references (e.g., user:belongs_to → user_id INTEGER + FOREIGN KEY)

      Column modifiers:
        null:false  : NOT NULL constraint
        unique      : UNIQUE constraint
        primary     : PRIMARY KEY constraint
        default=value : Sets default value

      Default value patterns:
        {id}       : Record's ID
        {timestamp}: Current timestamp (YYYYMMDDhhmmss)
        {date}     : Current date (YYYYMMDD)
        {time}     : Current time (hhmmss)
        {random}   : Random 8-character string

      Examples:
        default=user_{id}              → user_1, user_2, etc
        default=member_{id}_{timestamp} → member_1_20241229235959
        default=user_{random}          → user_a1b2c3d4
        default={id}@example.com       → 1@example.com
          `);
    process.exit(1);
  }

  let tableName = args[0];
  console.log("Original tableName:", tableName); // Debug log

  if (tableName.startsWith("Create")) {
    // Remove 'Create' prefix and convert to lowercase
    tableName = tableName
      .substring(6) // Remove 'Create' (6 characters)
      .toLowerCase();
    console.log("After transformation:", tableName); // Debug log
  }

  const columns = args.slice(1);
  console.log("Final tableName before generateMigration:", tableName); // Debug log
  generateMigration(tableName, columns);
}

module.exports = generateMigration;
