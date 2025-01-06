// const Database = require("better-sqlite3");
// const mysql = require("mysql2/promise");
// const { Pool } = require("pg");
// const path = require("path");
// const { log } = require("../utils/chalkUtils");
// const { loadConfig } = require("../config");
// const util = require("util");

// class ConnectionManager {
//   static instance = null;

//   constructor() {
//     if (ConnectionManager.instance) {
//       return ConnectionManager.instance;
//     }
//     this.connections = new Map();
//     this.loadConfig();
//     ConnectionManager.instance = this;
//   }

//   loadConfig() {
//     const configPath = path.join(process.cwd(), "config", "database.js");
//     if (require.cache[configPath]) {
//       delete require.cache[configPath];
//     }

//     this.config = loadConfig();
//     console.log("\nConnectionManager config loaded");
//     console.log("Config:", JSON.stringify(this.config, null, 2));
//   }

//   resetConfig() {
//     this.closeAll();
//     this.connections.clear();
//     this.loadConfig();
//   }

//   async createMySQLPool(config) {
//     console.log("Creating MySQL pool with config:", {
//       ...config,
//       password: "****",
//     });

//     try {
//       // Create pool configuration
//       const poolConfig = {
//         host: config.host || "localhost",
//         user: config.user || "root",
//         password: config.password || "",
//         port: config.port || 3306,
//         database: config.database,
//         waitForConnections: true,
//         connectionLimit: 10,
//         queueLimit: 0,
//         enableKeepAlive: true,
//         keepAliveInitialDelay: 0,
//         multipleStatements: true,
//       };

//       // Create the pool
//       const pool = mysql.createPool(poolConfig);

//       // Store the configuration directly on the pool instance
//       pool.poolConfig = poolConfig;

//       // Test the pool
//       console.log("Testing pool connection with config:", {
//         ...poolConfig,
//         password: "****",
//       });
//       const [rows] = await pool.query("SELECT 1 AS connection_test");
//       console.log("Pool connection test result:", rows);

//       return pool;
//     } catch (error) {
//       console.error("Pool creation/test failed:", error);
//       throw error;
//     }
//   }

//   async getConnection(type = null) {
//     console.log("\ngetConnection called with type:", type);

//     type = type || this.config.database?.development?.client || "sqlite";
//     console.log("Using database type:", type);

//     if (this.connections.has(type)) {
//       console.log("Returning existing connection");
//       const connection = this.connections.get(type);

//       try {
//         if (type === "mysql") {
//           await connection.query("SELECT 1");
//         }
//         return connection;
//       } catch (error) {
//         console.log("Existing connection failed, creating new one");
//         this.connections.delete(type);
//       }
//     }

//     try {
//       let connection;
//       const config = this.config.database?.development?.connection || {};
//       console.log("\nConnection config:", JSON.stringify(config, null, 2));

//       switch (type.toLowerCase()) {
//         case "mysql":
//           const mysqlConfig = {
//             host: config.host || "localhost",
//             user: config.user || "root",
//             password: config.password || "",
//             port: config.port || 3306,
//           };

//           const tempPool = await this.createMySQLPool(mysqlConfig);
//           try {
//             console.log(`Checking if database '${config.database}' exists...`);
//             await tempPool.query(`USE ${config.database}`);
//             console.log("Database exists");
//           } catch (error) {
//             if (error.code === "ER_BAD_DB_ERROR") {
//               console.log(`Creating database '${config.database}'...`);
//               await tempPool.query(
//                 `CREATE DATABASE IF NOT EXISTS ${config.database}`
//               );
//               console.log("Database created successfully");
//             } else {
//               throw error;
//             }
//           } finally {
//             await tempPool.end();
//           }

//           connection = await this.createMySQLPool({
//             ...mysqlConfig,
//             database: config.database,
//           });
//           break;

//         case "sqlite":
//           const dbPath =
//             config.filename ||
//             path.join(process.cwd(), "db", "development.sqlite3");
//           console.log("SQLite database path:", dbPath);
//           connection = new Database(dbPath);
//           break;

//         case "postgresql":
//           const pgConfig = {
//             user: config.user || "postgres",
//             host: config.host || "localhost",
//             password: config.password || "",
//             port: config.port || 5432,
//             max: 20,
//             idleTimeoutMillis: 30000,
//             connectionTimeoutMillis: 2000,
//           };

//           const tempPgPool = new Pool(pgConfig);

//           try {
//             console.log(`Checking if database '${config.database}' exists...`);
//             const result = await tempPgPool.query(
//               `SELECT 1 FROM pg_database WHERE datname = $1`,
//               [config.database]
//             );

//             if (result.rows.length === 0) {
//               console.log(
//                 `Database '${config.database}' not found, creating it...`
//               );
//               await tempPgPool.query(`CREATE DATABASE ${config.database}`);
//               console.log("Database created successfully");
//             } else {
//               console.log("Database exists");
//             }
//           } catch (error) {
//             console.error("Error checking/creating database:", error.message);
//             throw error;
//           } finally {
//             await tempPgPool.end();
//           }

//           connection = new Pool({
//             ...pgConfig,
//             database: config.database,
//           });

//           console.log("Testing PostgreSQL connection...");
//           await connection.query("SELECT 1");
//           console.log("PostgreSQL connection test successful");
//           break;

//         default:
//           throw new Error(`Unsupported database type: ${type}`);
//       }

//       this.connections.set(type, connection);
//       console.log(`${type} connection created successfully`);
//       return connection;
//     } catch (error) {
//       console.error("\nConnection error:", {
//         message: error.message,
//         code: error.code,
//         errno: error.errno,
//         sqlState: error.sqlState,
//         sqlMessage: error.sqlMessage,
//       });
//       throw error;
//     }
//   }

//   async closeConnection(type = null) {
//     type = type || this.config.database?.development?.client || "sqlite";
//     const connection = this.connections.get(type);

//     if (connection) {
//       try {
//         console.log(`Closing ${type} connection...`);
//         switch (type.toLowerCase()) {
//           case "mysql":
//             await connection.end();
//             break;
//           case "sqlite":
//             connection.close();
//             break;
//           case "postgresql":
//             await connection.end();
//             break;
//         }
//         this.connections.delete(type);
//         console.log(`${type} connection closed successfully`);
//       } catch (error) {
//         console.error(`Error closing ${type} connection:`, error);
//         throw error;
//       }
//     }
//   }

//   async closeAll() {
//     for (const [type] of this.connections) {
//       await this.closeConnection(type);
//     }
//   }

//   async isConnected(type = null) {
//     type = type || this.config.database?.development?.client || "sqlite";
//     const connection = this.connections.get(type);

//     if (!connection) return false;

//     try {
//       switch (type.toLowerCase()) {
//         case "mysql":
//           await connection.query("SELECT 1");
//           break;
//         case "sqlite":
//           connection.prepare("SELECT 1").get();
//           break;
//         case "postgresql":
//           await connection.query("SELECT 1");
//           break;
//       }
//       return true;
//     } catch (error) {
//       console.error(`Connection test failed for ${type}:`, error);
//       return false;
//     }
//   }

//   getCurrentDatabaseType() {
//     return this.config.database?.development?.client || "sqlite";
//   }

//   getDbPath() {
//     const config = this.config.database?.development?.connection || {};
//     return (
//       config.filename || path.join(process.cwd(), "db", "development.sqlite3")
//     );
//   }
// }

// module.exports = new ConnectionManager();

const Database = require("better-sqlite3");
const mysql = require("mysql2/promise");
const { Pool } = require("pg");
const path = require("path");
const { log } = require("../utils/chalkUtils");
const { loadConfig } = require("../config");
const util = require("util");

class ConnectionManager {
  static instance = null;

  constructor() {
    if (ConnectionManager.instance) {
      return ConnectionManager.instance;
    }
    this.connections = new Map();
    this.loadConfig();
    ConnectionManager.instance = this;
  }

  loadConfig() {
    const configPath = path.join(process.cwd(), "config", "database.js");
    if (require.cache[configPath]) {
      delete require.cache[configPath];
    }

    this.config = loadConfig();
    console.log("\nConnectionManager config loaded");
    console.log("Config:", JSON.stringify(this.config, null, 2));
  }

  resetConfig() {
    this.closeAll();
    this.connections.clear();
    this.loadConfig();
  }

  async createMySQLPool(config) {
    console.log("Creating MySQL pool with config:", {
      ...config,
      password: "****",
    });

    try {
      const poolConfig = {
        host: config.host || "localhost",
        user: config.user || "root",
        password: config.password || "",
        port: config.port || 3306,
        database: config.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        multipleStatements: true,
      };

      const pool = mysql.createPool(poolConfig);
      pool.poolConfig = poolConfig;

      console.log("Testing pool connection with config:", {
        ...poolConfig,
        password: "****",
      });
      const [rows] = await pool.query("SELECT 1 AS connection_test");
      console.log("Pool connection test result:", rows);

      return pool;
    } catch (error) {
      console.error("Pool creation/test failed:", error);
      throw error;
    }
  }

  getActiveDatabase() {
    return this.config.active || "sqlite";
  }

  getDatabaseConfig(type = null, env = "development") {
    type = type || this.getActiveDatabase();
    return this.config.databases?.[type]?.[env]?.connection;
  }

  async getConnection(type = null) {
    console.log("\ngetConnection called with type:", type);

    type = type || this.getActiveDatabase();
    console.log("Using database type:", type);

    if (this.connections.has(type)) {
      console.log("Returning existing connection");
      const connection = this.connections.get(type);

      try {
        if (type === "mysql") {
          await connection.query("SELECT 1");
        }
        return connection;
      } catch (error) {
        console.log("Existing connection failed, creating new one");
        this.connections.delete(type);
      }
    }

    try {
      let connection;
      const config = this.getDatabaseConfig(type);
      console.log("\nConnection config:", JSON.stringify(config, null, 2));

      switch (type.toLowerCase()) {
        case "mysql":
          const mysqlConfig = {
            host: config.host || "localhost",
            user: config.user || "root",
            password: config.password || "",
            port: config.port || 3306,
          };

          const tempPool = await this.createMySQLPool(mysqlConfig);
          try {
            console.log(`Checking if database '${config.database}' exists...`);
            await tempPool.query(`USE ${config.database}`);
            console.log("Database exists");
          } catch (error) {
            if (error.code === "ER_BAD_DB_ERROR") {
              console.log(`Creating database '${config.database}'...`);
              await tempPool.query(
                `CREATE DATABASE IF NOT EXISTS ${config.database}`
              );
              console.log("Database created successfully");
            } else {
              throw error;
            }
          } finally {
            await tempPool.end();
          }

          connection = await this.createMySQLPool({
            ...mysqlConfig,
            database: config.database,
          });
          break;

        case "sqlite":
          const dbPath =
            config.filename ||
            path.join(process.cwd(), "db", "development.sqlite3");
          console.log("SQLite database path:", dbPath);
          connection = new Database(dbPath);
          break;

        case "postgresql":
          const pgConfig = {
            user: config.user || "postgres",
            host: config.host || "localhost",
            password: config.password || "",
            port: config.port || 5432,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
          };

          const tempPgPool = new Pool(pgConfig);

          try {
            console.log(`Checking if database '${config.database}' exists...`);
            const result = await tempPgPool.query(
              `SELECT 1 FROM pg_database WHERE datname = $1`,
              [config.database]
            );

            if (result.rows.length === 0) {
              console.log(
                `Database '${config.database}' not found, creating it...`
              );
              await tempPgPool.query(`CREATE DATABASE ${config.database}`);
              console.log("Database created successfully");
            } else {
              console.log("Database exists");
            }
          } catch (error) {
            console.error("Error checking/creating database:", error.message);
            throw error;
          } finally {
            await tempPgPool.end();
          }

          connection = new Pool({
            ...pgConfig,
            database: config.database,
          });

          console.log("Testing PostgreSQL connection...");
          await connection.query("SELECT 1");
          console.log("PostgreSQL connection test successful");
          break;

        default:
          throw new Error(`Unsupported database type: ${type}`);
      }

      this.connections.set(type, connection);
      console.log(`${type} connection created successfully`);
      return connection;
    } catch (error) {
      console.error("\nConnection error:", {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage,
      });
      throw error;
    }
  }

  async closeConnection(type = null) {
    type = type || this.getActiveDatabase();
    const connection = this.connections.get(type);

    if (connection) {
      try {
        console.log(`Closing ${type} connection...`);
        switch (type.toLowerCase()) {
          case "mysql":
            await connection.end();
            break;
          case "sqlite":
            connection.close();
            break;
          case "postgresql":
            await connection.end();
            break;
        }
        this.connections.delete(type);
        console.log(`${type} connection closed successfully`);
      } catch (error) {
        console.error(`Error closing ${type} connection:`, error);
        throw error;
      }
    }
  }

  async closeAll() {
    for (const [type] of this.connections) {
      await this.closeConnection(type);
    }
  }

  async isConnected(type = null) {
    type = type || this.getActiveDatabase();
    const connection = this.connections.get(type);

    if (!connection) return false;

    try {
      switch (type.toLowerCase()) {
        case "mysql":
          await connection.query("SELECT 1");
          break;
        case "sqlite":
          connection.prepare("SELECT 1").get();
          break;
        case "postgresql":
          await connection.query("SELECT 1");
          break;
      }
      return true;
    } catch (error) {
      console.error(`Connection test failed for ${type}:`, error);
      return false;
    }
  }

  getCurrentDatabaseType() {
    return this.getActiveDatabase();
  }

  getDbPath(type = null) {
    const config = this.getDatabaseConfig(type);
    return (
      config.filename || path.join(process.cwd(), "db", "development.sqlite3")
    );
  }
}

module.exports = new ConnectionManager();
