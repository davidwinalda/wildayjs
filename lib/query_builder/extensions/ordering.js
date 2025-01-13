// class OrderingExtensions {
//   static extend(builder) {
//     // Check if already extended
//     if (builder._orderingExtended) {
//       console.log("Debug: Ordering already extended, skipping");
//       return builder;
//     }

//     // Validate builder and modelClass
//     if (!builder || !builder.modelClass) {
//       console.warn(
//         "OrderingExtensions.extend: Invalid builder or missing modelClass"
//       );
//       return builder;
//     }

//     builder._orderingExtended = true;
//     builder._orderStatements = [];

//     console.log("Debug: OrderingExtensions.extend called", {
//       builderType: builder.constructor.name,
//       modelClass: builder.modelClass().name,
//       isExtended: !!builder._orderingExtended,
//       hasOrderStatements: !!builder._orderStatements,
//     });

//     // Basic Ordering
//     builder.order = function (column, direction = "asc") {
//       this._orderStatements = this._orderStatements || [];

//       if (typeof column === "object") {
//         const orders = Object.entries(column).map(([col, dir]) => ({
//           column: col,
//           direction: dir,
//         }));
//         this._orderStatements = orders;
//         return this.orderBy(orders);
//       }

//       this._orderStatements = [{ column, direction }];
//       this.clear("orderBy");
//       return this.orderBy(column, direction);
//     };

//     builder.order_by = function (column, direction = "asc") {
//       return this.order(column, direction);
//     };

//     // Advanced Ordering
//     builder.reverse_order = function () {
//       const orders = this._orderStatements || [];
//       this.clear("orderBy");

//       if (orders.length === 0) {
//         this._orderStatements = [{ column: "id", direction: "desc" }];
//         return this.orderBy("id", "desc");
//       }

//       const reversedOrders = orders.map((order) => ({
//         column: order.column,
//         direction: order.direction === "asc" ? "desc" : "asc",
//       }));

//       this._orderStatements = reversedOrders;
//       reversedOrders.forEach((order) => {
//         this.orderBy(order.column, order.direction);
//       });

//       return this;
//     };

//     builder.reorder = function (column = "id", direction = "asc") {
//       return this.clear("order").orderBy(column, direction);
//     };

//     // Raw SQL Ordering
//     builder.order_by_raw = function (sql, bindings = []) {
//       return this.orderByRaw(sql, bindings);
//     };

//     builder.random = function () {
//       return this.orderByRaw("RANDOM()");
//     };

//     // NULL Handling
//     builder.nulls_first = function (column, direction = "asc") {
//       return this.orderByRaw(`${column} ${direction} NULLS FIRST`);
//     };

//     builder.nulls_last = function (column, direction = "asc") {
//       return this.orderByRaw(`${column} ${direction} NULLS LAST`);
//     };

//     // Complex Ordering
//     builder.order_by_case = function (column, cases) {
//       const caseStatement = cases
//         .map(([value, order]) => `WHEN ${column} = ? THEN ?`)
//         .join(" ");

//       const bindings = cases.flatMap(([value, order]) => [value, order]);

//       return this.orderByRaw(`CASE ${caseStatement} ELSE ? END`, [
//         ...bindings,
//         cases.length,
//       ]);
//     };

//     builder.order_by_field = function (column, values) {
//       const positions = values.map((_, index) => `WHEN ? THEN ?`).join(" ");

//       const bindings = values.flatMap((value, index) => [value, index]);

//       return this.orderByRaw(`CASE ${column} ${positions} ELSE ? END`, [
//         ...bindings,
//         values.length,
//       ]);
//     };

//     // Multiple Column Ordering
//     builder.order_by_multiple = function (orders) {
//       return this.orderBy(
//         orders.map(([column, direction]) => ({
//           column,
//           order: direction || "asc",
//         }))
//       );
//     };

//     // Relationship Ordering
//     builder.order_by_relation = function (relation, column, direction = "asc") {
//       return this.leftJoinRelated(relation).orderBy(
//         `${relation}.${column}`,
//         direction
//       );
//     };

//     // Aggregate Ordering
//     builder.order_by_count = function (relation, direction = "desc") {
//       return this.withCount(relation).orderBy(`${relation}_count`, direction);
//     };

//     // Conditional Ordering
//     builder.order_by_when = function (condition, trueOrder, falseOrder) {
//       return condition ? this.orderBy(trueOrder) : this.orderBy(falseOrder);
//     };

//     return builder;
//   }

//   static extendStatic(ModelClass) {
//     console.log(
//       "Debug: OrderingExtensions.extendStatic called for",
//       ModelClass.name,
//       {
//         isExtended: !!ModelClass._orderingStaticExtended,
//       }
//     );

//     if (ModelClass._orderingStaticExtended) {
//       console.log("Debug: Model class already extended statically");
//       return ModelClass;
//     }
//     ModelClass._orderingStaticExtended = true;
//     console.log("Debug: Added static ordering extensions to model class");

//     const methods = [
//       // Basic Ordering
//       "order",
//       "order_by",
//       // Advanced Ordering
//       "reverse_order",
//       "reorder",
//       // Raw SQL Ordering
//       "order_by_raw",
//       "random",
//       // NULL Handling
//       "nulls_first",
//       "nulls_last",
//       // Complex Ordering
//       "order_by_case",
//       "order_by_field",
//       // Multiple Column Ordering
//       "order_by_multiple",
//       // Relationship Ordering
//       "order_by_relation",
//       // Aggregate Ordering
//       "order_by_count",
//       // Conditional Ordering
//       "order_by_when",
//     ];

//     methods.forEach((method) => {
//       ModelClass[method] = function (...args) {
//         // Just use the query directly, no need to extend again
//         return this.query()[method](...args);
//       };
//     });

//     return ModelClass;
//   }
// }

// module.exports = OrderingExtensions;

// query-builder/extensions/ordering.js
module.exports = (QueryBuilder) => {
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

  // Extend the QueryBuilder prototype with ordering methods
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
        return this.orderByRaw("RANDOM()");
      }

      // Apply the ordering
      return this.orderBy(orderingRules.column, orderingRules.direction);
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
        return this.orderBy(orders);
      }

      return this.orderBy(column, direction);
    },

    /**
     * Alias for `order`.
     * @param {string|object} column - The column to order by or an object of column-direction pairs.
     * @param {string} direction - The direction to order by ("asc" or "desc").
     * @returns {QueryBuilder}
     */
    order_by(column, direction = "asc") {
      return this.order(column, direction);
    },

    /**
     * Reverse the current order.
     * @returns {QueryBuilder}
     */
    reverse_order() {
      const orders = this._orderStatements || [];
      this.clear("orderBy");

      if (orders.length === 0) {
        return this.orderBy("id", "desc");
      }

      const reversedOrders = orders.map((order) => ({
        column: order.column,
        direction: order.direction === "asc" ? "desc" : "asc",
      }));

      reversedOrders.forEach((order) => {
        this.orderBy(order.column, order.direction);
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
      return this.clear("order").orderBy(column, direction);
    },

    /**
     * Order by raw SQL.
     * @param {string} sql - The raw SQL for ordering.
     * @param {array} bindings - The bindings for the SQL.
     * @returns {QueryBuilder}
     */
    order_by_raw(sql, bindings = []) {
      return this.orderByRaw(sql, bindings);
    },

    /**
     * Order randomly.
     * @returns {QueryBuilder}
     */
    random() {
      return this.orderByRaw("RANDOM()");
    },

    /**
     * Order with NULLs first.
     * @param {string} column - The column to order by.
     * @param {string} direction - The direction to order by ("asc" or "desc").
     * @returns {QueryBuilder}
     */
    nulls_first(column, direction = "asc") {
      return this.orderByRaw(`${column} ${direction} NULLS FIRST`);
    },

    /**
     * Order with NULLs last.
     * @param {string} column - The column to order by.
     * @param {string} direction - The direction to order by ("asc" or "desc").
     * @returns {QueryBuilder}
     */
    nulls_last(column, direction = "asc") {
      return this.orderByRaw(`${column} ${direction} NULLS LAST`);
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

      return this.orderByRaw(`CASE ${caseStatement} ELSE ? END`, [
        ...bindings,
        cases.length,
      ]);
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

      return this.orderByRaw(`CASE ${column} ${positions} ELSE ? END`, [
        ...bindings,
        values.length,
      ]);
    },

    /**
     * Order by multiple columns.
     * @param {array} orders - An array of [column, direction] pairs.
     * @returns {QueryBuilder}
     */
    order_by_multiple(orders) {
      return this.orderBy(
        orders.map(([column, direction]) => ({
          column,
          order: direction || "asc",
        }))
      );
    },

    /**
     * Order by a related column.
     * @param {string} relation - The relation to join.
     * @param {string} column - The column to order by.
     * @param {string} direction - The direction to order by ("asc" or "desc").
     * @returns {QueryBuilder}
     */
    order_by_relation(relation, column, direction = "asc") {
      return this.leftJoinRelated(relation).orderBy(
        `${relation}.${column}`,
        direction
      );
    },

    /**
     * Order by the count of a relation.
     * @param {string} relation - The relation to count.
     * @param {string} direction - The direction to order by ("asc" or "desc").
     * @returns {QueryBuilder}
     */
    order_by_count(relation, direction = "desc") {
      return this.withCount(relation).orderBy(`${relation}_count`, direction);
    },

    /**
     * Conditionally apply an order.
     * @param {boolean} condition - The condition to check.
     * @param {object} trueOrder - The order to apply if the condition is true.
     * @param {object} falseOrder - The order to apply if the condition is false.
     * @returns {QueryBuilder}
     */
    order_by_when(condition, trueOrder, falseOrder) {
      return condition ? this.orderBy(trueOrder) : this.orderBy(falseOrder);
    },
  });
};

// module.exports = (QueryBuilder) => {
//   // Define default ordering themes
//   QueryBuilder.defaultOrderingThemes = {
//     recent: { column: "created_at", direction: "desc" },
//     oldest: { column: "created_at", direction: "asc" },
//     alphabetical: { column: "name", direction: "asc" },
//     random: { column: "random", direction: "asc" },
//   };

//   Object.assign(QueryBuilder.prototype, {
//     orderByTheme(theme = "recent", customThemes = {}) {
//       const allThemes = {
//         ...QueryBuilder.defaultOrderingThemes,
//         ...customThemes,
//       };

//       const orderingRules = allThemes[theme];

//       if (!orderingRules) {
//         throw new Error(
//           `Invalid theme: ${theme}. Valid themes are: ${Object.keys(
//             allThemes
//           ).join(", ")}`
//         );
//       }

//       if (orderingRules.column === "random") {
//         return this.orderByRaw("RANDOM()");
//       }

//       return this.orderBy(orderingRules.column, orderingRules.direction);
//     },
//   });
// };
