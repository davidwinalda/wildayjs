const { mapColumnType } = require("../../config/typeMapping");

function formatSql(sql) {
  return sql
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();
}

async function addColumnMigration(migrationName, adapter) {
  try {
    console.log("\n=== Add Column Migration Debug ===");
    console.log("Inputs:", { migrationName, adapterType: adapter?.type });

    if (!migrationName || !adapter) {
      throw new Error(`Missing required parameters:
        migrationName: ${migrationName},
        adapter: ${adapter?.type}`);
    }

    let table, columns;
    if (typeof migrationName === "object") {
      table = migrationName.table;
      columns = migrationName.columns;
    } else {
      throw new Error("Invalid migration format");
    }

    let upSql, downSql;

    switch (adapter.type) {
      case "mysql":
        upSql = formatSql(`
          ALTER TABLE ${adapter.escapeIdentifier(table)}
          ${columns
            .map((column) => {
              const [name, ...specs] = column.split(":");
              const { type, constraints } = parseColumnSpecs(
                specs.join(":"),
                adapter
              );
              return `ADD COLUMN ${adapter.escapeIdentifier(name)} ${type}${
                constraints.length ? " " + constraints.join(" ") : ""
              }`;
            })
            .join(",\n")}
        `);

        downSql = formatSql(`
          ALTER TABLE ${adapter.escapeIdentifier(table)}
          ${columns
            .map((column) => {
              const name = column.split(":")[0];
              return `DROP COLUMN ${adapter.escapeIdentifier(name)}`;
            })
            .join(",\n")}
        `);
        break;

      case "postgresql":
        upSql = formatSql(`
          ALTER TABLE ${adapter.escapeIdentifier(table)}
          ${columns
            .map((column) => {
              const [name, ...specs] = column.split(":");
              const { type, constraints } = parseColumnSpecs(
                specs.join(":"),
                adapter
              );
              return `ADD COLUMN ${adapter.escapeIdentifier(name)} ${type}${
                constraints.length ? " " + constraints.join(" ") : ""
              }`;
            })
            .join(",\n")}
        `);

        downSql = formatSql(`
          ALTER TABLE ${adapter.escapeIdentifier(table)}
          ${columns
            .map((column) => {
              const name = column.split(":")[0];
              return `DROP COLUMN ${adapter.escapeIdentifier(name)}`;
            })
            .join(",\n")}
        `);
        break;

      case "sqlite":
        // SQLite requires one ADD COLUMN statement per column
        upSql = columns
          .map((column) => {
            const [name, ...specs] = column.split(":");
            const { type, constraints } = parseColumnSpecs(
              specs.join(":"),
              adapter
            );
            return formatSql(`
            ALTER TABLE ${adapter.escapeIdentifier(table)}
            ADD COLUMN ${adapter.escapeIdentifier(name)} ${type}${
              constraints.length ? " " + constraints.join(" ") : ""
            }
          `);
          })
          .join(";\n");

        // SQLite doesn't support DROP COLUMN in older versions
        downSql =
          `-- SQLite does not support DROP COLUMN in older versions\n` +
          `-- Migration must be handled manually by creating new table`;
        break;

      default:
        throw new Error(
          `Unsupported database type: ${adapter.type || "sqlite"}`
        );
    }

    console.log("\nGenerated SQL:", {
      up: upSql,
      down: downSql,
    });

    return {
      up: upSql,
      down: downSql,
    };
  } catch (error) {
    console.error("Error in addColumnMigration:", error);
    throw error;
  }
}

function parseColumnSpecs(specString, adapter) {
  const parts = specString.split(":");
  const type = parts[0];
  const constraints = parts.slice(1);

  // Parse default value if present
  const defaultValueIndex = constraints.findIndex((c) =>
    c.startsWith("default=")
  );
  if (defaultValueIndex !== -1) {
    const defaultPart = constraints.splice(defaultValueIndex, 1)[0];
    const defaultValue = processDefaultValue(
      defaultPart.split("=")[1],
      type,
      adapter
    );
    if (defaultValue) {
      constraints.push(`DEFAULT ${defaultValue}`);
    }
  }

  // Map constraints
  const constraintMap = {
    "null:false": "NOT NULL",
    unique: "UNIQUE",
    primary: "PRIMARY KEY",
    index: "INDEX",
  };

  return {
    type: mapColumnType(type, adapter),
    constraints: constraints.map((c) => constraintMap[c] || c).filter(Boolean),
  };
}

function processDefaultValue(value, type, adapter) {
  const dbFunctions = {
    mysql: {
      random: "SUBSTRING(MD5(RAND()), 1, 10)",
      timestamp: "UNIX_TIMESTAMP()",
    },
    postgresql: {
      random: "SUBSTRING(MD5(RANDOM()::TEXT), 1, 10)",
      timestamp: "EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::INTEGER",
    },
    sqlite: {
      random: "(substr(hex(randomblob(4)), 1, 8))",
      timestamp: "(strftime('%s', 'now'))",
      replacements: {
        CURRENT_TIMESTAMP: "strftime('%Y-%m-%d %H:%M:%S', 'now')",
        "NOW()": "strftime('%Y-%m-%d %H:%M:%S', 'now')",
      },
    },
  };

  const functions = dbFunctions[adapter.type || "sqlite"];

  if (value.includes("{random}") || value.includes("{timestamp}")) {
    return value
      .replace("{random}", functions.random)
      .replace("{timestamp}", functions.timestamp);
  }

  // Handle SQLite function replacements
  if (adapter.type === "sqlite" && functions.replacements) {
    for (const [mysqlFunc, sqliteFunc] of Object.entries(
      functions.replacements
    )) {
      if (value.includes(mysqlFunc)) {
        return value.replace(mysqlFunc, sqliteFunc);
      }
    }
  }

  // Handle string values
  const stringTypes = ["varchar", "text", "char", "string"];
  if (stringTypes.some((t) => type.toLowerCase().includes(t))) {
    if (!value.includes("(")) {
      return `'${value}'`;
    }
  }

  return value;
}

module.exports = {
  addColumnMigration,
};
