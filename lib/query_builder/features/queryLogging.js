module.exports = (QueryBuilder) => {
  /**
   * Log the query and its results in a readable format.
   * @returns {QueryBuilder}
   */
  QueryBuilder.prototype.log = function () {
    // Capture the SQL query and bindings before execution
    const sql = this.toKnexQuery().toSQL();
    console.log("Query:", sql.sql);
    console.log("Bindings:", sql.bindings);

    return this.then((result) => {
      // Log the result in a readable format
      if (Array.isArray(result)) {
        console.log(
          "Result:",
          result.map((item) => (item.toJSON ? item.toJSON() : item))
        );
      } else if (result && typeof result === "object") {
        console.log("Result:", result.toJSON ? result.toJSON() : result);
      } else {
        console.log("Result:", result);
      }

      return result;
    });
  };

  /**
   * Log only the query and bindings (without the result).
   * @returns {QueryBuilder}
   */
  QueryBuilder.prototype.logQueryOnly = function () {
    const sql = this.toKnexQuery().toSQL();
    console.log("Query:", sql.sql);
    console.log("Bindings:", sql.bindings);
    return this;
  };
};
