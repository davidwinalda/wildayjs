const { QueryBuilder: ObjectionBuilder } = require("objection");
const ConnectionManager = require("../../database/connectionManager");

module.exports = (QueryBuilder) => {
  if (QueryBuilder.prototype.__finderMethodsExtended) return;
  QueryBuilder.prototype.__finderMethodsExtended = true;

  // Helper method to get the current database type
  QueryBuilder.prototype.getDatabaseType = function () {
    return ConnectionManager.getCurrentDatabaseType();
  };

  Object.assign(QueryBuilder.prototype, {
    /**
     * Fetch all records from the table.
     * @returns {Promise<array>} - An array of records.
     */
    async all() {
      return this;
    },

    /**
     * Fetch the last record.
     * @returns {Promise<object|null>} - The last record or null if not found.
     */
    async last() {
      return this.orderBy("id", "desc").limit(1).first();
    },

    /**
     * Fetch a limited number of records.
     * @param {number} limit - The number of records to fetch (default: 1).
     * @returns {QueryBuilder} - The QueryBuilder instance for chaining.
     */
    take(limit = 1) {
      return this.limit(limit);
    },

    /**
     * Check if a record matching the criteria exists.
     * @param {object} criteria - The criteria to match.
     * @returns {Promise<boolean>} - True if the record exists, false otherwise.
     */
    async exists(criteria) {
      const result = await this.where(criteria).select("1 as exists").first();
      return !!result;
    },

    /**
     * Find or create a record.
     * @param {object} criteria - The criteria to match.
     * @param {object} defaults - Default values to use if the record is not found.
     * @returns {Promise<object>} - The found or created record.
     */
    async findOrCreate(criteria, defaults = {}) {
      let record = await this.where(criteria).first();
      if (!record) {
        record = await this.insert({ ...criteria, ...defaults });
      }
      return record;
    },

    /**
     * Find or fail with a custom error message.
     * @param {object} criteria - The criteria to match.
     * @param {string} message - The error message to throw if the record is not found.
     * @returns {Promise<object>} - The found record.
     * @throws {Error} - If the record is not found.
     */
    async findOrFail(criteria, message = "Record not found.") {
      const result = await this.where(criteria).first();
      if (!result) {
        throw new Error(message);
      }
      return result;
    },

    /**
     * Find or return a fallback value.
     * @param {object} criteria - The criteria to match.
     * @param {mixed} fallback - The fallback value to return if the record is not found.
     * @returns {Promise<object|mixed>} - The found record or fallback value.
     */
    async findOr(criteria, fallback = null) {
      const result = await this.where(criteria).first();
      return result || fallback;
    },

    /**
     * Fetch a random record.
     * @returns {Promise<object|null>} - A random record or null if not found.
     */
    async findRandom() {
      const dbType = this.getDatabaseType();
      if (dbType === "postgresql" || dbType === "sqlite") {
        return this.orderByRaw("RANDOM()").limit(1).first();
      } else if (dbType === "mysql") {
        return this.orderByRaw("RAND()").limit(1).first();
      }
      return this.limit(1).first();
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
        records = await this.limit(batchSize).offset(offset);
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
        records = await this.limit(batchSize).offset(offset);
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
     * @returns {Promise<object>} - The found record or a new object with default values.
     */
    async findOrInitializeBy(criteria, defaults = {}) {
      const record = await this.where(criteria).first();
      if (record) {
        return record;
      }
      return { ...criteria, ...defaults }; // Return a new object (not saved to the database)
    },

    /**
     * Execute a custom SQL query and return the results.
     * @param {string} sql - The SQL query to execute.
     * @param {array} bindings - The bindings for the SQL query.
     * @returns {Promise<array>} - The query results.
     */
    async findBySql(sql, bindings = []) {
      const knex = this.knex();
      const results = await knex.raw(sql, bindings);
      return results.rows || results; // Return rows for PostgreSQL, raw results for others
    },

    /**
     * Pluck a single column's values from the result set.
     * @param {string} column - The column to pluck.
     * @returns {Promise<array>} - An array of column values.
     */
    async pluck(column) {
      const results = await this.select(column);
      return results.map((row) => row[column]);
    },

    /**
     * Process records in fixed-size chunks.
     * @param {number} chunkSize - The number of records per chunk.
     * @param {function} callback - The callback to process each chunk.
     * @returns {Promise<void>}
     */
    async chunk(chunkSize, callback) {
      let offset = 0;
      let records;
      do {
        records = await this.limit(chunkSize).offset(offset);
        if (records.length > 0) {
          await callback(records);
        }
        offset += chunkSize;
      } while (records.length === chunkSize);
    },

    /**
     * Find records by querying a JSON column.
     * @param {string} column - The JSON column to query.
     * @param {string} path - The JSON path (e.g., '$.key').
     * @param {mixed} value - The value to match.
     * @returns {QueryBuilder} - The QueryBuilder instance for chaining.
     */
    findByJson(column, path, value) {
      const dbType = this.getDatabaseType();
      if (dbType === "postgresql") {
        return this.whereRaw(`??::jsonb @> ?`, [
          column,
          JSON.stringify({ [path]: value }),
        ]);
      } else if (dbType === "mysql") {
        return this.whereRaw(`JSON_EXTRACT(??, ?) = ?`, [
          column,
          path,
          JSON.stringify(value),
        ]);
      }
      throw new Error("JSON queries are not supported for this database type.");
    },

    /**
     * Find records by querying a related table.
     * @param {string} relation - The relation to query.
     * @param {object} criteria - The criteria to match in the related table.
     * @returns {QueryBuilder} - The QueryBuilder instance for chaining.
     */
    findByRelation(relation, criteria) {
      return this.whereExists((builder) => {
        builder
          .from(relation)
          .whereRaw(
            `${this.modelClass().tableName}.id = ${relation}.${
              this.modelClass().tableName
            }_id`
          )
          .where(criteria);
      });
    },

    /**
     * Find records within a date range.
     * @param {string} column - The date column to query.
     * @param {string} startDate - The start date (inclusive).
     * @param {string} endDate - The end date (inclusive).
     * @returns {QueryBuilder} - The QueryBuilder instance for chaining.
     */
    findByDateRange(column, startDate, endDate) {
      return this.whereBetween(column, [startDate, endDate]);
    },

    /**
     * Find records within a certain distance from a geographic point.
     * @param {string} latColumn - The latitude column.
     * @param {string} lngColumn - The longitude column.
     * @param {number} lat - The target latitude.
     * @param {number} lng - The target longitude.
     * @param {number} distance - The maximum distance (in kilometers).
     * @returns {QueryBuilder} - The QueryBuilder instance for chaining.
     */
    findByDistance(latColumn, lngColumn, lat, lng, distance) {
      const dbType = this.getDatabaseType();
      if (dbType === "postgresql") {
        return this.whereRaw(
          `earth_distance(ll_to_earth(${latColumn}, ${lngColumn}), ll_to_earth(?, ?)) <= ?`,
          [lat, lng, distance * 1000]
        );
      } else if (dbType === "mysql") {
        return this.whereRaw(
          `ST_Distance_Sphere(point(${lngColumn}, ${latColumn}), point(?, ?)) <= ?`,
          [lng, lat, distance * 1000]
        );
      }
      throw new Error(
        "Geographic queries are not supported for this database type."
      );
    },
  });
};
