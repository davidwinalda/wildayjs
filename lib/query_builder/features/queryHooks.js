const { QueryBuilder: ObjectionBuilder } = require("objection");
const ConnectionManager = require("../../database/connectionManager");

module.exports = (QueryBuilder) => {
  console.log("queryHooks", QueryBuilder);
  // Get Objection's QueryBuilder prototype directly
  const prototype = ObjectionBuilder.prototype;

  if (QueryBuilder.prototype.__queryHooksExtended) return;
  QueryBuilder.prototype.__queryHooksExtended = true;

  // Helper method to get the current database type
  QueryBuilder.prototype.getDatabaseType = function () {
    return ConnectionManager.getCurrentDatabaseType();
  };

  /**
   * Add a before hook to execute custom logic before the query is executed.
   * @param {function} callback - The callback to execute before the query.
   * @returns {QueryBuilder}
   * @throws {Error} If the callback is not a function.
   */
  QueryBuilder.prototype.before = function (callback) {
    if (typeof callback !== "function") {
      throw new Error("The before hook callback must be a function");
    }
    console.log("before", callback);
    this._beforeHooks = this._beforeHooks || []; // Initialize before hooks array
    this._beforeHooks.push(callback); // Add the callback to the before hooks
    return this;
  };

  /**
   * Add an after hook to execute custom logic after the query is executed.
   * @param {function} callback - The callback to execute after the query.
   * @returns {QueryBuilder}
   * @throws {Error} If the callback is not a function.
   */
  QueryBuilder.prototype.after = function (callback) {
    if (typeof callback !== "function") {
      throw new Error("The after hook callback must be a function");
    }
    console.log("after", callback);
    this._afterHooks = this._afterHooks || []; // Initialize after hooks array
    this._afterHooks.push(callback); // Add the callback to the after hooks
    return this;
  };

  /**
   * Execute the query with before and after hooks.
   * @returns {Promise}
   * @throws {Error} If an error occurs during query execution or hook execution.
   */
  QueryBuilder.prototype.executeWithHooks = function () {
    console.log("executeWithHooks");
    return Promise.resolve()
      .then(() => {
        // Execute before hooks
        if (this._beforeHooks) {
          console.log("Executing before hooks"); // Debug log
          return Promise.all(this._beforeHooks.map((hook) => hook(this)));
        }
      })
      .then(async () => {
        // Execute the query and await the result
        console.log("Executing query..."); // Debug log
        const result = await this.execute();
        console.log("Query execution result:", result); // Debug log
        return result;
      })
      .then((result) => {
        // Execute after hooks
        if (this._afterHooks) {
          console.log("Executing after hooks"); // Debug log
          return Promise.all(this._afterHooks.map((hook) => hook(result))).then(
            () => result // Return the result after executing the hooks
          );
        }
        return result; // Ensure the result is returned
      })
      .catch((error) => {
        console.error("Error executing query with hooks:", error); // Error log
        throw error; // Re-throw the error to propagate it
      });
  };
};
