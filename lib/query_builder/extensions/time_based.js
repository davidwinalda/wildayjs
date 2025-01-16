const dayjs = require("dayjs");
const { QueryBuilder: ObjectionBuilder } = require("objection");
const ConnectionManager = require("../../database/connectionManager");

module.exports = (QueryBuilder) => {
  // Get Objection's QueryBuilder prototype directly
  const prototype = ObjectionBuilder.prototype;

  if (QueryBuilder.prototype.__timeBasedExtended) return;
  QueryBuilder.prototype.__timeBasedExtended = true;

  // Helper method to get the current database type
  QueryBuilder.prototype.getDatabaseType = function () {
    return ConnectionManager.getCurrentDatabaseType();
  };

  Object.assign(QueryBuilder.prototype, {
    /**
     * Query records within a date range.
     * @param {string|Date} startDate - The start date.
     * @param {string|Date} endDate - The end date.
     * @param {string} dateField - The column to filter by (default: "created_at").
     * @returns {QueryBuilder}
     */
    date_range(startDate, endDate, dateField = "created_at") {
      prototype.whereBetween.call(this, dateField, [
        dayjs(startDate).startOf("day").toDate(),
        dayjs(endDate).endOf("day").toDate(),
      ]);
      return this;
    },

    /**
     * Query records within the last N days.
     * @param {number} days - The number of days.
     * @param {string} dateField - The column to filter by (default: "created_at").
     * @returns {QueryBuilder}
     */
    within_days(days, dateField = "created_at") {
      prototype.where.call(
        this,
        dateField,
        ">=",
        dayjs().subtract(days, "days").startOf("day").toDate()
      );
      return this;
    },

    /**
     * Query records created within the last N days (default: 7 days).
     * @param {number} days - The number of days (default: 7).
     * @param {string} dateField - The column to filter by (default: "created_at").
     * @returns {QueryBuilder}
     */
    recent(days = 7, dateField = "created_at") {
      prototype.where.call(
        this,
        dateField,
        ">=",
        dayjs().subtract(days, "day").toDate()
      );
      return this;
    },

    /**
     * Query records for today.
     * @param {string} dateField - The column to filter by (default: "created_at").
     * @returns {QueryBuilder}
     */
    today(dateField = "created_at") {
      prototype.whereBetween.call(this, dateField, [
        dayjs().startOf("day").toDate(),
        dayjs().endOf("day").toDate(),
      ]);
      return this;
    },

    /**
     * Query records for yesterday.
     * @param {string} dateField - The column to filter by (default: "created_at").
     * @returns {QueryBuilder}
     */
    yesterday(dateField = "created_at") {
      prototype.whereBetween.call(this, dateField, [
        dayjs().subtract(1, "day").startOf("day").toDate(),
        dayjs().subtract(1, "day").endOf("day").toDate(),
      ]);
      return this;
    },

    /**
     * Query records for tomorrow.
     * @param {string} dateField - The column to filter by (default: "created_at").
     * @returns {QueryBuilder}
     */
    tomorrow(dateField = "created_at") {
      prototype.whereBetween.call(this, dateField, [
        dayjs().add(1, "day").startOf("day").toDate(),
        dayjs().add(1, "day").endOf("day").toDate(),
      ]);
      return this;
    },

    /**
     * Query records for this week.
     * @param {string} dateField - The column to filter by (default: "created_at").
     * @returns {QueryBuilder}
     */
    this_week(dateField = "created_at") {
      prototype.whereBetween.call(this, dateField, [
        dayjs().startOf("week").toDate(),
        dayjs().endOf("week").toDate(),
      ]);
      return this;
    },

    /**
     * Query records for last week.
     * @param {string} dateField - The column to filter by (default: "created_at").
     * @returns {QueryBuilder}
     */
    last_week(dateField = "created_at") {
      prototype.whereBetween.call(this, dateField, [
        dayjs().subtract(1, "week").startOf("week").toDate(),
        dayjs().subtract(1, "week").endOf("week").toDate(),
      ]);
      return this;
    },

    /**
     * Query records for next week.
     * @param {string} dateField - The column to filter by (default: "created_at").
     * @returns {QueryBuilder}
     */
    next_week(dateField = "created_at") {
      prototype.whereBetween.call(this, dateField, [
        dayjs().add(1, "week").startOf("week").toDate(),
        dayjs().add(1, "week").endOf("week").toDate(),
      ]);
      return this;
    },

    /**
     * Query records for this month.
     * @param {string} dateField - The column to filter by (default: "created_at").
     * @returns {QueryBuilder}
     */
    this_month(dateField = "created_at") {
      prototype.whereBetween.call(this, dateField, [
        dayjs().startOf("month").toDate(),
        dayjs().endOf("month").toDate(),
      ]);
      return this;
    },

    /**
     * Query records for last month.
     * @param {string} dateField - The column to filter by (default: "created_at").
     * @returns {QueryBuilder}
     */
    last_month(dateField = "created_at") {
      prototype.whereBetween.call(this, dateField, [
        dayjs().subtract(1, "month").startOf("month").toDate(),
        dayjs().subtract(1, "month").endOf("month").toDate(),
      ]);
      return this;
    },

    /**
     * Query records for next month.
     * @param {string} dateField - The column to filter by (default: "created_at").
     * @returns {QueryBuilder}
     */
    next_month(dateField = "created_at") {
      prototype.whereBetween.call(this, dateField, [
        dayjs().add(1, "month").startOf("month").toDate(),
        dayjs().add(1, "month").endOf("month").toDate(),
      ]);
      return this;
    },

    /**
     * Query records for this quarter.
     * @param {string} dateField - The column to filter by (default: "created_at").
     * @returns {QueryBuilder}
     */
    this_quarter(dateField = "created_at") {
      prototype.whereBetween.call(this, dateField, [
        dayjs().startOf("quarter").toDate(),
        dayjs().endOf("quarter").toDate(),
      ]);
      return this;
    },

    /**
     * Query records for last quarter.
     * @param {string} dateField - The column to filter by (default: "created_at").
     * @returns {QueryBuilder}
     */
    last_quarter(dateField = "created_at") {
      prototype.whereBetween.call(this, dateField, [
        dayjs().subtract(1, "quarter").startOf("quarter").toDate(),
        dayjs().subtract(1, "quarter").endOf("quarter").toDate(),
      ]);
      return this;
    },

    /**
     * Query records for next quarter.
     * @param {string} dateField - The column to filter by (default: "created_at").
     * @returns {QueryBuilder}
     */
    next_quarter(dateField = "created_at") {
      prototype.whereBetween.call(this, dateField, [
        dayjs().add(1, "quarter").startOf("quarter").toDate(),
        dayjs().add(1, "quarter").endOf("quarter").toDate(),
      ]);
      return this;
    },

    /**
     * Query records for this year.
     * @param {string} dateField - The column to filter by (default: "created_at").
     * @returns {QueryBuilder}
     */
    this_year(dateField = "created_at") {
      prototype.whereBetween.call(this, dateField, [
        dayjs().startOf("year").toDate(),
        dayjs().endOf("year").toDate(),
      ]);
      return this;
    },

    /**
     * Query records for last year.
     * @param {string} dateField - The column to filter by (default: "created_at").
     * @returns {QueryBuilder}
     */
    last_year(dateField = "created_at") {
      prototype.whereBetween.call(this, dateField, [
        dayjs().subtract(1, "year").startOf("year").toDate(),
        dayjs().subtract(1, "year").endOf("year").toDate(),
      ]);
      return this;
    },

    /**
     * Query records for next year.
     * @param {string} dateField - The column to filter by (default: "created_at").
     * @returns {QueryBuilder}
     */
    next_year(dateField = "created_at") {
      prototype.whereBetween.call(this, dateField, [
        dayjs().add(1, "year").startOf("year").toDate(),
        dayjs().add(1, "year").endOf("year").toDate(),
      ]);
      return this;
    },

    /**
     * Query records older than a specified duration.
     * @param {number} duration - The duration.
     * @param {string} unit - The unit of duration (e.g., "days", "months").
     * @param {string} dateField - The column to filter by (default: "created_at").
     * @returns {QueryBuilder}
     */
    older_than(duration, unit = "days", dateField = "created_at") {
      prototype.where.call(
        this,
        dateField,
        "<",
        dayjs().subtract(duration, unit).toDate()
      );
      return this;
    },

    /**
     * Query records newer than a specified duration.
     * @param {number} duration - The duration.
     * @param {string} unit - The unit of duration (e.g., "days", "months").
     * @param {string} dateField - The column to filter by (default: "created_at").
     * @returns {QueryBuilder}
     */
    newer_than(duration, unit = "days", dateField = "created_at") {
      prototype.where.call(
        this,
        dateField,
        ">",
        dayjs().subtract(duration, unit).toDate()
      );
      return this;
    },

    /**
     * Query records between two dates.
     * @param {string|Date} startDate - The start date.
     * @param {string|Date} endDate - The end date.
     * @param {string} dateField - The column to filter by (default: "created_at").
     * @returns {QueryBuilder}
     */
    between_dates(startDate, endDate, dateField = "created_at") {
      prototype.whereBetween.call(this, dateField, [
        dayjs(startDate).toDate(),
        dayjs(endDate).toDate(),
      ]);
      return this;
    },

    /**
     * Query records before a specified date.
     * @param {string|Date} date - The date.
     * @param {string} dateField - The column to filter by (default: "created_at").
     * @returns {QueryBuilder}
     */
    before_date(date, dateField = "created_at") {
      prototype.where.call(this, dateField, "<", dayjs(date).toDate());
      return this;
    },

    /**
     * Query records after a specified date.
     * @param {string|Date} date - The date.
     * @param {string} dateField - The column to filter by (default: "created_at").
     * @returns {QueryBuilder}
     */
    after_date(date, dateField = "created_at") {
      prototype.where.call(this, dateField, ">", dayjs(date).toDate());
      return this;
    },
  });
};
