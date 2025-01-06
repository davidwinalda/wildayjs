function formatSql(sql) {
  return sql.trim();
}

function parseTableAndColumn(migrationName) {
  const match = migrationName.match(/^AddForeignKeyTo(\w+?)([A-Z]\w+)$/);
  if (!match) {
    throw new Error("Invalid foreign key migration name format");
  }

  const table = match[1].toLowerCase();
  const columnName = match[2].toLowerCase().replace(/id$/, "_id");
  const referencedTable = columnName.replace(/_id$/, "s");

  return {
    table,
    column: columnName,
    referencedTable,
  };
}

function getCreateForeignKeySQL(params) {
  const { adapter, table, column, referencedTable, constraintName } = params;
  const dbType = adapter.type.toLowerCase();

  switch (dbType) {
    case "postgresql":
    case "mysql":
      return `ALTER TABLE ${adapter.escapeIdentifier(table)}
    ADD CONSTRAINT ${adapter.escapeIdentifier(constraintName)}
    FOREIGN KEY (${adapter.escapeIdentifier(column)})
    REFERENCES ${adapter.escapeIdentifier(
      referencedTable
    )} (${adapter.escapeIdentifier("id")})
    ON DELETE RESTRICT`;

    case "sqlite":
      return `/* SQLite doesn't support adding foreign keys after table creation */`;

    default:
      return `ALTER TABLE ${adapter.escapeIdentifier(table)}
    ADD CONSTRAINT ${adapter.escapeIdentifier(constraintName)}
    FOREIGN KEY (${adapter.escapeIdentifier(column)})
    REFERENCES ${adapter.escapeIdentifier(
      referencedTable
    )} (${adapter.escapeIdentifier("id")})
    ON DELETE RESTRICT`;
  }
}

function getDropForeignKeySQL(params) {
  const { adapter, table, constraintName } = params;
  const dbType = adapter.type.toLowerCase();

  switch (dbType) {
    case "postgresql":
    case "mysql":
      return `ALTER TABLE ${adapter.escapeIdentifier(table)}
    DROP FOREIGN KEY ${adapter.escapeIdentifier(constraintName)}`;

    case "sqlite":
      return `/* SQLite doesn't support dropping foreign keys */`;

    default:
      return `ALTER TABLE ${adapter.escapeIdentifier(table)}
    DROP FOREIGN KEY ${adapter.escapeIdentifier(constraintName)}`;
  }
}

async function addForeignKeyMigration(migrationName, adapter) {
  try {
    console.log("\n=== Add Foreign Key Migration Debug ===");
    console.log("Inputs:", { migrationName, adapterType: adapter.type });

    let fkInfo;

    // Handle parsed migration info
    if (typeof migrationName === "object" && migrationName.table) {
      fkInfo = {
        table: migrationName.table,
        column: migrationName.column,
        referencedTable: migrationName.referencedTable,
      };
    } else {
      // Legacy format parsing
      fkInfo = parseTableAndColumn(migrationName);
    }

    const constraintName = `fk_${fkInfo.table}_${fkInfo.column}`;

    const params = {
      adapter,
      table: fkInfo.table,
      column: fkInfo.column,
      referencedTable: fkInfo.referencedTable,
      constraintName,
    };

    const upSql = formatSql(getCreateForeignKeySQL(params));
    const downSql = formatSql(getDropForeignKeySQL(params));

    console.log("\nGenerated SQL:", {
      up: upSql,
      down: downSql,
    });

    return {
      up: upSql,
      down: downSql,
    };
  } catch (error) {
    console.error("Error in addForeignKeyMigration:", error);
    throw error;
  }
}

module.exports = {
  addForeignKeyMigration,
};
