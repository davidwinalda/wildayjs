// const SQLiteAdapter = require("./sqlite");
// const PostgreSQLAdapter = require("./postgresql");
// const MySQLAdapter = require("./mysql");
// const connectionManager = require("../../database/connectionManager");

// class AdapterFactory {
//   static async create(type = null, connection = null) {
//     console.log("\n=== Creating Database Adapter ===");
//     console.log("Requested type:", type);
//     console.log("Has connection:", !!connection);

//     try {
//       // If connection is not provided, get it from connection manager
//       if (!connection) {
//         console.log("No connection provided, getting from connection manager");
//         connection = await connectionManager.getConnection(type);
//         console.log("Connection obtained from manager:", !!connection);
//       }

//       // Get database type
//       const dbType =
//         type || connectionManager.getCurrentDatabaseType() || "sqlite";
//       console.log("Resolved database type:", dbType);

//       let adapter;
//       switch (dbType.toLowerCase()) {
//         case "sqlite":
//         case "sqlite3":
//           console.log("Creating SQLite adapter");
//           adapter = new SQLiteAdapter(connection);
//           break;

//         case "mysql":
//         case "mysql2":
//           console.log("Creating MySQL adapter");
//           adapter = new MySQLAdapter(connection);
//           break;

//         case "postgresql":
//         case "postgres":
//         case "pg":
//           console.log("Creating PostgreSQL adapter");
//           adapter = new PostgreSQLAdapter(connection);
//           break;

//         default:
//           throw new Error(`Unsupported database type: ${dbType}`);
//       }

//       // Verify adapter was created properly
//       console.log("Adapter created successfully:", {
//         type: adapter.type,
//         hasConnection: !!adapter.pool || !!adapter.connection,
//         methods: Object.keys(adapter),
//         transactionSupport: {
//           beginTransaction: typeof adapter.beginTransaction === "function",
//           commit: typeof adapter.commit === "function",
//           rollback: typeof adapter.rollback === "function",
//         },
//       });

//       return adapter;
//     } catch (error) {
//       console.error("\n=== Adapter Creation Error ===");
//       console.error("Error type:", error.constructor.name);
//       console.error("Error message:", error.message);
//       console.error("Stack trace:", error.stack);
//       throw new Error(`Failed to create database adapter: ${error.message}`);
//     }
//   }
// }

// module.exports = {
//   AdapterFactory,
//   // Export adapter classes for direct use if needed
//   SQLiteAdapter,
//   PostgreSQLAdapter,
//   MySQLAdapter,
// };

const SQLiteAdapter = require("./sqlite");
const PostgreSQLAdapter = require("./postgresql");
const MySQLAdapter = require("./mysql");
const connectionManager = require("../../database/connectionManager");

class AdapterFactory {
  static async create(type = null, connection = null) {
    console.log("\n=== Creating Database Adapter ===");
    console.log("Requested type:", type);
    console.log("Has connection:", !!connection);

    try {
      // Get active database type from connection manager
      const activeType = connectionManager.getActiveDatabase();
      console.log("Active database type from config:", activeType);

      // Determine final database type with priority:
      // 1. Explicitly passed type
      // 2. Active type from config
      // 3. Default to sqlite
      const dbType = type || activeType || "sqlite";
      console.log("Final database type:", dbType);

      // If connection is not provided, get it from connection manager
      if (!connection) {
        console.log("\nGetting connection from connection manager");
        console.log("Requesting connection for type:", dbType);

        try {
          connection = await connectionManager.getConnection(dbType);
          console.log("Connection obtained successfully:", {
            hasConnection: !!connection,
            type: dbType,
            isClient: !!connection?.client,
            isPool: !!connection?.pool,
            config: connection?.config
              ? {
                  host: connection.config.host,
                  port: connection.config.port,
                  database: connection.config.database,
                  user: connection.config.user,
                }
              : "No config",
          });
        } catch (connError) {
          console.error("Connection error:", {
            type: connError.constructor.name,
            message: connError.message,
            code: connError.code,
          });
          throw connError;
        }
      }

      // Create appropriate adapter based on database type
      let adapter;
      switch (dbType.toLowerCase()) {
        case "postgresql":
        case "postgres":
        case "pg":
          console.log("\nInitializing PostgreSQL adapter");
          adapter = new PostgreSQLAdapter(connection);
          adapter.type = "postgresql";
          adapter.dialect = "postgresql";
          break;

        case "mysql":
        case "mysql2":
          console.log("\nInitializing MySQL adapter");
          adapter = new MySQLAdapter(connection);
          adapter.type = "mysql";
          adapter.dialect = "mysql";
          break;

        case "sqlite":
        case "sqlite3":
          console.log("\nInitializing SQLite adapter");
          adapter = new SQLiteAdapter(connection);
          adapter.type = "sqlite";
          adapter.dialect = "sqlite";
          break;

        default:
          throw new Error(`Unsupported database type: ${dbType}`);
      }

      // Add common utility methods
      this.addCommonMethods(adapter, dbType);

      // Verify adapter was created properly
      const adapterInfo = {
        type: adapter.type,
        dialect: adapter.dialect,
        hasConnection:
          !!adapter.client || !!adapter.pool || !!adapter.connection,
        connectionType: adapter.client
          ? "client"
          : adapter.pool
          ? "pool"
          : "connection",
        methods: Object.keys(adapter),
        transactionSupport: {
          beginTransaction: typeof adapter.beginTransaction === "function",
          commit: typeof adapter.commit === "function",
          rollback: typeof adapter.rollback === "function",
        },
      };

      console.log("\nAdapter created successfully:", adapterInfo);

      // Test connection
      try {
        console.log("\nTesting adapter connection...");
        await adapter.query("SELECT 1 AS connection_test");
        console.log("Connection test successful");
      } catch (testError) {
        console.error("Connection test failed:", testError.message);
        throw new Error(`Connection test failed: ${testError.message}`);
      }

      return adapter;
    } catch (error) {
      console.error("\n=== Adapter Creation Error ===");
      console.error("Error type:", error.constructor.name);
      console.error("Error message:", error.message);
      console.error("Stack trace:", error.stack);
      throw new Error(`Failed to create database adapter: ${error.message}`);
    }
  }

  static addCommonMethods(adapter, dbType) {
    // Add escapeIdentifier if it doesn't exist
    if (!adapter.escapeIdentifier) {
      adapter.escapeIdentifier = (identifier) => {
        if (!identifier) return '""';

        switch (dbType) {
          case "postgresql":
            return '"' + identifier.replace(/"/g, '""') + '"';
          case "mysql":
            return "`" + identifier.replace(/`/g, "``") + "`";
          default:
            return '"' + identifier.replace(/"/g, '""') + '"';
        }
      };
    }

    // Add query method if it doesn't exist
    if (!adapter.query) {
      adapter.query = async (sql, params = []) => {
        try {
          switch (dbType) {
            case "postgresql":
              const result = await adapter.client.query(sql, params);
              return result.rows;
            case "mysql":
              const [rows] = await adapter.pool.query(sql, params);
              return rows;
            default:
              return adapter.execute(sql, params);
          }
        } catch (error) {
          console.error(`Query error (${dbType}):`, {
            sql,
            params,
            error: error.message,
          });
          throw error;
        }
      };
    }

    // Add execute method if it doesn't exist
    if (!adapter.execute) {
      adapter.execute = async (sql, params = []) => {
        try {
          switch (dbType) {
            case "postgresql":
              return adapter.client.query(sql, params);
            case "mysql":
              return adapter.pool.query(sql, params);
            default:
              return adapter.db.run(sql, params);
          }
        } catch (error) {
          console.error(`Execute error (${dbType}):`, {
            sql,
            params,
            error: error.message,
          });
          throw error;
        }
      };
    }
  }
}

module.exports = {
  AdapterFactory,
  SQLiteAdapter,
  PostgreSQLAdapter,
  MySQLAdapter,
};
