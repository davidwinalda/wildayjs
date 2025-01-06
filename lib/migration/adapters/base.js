const { getTypeMappings } = require("../config/typeMapping");

class BaseAdapter {
  constructor() {
    if (this.constructor === BaseAdapter) {
      throw new Error("Cannot instantiate abstract BaseAdapter");
    }
  }
  // Transaction Management
  async beginTransaction() {
    throw new Error("beginTransaction must be implemented");
  }

  async commit() {
    throw new Error("commit must be implemented");
  }

  async rollback() {
    throw new Error("rollback must be implemented");
  }

  // Query Execution
  async execute(sql, params = []) {
    throw new Error("execute must be implemented");
  }

  async query(sql, params = []) {
    throw new Error("query must be implemented");
  }

  // Schema Information
  async exists(table, condition, params = []) {
    throw new Error("exists must be implemented");
  }

  async columnExists(table, column) {
    throw new Error("columnExists must be implemented");
  }

  async tableExists(table) {
    throw new Error("tableExists must be implemented");
  }

  async getTableInfo(table) {
    throw new Error("getTableInfo must be implemented");
  }

  async getTriggers(table) {
    throw new Error("getTriggers must be implemented");
  }

  async getIndexes(table) {
    throw new Error("getIndexes must be implemented");
  }

  // SQL Generation
  getIdColumnDefinition() {
    throw new Error("getIdColumnDefinition must be implemented");
  }

  getColumnType(type) {
    const mappings = getTypeMappings(this);
    return mappings[type] || type.toUpperCase();
  }

  getDefaultValueSql(value) {
    if (value === null) return "NULL";
    if (value === undefined) return "NULL";
    if (typeof value === "boolean") return value ? "1" : "0";
    if (typeof value === "number") return value.toString();
    return this.escapeString(value.toString());
  }

  getCastToTextSql(value) {
    throw new Error("getCastToTextSql must be implemented");
  }

  getDatetimeNowSql() {
    return "CURRENT_TIMESTAMP";
  }

  getRandomSql(length = 8) {
    throw new Error("getRandomSql must be implemented");
  }

  getDateFormatSql(format, value = "now") {
    throw new Error("getDateFormatSql must be implemented");
  }

  // Migration Helpers
  cleanMigrationSql(sql) {
    throw new Error("cleanMigrationSql must be implemented");
  }

  async disableForeignKeys() {
    throw new Error("disableForeignKeys must be implemented");
  }

  async enableForeignKeys() {
    throw new Error("enableForeignKeys must be implemented");
  }

  // DDL Statements
  getCreateTableSql(table, columns, options = {}) {
    throw new Error("getCreateTableSql must be implemented");
  }

  getDropTableSql(table) {
    throw new Error("getDropTableSql must be implemented");
  }

  getCreateIndexSql(table, columns, options = {}) {
    throw new Error("getCreateIndexSql must be implemented");
  }

  getDropIndexSql(indexName) {
    throw new Error("getDropIndexSql must be implemented");
  }

  // Utility Methods
  escapeIdentifier(identifier) {
    if (!identifier) return '""';
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  escapeString(value) {
    if (!value) return "''";
    return `'${value.replace(/'/g, "''")}'`;
  }

  validateColumnName(name) {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
  }

  // Foreign Key Handling
  getForeignKeyDefinition(columnName, targetTable, options = {}) {
    const onDelete = options.onDelete ? ` ON DELETE ${options.onDelete}` : "";
    const onUpdate = options.onUpdate ? ` ON UPDATE ${options.onUpdate}` : "";
    return (
      `FOREIGN KEY (${this.escapeIdentifier(columnName)}) ` +
      `REFERENCES ${this.escapeIdentifier(
        targetTable
      )} (id)${onDelete}${onUpdate}`
    );
  }

  // Trigger Management
  getTriggerName(table, column, action) {
    return `tr_${table}_${column}_${action}`;
  }

  getCreateTriggerSql(table, column, options = {}) {
    throw new Error("getCreateTriggerSql must be implemented");
  }

  getDropTriggerSql(triggerName) {
    throw new Error("getDropTriggerSql must be implemented");
  }

  // Type Conversion
  convertToNativeType(value, type) {
    throw new Error("convertToNativeType must be implemented");
  }

  // Error Handling
  isUniqueViolation(error) {
    throw new Error("isUniqueViolation must be implemented");
  }

  isForeignKeyViolation(error) {
    throw new Error("isForeignKeyViolation must be implemented");
  }

  // Add missing method for column type mapping
  mapColumnType(type) {
    const mappings = {
      string: "TEXT",
      text: "TEXT",
      integer: "INTEGER",
      float: "REAL",
      decimal: "REAL",
      datetime: "DATETIME",
      boolean: "INTEGER",
      date: "DATE",
      time: "TIME",
      binary: "BLOB",
    };
    return mappings[type.toLowerCase()] || type.toUpperCase();
  }

  getColumnDefinition(column) {
    let def = [];
    def.push(this.escapeIdentifier(column.name));
    def.push(this.mapColumnType(column.type));

    if (column.primaryKey) def.push("PRIMARY KEY");
    if (column.autoIncrement) def.push("AUTOINCREMENT");
    if (column.notNull) def.push("NOT NULL");
    if (column.unique) def.push("UNIQUE");
    if (column.default !== undefined) {
      def.push(`DEFAULT ${this.getDefaultValueSql(column.default)}`);
    }

    return def.join(" ");
  }
}

module.exports = BaseAdapter;
