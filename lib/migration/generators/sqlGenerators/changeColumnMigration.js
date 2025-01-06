const { mapColumnType } = require("../../config/typeMapping");

function formatSql(sql) {
  return sql
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();
}

async function changeColumnMigration(table, columnName, newType, adapter) {
  try {
    // Get current column info
    const tableInfo = await adapter.getTableInfo(table);
    const column = tableInfo.find((col) => col.name === columnName);

    if (!column) {
      throw new Error(`Column '${columnName}' not found in table '${table}'`);
    }

    // Map the new type using the type mapping system
    const mappedType = mapColumnType(newType, adapter);
    const originalType = column.type;
    const nullability = column.nullable ? " NULL" : " NOT NULL";
    const defaultValue = column.default ? ` DEFAULT ${column.default}` : "";

    let upSql, downSql;

    switch (adapter.type) {
      case "mysql":
        upSql = formatSql(
          `ALTER TABLE ${adapter.escapeIdentifier(table)} 
             MODIFY COLUMN ${adapter.escapeIdentifier(columnName)} 
             ${mappedType}${nullability}${defaultValue}`
        );

        downSql = formatSql(
          `ALTER TABLE ${adapter.escapeIdentifier(table)} 
             MODIFY COLUMN ${adapter.escapeIdentifier(columnName)} 
             ${originalType}${nullability}${defaultValue}`
        );
        break;

      case "postgresql":
        upSql = formatSql(
          `ALTER TABLE ${adapter.escapeIdentifier(table)} 
             ALTER COLUMN ${adapter.escapeIdentifier(columnName)} 
             TYPE ${mappedType} 
             USING ${adapter.escapeIdentifier(columnName)}::${mappedType}`
        );

        if (!column.nullable) {
          upSql += formatSql(
            `; ALTER TABLE ${adapter.escapeIdentifier(table)} 
               ALTER COLUMN ${adapter.escapeIdentifier(columnName)} 
               SET NOT NULL`
          );
        }

        if (column.default) {
          upSql += formatSql(
            `; ALTER TABLE ${adapter.escapeIdentifier(table)} 
               ALTER COLUMN ${adapter.escapeIdentifier(columnName)} 
               SET DEFAULT ${column.default}`
          );
        }

        downSql = formatSql(
          `ALTER TABLE ${adapter.escapeIdentifier(table)} 
             ALTER COLUMN ${adapter.escapeIdentifier(columnName)} 
             TYPE ${originalType} 
             USING ${adapter.escapeIdentifier(columnName)}::${originalType}`
        );

        if (!column.nullable) {
          downSql += formatSql(
            `; ALTER TABLE ${adapter.escapeIdentifier(table)} 
               ALTER COLUMN ${adapter.escapeIdentifier(columnName)} 
               SET NOT NULL`
          );
        }

        if (column.default) {
          downSql += formatSql(
            `; ALTER TABLE ${adapter.escapeIdentifier(table)} 
               ALTER COLUMN ${adapter.escapeIdentifier(columnName)} 
               SET DEFAULT ${column.default}`
          );
        }
        break;

      case "sqlite":
        const columns = tableInfo
          .map((col) => {
            if (col.name === columnName) {
              return `${adapter.escapeIdentifier(columnName)} ${mappedType}${
                col.nullable ? " NULL" : " NOT NULL"
              }${col.default ? ` DEFAULT ${col.default}` : ""}`;
            }
            return `${adapter.escapeIdentifier(col.name)} ${col.type}${
              col.nullable ? " NULL" : " NOT NULL"
            }${col.default ? ` DEFAULT ${col.default}` : ""}`;
          })
          .join(", ");

        upSql = formatSql(`
            CREATE TABLE ${adapter.escapeIdentifier(
              table + "_new"
            )} (${columns});
            INSERT INTO ${adapter.escapeIdentifier(table + "_new")} 
            SELECT * FROM ${adapter.escapeIdentifier(table)};
            DROP TABLE ${adapter.escapeIdentifier(table)};
            ALTER TABLE ${adapter.escapeIdentifier(table + "_new")} 
            RENAME TO ${adapter.escapeIdentifier(table)};
          `);

        const downColumns = tableInfo
          .map((col) => {
            if (col.name === columnName) {
              return `${adapter.escapeIdentifier(columnName)} ${originalType}${
                col.nullable ? " NULL" : " NOT NULL"
              }${col.default ? ` DEFAULT ${col.default}` : ""}`;
            }
            return `${adapter.escapeIdentifier(col.name)} ${col.type}${
              col.nullable ? " NULL" : " NOT NULL"
            }${col.default ? ` DEFAULT ${col.default}` : ""}`;
          })
          .join(", ");

        downSql = formatSql(`
            CREATE TABLE ${adapter.escapeIdentifier(
              table + "_new"
            )} (${downColumns});
            INSERT INTO ${adapter.escapeIdentifier(table + "_new")} 
            SELECT * FROM ${adapter.escapeIdentifier(table)};
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
    console.error("Error in changeColumnMigration:", error);
    throw error;
  }
}

module.exports = {
  changeColumnMigration,
};
