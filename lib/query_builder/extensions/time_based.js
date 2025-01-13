const dayjs = require("dayjs");

class TimeBasedExtensions {
  static extend(builder) {
    // Date range queries
    builder.date_range = function (
      startDate,
      endDate,
      dateField = "created_at"
    ) {
      return this.whereBetween(dateField, [
        dayjs(startDate).startOf("day").toDate(),
        dayjs(endDate).endOf("day").toDate(),
      ]);
    };

    // Time-based queries
    builder.within_days = function (days, dateField = "created_at") {
      return this.where(
        dateField,
        ">=",
        dayjs().subtract(days, "days").startOf("day").toDate()
      );
    };

    // Daily queries
    builder.today = function (dateField = "created_at") {
      return this.whereBetween(dateField, [
        dayjs().startOf("day").toDate(),
        dayjs().endOf("day").toDate(),
      ]);
    };

    builder.yesterday = function (dateField = "created_at") {
      return this.whereBetween(dateField, [
        dayjs().subtract(1, "day").startOf("day").toDate(),
        dayjs().subtract(1, "day").endOf("day").toDate(),
      ]);
    };

    builder.tomorrow = function (dateField = "created_at") {
      return this.whereBetween(dateField, [
        dayjs().add(1, "day").startOf("day").toDate(),
        dayjs().add(1, "day").endOf("day").toDate(),
      ]);
    };

    // Weekly queries
    builder.this_week = function (dateField = "created_at") {
      return this.whereBetween(dateField, [
        dayjs().startOf("week").toDate(),
        dayjs().endOf("week").toDate(),
      ]);
    };

    builder.last_week = function (dateField = "created_at") {
      return this.whereBetween(dateField, [
        dayjs().subtract(1, "week").startOf("week").toDate(),
        dayjs().subtract(1, "week").endOf("week").toDate(),
      ]);
    };

    builder.next_week = function (dateField = "created_at") {
      return this.whereBetween(dateField, [
        dayjs().add(1, "week").startOf("week").toDate(),
        dayjs().add(1, "week").endOf("week").toDate(),
      ]);
    };

    // Monthly queries
    builder.this_month = function (dateField = "created_at") {
      return this.whereBetween(dateField, [
        dayjs().startOf("month").toDate(),
        dayjs().endOf("month").toDate(),
      ]);
    };

    builder.last_month = function (dateField = "created_at") {
      return this.whereBetween(dateField, [
        dayjs().subtract(1, "month").startOf("month").toDate(),
        dayjs().subtract(1, "month").endOf("month").toDate(),
      ]);
    };

    builder.next_month = function (dateField = "created_at") {
      return this.whereBetween(dateField, [
        dayjs().add(1, "month").startOf("month").toDate(),
        dayjs().add(1, "month").endOf("month").toDate(),
      ]);
    };

    // Quarterly queries
    builder.this_quarter = function (dateField = "created_at") {
      return this.whereBetween(dateField, [
        dayjs().startOf("quarter").toDate(),
        dayjs().endOf("quarter").toDate(),
      ]);
    };

    builder.last_quarter = function (dateField = "created_at") {
      return this.whereBetween(dateField, [
        dayjs().subtract(1, "quarter").startOf("quarter").toDate(),
        dayjs().subtract(1, "quarter").endOf("quarter").toDate(),
      ]);
    };

    builder.next_quarter = function (dateField = "created_at") {
      return this.whereBetween(dateField, [
        dayjs().add(1, "quarter").startOf("quarter").toDate(),
        dayjs().add(1, "quarter").endOf("quarter").toDate(),
      ]);
    };

    // Yearly queries
    builder.this_year = function (dateField = "created_at") {
      return this.whereBetween(dateField, [
        dayjs().startOf("year").toDate(),
        dayjs().endOf("year").toDate(),
      ]);
    };

    builder.last_year = function (dateField = "created_at") {
      return this.whereBetween(dateField, [
        dayjs().subtract(1, "year").startOf("year").toDate(),
        dayjs().subtract(1, "year").endOf("year").toDate(),
      ]);
    };

    builder.next_year = function (dateField = "created_at") {
      return this.whereBetween(dateField, [
        dayjs().add(1, "year").startOf("year").toDate(),
        dayjs().add(1, "year").endOf("year").toDate(),
      ]);
    };

    // Relative time queries
    builder.older_than = function (
      duration,
      unit = "days",
      dateField = "created_at"
    ) {
      return this.where(
        dateField,
        "<",
        dayjs().subtract(duration, unit).toDate()
      );
    };

    builder.newer_than = function (
      duration,
      unit = "days",
      dateField = "created_at"
    ) {
      return this.where(
        dateField,
        ">",
        dayjs().subtract(duration, unit).toDate()
      );
    };

    // Custom period queries
    builder.between_dates = function (
      startDate,
      endDate,
      dateField = "created_at"
    ) {
      return this.whereBetween(dateField, [
        dayjs(startDate).toDate(),
        dayjs(endDate).toDate(),
      ]);
    };

    builder.before_date = function (date, dateField = "created_at") {
      return this.where(dateField, "<", dayjs(date).toDate());
    };

    builder.after_date = function (date, dateField = "created_at") {
      return this.where(dateField, ">", dayjs(date).toDate());
    };

    return builder;
  }

  static extendStatic(ModelClass) {
    const methods = [
      // Date range
      "date_range",
      "within_days",
      // Daily
      "today",
      "yesterday",
      "tomorrow",
      // Weekly
      "this_week",
      "last_week",
      "next_week",
      // Monthly
      "this_month",
      "last_month",
      "next_month",
      // Quarterly
      "this_quarter",
      "last_quarter",
      "next_quarter",
      // Yearly
      "this_year",
      "last_year",
      "next_year",
      // Relative
      "older_than",
      "newer_than",
      // Custom
      "between_dates",
      "before_date",
      "after_date",
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

module.exports = TimeBasedExtensions;
