function formatSql(sql) {
  return sql.trim();
}

function parseIndexName(migrationName) {
  // For unique index
  const uniqueMatch = migrationName.match(/^AddUniqueIndexTo(\w+?)([A-Z]\w+)$/);
  if (uniqueMatch) {
    const table = uniqueMatch[1].toLowerCase();
    // Convert camelCase to snake_case for column name
    const column = uniqueMatch[2]
      .replace(/([A-Z])/g, "_$1")
      .toLowerCase()
      .replace(/^_/, "");

    return {
      isUnique: true,
      table,
      column,
    };
  }

  // For regular index
  const normalMatch = migrationName.match(/^AddIndexTo(\w+?)([A-Z]\w+)$/);
  if (normalMatch) {
    const table = normalMatch[1].toLowerCase();
    // Convert camelCase to snake_case for column name
    const column = normalMatch[2]
      .replace(/([A-Z])/g, "_$1")
      .toLowerCase()
      .replace(/^_/, "");

    return {
      isUnique: false,
      table,
      column,
    };
  }

  throw new Error("Invalid index migration name format");
}

function getCreateIndexSQL(params) {
  const { adapter, indexName, table, column, isUnique } = params;
  const dbType = adapter.type.toLowerCase();
  const uniqueStr = isUnique ? "UNIQUE " : "";

  switch (dbType) {
    case "postgresql":
      return `CREATE ${uniqueStr}INDEX ${adapter.escapeIdentifier(
        indexName
      )} ON ${adapter.escapeIdentifier(table)} (${adapter.escapeIdentifier(
        column
      )})`;

    case "sqlite":
      return `CREATE ${uniqueStr}INDEX ${adapter.escapeIdentifier(
        indexName
      )} ON ${adapter.escapeIdentifier(table)} (${adapter.escapeIdentifier(
        column
      )})`;

    case "mysql":
    default:
      return `ALTER TABLE ${adapter.escapeIdentifier(
        table
      )} ADD ${uniqueStr}INDEX ${adapter.escapeIdentifier(
        indexName
      )} (${adapter.escapeIdentifier(column)})`;
  }
}

function getDropIndexSQL(params) {
  const { adapter, indexName, table } = params;
  const dbType = adapter.type.toLowerCase();

  switch (dbType) {
    case "postgresql":
      return `DROP INDEX ${adapter.escapeIdentifier(indexName)}`;

    case "sqlite":
      return `DROP INDEX ${adapter.escapeIdentifier(indexName)}`;

    case "mysql":
    default:
      return `ALTER TABLE ${adapter.escapeIdentifier(
        table
      )} DROP INDEX ${adapter.escapeIdentifier(indexName)}`;
  }
}

async function addIndexMigration(migrationName, adapter) {
  try {
    console.log("\n=== Add Index Migration Debug ===");
    console.log("Inputs:", { migrationName, adapterType: adapter.type });

    let indexInfo;

    // Handle direct format
    if (
      typeof migrationName === "object" &&
      migrationName.type === "add_index"
    ) {
      indexInfo = {
        isUnique: migrationName.isUnique,
        table: migrationName.table,
        column: migrationName.column,
      };
    } else {
      // Legacy format parsing
      indexInfo = parseIndexName(migrationName);
    }

    const indexName = `index_${indexInfo.table}_on_${indexInfo.column}`;

    const params = {
      adapter,
      indexName,
      table: indexInfo.table,
      column: indexInfo.column,
      isUnique: indexInfo.isUnique,
    };

    // Generate CREATE INDEX SQL
    const upSql = formatSql(getCreateIndexSQL(params));

    // Generate DROP INDEX SQL
    const downSql = formatSql(getDropIndexSQL(params));

    console.log("\nGenerated SQL:", {
      up: upSql,
      down: downSql,
    });

    return {
      up: upSql,
      down: downSql,
    };
  } catch (error) {
    console.error("Error in addIndexMigration:", error);
    throw error;
  }
}

module.exports = {
  addIndexMigration,
};
