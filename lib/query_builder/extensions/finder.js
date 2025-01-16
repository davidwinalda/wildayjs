const { QueryBuilder: ObjectionBuilder } = require("objection");
const ConnectionManager = require("../../database/connectionManager");

module.exports = (QueryBuilder) => {
  // Get Objection's QueryBuilder prototype directly
  const prototype = ObjectionBuilder.prototype;

  if (QueryBuilder.prototype.__finderMethodsExtended) return;
  QueryBuilder.prototype.__finderMethodsExtended = true;

  // Helper method to get the current database type
  QueryBuilder.prototype.getDatabaseType = function () {
    return ConnectionManager.getCurrentDatabaseType();
  };

  Object.assign(QueryBuilder.prototype, {
    /**
     * Find a record by its primary key.
     * @param {string|number} id - The primary key value.
     * @param {string} column - The primary key column (default: "id").
     * @returns {QueryBuilder}
     */
    find(id, column = "id") {
      prototype.where.call(this, column, id);
      prototype.limit.call(this, 1);
      return this;
    },

    /**
     * Find the first record matching the given criteria.
     * @param {object} criteria - The criteria to match.
     * @returns {QueryBuilder}
     */
    findBy(criteria) {
      prototype.where.call(this, criteria);
      prototype.limit.call(this, 1);
      return this;
    },

    /**
     * Fetch all records from the table.
     * @returns {QueryBuilder}
     */
    all() {
      return this;
    },

    /**
     * Fetch the first record.
     * @returns {QueryBuilder}
     */
    first() {
      prototype.limit.call(this, 1);
      return this;
    },

    /**
     * Fetch the last record.
     * @returns {QueryBuilder}
     */
    last() {
      prototype.orderBy.call(this, "id", "desc");
      prototype.limit.call(this, 1);
      return this;
    },

    /**
     * Check if a record matching the criteria exists.
     * @param {object} criteria - The criteria to match.
     * @returns {QueryBuilder}
     */
    exists(criteria) {
      prototype.where.call(this, criteria);
      prototype.limit.call(this, 1);
      prototype.select.call(this, "1 as exists");
      return this;
    },

    /**
     * Find or create a record.
     * @param {object} criteria - The criteria to match.
     * @param {object} defaults - Default values to use if the record is not found.
     * @returns {Promise<object>}
     */
    async findOrCreate(criteria, defaults = {}) {
      let record = await this.clone().where(criteria).first();
      if (!record) {
        record = await this.insert({ ...criteria, ...defaults });
      }
      return record;
    },

    /**
     * Find or fail with a custom error message.
     * @param {object} criteria - The criteria to match.
     * @param {string} message - The error message to throw if the record is not found.
     * @returns {Promise<object>}
     */
    async findOrFail(criteria, message = "Record not found.") {
      const result = await this.clone().where(criteria).first();
      if (!result) {
        throw new Error(message);
      }
      return result;
    },

    /**
     * Find or return a fallback value.
     * @param {object} criteria - The criteria to match.
     * @param {mixed} fallback - The fallback value to return if the record is not found.
     * @returns {Promise<object|mixed>}
     */
    async findOr(criteria, fallback = null) {
      const result = await this.clone().where(criteria).first();
      return result || fallback;
    },

    /**
     * Fetch a random record.
     * @returns {QueryBuilder}
     */
    findRandom() {
      const dbType = this.getDatabaseType();
      if (dbType === "postgresql" || dbType === "sqlite") {
        prototype.orderByRaw.call(this, "RANDOM()");
      } else if (dbType === "mysql") {
        prototype.orderByRaw.call(this, "RAND()");
      }
      prototype.limit.call(this, 1);
      return this;
    },

    /**
     * Find a record by its primary key and throw an error if not found.
     * @param {string|number} id - The primary key value.
     * @param {string} column - The primary key column (default: "id").
     * @returns {Promise<object>}
     */
    async findStrict(id, column = "id") {
      const record = await this.find(id, column).first();
      if (!record) {
        throw new Error(`Record with ${column} = ${id} not found.`);
      }
      return record;
    },

    /**
     * Find the first record matching the given criteria and throw an error if not found.
     * @param {object} criteria - The criteria to match.
     * @returns {Promise<object>}
     */
    async findByStrict(criteria) {
      const record = await this.findBy(criteria).first();
      if (!record) {
        throw new Error(`Record matching criteria not found.`);
      }
      return record;
    },

    /**
     * Fetch a limited number of records.
     * @param {number} limit - The number of records to fetch (default: 1).
     * @returns {QueryBuilder}
     */
    take(limit = 1) {
      prototype.limit.call(this, limit);
      return this;
    },

    /**
     * Process records in batches using a callback.
     * @param {number} batchSize - The number of records per batch (default: 1000).
     * @param {function} callback - The callback to process each record.
     * @returns {Promise<void>}
     */
    async findEach(batchSize = 1000, callback) {
      let offset = 0;
      let records;
      do {
        records = await this.clone().limit(batchSize).offset(offset);
        for (const record of records) {
          await callback(record);
        }
        offset += batchSize;
      } while (records.length === batchSize);
    },

    /**
     * Process records in batches using a callback.
     * @param {number} batchSize - The number of records per batch (default: 1000).
     * @param {function} callback - The callback to process each batch.
     * @returns {Promise<void>}
     */
    async findInBatches(batchSize = 1000, callback) {
      let offset = 0;
      let records;
      do {
        records = await this.clone().limit(batchSize).offset(offset);
        if (records.length > 0) {
          await callback(records);
        }
        offset += batchSize;
      } while (records.length === batchSize);
    },

    /**
     * Find or initialize a record with the given attributes.
     * @param {object} criteria - The criteria to match.
     * @param {object} defaults - Default values to use if the record is not found.
     * @returns {Promise<object>}
     */
    async findOrInitializeBy(criteria, defaults = {}) {
      const record = await this.findBy(criteria).first();
      if (record) {
        return record;
      }
      return { ...criteria, ...defaults }; // Return a new object (not saved to the database)
    },

    /**
     * Execute a custom SQL query and return the results.
     * @param {string} sql - The SQL query to execute.
     * @param {array} bindings - The bindings for the SQL query.
     * @returns {Promise<array>}
     */
    async findBySql(sql, bindings = []) {
      const knex = this.knex();
      const results = await knex.raw(sql, bindings);
      return results.rows || results; // Return rows for PostgreSQL, raw results for others
    },
  });
};
