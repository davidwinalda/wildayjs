// class WhereClauseExtensions {
//   static extend(builder) {
//     // Basic Where Clauses
//     builder.where_not = function (conditions) {
//       return this.not(conditions);
//     };

//     builder.where_not_null = function (column) {
//       return this.whereNotNull(column);
//     };

//     builder.where_null = function (column) {
//       return this.whereNull(column);
//     };

//     builder.where_between = function (column, range) {
//       return this.whereBetween(column, range);
//     };

//     builder.where_not_between = function (column, range) {
//       return this.whereNotBetween(column, range);
//     };

//     builder.where_in = function (column, values) {
//       return this.whereIn(column, values);
//     };

//     builder.where_not_in = function (column, values) {
//       return this.whereNotIn(column, values);
//     };

//     // Advanced Where Clauses
//     builder.where_raw = function (sql, bindings) {
//       return this.whereRaw(sql, bindings);
//     };

//     builder.where_exists = function (callback) {
//       return this.whereExists(callback);
//     };

//     builder.where_not_exists = function (callback) {
//       return this.whereNotExists(callback);
//     };

//     builder.where_json_contains = function (column, value) {
//       return this.whereJsonContains(column, value);
//     };

//     builder.where_json_length = function (column, length) {
//       return this.whereJsonLength(column, length);
//     };

//     // Composite Where Clauses
//     builder.where_all = function (conditions) {
//       return this.where((builder) => {
//         Object.entries(conditions).forEach(([column, value]) => {
//           builder.where(column, value);
//         });
//       });
//     };

//     builder.where_any = function (conditions) {
//       return this.where((builder) => {
//         builder.where(conditions[0]);
//         conditions.slice(1).forEach((condition) => {
//           builder.orWhere(condition);
//         });
//       });
//     };

//     // Column Comparison
//     builder.where_column = function (column1, operator, column2) {
//       return this.whereColumn(column1, operator, column2);
//     };

//     builder.where_columns = function (columnPairs) {
//       return this.whereColumns(columnPairs);
//     };

//     // OR Conditions
//     builder.or_where = function (column, operator, value) {
//       return this.orWhere(column, operator, value);
//     };

//     builder.or_where_not = function (column, operator, value) {
//       return this.orWhereNot(column, operator, value);
//     };

//     builder.or_where_null = function (column) {
//       return this.orWhereNull(column);
//     };

//     builder.or_where_not_null = function (column) {
//       return this.orWhereNotNull(column);
//     };

//     builder.or_where_exists = function (callback) {
//       return this.orWhereExists(callback);
//     };

//     builder.or_where_not_exists = function (callback) {
//       return this.orWhereNotExists(callback);
//     };

//     builder.or_where_between = function (column, range) {
//       return this.orWhereBetween(column, range);
//     };

//     builder.or_where_not_between = function (column, range) {
//       return this.orWhereNotBetween(column, range);
//     };

//     builder.or_where_in = function (column, values) {
//       return this.orWhereIn(column, values);
//     };

//     builder.or_where_not_in = function (column, values) {
//       return this.orWhereNotIn(column, values);
//     };

//     return builder;
//   }

//   static extendStatic(ModelClass) {
//     const methods = [
//       // Basic Where Clauses
//       "where_not",
//       "where_not_null",
//       "where_null",
//       "where_between",
//       "where_not_between",
//       "where_in",
//       "where_not_in",
//       // Advanced Where Clauses
//       "where_raw",
//       "where_exists",
//       "where_not_exists",
//       "where_json_contains",
//       "where_json_length",
//       // Composite Where Clauses
//       "where_all",
//       "where_any",
//       // Column Comparison
//       "where_column",
//       "where_columns",
//       // OR Conditions
//       "or_where",
//       "or_where_not",
//       "or_where_null",
//       "or_where_not_null",
//       "or_where_exists",
//       "or_where_not_exists",
//       "or_where_between",
//       "or_where_not_between",
//       "or_where_in",
//       "or_where_not_in",
//     ];

//     methods.forEach((method) => {
//       if (typeof ModelClass[method] !== "function") {
//         ModelClass[method] = function (...args) {
//           return this.query()[method](...args);
//         };
//       }
//     });

//     return ModelClass;
//   }
// }

// module.exports = WhereClauseExtensions;

// query-builder/extensions/where_clauses.js
module.exports = (QueryBuilder) => {
  Object.assign(QueryBuilder.prototype, {
    whereLike(column, value) {
      return this.where(column, "like", `%${value}%`);
    },

    whereIn(column, values) {
      return this.where(column, "in", values);
    },

    whereBetween(column, range) {
      return this.where(column, "between", range);
    },
  });
};
