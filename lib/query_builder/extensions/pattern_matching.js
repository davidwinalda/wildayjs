const { QueryBuilder: ObjectionBuilder } = require("objection");
const ConnectionManager = require("../../database/connectionManager");

module.exports = (QueryBuilder) => {
  // Get Objection's QueryBuilder prototype directly
  const prototype = ObjectionBuilder.prototype;

  if (QueryBuilder.prototype.__patternMatchingExtended) return;
  QueryBuilder.prototype.__patternMatchingExtended = true;

  // Helper method to get the current database type
  QueryBuilder.prototype.getDatabaseType = function () {
    return ConnectionManager.getCurrentDatabaseType();
  };

  // Helper method to automatically add % wildcards if not present
  QueryBuilder.prototype.autoWrapWildcards = function (pattern) {
    if (typeof pattern !== "string") return pattern; // Skip if not a string
    if (!pattern.includes("%")) {
      return `%${pattern}%`; // Wrap with % for "contains" behavior
    }
    return pattern; // Return as-is if % is already present
  };

  Object.assign(QueryBuilder.prototype, {
    /**
     * Add a WHERE LIKE clause.
     * Automatically wraps the pattern with % if no wildcards are present.
     * @param {string} column - The column to filter by.
     * @param {string} pattern - The pattern to match.
     * @returns {QueryBuilder}
     */
    where_like(column, pattern) {
      const wrappedPattern = this.autoWrapWildcards(pattern);
      prototype.where.call(this, column, "like", wrappedPattern);
      return this;
    },

    /**
     * Add a WHERE ILIKE clause (case-insensitive LIKE).
     * Automatically wraps the pattern with % if no wildcards are present.
     * @param {string} column - The column to filter by.
     * @param {string} pattern - The pattern to match.
     * @returns {QueryBuilder}
     */
    where_ilike(column, pattern) {
      const wrappedPattern = this.autoWrapWildcards(pattern);
      const dbType = this.getDatabaseType();
      if (dbType === "postgresql") {
        // Use ILIKE for PostgreSQL
        prototype.where.call(this, column, "ilike", wrappedPattern);
      } else {
        // Use LOWER() for MySQL and SQLite
        prototype.whereRaw.call(this, `LOWER(${column}) LIKE LOWER(?)`, [
          wrappedPattern,
        ]);
      }
      return this;
    },

    /**
     * Add a WHERE NOT LIKE clause.
     * Automatically wraps the pattern with % if no wildcards are present.
     * @param {string} column - The column to filter by.
     * @param {string} pattern - The pattern to exclude.
     * @returns {QueryBuilder}
     */
    where_not_like(column, pattern) {
      const wrappedPattern = this.autoWrapWildcards(pattern);
      prototype.whereNot.call(this, column, "like", wrappedPattern);
      return this;
    },

    /**
     * Add a WHERE NOT ILIKE clause (case-insensitive NOT LIKE).
     * Automatically wraps the pattern with % if no wildcards are present.
     * @param {string} column - The column to filter by.
     * @param {string} pattern - The pattern to exclude.
     * @returns {QueryBuilder}
     */
    where_not_ilike(column, pattern) {
      const wrappedPattern = this.autoWrapWildcards(pattern);
      const dbType = this.getDatabaseType();
      if (dbType === "postgresql") {
        // Use NOT ILIKE for PostgreSQL
        prototype.whereNot.call(this, column, "ilike", wrappedPattern);
      } else {
        // Use LOWER() for MySQL and SQLite
        prototype.whereRaw.call(this, `LOWER(${column}) NOT LIKE LOWER(?)`, [
          wrappedPattern,
        ]);
      }
      return this;
    },

    /**
     * Add a WHERE STARTS WITH clause.
     * @param {string} column - The column to filter by.
     * @param {string} value - The value to match at the start.
     * @returns {QueryBuilder}
     */
    where_starts_with(column, value) {
      prototype.where.call(this, column, "like", `${value}%`);
      return this;
    },

    /**
     * Add a WHERE ENDS WITH clause.
     * @param {string} column - The column to filter by.
     * @param {string} value - The value to match at the end.
     * @returns {QueryBuilder}
     */
    where_ends_with(column, value) {
      prototype.where.call(this, column, "like", `%${value}`);
      return this;
    },

    /**
     * Add a WHERE CONTAINS clause.
     * @param {string} column - The column to filter by.
     * @param {string} value - The value to match anywhere.
     * @returns {QueryBuilder}
     */
    where_contains(column, value) {
      prototype.where.call(this, column, "like", `%${value}%`);
      return this;
    },

    /**
     * Add a WHERE NOT CONTAINS clause.
     * @param {string} column - The column to filter by.
     * @param {string} value - The value to exclude.
     * @returns {QueryBuilder}
     */
    where_not_contains(column, value) {
      prototype.whereNot.call(this, column, "like", `%${value}%`);
      return this;
    },

    /**
     * Add a WHERE STARTS WITH clause (case-insensitive).
     * @param {string} column - The column to filter by.
     * @param {string} value - The value to match at the start.
     * @returns {QueryBuilder}
     */
    where_istarts_with(column, value) {
      const dbType = this.getDatabaseType();
      if (dbType === "postgresql") {
        // Use ILIKE for PostgreSQL
        prototype.where.call(this, column, "ilike", `${value}%`);
      } else {
        // Use LOWER() for MySQL and SQLite
        prototype.whereRaw.call(this, `LOWER(${column}) LIKE LOWER(?)`, [
          `${value}%`,
        ]);
      }
      return this;
    },

    /**
     * Add a WHERE ENDS WITH clause (case-insensitive).
     * @param {string} column - The column to filter by.
     * @param {string} value - The value to match at the end.
     * @returns {QueryBuilder}
     */
    where_iends_with(column, value) {
      const dbType = this.getDatabaseType();
      if (dbType === "postgresql") {
        // Use ILIKE for PostgreSQL
        prototype.where.call(this, column, "ilike", `%${value}`);
      } else {
        // Use LOWER() for MySQL and SQLite
        prototype.whereRaw.call(this, `LOWER(${column}) LIKE LOWER(?)`, [
          `%${value}`,
        ]);
      }
      return this;
    },

    /**
     * Add a WHERE CONTAINS clause (case-insensitive).
     * @param {string} column - The column to filter by.
     * @param {string} value - The value to match anywhere.
     * @returns {QueryBuilder}
     */
    where_icontains(column, value) {
      const dbType = this.getDatabaseType();
      if (dbType === "postgresql") {
        // Use ILIKE for PostgreSQL
        prototype.where.call(this, column, "ilike", `%${value}%`);
      } else {
        // Use LOWER() for MySQL and SQLite
        prototype.whereRaw.call(this, `LOWER(${column}) LIKE LOWER(?)`, [
          `%${value}%`,
        ]);
      }
      return this;
    },

    /**
     * Add a WHERE NOT CONTAINS clause (case-insensitive).
     * @param {string} column - The column to filter by.
     * @param {string} value - The value to exclude.
     * @returns {QueryBuilder}
     */
    where_not_icontains(column, value) {
      const dbType = this.getDatabaseType();
      if (dbType === "postgresql") {
        // Use NOT ILIKE for PostgreSQL
        prototype.whereNot.call(this, column, "ilike", `%${value}%`);
      } else {
        // Use LOWER() for MySQL and SQLite
        prototype.whereRaw.call(this, `LOWER(${column}) NOT LIKE LOWER(?)`, [
          `%${value}%`,
        ]);
      }
      return this;
    },

    /**
     * Add a WHERE REGEX clause (database-agnostic).
     * @param {string} column - The column to filter by.
     * @param {string} pattern - The regex pattern to match.
     * @returns {QueryBuilder}
     */
    where_regex(column, pattern) {
      const dbType = this.getDatabaseType();
      if (dbType === "postgresql") {
        // Use ~ for PostgreSQL
        prototype.whereRaw.call(this, `${column} ~ ?`, [pattern]);
      } else if (dbType === "mysql") {
        // Use REGEXP for MySQL
        prototype.whereRaw.call(this, `${column} REGEXP ?`, [pattern]);
      } else {
        // SQLite does not support regex natively, so use GLOB (case-sensitive)
        prototype.whereRaw.call(this, `${column} GLOB ?`, [
          pattern.replace(/%/g, "*"),
        ]);
      }
      return this;
    },

    /**
     * Add a WHERE IREGEX clause (case-insensitive regex).
     * @param {string} column - The column to filter by.
     * @param {string} pattern - The regex pattern to match.
     * @returns {QueryBuilder}
     */
    where_iregex(column, pattern) {
      const dbType = this.getDatabaseType();
      if (dbType === "postgresql") {
        // Use ~* for PostgreSQL
        prototype.whereRaw.call(this, `${column} ~* ?`, [pattern]);
      } else if (dbType === "mysql") {
        // Use REGEXP with case-insensitive collation for MySQL
        prototype.whereRaw.call(
          this,
          `${column} REGEXP ? COLLATE utf8_general_ci`,
          [pattern]
        );
      } else {
        // SQLite does not support case-insensitive regex natively, so use LOWER()
        prototype.whereRaw.call(this, `LOWER(${column}) GLOB LOWER(?)`, [
          pattern.replace(/%/g, "*"),
        ]);
      }
      return this;
    },

    /**
     * Add a WHERE NOT REGEX clause.
     * @param {string} column - The column to filter by.
     * @param {string} pattern - The regex pattern to exclude.
     * @returns {QueryBuilder}
     */
    where_not_regex(column, pattern) {
      const dbType = this.getDatabaseType();
      if (dbType === "postgresql") {
        // Use !~ for PostgreSQL
        prototype.whereRaw.call(this, `${column} !~ ?`, [pattern]);
      } else if (dbType === "mysql") {
        // Use NOT REGEXP for MySQL
        prototype.whereRaw.call(this, `${column} NOT REGEXP ?`, [pattern]);
      } else {
        // SQLite does not support regex natively, so use GLOB (case-sensitive)
        prototype.whereRaw.call(this, `${column} NOT GLOB ?`, [
          pattern.replace(/%/g, "*"),
        ]);
      }
      return this;
    },

    /**
     * Add a WHERE NOT IREGEX clause (case-insensitive).
     * @param {string} column - The column to filter by.
     * @param {string} pattern - The regex pattern to exclude.
     * @returns {QueryBuilder}
     */
    where_not_iregex(column, pattern) {
      const dbType = this.getDatabaseType();
      if (dbType === "postgresql") {
        // Use !~* for PostgreSQL
        prototype.whereRaw.call(this, `${column} !~* ?`, [pattern]);
      } else if (dbType === "mysql") {
        // Use NOT REGEXP with case-insensitive collation for MySQL
        prototype.whereRaw.call(
          this,
          `${column} NOT REGEXP ? COLLATE utf8_general_ci`,
          [pattern]
        );
      } else {
        // SQLite does not support case-insensitive regex natively, so use LOWER()
        prototype.whereRaw.call(this, `LOWER(${column}) NOT GLOB LOWER(?)`, [
          pattern.replace(/%/g, "*"),
        ]);
      }
      return this;
    },
  });
};
