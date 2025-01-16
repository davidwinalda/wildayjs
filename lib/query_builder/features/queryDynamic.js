const { QueryBuilder: ObjectionBuilder } = require("objection");
const ConnectionManager = require("../../database/connectionManager");

module.exports = (QueryBuilder) => {
  // Get Objection's QueryBuilder prototype directly
  const prototype = ObjectionBuilder.prototype;

  if (QueryBuilder.prototype.__queryDynamicExtended) return;
  QueryBuilder.prototype.__queryDynamicExtended = true;

  // Helper method to get the current database type
  QueryBuilder.prototype.getDatabaseType = function () {
    return ConnectionManager.getCurrentDatabaseType();
  };

  /**
   * Conditionally add a WHERE clause.
   * @param {boolean} condition - Whether to apply the WHERE clause.
   * @param {string} column - The column to filter by.
   * @param {string} operator - The operator to use (e.g., "=", ">", "<", "LIKE", "ILIKE").
   * @param {mixed} value - The value to compare against.
   * @param {object} options - Additional options (e.g., { caseSensitive: false }).
   * @returns {QueryBuilder}
   */
  QueryBuilder.prototype.whereIf = function (
    condition,
    column,
    operator,
    value,
    options = { caseSensitive: false }
  ) {
    if (condition) {
      const dbType = this.getDatabaseType();

      // Handle LIKE/ILIKE based on case sensitivity
      if (
        operator.toLowerCase() === "like" ||
        operator.toLowerCase() === "ilike"
      ) {
        if (dbType === "postgresql") {
          // PostgreSQL: Respect the operator (LIKE or ILIKE)
          if (operator.toLowerCase() === "ilike") {
            this.where(column, "ILIKE", value); // Case-insensitive
          } else {
            this.where(column, "LIKE", value); // Case-sensitive
          }
        } else if (dbType === "mysql") {
          // MySQL: Use BINARY for case-sensitive, LOWER() for case-insensitive
          if (options.caseSensitive) {
            this.whereRaw(`BINARY ${column} LIKE ?`, [`%${value}%`]); // Case-sensitive
          } else {
            this.whereRaw(`LOWER(${column}) LIKE ?`, [
              `%${value.toLowerCase()}%`,
            ]); // Case-insensitive
          }
        } else if (dbType === "sqlite3") {
          // SQLite: Use LIKE directly for case-sensitive, LOWER() for case-insensitive
          if (options.caseSensitive) {
            this.where(column, "LIKE", value); // Case-sensitive
          } else {
            this.whereRaw(`LOWER(${column}) LIKE ?`, [
              `%${value.toLowerCase()}%`,
            ]); // Case-insensitive
          }
        }
      }
      // Default behavior for other operators
      else {
        this.where(column, operator, value);
      }
    }
    return this;
  };

  /**
   * Conditionally add an ORDER BY clause.
   * @param {boolean} condition - Whether to apply the ORDER BY clause.
   * @param {string} column - The column to sort by.
   * @param {string} direction - The sort direction ("asc" or "desc").
   * @returns {QueryBuilder}
   */
  QueryBuilder.prototype.orderByIf = function (
    condition,
    column,
    direction = "asc"
  ) {
    if (condition) {
      this.orderBy(column, direction);
    }
    return this;
  };

  /**
   * Apply multiple filters dynamically.
   * @param {object} filters - An object of column-value pairs.
   * @returns {QueryBuilder}
   */
  QueryBuilder.prototype.applyFilters = function (filters) {
    for (const [column, value] of Object.entries(filters)) {
      if (value !== undefined) {
        this.where(column, value);
      }
    }
    return this;
  };
};
