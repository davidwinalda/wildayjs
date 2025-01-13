class PatternMatchingExtensions {
  static extend(builder) {
    // Basic Pattern Matching
    builder.where_like = function (column, pattern) {
      return this.where(column, "like", pattern);
    };

    builder.where_ilike = function (column, pattern) {
      return this.where(column, "ilike", pattern);
    };

    builder.where_not_like = function (column, pattern) {
      return this.whereNot(column, "like", pattern);
    };

    builder.where_not_ilike = function (column, pattern) {
      return this.whereNot(column, "ilike", pattern);
    };

    // Common Pattern Shortcuts
    builder.where_starts_with = function (column, value) {
      return this.where_like(column, `${value}%`);
    };

    builder.where_ends_with = function (column, value) {
      return this.where_like(column, `%${value}`);
    };

    builder.where_contains = function (column, value) {
      return this.where_like(column, `%${value}%`);
    };

    builder.where_not_contains = function (column, value) {
      return this.where_not_like(column, `%${value}%`);
    };

    // Case-insensitive Variants
    builder.where_istarts_with = function (column, value) {
      return this.where_ilike(column, `${value}%`);
    };

    builder.where_iends_with = function (column, value) {
      return this.where_ilike(column, `%${value}`);
    };

    builder.where_icontains = function (column, value) {
      return this.where_ilike(column, `%${value}%`);
    };

    builder.where_not_icontains = function (column, value) {
      return this.where_not_ilike(column, `%${value}%`);
    };

    // Regular Expression Support (using database-agnostic approach)
    builder.where_regex = function (column, pattern) {
      return this.whereRaw(`${column} ~ ?`, [pattern]);
    };

    builder.where_iregex = function (column, pattern) {
      return this.whereRaw(`${column} ~* ?`, [pattern]);
    };

    builder.where_not_regex = function (column, pattern) {
      return this.whereRaw(`${column} !~ ?`, [pattern]);
    };

    builder.where_not_iregex = function (column, pattern) {
      return this.whereRaw(`${column} !~* ?`, [pattern]);
    };

    return builder;
  }

  static extendStatic(ModelClass) {
    const methods = [
      "where_like",
      "where_ilike",
      "where_not_like",
      "where_not_ilike",
      "where_starts_with",
      "where_ends_with",
      "where_contains",
      "where_not_contains",
      "where_istarts_with",
      "where_iends_with",
      "where_icontains",
      "where_not_icontains",
      "where_regex",
      "where_iregex",
      "where_not_regex",
      "where_not_iregex",
    ];

    methods.forEach((method) => {
      if (typeof ModelClass[method] !== "function") {
        ModelClass[method] = function (...args) {
          return this.query()[method](...args);
        };
      }
    });

    return ModelClass;
  }
}

module.exports = PatternMatchingExtensions;
