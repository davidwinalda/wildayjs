module.exports = {
  database: {
    client: "sqlite", // or "mysql" or "postgresql"

    connection: {
      // SQLite
      filename: "./db/development.sqlite3",

      // MySQL/PostgreSQL
      host: "localhost",
      user: "your_username",
      password: "your_password",
      database: "your_database",
      port: 3306, // MySQL default
      // port: 5432, // PostgreSQL default
    },

    pool: {
      min: 2,
      max: 10,
    },

    migrations: {
      directory: "./db/migrate",
    },
  },
};
