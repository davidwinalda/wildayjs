const BaseAdapter = require("./base");
const { getTypeMappings } = require("../config/typeMapping");

class SQLiteAdapter extends BaseAdapter {
  constructor(db) {
    super();
    this.type = "sqlite";
    this.dialect = "sqlite";
    this.db = db;
  }

  // Connection Management
  async testConnection() {
    console.log("\n=== Testing SQLite Connection ===");
    try {
      const result = await this.query("SELECT 1 AS connection_test");
      console.log("Connection test successful:", result);
      return true;
    } catch (error) {
      console.error("Connection test failed:", error);
      throw error;
    }
  }

  // Transaction Management
  async beginTransaction() {
    console.log("\n=== Beginning Transaction ===");
    try {
      await this.execute("BEGIN TRANSACTION");
      console.log("Transaction started successfully");
    } catch (error) {
      console.error("Transaction start error:", error);
      throw error;
    }
  }

  async commit() {
    console.log("\n=== Committing Transaction ===");
    try {
      await this.execute("COMMIT");
      console.log("Transaction committed successfully");
    } catch (error) {
      console.error("Commit error:", error);
      throw error;
    }
  }

  async rollback() {
    console.log("\n=== Rolling Back Transaction ===");
    try {
      await this.execute("ROLLBACK");
      console.log("Transaction rolled back successfully");
    } catch (error) {
      console.error("Rollback error:", error);
      throw error;
    }
  }

  // Query Execution
  async execute(sql, params = []) {
    console.log("\n=== Execute Method Called ===");
    console.log("Original SQL:", sql);
    const convertedSql = this.convertParameterPlaceholders(sql);
    console.log("Converted SQL:", convertedSql);
    console.log("Params:", params);

    if (!this.db || typeof this.db.prepare !== "function") {
      throw new Error("Database connection not initialized");
    }

    try {
      const stmt = this.db.prepare(convertedSql);
      const result = params.length ? stmt.run(...params) : stmt.run();
      console.log("Execute result:", result);
      return result;
    } catch (error) {
      console.error("Execute error:", {
        message: error.message,
        originalSql: sql,
        convertedSql,
        params,
      });
      throw error;
    }
  }

  async query(sql, params = []) {
    console.log("\n=== Query Method Called ===");
    console.log("Original SQL:", sql);
    const convertedSql = this.convertParameterPlaceholders(sql);
    console.log("Converted SQL:", convertedSql);
    console.log("Params:", params);

    if (!this.db || typeof this.db.prepare !== "function") {
      throw new Error("Database connection not initialized");
    }

    try {
      const stmt = this.db.prepare(convertedSql);
      const results = params.length ? stmt.all(...params) : stmt.all();
      console.log("Query results:", results);
      return results;
    } catch (error) {
      console.error("Query error:", {
        message: error.message,
        originalSql: sql,
        convertedSql,
        params,
      });
      throw error;
    }
  }

  // Schema Information
  async tableExists(tableName) {
    const result = await this.query(
      `SELECT 1 FROM sqlite_master WHERE type='table' AND name = ?`,
      [tableName]
    );
    return result.length > 0;
  }

  async columnExists(tableName, columnName) {
    const result = await this.query(
      `SELECT 1 FROM pragma_table_info(?) WHERE name = ?`,
      [tableName, columnName]
    );
    return result.length > 0;
  }

  async getTableInfo(tableName) {
    return await this.query(`PRAGMA table_info("${tableName}")`);
  }

  async getIndexes(tableName) {
    return await this.query(
      `SELECT * FROM sqlite_master WHERE type='index' AND tbl_name = ?`,
      [tableName]
    );
  }

  async getTriggers(tableName) {
    return await this.query(
      `SELECT * FROM sqlite_master WHERE type='trigger' AND tbl_name = ?`,
      [tableName]
    );
  }

  async getForeignKeys(tableName) {
    return await this.query(`PRAGMA foreign_key_list("${tableName}")`);
  }

  // Schema Modification
  async createTable(tableName, columns, options = {}) {
    const columnDefs = columns
      .map((col) => this.getColumnDefinition(col))
      .join(",\n");
    const sql = `CREATE TABLE "${tableName}" (\n${columnDefs}\n)`;
    await this.execute(sql);
  }

  async dropTable(tableName) {
    await this.execute(`DROP TABLE IF EXISTS "${tableName}"`);
  }

  async renameTable(oldName, newName) {
    await this.execute(`ALTER TABLE "${oldName}" RENAME TO "${newName}"`);
  }

  async addColumn(tableName, column) {
    if (column.unique || column.primaryKey) {
      await this.addColumnWithConstraints(tableName, column);
    } else {
      const columnDef = this.getColumnDefinition(column);
      await this.execute(`ALTER TABLE "${tableName}" ADD COLUMN ${columnDef}`);
    }
  }

  async addColumnWithConstraints(tableName, newColumn) {
    // Get existing table info
    const tableInfo = await this.getTableInfo(tableName);
    const columns = tableInfo.map((col) => ({
      name: col.name,
      type: col.type,
      notNull: col.notnull === 1,
      defaultValue: col.dflt_value,
      primaryKey: col.pk === 1,
    }));

    // Add new column to columns array
    columns.push(newColumn);

    // Create new table with all columns
    const tempTableName = `${tableName}_new`;
    await this.createTable(tempTableName, columns);

    // Copy data
    const columnNames = columns.map((col) => `"${col.name}"`).join(", ");
    await this.execute(`
      INSERT INTO "${tempTableName}" (${columnNames})
      SELECT ${columnNames} FROM "${tableName}"
    `);

    // Drop old table and rename new table
    await this.dropTable(tableName);
    await this.renameTable(tempTableName, tableName);
  }

  // Constraints
  async addForeignKey(tableName, foreignKey) {
    // SQLite doesn't support adding foreign keys after table creation
    // Need to recreate table with the new constraint
    await this.recreateTableWithNewConstraint(tableName, foreignKey);
  }

  async addUniqueConstraint(tableName, columnNames) {
    const constraintName = `${tableName}_${columnNames.join("_")}_unique`;
    await this.execute(`
      CREATE UNIQUE INDEX "${constraintName}"
      ON "${tableName}" (${columnNames.map((col) => `"${col}"`).join(", ")})
    `);
  }

  // Utility Methods
  convertParameterPlaceholders(sql) {
    // Convert $1, $2, etc. to ?
    return sql.replace(/\$\d+/g, "?");
  }

  getColumnDefinition(column) {
    const parts = [`"${column.name}"`];

    // Handle special case for auto-incrementing primary key
    if (
      column.type.toUpperCase().includes("AUTO_INCREMENT") ||
      (column.primaryKey && column.type.toUpperCase().includes("INTEGER"))
    ) {
      parts.push("INTEGER PRIMARY KEY AUTOINCREMENT");
    } else {
      // Convert MySQL/PostgreSQL types to SQLite types
      let sqliteType = this.convertType(column.type);
      parts.push(sqliteType);

      if (column.primaryKey) parts.push("PRIMARY KEY");
      if (column.notNull) parts.push("NOT NULL");
      if (column.unique) parts.push("UNIQUE");
    }

    // Handle default values
    if (column.default !== undefined) {
      const defaultValue = this.getDefaultValueSql(column.default, column.type);
      if (defaultValue) parts.push(`DEFAULT ${defaultValue}`);
    }

    return parts.join(" ");
  }

  convertType(type) {
    // Remove size specifications for TEXT type
    type = type.toUpperCase().trim();

    if (type.includes("VARCHAR") || type.includes("CHAR")) {
      return "TEXT";
    }
    if (type.includes("BIGINT") || type.includes("INT")) {
      return "INTEGER";
    }
    if (type.includes("TIMESTAMP")) {
      return "DATETIME";
    }
    if (type.includes("BOOLEAN")) {
      return "INTEGER"; // SQLite doesn't have a boolean type
    }
    if (type.includes("DOUBLE") || type.includes("FLOAT")) {
      return "REAL";
    }
    if (type.includes("DECIMAL")) {
      return "NUMERIC";
    }

    return type;
  }

  getDefaultValueSql(value, columnType) {
    if (value === null) return "NULL";

    // Handle timestamp defaults
    if (value.toUpperCase() === "CURRENT_TIMESTAMP") {
      return "DATETIME('now', 'localtime')";
    }

    // Handle ON UPDATE CURRENT_TIMESTAMP
    if (value.toUpperCase().includes("ON UPDATE CURRENT_TIMESTAMP")) {
      // SQLite doesn't support ON UPDATE CURRENT_TIMESTAMP
      return "DATETIME('now', 'localtime')";
    }

    if (typeof value === "string") {
      return `'${value.replace(/'/g, "''")}'`;
    }

    return value;
  }

  // Foreign Key Management
  async enableForeignKeys() {
    await this.execute("PRAGMA foreign_keys = ON");
  }

  async disableForeignKeys() {
    await this.execute("PRAGMA foreign_keys = OFF");
  }

  // Error Handling
  isUniqueViolation(error) {
    return error.message.includes("UNIQUE constraint failed");
  }

  isForeignKeyViolation(error) {
    return error.message.includes("FOREIGN KEY constraint failed");
  }

  // Helper Methods
  escapeIdentifier(identifier) {
    if (!identifier) return '""';
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  escapeString(value) {
    if (!value) return "''";
    return `'${value.replace(/'/g, "''")}'`;
  }

  // Private helper methods
  async recreateTableWithNewConstraint(tableName, constraint) {
    const tableInfo = await this.getTableInfo(tableName);
    const createTableSQL = await this.generateCreateTableWithConstraint(
      tableName,
      tableInfo,
      constraint
    );

    await this.beginTransaction();
    try {
      const tempTableName = `${tableName}_temp`;
      await this.execute(
        `ALTER TABLE "${tableName}" RENAME TO "${tempTableName}"`
      );
      await this.execute(createTableSQL);
      await this.execute(`
        INSERT INTO "${tableName}"
        SELECT * FROM "${tempTableName}"
      `);
      await this.execute(`DROP TABLE "${tempTableName}"`);
      await this.commit();
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  async generateCreateTableWithConstraint(tableName, tableInfo, newConstraint) {
    const columns = tableInfo.map((col) =>
      this.getColumnDefinition({
        name: col.name,
        type: col.type,
        notNull: col.notnull === 1,
        defaultValue: col.dflt_value,
        primaryKey: col.pk === 1,
      })
    );

    const constraints = [
      `FOREIGN KEY ("${newConstraint.column}") REFERENCES "${newConstraint.references.table}" ("${newConstraint.references.column}")`,
    ];

    return `
      CREATE TABLE "${tableName}" (
        ${columns.join(",\n        ")},
        ${constraints.join(",\n        ")}
      )
    `;
  }
}

module.exports = SQLiteAdapter;
