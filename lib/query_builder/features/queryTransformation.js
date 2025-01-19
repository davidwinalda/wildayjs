const { QueryBuilder: ObjectionBuilder } = require("objection");
const ConnectionManager = require("../../database/connectionManager");

module.exports = (QueryBuilder) => {
  console.log("queryTransformation", QueryBuilder);
  // Get Objection's QueryBuilder prototype directly
  const prototype = ObjectionBuilder.prototype;

  if (QueryBuilder.prototype.__queryTransformationExtended) return;
  QueryBuilder.prototype.__queryTransformationExtended = true;

  // Helper method to get the current database type
  QueryBuilder.prototype.getDatabaseType = function () {
    return ConnectionManager.getCurrentDatabaseType();
  };

  /**
   * Add a transformation function to modify the query results.
   * @param {function} transformer - A function that transforms the query results.
   * @returns {QueryBuilder}
   * @throws {Error} If the transformer is not a function.
   */
  QueryBuilder.prototype.transform = function (transformer) {
    if (typeof transformer !== "function") {
      throw new Error("The transformer must be a function");
    }
    console.log("transform", transformer);
    this._transformers = this._transformers || []; // Initialize transformers array
    this._transformers.push(transformer); // Add the transformer to the transformers array
    return this; // Ensure chainability
  };

  /**
   * Execute the query and apply transformations to the results.
   * @returns {Promise}
   * @throws {Error} If an error occurs during query execution or transformation.
   */
  QueryBuilder.prototype.executeWithTransformation = function () {
    console.log("executeWithTransformation");
    return Promise.resolve()
      .then(async () => {
        // Execute the query and await the result
        console.log("Executing query..."); // Debug log
        const result = await this.execute();
        console.log("Query execution result:", result); // Debug log
        return result;
      })
      .then((result) => {
        // Apply transformations to the result
        if (this._transformers) {
          console.log("Applying transformations"); // Debug log
          return this._transformers.reduce((acc, transformer) => {
            return transformer(acc);
          }, result);
        }
        return result; // Ensure the result is returned if no transformers are applied
      })
      .catch((error) => {
        console.error("Transformation Error:", error.message); // Only show the error message
        throw error; // Re-throw the error to propagate it
      });
  };
};
