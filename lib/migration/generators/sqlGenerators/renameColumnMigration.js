function formatSql(sql) {
  return sql
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();
}

async function renameColumnMigration(table, oldName, newName, adapter) {
  try {
    console.log("\n=== Rename Column Migration Debug ===");
    console.log("Inputs:", {
      table,
      oldName,
      newName,
      adapterType: adapter?.type,
    });

    if (!table || !oldName || !newName || !adapter) {
      throw new Error(`Missing required parameters:
        table: ${table},
        oldName: ${oldName},
        newName: ${newName},
        adapter: ${adapter?.type}`);
    }

    if (oldName === newName) {
      throw new Error(`Old name and new name are the same: ${oldName}`);
    }

    let upSql, downSql;

    switch (adapter.type) {
      case "mysql":
        upSql = formatSql(
          `ALTER TABLE ${adapter.escapeIdentifier(table)} 
           RENAME COLUMN ${adapter.escapeIdentifier(oldName)} 
           TO ${adapter.escapeIdentifier(newName)}`
        );
        downSql = formatSql(
          `ALTER TABLE ${adapter.escapeIdentifier(table)} 
           RENAME COLUMN ${adapter.escapeIdentifier(newName)} 
           TO ${adapter.escapeIdentifier(oldName)}`
        );
        break;

      case "postgresql":
        upSql = formatSql(
          `ALTER TABLE ${adapter.escapeIdentifier(table)} 
           RENAME COLUMN ${adapter.escapeIdentifier(oldName)} 
           TO ${adapter.escapeIdentifier(newName)}`
        );
        downSql = formatSql(
          `ALTER TABLE ${adapter.escapeIdentifier(table)} 
           RENAME COLUMN ${adapter.escapeIdentifier(newName)} 
           TO ${adapter.escapeIdentifier(oldName)}`
        );
        break;

      case "sqlite":
        // Get table structure
        const tableInfo = await adapter.getTableInfo(table);

        // Generate column definitions
        const columns = tableInfo
          .map((col) => {
            const name = col.name === oldName ? newName : col.name;
            return `${adapter.escapeIdentifier(name)} ${col.type}${
              col.nullable ? "" : " NOT NULL"
            }${col.default ? ` DEFAULT ${col.default}` : ""}`;
          })
          .join(", ");

        // Generate UP migration
        upSql = formatSql(`
          CREATE TABLE ${adapter.escapeIdentifier(table + "_new")} (${columns});
          INSERT INTO ${adapter.escapeIdentifier(table + "_new")} 
          SELECT ${tableInfo
            .map((col) =>
              col.name === oldName
                ? `${adapter.escapeIdentifier(
                    oldName
                  )} AS ${adapter.escapeIdentifier(newName)}`
                : adapter.escapeIdentifier(col.name)
            )
            .join(", ")} 
          FROM ${adapter.escapeIdentifier(table)};
          DROP TABLE ${adapter.escapeIdentifier(table)};
          ALTER TABLE ${adapter.escapeIdentifier(table + "_new")} 
          RENAME TO ${adapter.escapeIdentifier(table)};
        `);

        // Generate DOWN migration
        downSql = formatSql(`
          CREATE TABLE ${adapter.escapeIdentifier(
            table + "_new"
          )} (${columns.replace(newName, oldName)});
          INSERT INTO ${adapter.escapeIdentifier(table + "_new")} 
          SELECT ${tableInfo
            .map((col) =>
              col.name === newName
                ? `${adapter.escapeIdentifier(
                    newName
                  )} AS ${adapter.escapeIdentifier(oldName)}`
                : adapter.escapeIdentifier(col.name)
            )
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

    console.log("\nGenerated SQL:", {
      up: upSql,
      down: downSql,
    });

    return {
      up: upSql,
      down: downSql,
    };
  } catch (error) {
    console.error("Error in renameColumnMigration:", error);
    throw error;
  }
}

module.exports = {
  renameColumnMigration,
};
