const { QueryBuilder: ObjectionBuilder } = require("objection");
const { transaction } = require("objection");
const ConnectionManager = require("../../database/connectionManager");

module.exports = (QueryBuilder) => {
  console.log("queryBatches", QueryBuilder);
  // Get Objection's QueryBuilder prototype directly
  const prototype = ObjectionBuilder.prototype;

  if (QueryBuilder.prototype.__queryBatchesExtended) return;
  QueryBuilder.prototype.__queryBatchesExtended = true;

  // Helper method to get the current database type
  QueryBuilder.prototype.getDatabaseType = function () {
    return ConnectionManager.getCurrentDatabaseType();
  };

  /**
   * Add a query to the batch.
   * @param {function} queryFn - A function that returns a query builder instance.
   * @returns {QueryBuilder}
   * @throws {Error} If the queryFn is not a function.
   */
  QueryBuilder.prototype.addToBatch = function (queryFn) {
    if (typeof queryFn !== "function") {
      throw new Error("The queryFn must be a function");
    }
    console.log("addToBatch:", queryFn.toString()); // Enhanced log
    this._batchQueries = this._batchQueries || []; // Initialize batch queries array
    this._batchQueries.push(queryFn); // Add the query function to the batch
    return this; // Ensure chainability
  };

  /**
   * Add a dependent query to the batch.
   * @param {function} queryFn - A function that returns a query builder instance, using results from previous queries.
   * @returns {QueryBuilder}
   * @throws {Error} If the queryFn is not a function.
   */
  QueryBuilder.prototype.addDependentBatch = function (queryFn) {
    if (typeof queryFn !== "function") {
      throw new Error("The queryFn must be a function");
    }
    console.log("addDependentBatch:", queryFn.toString()); // Enhanced log
    this._dependentBatchQueries = this._dependentBatchQueries || []; // Initialize dependent batch queries array
    this._dependentBatchQueries.push(queryFn); // Add the dependent query function to the batch
    return this; // Ensure chainability
  };

  /**
   * Execute all queries in the batch.
   * @param {object} options - Options for batch execution.
   * @param {boolean} options.parallel - Whether to execute queries in parallel (default: false).
   * @param {number} options.timeout - Timeout for each query in milliseconds.
   * @param {boolean} options.partialResults - Whether to return partial results if a query fails (default: false).
   * @returns {Promise}
   * @throws {Error} If an error occurs during batch execution.
   */
  QueryBuilder.prototype.executeBatch = async function (options = {}) {
    const { parallel = false, timeout, partialResults = false } = options;

    console.log("executeBatch with options:", options);

    try {
      const results = [];

      // Execute batch queries
      if (parallel) {
        // Execute queries in parallel
        const queryPromises = this._batchQueries.map((queryFn) => {
          const query = queryFn();
          if (timeout) query.timeout(timeout);
          return query.execute();
        });
        const batchResults = await Promise.all(queryPromises);
        results.push(...batchResults);
      } else {
        // Execute queries sequentially
        for (let i = 0; i < this._batchQueries.length; i++) {
          const queryFn = this._batchQueries[i];
          console.log(`Executing query ${i + 1}:`, queryFn.toString()); // Log the query function
          try {
            const query = queryFn();
            if (timeout) query.timeout(timeout);
            const result = await query.execute();
            console.log(`Query ${i + 1} result:`, result); // Log the result of each query
            results.push(result);
          } catch (error) {
            if (partialResults) {
              console.error(`Query ${i + 1} failed:`, error.message);
              results.push({ error: error.message });
            } else {
              throw error;
            }
          }
        }
      }

      // Execute dependent batch queries
      if (this._dependentBatchQueries) {
        for (let i = 0; i < this._dependentBatchQueries.length; i++) {
          const queryFn = this._dependentBatchQueries[i];
          console.log(
            `Executing dependent query ${i + 1}:`,
            queryFn.toString()
          ); // Log the query function
          try {
            const query = queryFn(results);
            if (timeout) query.timeout(timeout);
            const result = await query.execute();
            console.log(`Dependent query ${i + 1} result:`, result); // Log the result of each query
            results.push(result);
          } catch (error) {
            if (partialResults) {
              console.error(`Dependent query ${i + 1} failed:`, error.message);
              results.push({ error: error.message });
            } else {
              throw error;
            }
          }
        }
      }

      console.log("Batch execution completed. Results:", results); // Enhanced log
      return results;
    } catch (error) {
      console.error("Batch Execution Error:", error.message); // Only show the error message
      throw error; // Re-throw the error to propagate it
    }
  };

  /**
   * Execute all queries in the batch within a transaction.
   * @param {object} options - Options for batch execution.
   * @param {boolean} options.parallel - Whether to execute queries in parallel (default: false).
   * @param {number} options.timeout - Timeout for each query in milliseconds.
   * @param {boolean} options.partialResults - Whether to return partial results if a query fails (default: false).
   * @returns {Promise}
   * @throws {Error} If an error occurs during batch execution.
   */
  QueryBuilder.prototype.executeBatchInTransaction = async function (
    options = {}
  ) {
    console.log("executeBatchInTransaction with options:", options);
    return transaction(this.modelClass().knex(), async (trx) => {
      const results = await this.clone().transacting(trx).executeBatch(options);
      return results;
    });
  };
};
