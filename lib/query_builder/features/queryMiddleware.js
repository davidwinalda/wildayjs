const { QueryBuilder: ObjectionBuilder } = require("objection");
const ConnectionManager = require("../../database/connectionManager");

module.exports = (QueryBuilder) => {
  console.log("queryMiddleware", QueryBuilder);
  // Get Objection's QueryBuilder prototype directly
  const prototype = ObjectionBuilder.prototype;

  if (QueryBuilder.prototype.__queryMiddlewareExtended) return;
  QueryBuilder.prototype.__queryMiddlewareExtended = true;

  // Helper method to get the current database type
  QueryBuilder.prototype.getDatabaseType = function () {
    return ConnectionManager.getCurrentDatabaseType();
  };

  /**
   * Add a middleware function to intercept and modify the query.
   * @param {function} middleware - A function that intercepts and modifies the query.
   * @returns {QueryBuilder}
   * @throws {Error} If the middleware is not a function.
   */
  QueryBuilder.prototype.use = function (middleware) {
    if (typeof middleware !== "function") {
      throw new Error("The middleware must be a function");
    }
    console.log("use", middleware);
    this._middlewares = this._middlewares || []; // Initialize middlewares array
    this._middlewares.push(middleware); // Add the middleware to the middlewares array
    return this; // Ensure chainability
  };

  /**
   * Execute the query with middleware applied.
   * @returns {Promise}
   * @throws {Error} If an error occurs during query execution or middleware execution.
   */
  QueryBuilder.prototype.executeWithMiddleware = function () {
    console.log("executeWithMiddleware");
    return Promise.resolve()
      .then(() => {
        // Apply middlewares to the query
        if (this._middlewares) {
          console.log("Applying middlewares"); // Debug log
          return this._middlewares.reduce((query, middleware) => {
            return middleware(query);
          }, this);
        }
        return this; // Ensure the query is returned if no middlewares are applied
      })
      .then(async () => {
        // Execute the query and await the result
        console.log("Executing query..."); // Debug log
        const result = await this.execute();
        console.log("Query execution result:", result); // Debug log
        return result;
      })
      .catch((error) => {
        console.error("Middleware Error:", error.message); // Only show the error message
        throw error; // Re-throw the error to propagate it
      });
  };
};
