// function generateColumnDefinition(col, changes, uniqueColumns) {
//   console.log("Generating definition for:", col.name);

//   // Handle column renames
//   if (changes?.isRename) {
//     let sql = `  ${changes.newName} ${changes.type}`;

//     if (col.pk) sql += ` PRIMARY KEY AUTOINCREMENT`;
//     if (col.notnull) sql += ` NOT NULL`;

//     if (col.dflt_value) {
//       if (col.name === "created_at" || col.name === "updated_at") {
//         sql += ` DEFAULT (datetime('now'))`;
//       } else if (col.dflt_value.includes("||")) {
//         sql += ` DEFAULT (${col.dflt_value})`;
//       } else {
//         sql += ` DEFAULT ${col.dflt_value}`;
//       }
//     }

//     if (col.unique || uniqueColumns.has(col.name)) sql += ` UNIQUE`;
//     return sql;
//   }

//   // Handle normal column changes
//   let sql = `  ${col.name} ${
//     changes ? typeMappings[changes.type] || changes.type : col.type
//   }`;

//   if (col.pk) sql += ` PRIMARY KEY AUTOINCREMENT`;

//   if (
//     (!changes && col.notnull) ||
//     (changes && !changes.modifiers?.includes("null=true") && col.notnull)
//   ) {
//     sql += ` NOT NULL`;
//   }

//   // Handle default values
//   if (changes?.modifiers) {
//     const defaultMod = changes.modifiers.find((m) => m.startsWith("default="));
//     if (defaultMod) {
//       const defaultValue = defaultMod.split("=")[1];
//       const processedValue = processDefaultValue(defaultValue);
//       sql += ` DEFAULT (${processedValue})`;
//     }
//   } else if (col.dflt_value) {
//     if (col.name === "created_at" || col.name === "updated_at") {
//       sql += ` DEFAULT (datetime('now'))`;
//     } else if (col.dflt_value.includes("||")) {
//       sql += ` DEFAULT (${col.dflt_value})`;
//     } else {
//       sql += ` DEFAULT ${col.dflt_value}`;
//     }
//   }

//   if (
//     (!changes && (col.unique || uniqueColumns.has(col.name))) ||
//     (changes &&
//       !changes.modifiers?.includes("unique=false") &&
//       (col.unique || uniqueColumns.has(col.name)))
//   ) {
//     sql += ` UNIQUE`;
//   }

//   return sql;
// }

// module.exports = {
//   generateColumnDefinition,
// };

const { getTypeMappings } = require("../../config/typeMapping");
const { processDefaultValue } = require("./utils");

function generateColumnDefinition(col, changes, uniqueColumns, adapter) {
  if (!adapter || typeof adapter.escapeIdentifier !== "function") {
    throw new Error("Invalid adapter: missing escapeIdentifier method");
  }

  console.log("generateColumnDefinition input:", {
    name: col.name,
    type: col.type,
    notnull: col.notnull,
    unique: col.unique,
    dflt_value: col.dflt_value,
    pk: col.pk,
  });

  // Parse column type and parameters
  let columnType = col.type;
  let columnParams = [];
  let constraints = [];

  // Parse type and constraints from combined string (e.g., "STRING:NULL:FALSE:UNIQUE")
  if (typeof col.type === "string" && col.type.includes(":")) {
    const parts = col.type.split(":");
    columnType = parts[0].toUpperCase();
    constraints = parts.slice(1);

    // Update column properties based on constraints
    col.notnull = constraints.includes("FALSE");
    col.unique = constraints.includes("UNIQUE");
  }

  // Handle column renames
  if (changes?.isRename) {
    let sql = `${adapter.escapeIdentifier(changes.newName)} ${changes.type}`;
    sql += generateColumnConstraints(col, changes, uniqueColumns, adapter);
    return sql;
  }

  // Handle normal column definition
  const typeMappings = getTypeMappings(adapter);
  let mappedType = changes
    ? typeMappings[changes.type] || changes.type
    : columnType;

  // Handle MySQL-specific types
  if (adapter.type === "mysql") {
    mappedType = getMySQLColumnType(columnType, columnParams);
  }

  let sql = `${adapter.escapeIdentifier(col.name)} ${mappedType}`;
  sql += generateColumnConstraints(col, changes, uniqueColumns, adapter);

  console.log("Generated SQL:", sql);
  return sql;
}

function generateColumnConstraints(col, changes, uniqueColumns, adapter) {
  let sql = "";
  const constraints = [];

  // Primary Key
  if (col.pk) {
    constraints.push("PRIMARY KEY");
    if (adapter.type === "mysql" && col.auto_increment) {
      constraints.push("AUTO_INCREMENT");
    } else if (
      adapter.type === "sqlite" &&
      col.type.toUpperCase() === "INTEGER"
    ) {
      constraints.push("AUTOINCREMENT");
    }
  }

  // Not Null constraint
  if (col.notnull) {
    constraints.push("NOT NULL");
  }

  // Default values
  if (changes?.modifiers) {
    const defaultMod = changes.modifiers.find((m) => m.startsWith("default="));
    if (defaultMod) {
      const defaultValue = defaultMod.split("=")[1];
      constraints.push(
        `DEFAULT ${processDefaultValue(defaultValue, { adapter })}`
      );
    }
  } else if (col.dflt_value !== null && col.dflt_value !== undefined) {
    if (col.name === "created_at" || col.name === "updated_at") {
      constraints.push("DEFAULT CURRENT_TIMESTAMP");
      if (col.name === "updated_at" && adapter.type === "mysql") {
        constraints.push("ON UPDATE CURRENT_TIMESTAMP");
      }
    } else {
      constraints.push(`DEFAULT ${col.dflt_value}`);
    }
  }

  // Unique constraint
  if (col.unique || uniqueColumns.has(col.name)) {
    constraints.push("UNIQUE");
  }

  if (constraints.length > 0) {
    sql += ` ${constraints.join(" ")}`;
  }

  return sql;
}

function getMySQLColumnType(type, params = []) {
  switch (type.toUpperCase()) {
    case "STRING":
      return "VARCHAR(255)";
    case "VARCHAR":
      return `VARCHAR(${params[0] || "255"})`;
    case "TEXT":
      if (params[0]) {
        const length = parseInt(params[0]);
        if (length <= 255) return "TINYTEXT";
        if (length <= 65535) return "TEXT";
        if (length <= 16777215) return "MEDIUMTEXT";
        return "LONGTEXT";
      }
      return "TEXT";
    case "INTEGER":
    case "INT":
      return params[0] ? `INT(${params[0]})` : "INT";
    case "BIGINT":
      return params[0] ? `BIGINT(${params[0]})` : "BIGINT";
    case "FLOAT":
      return params[0] ? `FLOAT(${params[0]})` : "FLOAT";
    case "DOUBLE":
      return params[0] ? `DOUBLE(${params[0]})` : "DOUBLE";
    case "DECIMAL":
      return `DECIMAL(${params[0] || "10,2"})`;
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
    case "BINARY":
      return `BINARY(${params[0] || "255"})`;
    case "BLOB":
      if (params[0]) {
        const length = parseInt(params[0]);
        if (length <= 255) return "TINYBLOB";
        if (length <= 65535) return "BLOB";
        if (length <= 16777215) return "MEDIUMBLOB";
        return "LONGBLOB";
      }
      return "BLOB";
    default:
      return type;
  }
}

module.exports = {
  generateColumnDefinition,
  generateColumnConstraints,
  getMySQLColumnType,
};
