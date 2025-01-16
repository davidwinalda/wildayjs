const { QueryBuilder: ObjectionBuilder } = require("objection");
const ConnectionManager = require("../../database/connectionManager");

module.exports = (QueryBuilder) => {
  // Get Objection's QueryBuilder prototype directly
  const prototype = ObjectionBuilder.prototype;

  if (QueryBuilder.prototype.__whereClausesExtended) return;
  QueryBuilder.prototype.__whereClausesExtended = true;

  // Helper method to get the current database type
  QueryBuilder.prototype.getDatabaseType = function () {
    return ConnectionManager.getCurrentDatabaseType();
  };

  Object.assign(QueryBuilder.prototype, {
    /**
     * Add a basic where clause.
     * @param {string|object} column - The column to filter by or an object of column-value pairs.
     * @param {string} operator - The operator to use (e.g., "=", ">", "<").
     * @param {mixed} value - The value to compare against.
     * @returns {QueryBuilder}
     */
    where(column, operator = "=", value = null) {
      console.log("where", column, operator, value);
      if (typeof column === "object") {
        Object.entries(column).forEach(([col, val]) => {
          prototype.where.call(this, col, "=", val);
        });
        return this;
      }

      if (value === null) {
        value = operator;
        operator = "=";
      }

      prototype.where.call(this, column, operator, value);
      return this;
    },

    /**
     * Add a where not clause.
     * @param {string|object} column - The column to filter by or an object of column-value pairs.
     * @param {string} operator - The operator to use (e.g., "=", ">", "<").
     * @param {mixed} value - The value to compare against.
     * @returns {QueryBuilder}
     */
    where_not(column, operator = "=", value = null) {
      if (typeof column === "object") {
        Object.entries(column).forEach(([col, val]) => {
          prototype.whereNot.call(this, col, "=", val);
        });
        return this;
      }

      if (value === null) {
        value = operator;
        operator = "=";
      }

      prototype.whereNot.call(this, column, operator, value);
      return this;
    },

    /**
     * Add a where not null clause.
     * @param {string} column - The column to filter by.
     * @returns {QueryBuilder}
     */
    where_not_null(column) {
      prototype.whereNotNull.call(this, column);
      return this;
    },

    /**
     * Add a where null clause.
     * @param {string} column - The column to filter by.
     * @returns {QueryBuilder}
     */
    where_null(column) {
      prototype.whereNull.call(this, column);
      return this;
    },

    /**
     * Add a where between clause.
     * @param {string} column - The column to filter by.
     * @param {array} values - The range values [min, max].
     * @returns {QueryBuilder}
     */
    where_between(column, values) {
      prototype.whereBetween.call(this, column, values);
      return this;
    },

    /**
     * Add a where not between clause.
     * @param {string} column - The column to filter by.
     * @param {array} values - The range values [min, max].
     * @returns {QueryBuilder}
     */
    where_not_between(column, values) {
      prototype.whereNotBetween.call(this, column, values);
      return this;
    },

    /**
     * Add a where in clause.
     * @param {string} column - The column to filter by.
     * @param {array} values - The values to match.
     * @returns {QueryBuilder}
     */
    where_in(column, values) {
      prototype.whereIn.call(this, column, values);
      return this;
    },

    /**
     * Add a where not in clause.
     * @param {string} column - The column to filter by.
     * @param {array} values - The values to exclude.
     * @returns {QueryBuilder}
     */
    where_not_in(column, values) {
      prototype.whereNotIn.call(this, column, values);
      return this;
    },

    /**
     * Add a where raw clause.
     * @param {string} sql - The raw SQL for the where clause.
     * @param {array} bindings - The bindings for the SQL.
     * @returns {QueryBuilder}
     */
    where_raw(sql, bindings = []) {
      prototype.whereRaw.call(this, sql, bindings);
      return this;
    },

    /**
     * Add a where exists clause.
     * @param {function} callback - The callback to define the subquery.
     * @returns {QueryBuilder}
     */
    where_exists(callback) {
      prototype.whereExists.call(this, callback);
      return this;
    },

    /**
     * Add a where not exists clause.
     * @param {function} callback - The callback to define the subquery.
     * @returns {QueryBuilder}
     */
    where_not_exists(callback) {
      prototype.whereNotExists.call(this, callback);
      return this;
    },

    /**
     * Add a where JSON contains clause.
     * @param {string} column - The column to filter by.
     * @param {mixed} value - The value to check for in the JSON.
     * @returns {QueryBuilder}
     */
    where_json_contains(column, value) {
      const dbType = this.getDatabaseType();
      if (dbType === "postgresql") {
        // Use JSONB containment operator for PostgreSQL
        prototype.whereRaw.call(this, `${column} @> ?`, [
          JSON.stringify(value),
        ]);
      } else if (dbType === "mysql") {
        // Use JSON_CONTAINS for MySQL
        prototype.whereRaw.call(this, `JSON_CONTAINS(${column}, ?)`, [
          JSON.stringify(value),
        ]);
      } else {
        // SQLite does not support JSON natively, so use a workaround
        prototype.whereRaw.call(this, `json_extract(${column}, '$') LIKE ?`, [
          `%${JSON.stringify(value).slice(1, -1)}%`,
        ]);
      }
      return this;
    },

    /**
     * Add a where JSON length clause.
     * @param {string} column - The column to filter by.
     * @param {number} length - The length to compare against.
     * @returns {QueryBuilder}
     */
    where_json_length(column, length) {
      const dbType = this.getDatabaseType();
      if (dbType === "postgresql") {
        // Use jsonb_array_length for PostgreSQL
        prototype.whereRaw.call(this, `jsonb_array_length(${column}) = ?`, [
          length,
        ]);
      } else if (dbType === "mysql") {
        // Use JSON_LENGTH for MySQL
        prototype.whereRaw.call(this, `JSON_LENGTH(${column}) = ?`, [length]);
      } else {
        // SQLite does not support JSON natively, so use a workaround
        prototype.whereRaw.call(this, `json_array_length(${column}) = ?`, [
          length,
        ]);
      }
      return this;
    },

    /**
     * Add a where all clause.
     * @param {array} conditions - An array of conditions to apply.
     * @returns {QueryBuilder}
     */
    where_all(conditions) {
      conditions.forEach((condition) => {
        prototype.where.call(
          this,
          condition.column,
          condition.operator,
          condition.value
        );
      });
      return this;
    },

    /**
     * Add a where any clause.
     * @param {array} conditions - An array of conditions to apply.
     * @returns {QueryBuilder}
     */
    where_any(conditions) {
      prototype.orWhere.call(this, (builder) => {
        conditions.forEach((condition) => {
          builder.where(condition.column, condition.operator, condition.value);
        });
      });
      return this;
    },

    /**
     * Add a where column comparison clause.
     * @param {string} firstColumn - The first column to compare.
     * @param {string} operator - The operator to use (e.g., "=", ">", "<").
     * @param {string} secondColumn - The second column to compare.
     * @returns {QueryBuilder}
     */
    where_column(firstColumn, operator, secondColumn) {
      prototype.whereColumn.call(this, firstColumn, operator, secondColumn);
      return this;
    },

    /**
     * Add a where columns comparison clause.
     * @param {array} comparisons - An array of [firstColumn, operator, secondColumn] tuples.
     * @returns {QueryBuilder}
     */
    where_columns(comparisons) {
      comparisons.forEach(([firstColumn, operator, secondColumn]) => {
        prototype.whereColumn.call(this, firstColumn, operator, secondColumn);
      });
      return this;
    },

    /**
     * Add an or where clause.
     * @param {string|object} column - The column to filter by or an object of column-value pairs.
     * @param {string} operator - The operator to use (e.g., "=", ">", "<").
     * @param {mixed} value - The value to compare against.
     * @returns {QueryBuilder}
     */
    or_where(column, operator = "=", value = null) {
      if (typeof column === "object") {
        Object.entries(column).forEach(([col, val]) => {
          prototype.orWhere.call(this, col, "=", val);
        });
        return this;
      }

      if (value === null) {
        value = operator;
        operator = "=";
      }

      prototype.orWhere.call(this, column, operator, value);
      return this;
    },

    /**
     * Add an or where not clause.
     * @param {string|object} column - The column to filter by or an object of column-value pairs.
     * @param {string} operator - The operator to use (e.g., "=", ">", "<").
     * @param {mixed} value - The value to compare against.
     * @returns {QueryBuilder}
     */
    or_where_not(column, operator = "=", value = null) {
      if (typeof column === "object") {
        Object.entries(column).forEach(([col, val]) => {
          prototype.orWhereNot.call(this, col, "=", val);
        });
        return this;
      }

      if (value === null) {
        value = operator;
        operator = "=";
      }

      prototype.orWhereNot.call(this, column, operator, value);
      return this;
    },

    /**
     * Add an or where null clause.
     * @param {string} column - The column to filter by.
     * @returns {QueryBuilder}
     */
    or_where_null(column) {
      prototype.orWhereNull.call(this, column);
      return this;
    },

    /**
     * Add an or where not null clause.
     * @param {string} column - The column to filter by.
     * @returns {QueryBuilder}
     */
    or_where_not_null(column) {
      prototype.orWhereNotNull.call(this, column);
      return this;
    },

    /**
     * Add an or where exists clause.
     * @param {function} callback - The callback to define the subquery.
     * @returns {QueryBuilder}
     */
    or_where_exists(callback) {
      prototype.orWhereExists.call(this, callback);
      return this;
    },

    /**
     * Add an or where not exists clause.
     * @param {function} callback - The callback to define the subquery.
     * @returns {QueryBuilder}
     */
    or_where_not_exists(callback) {
      prototype.orWhereNotExists.call(this, callback);
      return this;
    },

    /**
     * Add an or where between clause.
     * @param {string} column - The column to filter by.
     * @param {array} values - The range values [min, max].
     * @returns {QueryBuilder}
     */
    or_where_between(column, values) {
      prototype.orWhereBetween.call(this, column, values);
      return this;
    },

    /**
     * Add an or where not between clause.
     * @param {string} column - The column to filter by.
     * @param {array} values - The range values [min, max].
     * @returns {QueryBuilder}
     */
    or_where_not_between(column, values) {
      prototype.orWhereNotBetween.call(this, column, values);
      return this;
    },

    /**
     * Add an or where in clause.
     * @param {string} column - The column to filter by.
     * @param {array} values - The values to match.
     * @returns {QueryBuilder}
     */
    or_where_in(column, values) {
      prototype.orWhereIn.call(this, column, values);
      return this;
    },

    /**
     * Add an or where not in clause.
     * @param {string} column - The column to filter by.
     * @param {array} values - The values to exclude.
     * @returns {QueryBuilder}
     */
    or_where_not_in(column, values) {
      prototype.orWhereNotIn.call(this, column, values);
      return this;
    },
  });
};
