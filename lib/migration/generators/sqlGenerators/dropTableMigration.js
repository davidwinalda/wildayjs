function formatSql(sql) {
  return sql.trim();
}

function getDropTableSQL(params) {
  const { adapter, table } = params;
  const dbType = adapter.type.toLowerCase();

  switch (dbType) {
    case "postgresql":
      return `DROP TABLE IF EXISTS ${adapter.escapeIdentifier(table)} CASCADE`;

    case "mysql":
      return `DROP TABLE IF EXISTS ${adapter.escapeIdentifier(table)}`;

    case "sqlite":
      return `DROP TABLE IF EXISTS ${adapter.escapeIdentifier(table)}`;

    default:
      return `DROP TABLE IF EXISTS ${adapter.escapeIdentifier(table)}`;
  }
}

function getBackupTableSQL(params) {
  const { adapter, table } = params;
  const dbType = adapter.type.toLowerCase();

  switch (dbType) {
    case "mysql":
      return `
          CREATE TABLE ${adapter.escapeIdentifier(table)} (
            id BIGINT NOT NULL AUTO_INCREMENT,
            title VARCHAR(255),
            content LONGTEXT,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            author_id BIGINT,
            PRIMARY KEY (id),
            KEY \`fk_articles_author_id\` (\`author_id\`),
            CONSTRAINT \`fk_articles_author_id\` 
            FOREIGN KEY (\`author_id\`) 
            REFERENCES \`authors\` (\`id\`) 
            ON DELETE RESTRICT
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;

    case "postgresql":
      return `
          CREATE TABLE ${adapter.escapeIdentifier(table)} (
            id BIGSERIAL PRIMARY KEY,
            title VARCHAR(255),
            content TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            author_id BIGINT REFERENCES authors(id) ON DELETE RESTRICT
          );
        `;

    case "sqlite":
      return `
          CREATE TABLE ${adapter.escapeIdentifier(table)} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            content TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            author_id INTEGER,
            FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE RESTRICT
          );
        `;

    default:
      throw new Error(`Unsupported database type: ${dbType}`);
  }
}

async function dropTableMigration(migrationName, adapter) {
  try {
    console.log("\n=== Drop Table Migration Debug ===");
    console.log("Inputs:", { migrationName, adapterType: adapter.type });

    const tableName =
      typeof migrationName === "object"
        ? migrationName.table
        : migrationName.split(" ").pop().toLowerCase();

    const params = {
      adapter,
      table: tableName,
    };

    const upSql = formatSql(getDropTableSQL(params));
    const downSql = formatSql(getBackupTableSQL(params));

    console.log("\nGenerated SQL:", {
      up: upSql,
      down: downSql,
    });

    return {
      up: upSql,
      down: downSql,
    };
  } catch (error) {
    console.error("Error in dropTableMigration:", error);
    throw error;
  }
}

module.exports = {
  dropTableMigration,
};
