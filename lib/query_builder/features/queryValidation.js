const { QueryBuilder: ObjectionBuilder } = require("objection");
const ConnectionManager = require("../../database/connectionManager");

module.exports = (QueryBuilder) => {
  console.log("queryValidation", QueryBuilder);
  // Get Objection's QueryBuilder prototype directly
  const prototype = ObjectionBuilder.prototype;

  if (QueryBuilder.prototype.__queryValidationExtended) return;
  QueryBuilder.prototype.__queryValidationExtended = true;

  // Helper method to get the current database type
  QueryBuilder.prototype.getDatabaseType = function () {
    return ConnectionManager.getCurrentDatabaseType();
  };

  /**
   * Add a validation rule to the query.
   * @param {function} validator - A function that validates the query. It should return a boolean or throw an error.
   * @returns {QueryBuilder}
   * @throws {Error} If the validator is not a function or if validation fails.
   */
  QueryBuilder.prototype.validate = function (validator) {
    if (typeof validator !== "function") {
      throw new Error("The validator must be a function");
    }
    console.log("validate", validator);
    this._validators = this._validators || []; // Initialize validators array
    this._validators.push(validator); // Add the validator to the validators array
    return this; // Ensure chainability
  };

  /**
   * Validate the query based on rules.
   * @param {object} rules - An object of column-validation rules.
   * @returns {QueryBuilder}
   * @throws {Error} If validation fails.
   */
  QueryBuilder.prototype.validateRules = function (rules) {
    const errors = [];

    // Helper function to check if a condition exists for a column
    const hasCondition = (column) => {
      const knexQuery = this.toKnexQuery(); // Convert the query to a Knex query
      const whereClauses = knexQuery._statements.filter(
        (stmt) => stmt.grouping === "where"
      );

      return whereClauses.some((clause) => {
        if (clause.column === column) return true;
        if (clause.type === "whereIn" && clause.column === column) return true;
        if (clause.type === "whereNull" && clause.column === column)
          return true;
        if (clause.type === "whereBetween" && clause.column === column)
          return true;
        return false;
      });
    };

    for (const [column, rule] of Object.entries(rules)) {
      // Check if the column is required
      if (rule.required && !hasCondition(column)) {
        errors.push(
          `Column "${column}" is required but not found in the query.`
        );
      }

      // Check if the column value matches a regex pattern
      if (rule.pattern) {
        const knexQuery = this.toKnexQuery();
        const whereClauses = knexQuery._statements.filter(
          (stmt) => stmt.grouping === "where"
        );
        const clause = whereClauses.find((clause) => clause.column === column);

        if (clause && !rule.pattern.test(clause.value)) {
          errors.push(
            `Column "${column}" must match the pattern: ${rule.pattern}.`
          );
        } else if (!clause) {
          errors.push(
            `Column "${column}" is required for pattern validation but not found in the query.`
          );
        }
      }

      // Check if the column value meets a minimum length
      if (rule.minLength) {
        const knexQuery = this.toKnexQuery();
        const whereClauses = knexQuery._statements.filter(
          (stmt) => stmt.grouping === "where"
        );
        const clause = whereClauses.find((clause) => clause.column === column);

        if (clause && clause.value.length < rule.minLength) {
          errors.push(
            `Column "${column}" must be at least ${rule.minLength} characters long.`
          );
        } else if (!clause) {
          errors.push(
            `Column "${column}" is required for length validation but not found in the query.`
          );
        }
      }

      // Check if the column value meets a maximum length
      if (rule.maxLength) {
        const knexQuery = this.toKnexQuery();
        const whereClauses = knexQuery._statements.filter(
          (stmt) => stmt.grouping === "where"
        );
        const clause = whereClauses.find((clause) => clause.column === column);

        if (clause && clause.value.length > rule.maxLength) {
          errors.push(
            `Column "${column}" must be at most ${rule.maxLength} characters long.`
          );
        } else if (!clause) {
          errors.push(
            `Column "${column}" is required for length validation but not found in the query.`
          );
        }
      }

      // Check if the column value is of a specific type
      if (rule.type) {
        const knexQuery = this.toKnexQuery();
        const whereClauses = knexQuery._statements.filter(
          (stmt) => stmt.grouping === "where"
        );
        const clause = whereClauses.find((clause) => clause.column === column);

        if (clause && typeof clause.value !== rule.type) {
          errors.push(
            `Column "${column}" must be of type "${
              rule.type
            }", but found "${typeof clause.value}".`
          );
        } else if (!clause) {
          errors.push(
            `Column "${column}" is required for type validation but not found in the query.`
          );
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Query validation failed: ${errors.join(" ")}`);
    }
    return this; // Ensure chainability
  };

  /**
   * Execute the query with validation.
   * @returns {Promise}
   * @throws {Error} If validation fails or an error occurs during query execution.
   */
  QueryBuilder.prototype.executeWithValidation = function () {
    console.log("executeWithValidation");
    return Promise.resolve()
      .then(() => {
        // Execute validators
        if (this._validators) {
          console.log("Executing validators"); // Debug log
          return Promise.all(
            this._validators.map((validator) => {
              const isValid = validator(this);
              if (isValid === false) {
                throw new Error(
                  "Query validation failed: Custom validator returned false."
                );
              }
              return isValid;
            })
          );
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
        // Execute after hooks (if any)
        if (this._afterHooks) {
          console.log("Executing after hooks"); // Debug log
          return Promise.all(this._afterHooks.map((hook) => hook(result))).then(
            () => result // Return the result after executing the hooks
          );
        }
        return result; // Ensure the result is returned
      })
      .catch((error) => {
        // Customize the error output
        console.error("Validation Error:", error.message); // Only show the error message
        throw error; // Re-throw the error to propagate it
      });
  };
};
