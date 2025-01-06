const { mapColumnType } = require("../../config/typeMapping");

function formatSql(sql, type = "") {
  if (type === "drop") {
    return sql.trim();
  }

  // First, clean up extra whitespace but preserve newlines
  let cleanedSql = sql
    .replace(/[\s\n]+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();

  // Format CREATE TABLE statement
  if (cleanedSql.startsWith("CREATE TABLE")) {
    // Extract main parts using regex
    const match = cleanedSql.match(/(CREATE TABLE.*?)\((.*)\)(\s*ENGINE.*)?$/);
    if (match) {
      const [, createPart, columnsPart, enginePart = ""] = match;

      // Format columns
      const columns = columnsPart
        .split(",")
        .map((col) => col.trim())
        .join(",\n  ");

      // Reconstruct SQL with proper formatting
      cleanedSql = `${createPart.trim()} (\n  ${columns}\n)${enginePart}`;
    }
  }

  return cleanedSql;
}

function getTypeDefinition(type, adapter) {
  return mapColumnType(type, adapter);
}

function getPrimaryKeyDefinition(adapter) {
  switch (adapter.type.toLowerCase()) {
    case "postgresql":
      return "id BIGSERIAL PRIMARY KEY";
    case "sqlite":
      return "id INTEGER PRIMARY KEY AUTOINCREMENT";
    case "mysql":
    default:
      return "id BIGINT AUTO_INCREMENT PRIMARY KEY";
  }
}

function getTimestampDefinitions(adapter) {
  const dbType = adapter.type.toLowerCase();

  switch (dbType) {
    case "postgresql":
      return [
        "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
      ];
    case "sqlite":
      return [
        "created_at DATETIME DEFAULT CURRENT_TIMESTAMP",
        "updated_at DATETIME DEFAULT CURRENT_TIMESTAMP",
      ];
    case "mysql":
    default:
      return [
        "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
      ];
  }
}

function getTableOptions(adapter) {
  switch (adapter.type.toLowerCase()) {
    case "postgresql":
      return "";
    case "sqlite":
      return "";
    case "mysql":
    default:
      return "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
  }
}

async function createTableMigration(tableName, columns, adapter) {
  try {
    console.log("\n=== Create Table Migration Debug ===");
    console.log("Inputs:", { tableName, columns, adapterType: adapter.type });

    // Start with primary key
    const columnDefinitions = [getPrimaryKeyDefinition(adapter)];

    // Add each column definition
    columns.forEach((column) => {
      const [name, type = "string", ...options] = column.split(":");
      const nullable =
        !options.includes("required") && !options.includes("not_null");
      const unique = options.includes("unique");
      const defaultValue = options
        .find((opt) => opt.startsWith("default="))
        ?.split("=")[1];

      let definition = `${adapter.escapeIdentifier(name)} ${getTypeDefinition(
        type,
        adapter
      )}`;

      if (!nullable) definition += " NOT NULL";
      if (unique) definition += " UNIQUE";
      if (defaultValue) {
        if (defaultValue.toLowerCase() === "null") {
          definition += " DEFAULT NULL";
        } else if (["true", "false"].includes(defaultValue.toLowerCase())) {
          definition +=
            adapter.type.toLowerCase() === "postgresql"
              ? ` DEFAULT ${defaultValue}`
              : ` DEFAULT ${defaultValue === "true" ? "1" : "0"}`;
        } else if (!isNaN(defaultValue)) {
          definition += ` DEFAULT ${defaultValue}`;
        } else {
          definition += ` DEFAULT '${defaultValue}'`;
        }
      }

      columnDefinitions.push(definition);
    });

    // Add timestamps
    columnDefinitions.push(...getTimestampDefinitions(adapter));

    // Generate CREATE TABLE SQL
    const tableOptions = getTableOptions(adapter);
    const upSql = formatSql(`
      CREATE TABLE ${adapter.escapeIdentifier(tableName)} (
        ${columnDefinitions.join(",\n        ")}
      )${tableOptions ? " " + tableOptions : ""}
    `);

    // Generate DROP TABLE SQL
    const downSql = formatSql(
      `DROP TABLE IF EXISTS ${adapter.escapeIdentifier(tableName)}`,
      "drop"
    );

    console.log("\nGenerated SQL:", {
      up: upSql,
      down: downSql,
    });

    return {
      up: upSql,
      down: downSql,
    };
  } catch (error) {
    console.error("Error in createTableMigration:", error);
    throw error;
  }
}

module.exports = {
  createTableMigration,
};
