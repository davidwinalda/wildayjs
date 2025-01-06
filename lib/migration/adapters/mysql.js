// const BaseAdapter = require("./base");

// class MySQLAdapter extends BaseAdapter {
//   constructor(connection) {
//     super();
//     this.connection = connection;
//   }

//   // Transaction Management
//   async beginTransaction() {
//     return new Promise((resolve, reject) => {
//       this.connection.beginTransaction((err) => {
//         if (err) reject(err);
//         else resolve();
//       });
//     });
//   }

//   async commit() {
//     return new Promise((resolve, reject) => {
//       this.connection.commit((err) => {
//         if (err) reject(err);
//         else resolve();
//       });
//     });
//   }

//   async rollback() {
//     return new Promise((resolve, reject) => {
//       this.connection.rollback((err) => {
//         if (err) reject(err);
//         else resolve();
//       });
//     });
//   }

//   // Query Execution
//   async execute(sql, params = []) {
//     return new Promise((resolve, reject) => {
//       this.connection.query(sql, params, (error, results) => {
//         if (error) reject(error);
//         else resolve(results);
//       });
//     });
//   }

//   async query(sql, params = []) {
//     return this.execute(sql, params);
//   }

//   // Schema Information
//   async exists(table, condition, params = []) {
//     const result = await this.query(
//       `SELECT 1 FROM ${this.escapeIdentifier(
//         table
//       )} WHERE ${condition} LIMIT 1`,
//       params
//     );
//     return result.length > 0;
//   }

//   async columnExists(table, column) {
//     const result = await this.query(
//       `SELECT 1 FROM information_schema.columns
//        WHERE table_schema = DATABASE()
//        AND table_name = ? AND column_name = ?`,
//       [table, column]
//     );
//     return result.length > 0;
//   }

//   async tableExists(table) {
//     const result = await this.query(
//       `SELECT 1 FROM information_schema.tables
//        WHERE table_schema = DATABASE()
//        AND table_name = ?`,
//       [table]
//     );
//     return result.length > 0;
//   }

//   async getTableInfo(table) {
//     return await this.query(
//       `SHOW FULL COLUMNS FROM ${this.escapeIdentifier(table)}`
//     );
//   }

//   async getTriggers(table) {
//     const results = await this.query(`SHOW TRIGGERS WHERE \`Table\` = ?`, [
//       table,
//     ]);
//     return results.map((t) => t.Statement);
//   }

//   async getIndexes(table) {
//     return await this.query(`SHOW INDEX FROM ${this.escapeIdentifier(table)}`);
//   }

//   // SQL Generation
//   getIdColumnDefinition() {
//     return "BIGINT AUTO_INCREMENT PRIMARY KEY";
//   }

//   getDefaultValueSql(value) {
//     if (value === null) return "NULL";
//     if (value === "CURRENT_TIMESTAMP") return "CURRENT_TIMESTAMP";
//     return value;
//   }

//   getCastToTextSql(value) {
//     return `CAST(${value} AS CHAR)`;
//   }

//   getDatetimeNowSql() {
//     return "CURRENT_TIMESTAMP";
//   }

//   getRandomSql(length = 8) {
//     return `SUBSTRING(MD5(RAND()), 1, ${length})`;
//   }

//   getDateFormatSql(format, value = "NOW()") {
//     const mysqlFormat = format
//       .replace(/%Y/g, "%Y")
//       .replace(/%m/g, "%m")
//       .replace(/%d/g, "%d")
//       .replace(/%H/g, "%H")
//       .replace(/%M/g, "%i")
//       .replace(/%S/g, "%s");
//     return `DATE_FORMAT(${value}, '${mysqlFormat}')`;
//   }

//   // Migration Helpers
//   cleanMigrationSql(sql) {
//     return sql
//       .replace(/START TRANSACTION;?\s*/gi, "")
//       .replace(/COMMIT;?\s*/gi, "")
//       .replace(/--.*$/gm, "")
//       .replace(/\s+/g, " ")
//       .trim();
//   }

//   async disableForeignKeys() {
//     await this.execute("SET FOREIGN_KEY_CHECKS = 0");
//   }

//   async enableForeignKeys() {
//     await this.execute("SET FOREIGN_KEY_CHECKS = 1");
//   }

//   // DDL Statements
//   getCreateTableSql(table, columns, options = {}) {
//     const columnDefs = columns.map((col) => {
//       let def = `${this.escapeIdentifier(col.name)} ${col.type}`;
//       if (col.primaryKey) def += " PRIMARY KEY";
//       if (col.autoIncrement) def += " AUTO_INCREMENT";
//       if (col.notNull) def += " NOT NULL";
//       if (col.unique) def += " UNIQUE";
//       if (col.default !== undefined) {
//         def += ` DEFAULT ${this.getDefaultValueSql(col.default)}`;
//       }
//       return def;
//     });

//     let sql = `CREATE TABLE ${this.escapeIdentifier(table)} (\n  `;
//     sql += columnDefs.join(",\n  ");

//     if (options.foreignKeys?.length > 0) {
//       sql += ",\n  ";
//       sql += options.foreignKeys
//         .map((fk) => this.getForeignKeyDefinition(fk.column, fk.reference, fk))
//         .join(",\n  ");
//     }

//     sql +=
//       "\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
//     return sql;
//   }

//   getDropTableSql(table) {
//     return `DROP TABLE IF EXISTS ${this.escapeIdentifier(table)}`;
//   }

//   getCreateTempTableSql(table, columns = "*") {
//     const tempTable = `${table}_temp`;
//     return `CREATE TEMPORARY TABLE ${this.escapeIdentifier(tempTable)} AS
// SELECT ${columns === "*" ? "*" : columns.join(", ")}
// FROM ${this.escapeIdentifier(table)}`;
//   }

//   getDropTempTableSql(table) {
//     return this.getDropTableSql(`${table}_temp`);
//   }

//   // Index Operations
//   getCreateIndexSql(table, columns, options = {}) {
//     const indexName = options.name || `idx_${table}_${columns.join("_")}`;
//     const uniqueStr = options.unique ? "UNIQUE" : "";
//     return `CREATE ${uniqueStr} INDEX ${indexName}
// ON ${this.escapeIdentifier(table)} (${columns.join(", ")})`;
//   }

//   getDropIndexSql(indexName, table) {
//     return `DROP INDEX ${indexName} ON ${this.escapeIdentifier(table)}`;
//   }

//   // Trigger Management
//   getTriggerName(table, column, action) {
//     return `tr_${table}_${column}_${action}`;
//   }

//   getCreateTriggerSql(table, column, options = {}) {
//     const triggerName = this.getTriggerName(
//       table,
//       column,
//       options.action || "default"
//     );
//     return `
// CREATE TRIGGER ${triggerName}
// ${options.timing || "BEFORE"} ${
//       options.event || "INSERT"
//     } ON ${this.escapeIdentifier(table)}
// FOR EACH ROW
// ${options.condition ? `WHEN (${options.condition})` : ""}
// BEGIN
//   ${
//     options.body ||
//     `SET NEW.${column} = ${options.value || this.getDatetimeNowSql()};`
//   }
// END;`;
//   }

//   getDropTriggerSql(triggerName) {
//     return `DROP TRIGGER IF EXISTS ${triggerName}`;
//   }

//   // Type Conversion
//   convertToNativeType(value, type) {
//     switch (type.toLowerCase()) {
//       case "int":
//       case "bigint":
//       case "tinyint":
//       case "smallint":
//       case "mediumint":
//         return parseInt(value, 10);
//       case "decimal":
//       case "float":
//       case "double":
//         return parseFloat(value);
//       case "boolean":
//       case "tinyint(1)":
//         return !!value;
//       case "datetime":
//       case "timestamp":
//         return value instanceof Date ? value.toISOString() : value;
//       default:
//         return value;
//     }
//   }

//   // Error Handling
//   isUniqueViolation(error) {
//     return error.code === "ER_DUP_ENTRY";
//   }

//   isForeignKeyViolation(error) {
//     return error.code === "ER_NO_REFERENCED_ROW";
//   }
// }

// module.exports = MySQLAdapter;

const BaseAdapter = require("./base");
const { getDefaultPatterns } = require("../generators/sqlGenerators/constants");

class MySQLAdapter extends BaseAdapter {
  constructor(connection) {
    super();
    this.type = "mysql";
    if (!connection) {
      throw new Error("MySQL connection is required");
    }

    this.pool = connection;
    this.config = this.pool.poolConfig;

    console.log("MySQLAdapter initialized with config:", {
      hasPool: !!this.pool,
      database: this.config?.database,
      host: this.config?.host,
      port: this.config?.port,
      user: this.config?.user,
      connectionLimit: this.config?.connectionLimit,
    });
  }

  // Test the connection
  async testConnection() {
    console.log("\n=== Testing MySQL Connection ===");
    try {
      const [results] = await this.pool.query("SELECT 1 AS connection_test");
      console.log("Connection test successful:", results);
      return true;
    } catch (error) {
      console.error("Connection test failed:", error);
      throw error;
    }
  }

  // Get connection state
  getConnectionState() {
    return {
      hasPool: !!this.pool,
      database: this.pool.config?.database || "unknown",
      state: "connected",
    };
  }

  // Transaction Management
  async beginTransaction() {
    console.log("\n=== Beginning Transaction ===");
    let connection = null;

    try {
      console.log("Getting connection from pool...");
      console.log("Pool state:", {
        pool: !!this.pool,
        config: {
          host: this.config?.host,
          port: this.config?.port,
          database: this.config?.database,
          user: this.config?.user,
        },
        connectionLimit: this.config?.connectionLimit,
      });

      // Get connection
      connection = await this.pool.getConnection();

      console.log("Connection obtained:", {
        threadId: connection.threadId,
        database: this.config?.database,
      });

      // Begin transaction
      console.log("Starting transaction...");
      await connection.beginTransaction();
      console.log("Transaction started successfully");

      // Add helper methods to connection
      connection.debugLog = (message) => {
        console.log(`[Connection ${connection.threadId}] ${message}`);
      };

      await connection.debugLog("Transaction initialized");
      return connection;
    } catch (error) {
      console.error("Transaction initialization error:", {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
      });

      if (connection) {
        try {
          await connection.rollback();
          connection.release();
          console.log("Failed connection cleaned up");
        } catch (cleanupError) {
          console.error("Cleanup error:", cleanupError);
        }
      }

      throw error;
    }
  }

  async commit(connection) {
    if (!connection) {
      throw new Error("No connection provided for commit");
    }

    console.log("\n=== Committing Transaction ===");
    try {
      await connection.debugLog("Committing transaction...");
      await connection.commit();
      await connection.debugLog("Transaction committed successfully");
    } catch (error) {
      console.error("Commit error:", {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
      });
      throw error;
    } finally {
      await connection.debugLog("Releasing connection...");
      connection.release();
      console.log("Connection released");
    }
  }

  async rollback(connection) {
    if (!connection) {
      throw new Error("No connection provided for rollback");
    }

    console.log("\n=== Rolling Back Transaction ===");
    try {
      await connection.debugLog("Rolling back transaction...");
      await connection.rollback();
      await connection.debugLog("Transaction rolled back successfully");
    } catch (error) {
      console.error("Rollback error:", {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
      });
      throw error;
    } finally {
      await connection.debugLog("Releasing connection...");
      connection.release();
      console.log("Connection released");
    }
  }

  async execute(sql, params = [], connection = null) {
    console.log("\n=== Executing MySQL Query ===");
    console.log("SQL:", sql);
    console.log("Parameters:", params);
    console.log(
      "Connection type:",
      connection ? `Transaction (${connection.threadId})` : "Pool"
    );

    try {
      const queryRunner = connection || this.pool;

      // Commands that need to use query() instead of execute()
      const nonPreparedCommands = [
        "CREATE TRIGGER",
        "DROP TRIGGER",
        "CREATE PROCEDURE",
        "DROP PROCEDURE",
        "CREATE FUNCTION",
        "DROP FUNCTION",
      ];

      // Check if the SQL starts with any of these commands
      const shouldUsePrepared = !nonPreparedCommands.some((cmd) =>
        sql.trim().toUpperCase().startsWith(cmd)
      );

      // Use appropriate method based on the SQL command
      const [results] = shouldUsePrepared
        ? await queryRunner.execute(sql, params)
        : await queryRunner.query(sql, params);

      console.log("Query executed successfully");
      return results;
    } catch (error) {
      console.error("Query error:", {
        message: error.message,
        code: error.code,
        sqlState: error.sqlState,
      });
      throw error;
    }
  }

  async query(sql, params = []) {
    console.log("\n=== Query Method Called ===");
    console.log("SQL:", sql.replace(/\s+/g, " ").trim());
    console.log("Params:", params);

    try {
      const [results] = await this.pool.query(sql, params);
      console.log("Query raw results:", JSON.stringify(results, null, 2));
      return results;
    } catch (error) {
      console.error("Query error:", {
        message: error.message,
        sql: sql.replace(/\s+/g, " ").trim(),
        params,
      });
      throw error;
    }
  }

  // Schema Information
  async exists(table, condition, params = []) {
    const result = await this.query(
      `SELECT 1 FROM ${this.escapeIdentifier(
        table
      )} WHERE ${condition} LIMIT 1`,
      params
    );
    return result.length > 0;
  }

  async columnExists(table, column) {
    const result = await this.query(
      `SELECT 1 FROM information_schema.columns 
       WHERE table_schema = DATABASE()
       AND table_name = ? AND column_name = ?`,
      [table, column]
    );
    return result.length > 0;
  }

  async tableExists(table) {
    const result = await this.query(
      `SELECT 1 FROM information_schema.tables 
       WHERE table_schema = DATABASE() 
       AND table_name = ?`,
      [table]
    );
    return result.length > 0;
  }

  // Migration Table Management
  async createMigrationsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS migrations (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        version VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reverted_at TIMESTAMP NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await this.execute(sql);
  }

  async createSchemaMigrationsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await this.execute(sql);
  }

  // Migration Status Management
  async insertMigration(filename, version) {
    const sql = `
      INSERT INTO migrations (filename, version) 
      VALUES (?, ?);
    `;
    await this.execute(sql, [filename, version]);
  }

  async updateMigrationStatus(version, status = "reverted") {
    const sql = `
      UPDATE migrations 
      SET reverted_at = ${status === "reverted" ? "CURRENT_TIMESTAMP" : "NULL"}
      WHERE version = ?;
    `;
    await this.execute(sql, [version]);
  }

  async getMigrations() {
    return await this.query(`
      SELECT * FROM migrations 
      WHERE reverted_at IS NULL 
      ORDER BY applied_at DESC;
    `);
  }

  async insertSchemaVersion(version) {
    const sql = `
      INSERT INTO schema_migrations (version) 
      VALUES (?);
    `;
    await this.execute(sql, [version]);
  }

  async getSchemaVersions() {
    return await this.query(`
      SELECT version FROM schema_migrations 
      ORDER BY created_at DESC;
    `);
  }

  // Column Type Management
  getColumnType(type, options = {}) {
    switch (type.toLowerCase()) {
      case "string":
        return options.limit ? `VARCHAR(${options.limit})` : "VARCHAR(255)";
      case "text":
        return "TEXT";
      case "integer":
        return "INT";
      case "bigint":
        return "BIGINT";
      case "float":
        return "FLOAT";
      case "decimal":
        return `DECIMAL(${options.precision || 10},${options.scale || 2})`;
      case "boolean":
        return "TINYINT(1)";
      case "date":
        return "DATE";
      case "datetime":
        return "TIMESTAMP";
      case "time":
        return "TIME";
      case "binary":
        return "BLOB";
      default:
        return "VARCHAR(255)";
    }
  }

  // Table Operations
  async createTable(tableName, columns, options = {}) {
    const columnDefinitions = columns.map((column) => {
      let def = `${this.escapeIdentifier(column.name)} ${this.getColumnType(
        column.type,
        column.options
      )}`;
      if (column.primaryKey) def += " PRIMARY KEY";
      if (column.autoIncrement) def += " AUTO_INCREMENT";
      if (column.notNull) def += " NOT NULL";
      if (column.unique) def += " UNIQUE";
      if (column.default !== undefined) {
        def += ` DEFAULT ${this.getDefaultValueSql(column.default)}`;
      }
      return def;
    });

    const sql = `
      CREATE TABLE ${this.escapeIdentifier(tableName)} (
        ${columnDefinitions.join(",\n        ")}
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await this.execute(sql);
  }

  // Utility Methods
  escapeIdentifier(identifier) {
    return `\`${identifier.replace(/`/g, "``")}\``;
  }

  getDefaultValueSql(value) {
    if (value === null) return "NULL";
    if (value === "CURRENT_TIMESTAMP") return "CURRENT_TIMESTAMP";
    if (typeof value === "string") return `'${value.replace(/'/g, "''")}'`;
    return value;
  }

  // Error Handling
  isUniqueViolation(error) {
    return error.code === "ER_DUP_ENTRY";
  }

  isForeignKeyViolation(error) {
    return error.code === "ER_NO_REFERENCED_ROW";
  }

  // Temporary Table Operations
  getCreateTempTableSql(table) {
    return `CREATE TEMPORARY TABLE ${this.escapeIdentifier(
      `${table}_temp`
    )} LIKE ${this.escapeIdentifier(table)}`;
  }

  getDropTempTableSql(table) {
    return `DROP TEMPORARY TABLE IF EXISTS ${this.escapeIdentifier(
      `${table}_temp`
    )}`;
  }

  // Table Operations (update existing createTable and add new ones)
  getCreateTableSql(table, columns) {
    const columnDefinitions = columns.map((col) => {
      let def = `${this.escapeIdentifier(col.name)} ${this.getColumnType(
        col.type,
        col.options
      )}`;
      if (col.primaryKey) def += " PRIMARY KEY";
      if (col.autoIncrement) def += " AUTO_INCREMENT";
      if (col.notNull) def += " NOT NULL";
      if (col.unique) def += " UNIQUE";
      if (col.default !== undefined) {
        def += ` DEFAULT ${this.getDefaultValueSql(col.default)}`;
      }
      return def;
    });

    return `CREATE TABLE ${this.escapeIdentifier(table)} (
      ${columnDefinitions.join(",\n      ")}
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;
  }

  getDropTableSql(table) {
    return `DROP TABLE IF EXISTS ${this.escapeIdentifier(table)}`;
  }

  // Index Operations
  getCreateIndexSql(table, columns, options = {}) {
    const indexName = options.name || `idx_${table}_${columns.join("_")}`;
    const indexType = options.unique ? "UNIQUE" : "";
    const columnList = columns
      .map((col) => this.escapeIdentifier(col))
      .join(", ");

    return `CREATE ${indexType} INDEX ${this.escapeIdentifier(indexName)} 
            ON ${this.escapeIdentifier(table)} (${columnList})`;
  }

  getDropIndexSql(table, indexName) {
    return `DROP INDEX ${this.escapeIdentifier(
      indexName
    )} ON ${this.escapeIdentifier(table)}`;
  }

  // Trigger Operations
  getTriggerName(table, timing, event) {
    return `trg_${table}_${timing}_${event}`;
  }

  getCreateTriggerSql(triggerName, table, timing, event, body) {
    return `CREATE TRIGGER ${this.escapeIdentifier(triggerName)}
            ${timing} ${event} ON ${this.escapeIdentifier(table)}
            FOR EACH ROW
            BEGIN
              ${body}
            END;`;
  }

  getDropTriggerSql(triggerName) {
    return `DROP TRIGGER IF EXISTS ${this.escapeIdentifier(triggerName)}`;
  }

  // Data Operations
  getInsertFromTempSql(table, columns) {
    const columnList = columns
      .map((col) => this.escapeIdentifier(col))
      .join(", ");
    return `INSERT INTO ${this.escapeIdentifier(table)} (${columnList})
            SELECT ${columnList} FROM ${this.escapeIdentifier(
      `${table}_temp`
    )}`;
  }

  // Type Conversion
  convertToNativeType(type) {
    const typeMap = {
      string: "VARCHAR(255)",
      text: "TEXT",
      integer: "INT",
      float: "FLOAT",
      decimal: "DECIMAL(10,2)",
      datetime: "DATETIME",
      boolean: "TINYINT(1)",
      date: "DATE",
      time: "TIME",
      timestamp: "TIMESTAMP",
      binary: "BLOB",
    };

    return typeMap[type.toLowerCase()] || type;
  }

  // Additional Utility Methods
  getCastToTextSql(value) {
    return `CAST(${value} AS CHAR)`;
  }

  getDatetimeNowSql() {
    return "CURRENT_TIMESTAMP";
  }

  getRandomSql(length = 8) {
    return `SUBSTRING(MD5(RAND()), 1, ${length})`;
  }

  getDateFormatSql(format) {
    return `DATE_FORMAT(NOW(), '${format}')`;
  }

  cleanMigrationSql(sql) {
    return sql.replace(/^\s+/gm, "").trim();
  }

  // Foreign Key Operations
  disableForeignKeys() {
    return "SET FOREIGN_KEY_CHECKS = 0;";
  }

  enableForeignKeys() {
    return "SET FOREIGN_KEY_CHECKS = 1;";
  }

  // Column Definition
  getColumnDefinition(column) {
    let def = `${this.escapeIdentifier(column.name)} ${this.convertToNativeType(
      column.type
    )}`;
    if (column.primaryKey) def += " PRIMARY KEY";
    if (column.autoIncrement) def += " AUTO_INCREMENT";
    if (column.notNull) def += " NOT NULL";
    if (column.unique) def += " UNIQUE";
    if (column.default !== undefined) {
      def += ` DEFAULT ${this.getDefaultValueSql(column.default)}`;
    }
    return def;
  }

  // ID Column Definition
  getIdColumnDefinition() {
    return "id BIGINT AUTO_INCREMENT PRIMARY KEY";
  }

  async getTableInfo(table) {
    console.log("\n=== getTableInfo Called ===");
    console.log("Getting info for table:", table);

    try {
      // First, check if table exists
      const tableExistsQuery = `
        SELECT COUNT(*) as count 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ?
      `;

      console.log("\nChecking table existence:");
      console.log("Query:", tableExistsQuery.replace(/\s+/g, " ").trim());
      console.log("Params:", [table]);

      const [tableExists] = await this.query(tableExistsQuery, [table]);
      console.log("Table exists check result:", tableExists);

      if (!tableExists || tableExists.count === 0) {
        console.log("Table does not exist:", table);
        return [];
      }

      // Get column information
      const columnsQuery = `
        SELECT 
          COLUMN_NAME as name,
          DATA_TYPE as data_type,
          COLUMN_TYPE as column_type,
          CHARACTER_MAXIMUM_LENGTH as max_length,
          IS_NULLABLE as is_nullable,
          COLUMN_DEFAULT as column_default,
          COLUMN_KEY as column_key,
          EXTRA as extra,
          ORDINAL_POSITION as position
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION;
      `;

      console.log("\nGetting column information:");
      console.log("Query:", columnsQuery.replace(/\s+/g, " ").trim());
      console.log("Params:", [table]);

      const columns = await this.query(columnsQuery, [table]);
      console.log("Raw column results:", JSON.stringify(columns, null, 2));

      if (!columns || columns.length === 0) {
        console.log("No columns found for table:", table);
        return [];
      }

      // Process columns
      const processedColumns = columns.map((col, index) => {
        console.log(
          `\nProcessing column ${index}:`,
          JSON.stringify(col, null, 2)
        );

        const columnInfo = {
          cid: index,
          name: col.name,
          type: this.normalizeColumnType(col.column_type || col.data_type),
          notnull: col.is_nullable === "NO" ? 1 : 0,
          dflt_value: this.normalizeDefaultValue(col.column_default),
          pk: col.column_key === "PRI" ? 1 : 0,
          unique: ["PRI", "UNI"].includes(col.column_key) ? 1 : 0,
          auto_increment: col.extra?.toLowerCase().includes("auto_increment")
            ? 1
            : 0,
        };

        console.log(
          "Processed column info:",
          JSON.stringify(columnInfo, null, 2)
        );
        return columnInfo;
      });

      console.log(
        "\nFinal processed columns:",
        JSON.stringify(processedColumns, null, 2)
      );
      return processedColumns;
    } catch (error) {
      console.error("\nError in getTableInfo:", {
        message: error.message,
        stack: error.stack,
        table: table,
      });
      throw error;
    }
  }

  async getTriggers(table) {
    try {
      const triggers = await this.query(
        `
        SELECT 
          TRIGGER_NAME as name,
          ACTION_TIMING as timing,
          EVENT_MANIPULATION as event,
          ACTION_STATEMENT as statement
        FROM information_schema.TRIGGERS
        WHERE EVENT_OBJECT_SCHEMA = DATABASE()
        AND EVENT_OBJECT_TABLE = ?
      `,
        [table]
      );

      return Array.isArray(triggers) ? triggers : [];
    } catch (error) {
      console.error("Error getting triggers:", error);
      return [];
    }
  }

  normalizeColumnType(type) {
    console.log("\nNormalizing column type:", type);

    if (!type) {
      console.log("No type provided, using default VARCHAR(255)");
      return "VARCHAR(255)";
    }

    // Handle special cases
    if (type.toLowerCase() === "string") {
      console.log("Converting 'string' to VARCHAR(255)");
      return "VARCHAR(255)";
    }

    const match = type.match(/([a-z]+)(?:\(([^)]+)\))?/i);
    console.log("Type match result:", match);

    if (!match) {
      console.log(
        "No match found, returning original type:",
        type.toUpperCase()
      );
      return type.toUpperCase();
    }

    const [, baseType, params] = match;
    const normalizedType = baseType.toUpperCase();
    console.log("Base type:", baseType, "Params:", params);

    let result;
    switch (normalizedType) {
      case "VARCHAR":
      case "CHAR":
        result = `${normalizedType}(${params || "255"})`;
        break;
      case "INT":
      case "BIGINT":
      case "TINYINT":
        result = params ? `${normalizedType}(${params})` : normalizedType;
        break;
      case "DECIMAL":
        result = `${normalizedType}(${params || "10,2"})`;
        break;
      case "STRING":
        result = "VARCHAR(255)";
        break;
      default:
        result = type.toUpperCase();
    }

    console.log("Final normalized type:", result);
    return result;
  }

  normalizeDefaultValue(value) {
    console.log("Normalizing default value:", value);

    if (value === null || value === undefined) return null;
    if (value === "CURRENT_TIMESTAMP") return value;
    if (
      typeof value === "string" &&
      value.startsWith("'") &&
      value.endsWith("'")
    ) {
      return value.slice(1, -1);
    }
    return value;
  }

  // Add this helper method
  async getTableStructure(table) {
    console.log("\n=== getTableStructure Called ===");
    try {
      const tableInfo = await this.getTableInfo(table);
      const triggers = await this.getTriggers(table);

      console.log("Final table structure:", {
        tableInfo,
        triggers,
      });

      return { tableInfo, triggers };
    } catch (error) {
      console.error("Error getting table structure:", error);
      throw error;
    }
  }

  mapColumnType(type, params = {}) {
    if (!type) return "VARCHAR(255)";

    // Handle string format with colons (e.g., "string:null:false:unique")
    if (typeof type === "string" && type.includes(":")) {
      const [baseType, ...options] = type.split(":");
      const isNullable = options.includes("null");
      const isNotNull = options.includes("false");
      const isUnique = options.includes("unique");

      let sqlType = this.convertToNativeType(baseType || "string");

      // Add constraints
      const constraints = [];
      if (isNotNull) constraints.push("NOT NULL");
      if (isUnique) constraints.push("UNIQUE");

      return constraints.length > 0
        ? `${sqlType} ${constraints.join(" ")}`
        : sqlType;
    }

    return this.convertToNativeType(type);
  }

  convertToNativeType(type) {
    const typeMap = {
      string: "VARCHAR(255)",
      text: "TEXT",
      integer: "INT",
      float: "FLOAT",
      decimal: "DECIMAL(10,2)",
      datetime: "DATETIME",
      boolean: "TINYINT(1)",
      date: "DATE",
      time: "TIME",
      timestamp: "TIMESTAMP",
      binary: "BLOB",
    };

    return typeMap[type.toLowerCase()] || type;
  }

  getDefaultValueSql(value) {
    if (value === null) return "NULL";
    if (value === "CURRENT_TIMESTAMP") return "CURRENT_TIMESTAMP";

    // Handle dynamic default values with patterns
    if (
      typeof value === "string" &&
      value.includes("{") &&
      value.includes("}")
    ) {
      const patterns = getDefaultPatterns(this);

      // For TKN_{random}_{timestamp} pattern
      if (value.startsWith("TKN_")) {
        // Note the extra parentheses around the CONCAT expression
        return `(CONCAT('TKN_', ${patterns.random}, '_', ${patterns.timestamp}))`;
      }

      // For other patterns
      let result = value;
      Object.entries(patterns).forEach(([key, sqlFunc]) => {
        const pattern = `{${key}}`;
        if (result.includes(pattern)) {
          result = result.replace(pattern, sqlFunc);
        }
      });

      return `(${result})`;
    }

    // Handle regular string values
    if (typeof value === "string") {
      return `'${value.replace(/'/g, "''")}'`;
    }

    return value;
  }
}

module.exports = MySQLAdapter;
