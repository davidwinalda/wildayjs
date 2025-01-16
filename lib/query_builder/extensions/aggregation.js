const { QueryBuilder: ObjectionBuilder } = require("objection");
const ConnectionManager = require("../../database/connectionManager");

module.exports = (QueryBuilder) => {
  // Get Objection's QueryBuilder prototype directly
  const prototype = ObjectionBuilder.prototype;

  if (QueryBuilder.prototype.__aggregationExtended) return;
  QueryBuilder.prototype.__aggregationExtended = true;

  // Helper method to get the current database type
  QueryBuilder.prototype.getDatabaseType = function () {
    return ConnectionManager.getCurrentDatabaseType();
  };

  // Define default aggregation themes
  Object.defineProperty(QueryBuilder, "defaultAggregationThemes", {
    value: {
      // Basic aggregations
      total_count: { type: "count", column: "*", alias: "total_count" },
      total_sum: { type: "sum", column: "value", alias: "total_sum" },
      average_value: { type: "avg", column: "value", alias: "average_value" },
      min_value: { type: "min", column: "value", alias: "min_value" },
      max_value: { type: "max", column: "value", alias: "max_value" },

      // Grouping themes
      group_by_status: {
        type: "group",
        columns: ["status"],
        aggregations: [{ type: "count", column: "*", alias: "post_count" }],
      },
      group_by_author: {
        type: "group",
        columns: ["author_id"],
        aggregations: [{ type: "sum", column: "views", alias: "total_views" }],
      },

      // Window function themes
      cumulative_views: {
        type: "window",
        function: "cumulativeSum",
        column: "views",
        alias: "cumulative_views",
      },
      moving_avg_views: {
        type: "window",
        function: "movingAverage",
        column: "views",
        alias: "moving_avg_views",
        windowSize: 5,
      },
      rank_by_views: {
        type: "window",
        function: "rank",
        column: "views",
        alias: "rank",
      },
      percentile_rank_by_views: {
        type: "window",
        function: "percentileRank",
        column: "views",
        alias: "percentile_rank",
      },
      cumulative_dist_views: {
        type: "window",
        function: "cumulativeDistribution",
        column: "views",
        alias: "cumulative_dist",
      },
    },
    writable: true,
    configurable: true,
  });

  Object.assign(QueryBuilder.prototype, {
    /**
     * Apply an aggregation theme.
     * @param {string} theme - The theme to apply (e.g., "total_count", "group_by_status").
     * @param {string|object} columnOrOverrides - A column name to override or an object of overrides.
     * @param {object} customThemes - Custom themes to extend the default themes.
     * @returns {QueryBuilder}
     */
    aggregateByTheme(theme, columnOrOverrides = {}, customThemes = {}) {
      const allThemes = {
        ...QueryBuilder.defaultAggregationThemes,
        ...customThemes,
      };

      const themeRules = allThemes[theme];

      if (!themeRules) {
        throw new Error(
          `Invalid theme: ${theme}. Valid themes are: ${Object.keys(
            allThemes
          ).join(", ")}`
        );
      }

      // Handle the second argument as a column override or an object of overrides
      const overrides =
        typeof columnOrOverrides === "string"
          ? { columns: [columnOrOverrides] } // Override the `columns` property for group themes
          : columnOrOverrides;

      // Apply overrides to the theme rules
      const rules = { ...themeRules, ...overrides };

      switch (rules.type) {
        case "count":
        case "sum":
        case "avg":
        case "min":
        case "max":
          this[rules.type](rules.column, rules.alias);
          break;

        case "group":
          this.groupBy(rules.columns);
          rules.aggregations.forEach((agg) => {
            this[agg.type](agg.column, agg.alias);
          });
          break;

        case "window":
          this[rules.function](rules.column, rules.windowSize, rules.alias);
          break;

        default:
          throw new Error(`Unsupported theme type: ${rules.type}`);
      }

      return this;
    },

    /**
     * Count the number of rows.
     * @param {string} column - The column to count (default: "*").
     * @param {string} alias - The alias for the result.
     * @returns {QueryBuilder}
     */
    count(column = "*", alias = "total") {
      prototype.count.call(this, `${column} as ${alias}`);
      return this;
    },

    /**
     * Sum the values of a column.
     * @param {string} column - The column to sum.
     * @param {string} alias - The alias for the result.
     * @returns {QueryBuilder}
     */
    sum(column, alias = "total_sum") {
      prototype.sum.call(this, `${column} as ${alias}`);
      return this;
    },

    /**
     * Calculate the average value of a column.
     * @param {string} column - The column to average.
     * @param {string} alias - The alias for the result.
     * @returns {QueryBuilder}
     */
    avg(column, alias = "average") {
      prototype.avg.call(this, `${column} as ${alias}`);
      return this;
    },

    /**
     * Find the minimum value of a column.
     * @param {string} column - The column to find the minimum of.
     * @param {string} alias - The alias for the result.
     * @returns {QueryBuilder}
     */
    min(column, alias = "minimum") {
      prototype.min.call(this, `${column} as ${alias}`);
      return this;
    },

    /**
     * Find the maximum value of a column.
     * @param {string} column - The column to find the maximum of.
     * @param {string} alias - The alias for the result.
     * @returns {QueryBuilder}
     */
    max(column, alias = "maximum") {
      prototype.max.call(this, `${column} as ${alias}`);
      return this;
    },

    /**
     * Group the results by one or more columns.
     * @param {string|array} columns - The column(s) to group by.
     * @returns {QueryBuilder}
     */
    groupBy(columns) {
      if (Array.isArray(columns)) {
        columns.forEach((col) => {
          prototype.groupBy.call(this, col);
        });
      } else {
        prototype.groupBy.call(this, columns);
      }
      return this;
    },

    /**
     * Add a HAVING clause for grouped results.
     * @param {string} column - The column to filter by.
     * @param {string} operator - The operator to use (e.g., "=", ">", "<").
     * @param {mixed} value - The value to compare against.
     * @returns {QueryBuilder}
     */
    having(column, operator, value) {
      prototype.having.call(this, column, operator, value);
      return this;
    },

    /**
     * Add a HAVING clause with raw SQL.
     * @param {string} sql - The raw SQL for the HAVING clause.
     * @param {array} bindings - The bindings for the SQL.
     * @returns {QueryBuilder}
     */
    havingRaw(sql, bindings = []) {
      prototype.havingRaw.call(this, sql, bindings);
      return this;
    },

    /**
     * Calculate the cumulative sum of a column (window function).
     * @param {string} column - The column to calculate the cumulative sum for.
     * @param {string} alias - The alias for the result.
     * @returns {QueryBuilder}
     */
    cumulativeSum(column, alias = "cumulative_sum") {
      const dbType = this.getDatabaseType();
      if (dbType === "postgresql" || dbType === "mysql") {
        // Use window functions for PostgreSQL and MySQL
        prototype.select.call(
          this,
          `${column}`,
          this.raw(
            `SUM(${column}) OVER (ORDER BY ?? ROWS UNBOUNDED PRECEDING) as ${alias}`,
            [column]
          )
        );
      } else {
        // SQLite does not support window functions, so use a subquery
        prototype.select.call(
          this,
          `${column}`,
          this.raw(
            `(SELECT SUM(${column}) FROM ?? as sub WHERE sub.?? <= ??.??) as ${alias}`,
            [this._single.table, column, this._single.table, column]
          )
        );
      }
      return this;
    },

    /**
     * Calculate the moving average of a column (window function).
     * @param {string} column - The column to calculate the moving average for.
     * @param {number} windowSize - The size of the moving window.
     * @param {string} alias - The alias for the result.
     * @returns {QueryBuilder}
     */
    movingAverage(column, windowSize = 3, alias = "moving_avg") {
      const dbType = this.getDatabaseType();
      if (dbType === "postgresql" || dbType === "mysql") {
        // Use window functions for PostgreSQL and MySQL
        prototype.select.call(
          this,
          `${column}`,
          this.raw(
            `AVG(${column}) OVER (ORDER BY ?? ROWS BETWEEN ? PRECEDING AND CURRENT ROW) as ${alias}`,
            [column, windowSize - 1]
          )
        );
      } else {
        // SQLite does not support window functions, so use a subquery
        prototype.select.call(
          this,
          `${column}`,
          this.raw(
            `(SELECT AVG(${column}) FROM ?? as sub WHERE sub.?? <= ??.?? LIMIT ?) as ${alias}`,
            [this._single.table, column, this._single.table, column, windowSize]
          )
        );
      }
      return this;
    },

    /**
     * Calculate the rank of rows based on a column (window function).
     * @param {string} column - The column to rank by.
     * @param {string} alias - The alias for the result.
     * @returns {QueryBuilder}
     */
    rank(column, alias = "rank") {
      const dbType = this.getDatabaseType();
      if (dbType === "postgresql" || dbType === "mysql") {
        // Use window functions for PostgreSQL and MySQL
        prototype.select.call(
          this,
          `${column}`,
          this.raw(`RANK() OVER (ORDER BY ??) as ${alias}`, [column])
        );
      } else {
        // SQLite does not support window functions, so use a subquery
        prototype.select.call(
          this,
          `${column}`,
          this.raw(
            `(SELECT COUNT(*) + 1 FROM ?? as sub WHERE sub.?? > ??.??) as ${alias}`,
            [this._single.table, column, this._single.table, column]
          )
        );
      }
      return this;
    },

    /**
     * Calculate the percentile rank of rows based on a column (window function).
     * @param {string} column - The column to calculate the percentile rank for.
     * @param {string} alias - The alias for the result.
     * @returns {QueryBuilder}
     */
    percentileRank(column, alias = "percentile_rank") {
      const dbType = this.getDatabaseType();
      if (dbType === "postgresql" || dbType === "mysql") {
        // Use window functions for PostgreSQL and MySQL
        prototype.select.call(
          this,
          `${column}`,
          this.raw(`PERCENT_RANK() OVER (ORDER BY ??) as ${alias}`, [column])
        );
      } else {
        // SQLite does not support window functions, so use a subquery
        prototype.select.call(
          this,
          `${column}`,
          this.raw(
            `(SELECT (COUNT(*) + 1) / (SELECT COUNT(*) FROM ??) FROM ?? as sub WHERE sub.?? > ??.??) as ${alias}`,
            [
              this._single.table,
              this._single.table,
              column,
              this._single.table,
              column,
            ]
          )
        );
      }
      return this;
    },

    /**
     * Calculate the cumulative distribution of rows based on a column (window function).
     * @param {string} column - The column to calculate the cumulative distribution for.
     * @param {string} alias - The alias for the result.
     * @returns {QueryBuilder}
     */
    cumulativeDistribution(column, alias = "cumulative_dist") {
      const dbType = this.getDatabaseType();
      if (dbType === "postgresql" || dbType === "mysql") {
        // Use window functions for PostgreSQL and MySQL
        prototype.select.call(
          this,
          `${column}`,
          this.raw(`CUME_DIST() OVER (ORDER BY ??) as ${alias}`, [column])
        );
      } else {
        // SQLite does not support window functions, so use a subquery
        prototype.select.call(
          this,
          `${column}`,
          this.raw(
            `(SELECT COUNT(*) / (SELECT COUNT(*) FROM ??) FROM ?? as sub WHERE sub.?? <= ??.??) as ${alias}`,
            [
              this._single.table,
              this._single.table,
              column,
              this._single.table,
              column,
            ]
          )
        );
      }
      return this;
    },
  });
};
