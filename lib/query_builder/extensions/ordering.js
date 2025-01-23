const { QueryBuilder: ObjectionBuilder } = require("objection");
const ConnectionManager = require("../../database/connectionManager");

module.exports = (QueryBuilder) => {
  // Get Objection's QueryBuilder prototype directly
  const prototype = ObjectionBuilder.prototype;

  if (QueryBuilder.prototype.__orderingExtended) return;
  QueryBuilder.prototype.__orderingExtended = true;

  // Helper method to get the current database type
  QueryBuilder.prototype.getDatabaseType = function () {
    return ConnectionManager.getCurrentDatabaseType();
  };

  // Define default ordering themes
  Object.defineProperty(QueryBuilder, "defaultOrderingThemes", {
    value: {
      recent: { column: "created_at", direction: "desc" },
      oldest: { column: "created_at", direction: "asc" },
      alphabetical: { column: "name", direction: "asc" },
      random: { column: "random", direction: "asc" },
      recently_updated: { column: "updated_at", direction: "desc" },
      least_updated: { column: "updated_at", direction: "asc" },
      highest_value: { column: "value", direction: "desc" },
      lowest_value: { column: "value", direction: "asc" },
      most_active: { column: "activity_count", direction: "desc" },
      least_active: { column: "activity_count", direction: "asc" },
    },
    writable: true,
    configurable: true,
  });

  Object.assign(QueryBuilder.prototype, {
    /**
     * Order by a predefined theme or custom theme.
     * @param {string} theme - The theme to order by (e.g., "recent", "oldest").
     * @param {string} column - The column to use for ordering (optional).
     * @param {object} customThemes - Custom themes to extend the default themes.
     * @returns {QueryBuilder}
     */
    orderByTheme(theme = "recent", column = null, customThemes = {}) {
      const allThemes = {
        ...QueryBuilder.defaultOrderingThemes,
        ...customThemes,
      };

      console.log("Debug - Available themes:", Object.keys(allThemes));
      console.log("Debug - Requested theme:", theme);

      const themeRules = allThemes[theme];

      if (!themeRules) {
        throw new Error(
          `Invalid theme: ${theme}. Valid themes are: ${Object.keys(
            allThemes
          ).join(", ")}`
        );
      }

      // If column is provided, override the theme's default column
      const orderingRules = column ? { ...themeRules, column } : themeRules;

      console.log("Debug - Using ordering rules:", orderingRules);

      // Handle random ordering
      if (orderingRules.column === "random") {
        prototype.orderByRaw.call(this, "RANDOM()");
        return this;
      }

      // Apply the ordering
      prototype.orderBy.call(
        this,
        orderingRules.column,
        orderingRules.direction
      );
      return this;
    },

    /**
     * Order by a column and direction.
     * @param {string|object} column - The column to order by or an object of column-direction pairs.
     * @param {string} direction - The direction to order by ("asc" or "desc").
     * @returns {QueryBuilder}
     */
    order(column, direction = "asc") {
      if (typeof column === "object") {
        const orders = Object.entries(column).map(([col, dir]) => ({
          column: col,
          direction: dir,
        }));
        prototype.orderBy.call(this, orders);
        return this;
      }

      prototype.orderBy.call(this, column, direction);
      return this;
    },

    /**
     * Reverse the current order.
     * @returns {QueryBuilder}
     */
    reverse_order() {
      const orders = this._orderStatements || [];
      this.clear("orderBy");

      if (orders.length === 0) {
        prototype.orderBy.call(this, "id", "desc");
        return this;
      }

      const reversedOrders = orders.map((order) => ({
        column: order.column,
        direction: order.direction === "asc" ? "desc" : "asc",
      }));

      reversedOrders.forEach((order) => {
        prototype.orderBy.call(this, order.column, order.direction);
      });

      return this;
    },

    /**
     * Clear existing order and apply a new order.
     * @param {string} column - The column to order by.
     * @param {string} direction - The direction to order by ("asc" or "desc").
     * @returns {QueryBuilder}
     */
    reorder(column = "id", direction = "asc") {
      this.clear("order");
      prototype.orderBy.call(this, column, direction);
      return this;
    },

    /**
     * Order randomly.
     * @returns {QueryBuilder}
     */
    random() {
      prototype.orderByRaw.call(this, "RANDOM()");
      return this;
    },

    /**
     * Order with NULLs first.
     * @param {string} column - The column to order by.
     * @param {string} direction - The direction to order by ("asc" or "desc").
     * @returns {QueryBuilder}
     */
    nulls_first(column, direction = "asc") {
      const dbType = this.getDatabaseType();
      if (dbType === "postgresql" || dbType === "sqlite") {
        // PostgreSQL and SQLite support NULLS FIRST
        prototype.orderByRaw.call(this, `${column} ${direction} NULLS FIRST`);
      } else if (dbType === "mysql") {
        // MySQL does not support NULLS FIRST, so use a workaround
        prototype.orderByRaw.call(
          this,
          `ISNULL(${column}), ${column} ${direction}`
        );
      }
      return this;
    },

    /**
     * Order with NULLs last.
     * @param {string} column - The column to order by.
     * @param {string} direction - The direction to order by ("asc" or "desc").
     * @returns {QueryBuilder}
     */
    nulls_last(column, direction = "asc") {
      const dbType = this.getDatabaseType();
      if (dbType === "postgresql" || dbType === "sqlite") {
        // PostgreSQL and SQLite support NULLS LAST
        prototype.orderByRaw.call(this, `${column} ${direction} NULLS LAST`);
      } else if (dbType === "mysql") {
        // MySQL does not support NULLS LAST, so use a workaround
        prototype.orderByRaw.call(
          this,
          `ISNULL(${column}) DESC, ${column} ${direction}`
        );
      }
      return this;
    },

    /**
     * Order by a CASE statement.
     * @param {string} column - The column to order by.
     * @param {array} cases - An array of [value, order] pairs.
     * @returns {QueryBuilder}
     */
    order_by_case(column, cases) {
      const caseStatement = cases
        .map(([value, order]) => `WHEN ${column} = ? THEN ?`)
        .join(" ");

      const bindings = cases.flatMap(([value, order]) => [value, order]);

      prototype.orderByRaw.call(this, `CASE ${caseStatement} ELSE ? END`, [
        ...bindings,
        cases.length,
      ]);
      return this;
    },

    /**
     * Order by a specific field order.
     * @param {string} column - The column to order by.
     * @param {array} values - The values to order by.
     * @returns {QueryBuilder}
     */
    order_by_field(column, values) {
      const positions = values.map((_, index) => `WHEN ? THEN ?`).join(" ");

      const bindings = values.flatMap((value, index) => [value, index]);

      prototype.orderByRaw.call(
        this,
        `CASE ${column} ${positions} ELSE ? END`,
        [...bindings, values.length]
      );
      return this;
    },

    /**
     * Order by multiple columns.
     * @param {array} orders - An array of [column, direction] pairs.
     * @returns {QueryBuilder}
     */
    order_by_multiple(orders) {
      prototype.orderBy.call(
        this,
        orders.map(([column, direction]) => ({
          column,
          order: direction || "asc",
        }))
      );
      return this;
    },

    /**
     * Order by a related column.
     * @param {string} relation - The relation to join.
     * @param {string} column - The column to order by.
     * @param {string} direction - The direction to order by ("asc" or "desc").
     * @returns {QueryBuilder}
     */
    order_by_relation(relation, column, direction = "asc") {
      this.leftJoinRelated(relation);
      prototype.orderBy.call(this, `${relation}.${column}`, direction);
      return this;
    },

    /**
     * Order by the count of a relation.
     * @param {string} relation - The relation to count.
     * @param {string} direction - The direction to order by ("asc" or "desc").
     * @returns {QueryBuilder}
     */
    order_by_count(relation, direction = "desc") {
      this.withCount(relation);
      prototype.orderBy.call(this, `${relation}_count`, direction);
      return this;
    },

    /**
     * Conditionally apply an order.
     * @param {boolean} condition - The condition to check.
     * @param {object} trueOrder - The order to apply if the condition is true.
     * @param {object} falseOrder - The order to apply if the condition is false.
     * @returns {QueryBuilder}
     */
    order_by_when(condition, trueOrder, falseOrder) {
      if (condition) {
        prototype.orderBy.call(this, trueOrder);
      } else {
        prototype.orderBy.call(this, falseOrder);
      }
      return this;
    },
  });
};
