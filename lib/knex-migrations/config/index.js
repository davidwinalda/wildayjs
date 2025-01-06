const path = require("path");
const connectionManager = require("../../database/connectionManager");

function getKnexConfig() {
  const dbType = connectionManager.getCurrentDatabaseType();
  const dbConfig = connectionManager.getDatabaseConfig(dbType);
  const migrationsPath = path.join(process.cwd(), "db", "migrate");
  const seedsPath = path.join(process.cwd(), "db", "seeds");

  const baseConfig = {
    migrations: {
      directory: migrationsPath,
      tableName: "knex_migrations",
      extension: "js",
    },
    seeds: {
      directory: seedsPath,
    },
    debug: process.env.KNEX_DEBUG === "true",
  };

  switch (dbType) {
    case "postgresql":
      return {
        ...baseConfig,
        client: "pg",
        connection: {
          host: dbConfig.host || "localhost",
          port: dbConfig.port || 5432,
          user: dbConfig.user || dbConfig.username, // Add fallback
          password: dbConfig.password,
          database: dbConfig.database,
          ssl: dbConfig.ssl,
        },
        pool: {
          min: 2,
          max: 10,
        },
      };

    case "mysql":
      return {
        ...baseConfig,
        client: "mysql2",
        connection: {
          host: dbConfig.host || "localhost",
          port: dbConfig.port || 3306,
          user: dbConfig.user || dbConfig.username, // Add fallback
          password: dbConfig.password,
          database: dbConfig.database,
          ssl: dbConfig.ssl,
        },
        pool: {
          min: 2,
          max: 10,
        },
      };

    case "sqlite":
    default:
      return {
        ...baseConfig,
        client: "sqlite3",
        connection: {
          filename:
            dbConfig.database ||
            path.join(process.cwd(), "db", "development.sqlite3"),
        },
        useNullAsDefault: true,
        pool: {
          afterCreate: (conn, cb) => {
            conn.run("PRAGMA foreign_keys = ON", cb);
          },
        },
      };
  }
}

module.exports = { getKnexConfig };
