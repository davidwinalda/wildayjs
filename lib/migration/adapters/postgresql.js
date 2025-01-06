const BaseAdapter = require("./base");
const { getDefaultPatterns } = require("../generators/sqlGenerators/constants");

class PostgreSQLAdapter extends BaseAdapter {
  constructor(client) {
    super();
    this.client = client;
  }

  // Transaction Management
  async beginTransaction() {
    console.log("\n=== Beginning Transaction ===");
    let client = null;

    try {
      console.log("Getting client connection...");
      console.log("Client state:", {
        client: !!this.client,
        config: {
          host: this.config?.host,
          port: this.config?.port,
          database: this.config?.database,
          user: this.config?.user,
        },
      });

      client = await this.client.connect();

      console.log("Connection obtained:", {
        processID: client.processID,
        database: this.config?.database,
      });

      // Begin transaction
      console.log("Starting transaction...");
      await client.query("BEGIN");
      console.log("Transaction started successfully");

      // Add helper methods to client
      client.debugLog = (message) => {
        console.log(`[Client ${client.processID}] ${message}`);
      };

      await client.debugLog("Transaction initialized");
      return client;
    } catch (error) {
      console.error("Transaction initialization error:", {
        message: error.message,
        code: error.code,
        detail: error.detail,
      });

      if (client) {
        try {
          await client.query("ROLLBACK");
          client.release();
          console.log("Failed connection cleaned up");
        } catch (cleanupError) {
          console.error("Cleanup error:", cleanupError);
        }
      }

      throw error;
    }
  }

  async commit(client) {
    if (!client) {
      throw new Error("No client provided for commit");
    }

    console.log("\n=== Committing Transaction ===");
    try {
      await client.debugLog("Committing transaction...");
      await client.query("COMMIT");
      await client.debugLog("Transaction committed successfully");
    } catch (error) {
      console.error("Commit error:", {
        message: error.message,
        code: error.code,
        detail: error.detail,
      });
      throw error;
    } finally {
      await client.debugLog("Releasing connection...");
      client.release();
      console.log("Connection released");
    }
  }

  async rollback(client) {
    if (!client) {
      throw new Error("No client provided for rollback");
    }

    console.log("\n=== Rolling Back Transaction ===");
    try {
      await client.debugLog("Rolling back transaction...");
      await client.query("ROLLBACK");
      await client.debugLog("Transaction rolled back successfully");
    } catch (error) {
      console.error("Rollback error:", {
        message: error.message,
        code: error.code,
        detail: error.detail,
      });
      throw error;
    } finally {
      await client.debugLog("Releasing connection...");
      client.release();
      console.log("Connection released");
    }
  }

  async execute(sql, params = [], client = null) {
    console.log("\n=== Executing PostgreSQL Query ===");
    console.log("SQL:", sql);
    console.log("Parameters:", params);
    console.log(
      "Connection type:",
      client ? `Transaction (${client.processID})` : "Pool"
    );

    try {
      const queryRunner = client || this.client;
      const result = await queryRunner.query(sql, params);
      console.log("Query executed successfully");
      return result.rows;
    } catch (error) {
      console.error("Query error:", {
        message: error.message,
        code: error.code,
        detail: error.detail,
      });
      throw error;
    }
  }

  async query(sql, params = []) {
    console.log("\n=== Query Method Called ===");
    console.log("SQL:", sql.replace(/\s+/g, " ").trim());
    console.log("Params:", params);

    try {
      const result = await this.client.query(sql, params);
      console.log("Query raw results:", JSON.stringify(result.rows, null, 2));
      return result.rows;
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
       WHERE table_name = $1 AND column_name = $2`,
      [table, column]
    );
    return result.length > 0;
  }

  async tableExists(table) {
    const result = await this.query(
      `SELECT 1 FROM information_schema.tables 
       WHERE table_name = $1`,
      [table]
    );
    return result.length > 0;
  }

  // Migration Table Management
  async createMigrationsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        version VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reverted_at TIMESTAMP NULL
      );
    `;
    await this.execute(sql);
  }

  async createSchemaMigrationsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await this.execute(sql);
  }

  // Migration Status Management
  async insertMigration(filename, version) {
    const sql = `
      INSERT INTO migrations (filename, version) 
      VALUES ($1, $2);
    `;
    await this.execute(sql, [filename, version]);
  }

  async updateMigrationStatus(version, status = "reverted") {
    const sql = `
      UPDATE migrations 
      SET reverted_at = ${status === "reverted" ? "CURRENT_TIMESTAMP" : "NULL"}
      WHERE version = $1;
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
      VALUES ($1);
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
        return "INTEGER";
      case "bigint":
        return "BIGINT";
      case "float":
        return "REAL";
      case "decimal":
        return `DECIMAL(${options.precision || 10},${options.scale || 2})`;
      case "boolean":
        return "BOOLEAN";
      case "date":
        return "DATE";
      case "datetime":
        return "TIMESTAMP";
      case "time":
        return "TIME";
      case "binary":
        return "BYTEA";
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
      if (column.autoIncrement) def += " GENERATED ALWAYS AS IDENTITY";
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
      );
    `;

    await this.execute(sql);
  }

  // Utility Methods
  escapeIdentifier(identifier) {
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  getDefaultValueSql(value) {
    if (value === null) return "NULL";
    if (value === "CURRENT_TIMESTAMP") return "CURRENT_TIMESTAMP";
    if (typeof value === "string") return `'${value.replace(/'/g, "''")}'`;
    return value;
  }

  // Error Handling
  isUniqueViolation(error) {
    return error.code === "23505";
  }

  isForeignKeyViolation(error) {
    return error.code === "23503";
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
    return `DROP INDEX IF EXISTS ${this.escapeIdentifier(indexName)}`;
  }
}

module.exports = PostgreSQLAdapter;
