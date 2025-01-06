function formatSql(sql) {
  return sql
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();
}

async function removeColumnMigration(table, columnName, adapter) {
  try {
    // Get current column info for down migration
    const tableInfo = await adapter.getTableInfo(table);
    const column = tableInfo.find((col) => col.name === columnName);

    if (!column) {
      throw new Error(`Column '${columnName}' not found in table '${table}'`);
    }

    // Build the nullability and default value strings
    // Use notnull property from the column info
    const nullability = column.notnull === 0 ? " NULL" : " NOT NULL";
    const defaultValue = column.dflt_value
      ? ` DEFAULT ${column.dflt_value}`
      : "";

    let upSql, downSql;

    switch (adapter.type) {
      case "mysql":
        upSql = formatSql(
          `ALTER TABLE ${adapter.escapeIdentifier(table)} 
           DROP COLUMN ${adapter.escapeIdentifier(columnName)}`
        );

        downSql = formatSql(
          `ALTER TABLE ${adapter.escapeIdentifier(table)} 
           ADD COLUMN ${adapter.escapeIdentifier(columnName)} ${
            column.type
          }${nullability}${defaultValue}`
        );
        break;

      case "postgresql":
        upSql = formatSql(
          `ALTER TABLE ${adapter.escapeIdentifier(table)} 
           DROP COLUMN ${adapter.escapeIdentifier(columnName)}`
        );

        downSql = formatSql(
          `ALTER TABLE ${adapter.escapeIdentifier(table)} 
           ADD COLUMN ${adapter.escapeIdentifier(columnName)} ${
            column.type
          }${nullability}${defaultValue}`
        );
        break;

      case "sqlite":
        // SQLite requires recreating the table
        const allColumns = tableInfo
          .filter((col) => col.name !== columnName)
          .map(
            (col) =>
              `${adapter.escapeIdentifier(col.name)} ${col.type}${
                col.notnull === 0 ? " NULL" : " NOT NULL"
              }${col.dflt_value ? ` DEFAULT ${col.dflt_value}` : ""}`
          )
          .join(", ");

        upSql = formatSql(`
          CREATE TABLE ${adapter.escapeIdentifier(
            table + "_new"
          )} (${allColumns});
          INSERT INTO ${adapter.escapeIdentifier(table + "_new")} 
          SELECT ${tableInfo
            .filter((col) => col.name !== columnName)
            .map((col) => adapter.escapeIdentifier(col.name))
            .join(", ")}
          FROM ${adapter.escapeIdentifier(table)};
          DROP TABLE ${adapter.escapeIdentifier(table)};
          ALTER TABLE ${adapter.escapeIdentifier(table + "_new")} 
          RENAME TO ${adapter.escapeIdentifier(table)};
        `);

        // For down migration, include the removed column
        const allColumnsWithRemoved = tableInfo
          .map(
            (col) =>
              `${adapter.escapeIdentifier(col.name)} ${col.type}${
                col.notnull === 0 ? " NULL" : " NOT NULL"
              }${col.dflt_value ? ` DEFAULT ${col.dflt_value}` : ""}`
          )
          .join(", ");

        downSql = formatSql(`
          CREATE TABLE ${adapter.escapeIdentifier(
            table + "_new"
          )} (${allColumnsWithRemoved});
          INSERT INTO ${adapter.escapeIdentifier(table + "_new")} (${tableInfo
          .filter((col) => col.name !== columnName)
          .map((col) => adapter.escapeIdentifier(col.name))
          .join(", ")})
          SELECT ${tableInfo
            .filter((col) => col.name !== columnName)
            .map((col) => adapter.escapeIdentifier(col.name))
            .join(", ")}
          FROM ${adapter.escapeIdentifier(table)};
          DROP TABLE ${adapter.escapeIdentifier(table)};
          ALTER TABLE ${adapter.escapeIdentifier(table + "_new")} 
          RENAME TO ${adapter.escapeIdentifier(table)};
        `);
        break;

      default:
        throw new Error(`Unsupported database type: ${adapter.type}`);
    }

    return {
      up: upSql,
      down: downSql,
    };
  } catch (error) {
    console.error("Error in removeColumnMigration:", error);
    throw error;
  }
}

module.exports = {
  removeColumnMigration,
};
