const { QueryBuilder: ObjectionBuilder } = require("objection");
const ConnectionManager = require("../../database/connectionManager");

module.exports = (QueryBuilder) => {
  console.log("queryMetrics", QueryBuilder);
  // Get Objection's QueryBuilder prototype directly
  const prototype = ObjectionBuilder.prototype;

  if (QueryBuilder.prototype.__queryMetricsExtended) return;
  QueryBuilder.prototype.__queryMetricsExtended = true;

  // Helper method to get the current database type
  QueryBuilder.prototype.getDatabaseType = function () {
    return ConnectionManager.getCurrentDatabaseType();
  };

  /**
   * Start tracking query performance metrics.
   * @returns {QueryBuilder}
   */
  QueryBuilder.prototype.startMetrics = function () {
    this._metrics = {
      startTime: process.hrtime(), // High-resolution time for accurate measurement
      queryCount: 0,
      totalDuration: 0, // Total duration in milliseconds
      queries: [],
      customMetrics: {}, // Custom metrics storage
    };
    return this;
  };

  /**
   * Reset the metrics without stopping the tracking.
   * @returns {QueryBuilder}
   */
  QueryBuilder.prototype.resetMetrics = function () {
    if (!this._metrics) {
      throw new Error(
        "Metrics tracking has not been started. Call startMetrics() first."
      );
    }

    this._metrics = {
      startTime: process.hrtime(),
      queryCount: 0,
      totalDuration: 0,
      queries: [],
      customMetrics: {},
    };
    return this;
  };

  /**
   * Get the current metrics without stopping the tracking.
   * @returns {object} - The current metrics.
   */
  QueryBuilder.prototype.getCurrentMetrics = function () {
    if (!this._metrics) {
      throw new Error(
        "Metrics tracking has not been started. Call startMetrics() first."
      );
    }

    const [seconds, nanoseconds] = process.hrtime(this._metrics.startTime);
    const currentDuration = seconds * 1000 + nanoseconds / 1e6;

    return {
      queryCount: this._metrics.queryCount,
      totalDuration: currentDuration,
      queries: [...this._metrics.queries],
      customMetrics: { ...this._metrics.customMetrics },
    };
  };

  /**
   * Add tags to the current query.
   * @param {string[]} tags - Array of tags.
   * @returns {QueryBuilder}
   */
  QueryBuilder.prototype.tagQuery = function (tags) {
    if (!this._metrics) {
      throw new Error(
        "Metrics tracking has not been started. Call startMetrics() first."
      );
    }

    this._metrics.currentTags = tags;
    return this;
  };

  /**
   * Set a duration threshold for query execution.
   * @param {number} threshold - The threshold in milliseconds.
   * @returns {QueryBuilder}
   */
  QueryBuilder.prototype.setThreshold = function (threshold) {
    if (!this._metrics) {
      throw new Error(
        "Metrics tracking has not been started. Call startMetrics() first."
      );
    }

    this._metrics.threshold = threshold;
    return this;
  };

  /**
   * Add custom metrics to the current query.
   * @param {string} key - The key for the custom metric.
   * @param {any} value - The value of the custom metric.
   * @returns {QueryBuilder}
   */
  QueryBuilder.prototype.addCustomMetric = function (key, value) {
    if (!this._metrics) {
      throw new Error(
        "Metrics tracking has not been started. Call startMetrics() first."
      );
    }

    if (!this._metrics.customMetrics) {
      this._metrics.customMetrics = {};
    }

    this._metrics.customMetrics[key] = value;
    return this;
  };

  /**
   * Stop tracking query performance metrics and return the collected data.
   * @returns {object} - The collected metrics.
   */
  QueryBuilder.prototype.stopMetrics = function () {
    if (!this._metrics) {
      throw new Error(
        "Metrics tracking has not been started. Call startMetrics() first."
      );
    }

    const [seconds, nanoseconds] = process.hrtime(this._metrics.startTime);
    this._metrics.totalDuration = seconds * 1000 + nanoseconds / 1e6; // Convert to milliseconds

    const metrics = { ...this._metrics };
    delete this._metrics; // Clean up
    return metrics;
  };

  /**
   * Export metrics in a structured format.
   * @returns {object} - The exported metrics.
   */
  QueryBuilder.prototype.exportMetrics = function () {
    if (!this._metrics) {
      throw new Error(
        "Metrics tracking has not been started. Call startMetrics() first."
      );
    }

    const [seconds, nanoseconds] = process.hrtime(this._metrics.startTime);
    const totalDuration = seconds * 1000 + nanoseconds / 1e6;

    return {
      queryCount: this._metrics.queryCount,
      totalDuration: totalDuration,
      queries: this._metrics.queries.map((query) => ({
        query: query.query,
        duration: query.duration,
        tags: query.tags || [],
      })),
      customMetrics: this._metrics.customMetrics || {},
    };
  };

  /**
   * Log query performance metrics.
   * @returns {QueryBuilder}
   */
  QueryBuilder.prototype.logMetrics = function () {
    if (!this._metrics) {
      throw new Error(
        "Metrics tracking has not been started. Call startMetrics() first."
      );
    }

    const metrics = this.stopMetrics();
    console.log("Query Performance Metrics:", {
      queryCount: metrics.queryCount,
      totalDuration: `${metrics.totalDuration.toFixed(3)} ms`,
      queries: metrics.queries.map((query) => ({
        query: query.query,
        duration: `${query.duration.toFixed(3)} ms`,
        tags: query.tags || [],
      })),
      customMetrics: metrics.customMetrics || {},
    });
    return this;
  };

  /**
   * Execute the query and track performance metrics.
   * @returns {Promise}
   * @throws {Error} If an error occurs during query execution.
   */
  QueryBuilder.prototype.executeWithMetrics = function () {
    if (!this._metrics) {
      throw new Error(
        "Metrics tracking has not been started. Call startMetrics() first."
      );
    }

    const startTime = process.hrtime();

    return Promise.resolve()
      .then(async () => {
        // Execute the query and await the result
        console.log("Executing query with metrics..."); // Debug log
        const result = await this.execute();
        console.log("Query execution result:", result); // Debug log

        // Calculate query duration
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const duration = seconds * 1000 + nanoseconds / 1e6; // Convert to milliseconds

        // Update metrics
        this._metrics.queryCount += 1;
        this._metrics.totalDuration += duration;
        this._metrics.queries.push({
          query: this.toKnexQuery().toSQL().sql,
          duration: duration,
          tags: this._metrics.currentTags || [],
        });

        // Check threshold
        if (this._metrics.threshold && duration > this._metrics.threshold) {
          console.warn(
            `Query exceeded threshold: ${duration.toFixed(3)} ms > ${
              this._metrics.threshold
            } ms`
          );
        }

        delete this._metrics.currentTags; // Clean up tags
        return result;
      })
      .catch((error) => {
        console.error("Error executing query with metrics:", error); // Error log
        throw error; // Re-throw the error to propagate it
      });
  };

  /**
   * Start tracking metrics for a batch of queries.
   * @returns {QueryBuilder}
   */
  QueryBuilder.prototype.startBatchMetrics = function () {
    this._batchMetrics = {
      startTime: process.hrtime(),
      queryCount: 0,
      totalDuration: 0,
      queries: [],
      customMetrics: {},
    };
    return this;
  };

  /**
   * Stop tracking metrics for a batch of queries and return the collected data.
   * @returns {object} - The collected batch metrics.
   */
  QueryBuilder.prototype.stopBatchMetrics = function () {
    if (!this._batchMetrics) {
      throw new Error(
        "Batch metrics tracking has not been started. Call startBatchMetrics() first."
      );
    }

    const [seconds, nanoseconds] = process.hrtime(this._batchMetrics.startTime);
    this._batchMetrics.totalDuration = seconds * 1000 + nanoseconds / 1e6;

    const batchMetrics = { ...this._batchMetrics };
    delete this._batchMetrics; // Clean up
    return batchMetrics;
  };
};
