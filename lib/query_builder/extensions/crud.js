const { QueryBuilder: ObjectionBuilder } = require("objection");
const ConnectionManager = require("../../database/connectionManager");

module.exports = (QueryBuilder) => {
  const prototype = ObjectionBuilder.prototype;

  if (QueryBuilder.prototype.__crudMethodsExtended) return;
  QueryBuilder.prototype.__crudMethodsExtended = true;

  // Helper method to get the current database type
  QueryBuilder.prototype.getDatabaseType = function () {
    return ConnectionManager.getCurrentDatabaseType();
  };

  Object.assign(QueryBuilder.prototype, {
    // ========================
    // Basic CRUD Methods
    // ========================

    /**
     * Create a new record.
     * @param {object} data - The data to insert.
     * @returns {Promise<Model>} - The created model instance.
     */
    async create(data) {
      try {
        const ModelClass = this.modelClass();

        // Create a clean instance of the model with the provided data
        const instance = new ModelClass();
        Object.assign(instance, data);

        // Run class-level callbacks with the instance as the context
        for (const callback of ModelClass._callbacks.beforeCreate || []) {
          await callback.call(instance);
        }
        for (const callback of ModelClass._callbacks.beforeSave || []) {
          await callback.call(instance);
        }

        // Add timestamps
        const now = new Date().toISOString();
        if (!instance.created_at) instance.created_at = now;
        if (!instance.updated_at) instance.updated_at = now;

        // Perform the insert operation
        const result = await this.insert(instance).returning("*").first();

        if (!result) {
          throw new Error("Failed to create record");
        }

        // Create a fresh instance with the result data
        const createdInstance = new ModelClass();
        const resultData = result[0] || result;
        Object.assign(createdInstance, resultData);

        // Run after callbacks with the instance as the context
        for (const callback of ModelClass._callbacks.afterCreate || []) {
          await callback.call(createdInstance);
        }
        for (const callback of ModelClass._callbacks.afterSave || []) {
          await callback.call(createdInstance);
        }

        return createdInstance;
      } catch (error) {
        if (error.code === "23505") {
          const field = error.constraint
            .replace(`${this.modelClass().tableName}_`, "")
            .replace("_key", "");
          throw new Error(`${field} already exists`);
        }
        throw error;
      }
    },

    /**
     * Create multiple records.
     * @param {array} data - An array of data objects to insert.
     * @returns {Promise<Model[]>} - An array of created model instances.
     */
    async createMany(data) {
      try {
        const ModelClass = this.modelClass();

        // Create clean instances of the model with the provided data
        const instances = data.map((item) => {
          const instance = new ModelClass();
          Object.assign(instance, item);
          return instance;
        });

        // Run class-level callbacks for each instance
        for (const instance of instances) {
          for (const callback of ModelClass._callbacks.beforeCreate || []) {
            await callback.call(instance);
          }
          for (const callback of ModelClass._callbacks.beforeSave || []) {
            await callback.call(instance);
          }
        }

        // Add timestamps
        const now = new Date().toISOString();
        instances.forEach((instance) => {
          if (!instance.created_at) instance.created_at = now;
          if (!instance.updated_at) instance.updated_at = now;
        });

        // Perform the insert operation
        const results = await this.insert(instances).returning("*");

        if (!results || results.length === 0) {
          throw new Error("Failed to create records");
        }

        // Create fresh instances with the results
        const createdInstances = results.map((result) => {
          const instance = new ModelClass();
          const resultData = result[0] || result;
          Object.assign(instance, resultData);
          return instance;
        });

        // Run after callbacks for each instance
        for (const instance of createdInstances) {
          for (const callback of ModelClass._callbacks.afterCreate || []) {
            await callback.call(instance);
          }
          for (const callback of ModelClass._callbacks.afterSave || []) {
            await callback.call(instance);
          }
        }

        return createdInstances;
      } catch (error) {
        if (error.code === "23505") {
          const field = error.constraint
            .replace(`${this.modelClass().tableName}_`, "")
            .replace("_key", "");
          throw new Error(`${field} already exists`);
        }
        throw error;
      }
    },

    /**
     * Update a record by its primary key or update the current instance.
     * @param {string|number|object} id - The primary key value or the data to update.
     * @param {object} [data] - The data to update (if `id` is a primary key).
     * @param {string} [column] - The primary key column (default: "id").
     * @returns {Promise<Model>} - The updated model instance.
     */
    /**
     * Update a record by its primary key or update the current instance.
     * @param {string|number|object} id - The primary key value or the data to update.
     * @param {object} [data] - The data to update (if `id` is a primary key).
     * @param {string} [column] - The primary key column (default: "id").
     * @returns {Promise<Model>} - The updated model instance.
     */
    async update(id, data, column = "id") {
      const ModelClass = this.modelClass();

      try {
        // If we're updating through a query builder (e.g., after find())
        if (typeof id === "object" && !data) {
          data = id;

          // First, fetch the actual model instance
          const modelInstance = await this.first();
          if (!modelInstance) {
            throw new Error("Record not found");
          }

          // Extract data from nested structure if necessary
          const modelData = modelInstance[0] || modelInstance;

          // Create a clean model instance
          const instance = new ModelClass();
          Object.assign(instance, modelData);

          // Run callbacks on the model instance
          for (const callback of ModelClass._callbacks.beforeUpdate || []) {
            await callback.call(instance);
          }
          for (const callback of ModelClass._callbacks.beforeSave || []) {
            await callback.call(instance);
          }

          // Update the instance with new data
          Object.assign(instance, data);

          // Add timestamps
          if (!data.updated_at) {
            instance.updated_at = new Date().toISOString();
          }

          // Perform the update operation
          const result = await ModelClass.query()
            .findById(instance.id)
            .patch(data)
            .returning("*")
            .first();

          if (!result) {
            throw new Error("Failed to update record");
          }

          // Create a fresh instance with the updated data
          const updatedInstance = new ModelClass();
          // Extract nested data if necessary
          const resultData = result[0] || result;
          Object.assign(updatedInstance, resultData);

          // Run after callbacks
          for (const callback of ModelClass._callbacks.afterUpdate || []) {
            await callback.call(updatedInstance);
          }
          for (const callback of ModelClass._callbacks.afterSave || []) {
            await callback.call(updatedInstance);
          }

          return updatedInstance;
        } else {
          // If we're updating by ID
          const existingInstance = await ModelClass.query().findById(id);
          if (!existingInstance) {
            throw new Error("Record not found");
          }

          // Create a clean instance
          const instance = new ModelClass();
          // Extract nested data if necessary
          const existingData = existingInstance[0] || existingInstance;
          Object.assign(instance, existingData);

          // Run callbacks
          for (const callback of ModelClass._callbacks.beforeUpdate || []) {
            await callback.call(instance);
          }
          for (const callback of ModelClass._callbacks.beforeSave || []) {
            await callback.call(instance);
          }

          // Update the instance with new data
          Object.assign(instance, data);

          // Add timestamps
          if (!data.updated_at) {
            instance.updated_at = new Date().toISOString();
          }

          // Perform the update operation
          const result = await ModelClass.query()
            .findById(id)
            .patch(data)
            .returning("*")
            .first();

          if (!result) {
            throw new Error("Failed to update record");
          }

          // Create a fresh instance with the updated data
          const updatedInstance = new ModelClass();
          // Extract nested data if necessary
          const resultData = result[0] || result;
          Object.assign(updatedInstance, resultData);

          // Run after callbacks
          for (const callback of ModelClass._callbacks.afterUpdate || []) {
            await callback.call(updatedInstance);
          }
          for (const callback of ModelClass._callbacks.afterSave || []) {
            await callback.call(updatedInstance);
          }

          return updatedInstance;
        }
      } catch (error) {
        if (error.code === "23505") {
          const field = error.constraint
            .replace(`${ModelClass.tableName}_`, "")
            .replace("_key", "");
          throw new Error(`${field} already exists`);
        }
        throw error;
      }
    },

    /**
     * Update records matching the given criteria.
     * @param {object} criteria - The criteria to match.
     * @param {object} data - The data to update.
     * @returns {Promise<Model>} - The updated model instance.
     */
    async updateBy(criteria, data) {
      const ModelClass = this.modelClass();

      try {
        // First, fetch the matching records
        const existingRecords = await this.where(criteria).first();
        if (!existingRecords) {
          throw new Error("No records found matching the criteria");
        }

        // Create a clean instance
        const instance = new ModelClass();
        const existingData = existingRecords[0] || existingRecords;
        Object.assign(instance, existingData);

        // Run callbacks
        for (const callback of ModelClass._callbacks.beforeUpdate || []) {
          await callback.call(instance);
        }
        for (const callback of ModelClass._callbacks.beforeSave || []) {
          await callback.call(instance);
        }

        // Update the instance with new data
        Object.assign(instance, data);

        // Add timestamps
        if (!data.updated_at) {
          instance.updated_at = new Date().toISOString();
        }

        // Perform the update operation
        const result = await this.where(criteria)
          .patch(data)
          .returning("*")
          .first();

        if (!result) {
          throw new Error("Failed to update records");
        }

        // Create a fresh instance with the updated data
        const updatedInstance = new ModelClass();
        const resultData = result[0] || result;
        Object.assign(updatedInstance, resultData);

        // Run after callbacks
        for (const callback of ModelClass._callbacks.afterUpdate || []) {
          await callback.call(updatedInstance);
        }
        for (const callback of ModelClass._callbacks.afterSave || []) {
          await callback.call(updatedInstance);
        }

        return updatedInstance;
      } catch (error) {
        if (error.code === "23505") {
          const field = error.constraint
            .replace(`${ModelClass.tableName}_`, "")
            .replace("_key", "");
          throw new Error(`${field} already exists`);
        }
        throw error;
      }
    },

    /**
     * Update all records in the table.
     * @param {object} data - The data to update.
     * @returns {Promise<Model>} - The updated model instance.
     */
    async updateAll(data) {
      const ModelClass = this.modelClass();

      try {
        // Create a clean instance
        const instance = new ModelClass();
        Object.assign(instance, data);

        // Run callbacks
        for (const callback of ModelClass._callbacks.beforeUpdate || []) {
          await callback.call(instance);
        }
        for (const callback of ModelClass._callbacks.beforeSave || []) {
          await callback.call(instance);
        }

        // Add timestamps
        if (!data.updated_at) {
          instance.updated_at = new Date().toISOString();
        }

        // Perform the update operation
        const result = await this.patch(data).returning("*").first();

        if (!result) {
          throw new Error("Failed to update records");
        }

        // Create a fresh instance with the updated data
        const updatedInstance = new ModelClass();
        const resultData = result[0] || result;
        Object.assign(updatedInstance, resultData);

        // Run after callbacks
        for (const callback of ModelClass._callbacks.afterUpdate || []) {
          await callback.call(updatedInstance);
        }
        for (const callback of ModelClass._callbacks.afterSave || []) {
          await callback.call(updatedInstance);
        }

        return updatedInstance;
      } catch (error) {
        if (error.code === "23505") {
          const field = error.constraint
            .replace(`${ModelClass.tableName}_`, "")
            .replace("_key", "");
          throw new Error(`${field} already exists`);
        }
        throw error;
      }
    },

    /**
     * Delete a record by its primary key or using existing query conditions.
     * @param {string|number} [id] - The primary key value (optional).
     * @param {string} [column] - The primary key column (default: "id").
     * @returns {QueryBuilder} - The query builder for chaining.
     */
    async destroy(id, column = "id") {
      const ModelClass = this.modelClass();

      try {
        // If an ID is provided, fetch the record first
        if (id !== undefined) {
          const existingRecord = await ModelClass.query().findById(id);
          if (!existingRecord) {
            throw new Error("Record not found");
          }

          // Create a clean instance for callbacks
          const instance = new ModelClass();
          const recordData = existingRecord[0] || existingRecord;
          Object.assign(instance, recordData);

          // Run beforeDestroy callbacks
          for (const callback of ModelClass._callbacks.beforeDestroy || []) {
            await callback.call(instance);
          }

          // Perform the delete operation
          const deleted = await ModelClass.query().deleteById(id);

          // Run afterDestroy callbacks
          for (const callback of ModelClass._callbacks.afterDestroy || []) {
            await callback.call(instance);
          }

          return deleted > 0;
        } else {
          // If no ID provided, use the current query conditions
          const records = await this.select("*");
          if (!records || records.length === 0) {
            throw new Error("No records found matching the criteria");
          }

          // Create instances for callbacks
          const instances = records.map((record) => {
            const instance = new ModelClass();
            const recordData = record[0] || record;
            Object.assign(instance, recordData);
            return instance;
          });

          // Run beforeDestroy callbacks for each instance
          for (const instance of instances) {
            for (const callback of ModelClass._callbacks.beforeDestroy || []) {
              await callback.call(instance);
            }
          }

          // Perform the delete operation
          const deleted = await this.delete();

          // Run afterDestroy callbacks for each instance
          for (const instance of instances) {
            for (const callback of ModelClass._callbacks.afterDestroy || []) {
              await callback.call(instance);
            }
          }

          return deleted > 0;
        }
      } catch (error) {
        throw error;
      }
    },

    /**
     * Delete records matching the given criteria.
     * @param {object} criteria - The criteria to match.
     * @returns {QueryBuilder} - The query builder for chaining.
     */
    async destroyBy(criteria) {
      const ModelClass = this.modelClass();

      try {
        // First, fetch the matching records
        const records = await this.where(criteria).select("*");
        if (!records || records.length === 0) {
          throw new Error("No records found matching the criteria");
        }

        // Create instances for callbacks
        const instances = records.map((record) => {
          const instance = new ModelClass();
          const recordData = record[0] || record;
          Object.assign(instance, recordData);
          return instance;
        });

        // Run beforeDestroy callbacks for each instance
        for (const instance of instances) {
          for (const callback of ModelClass._callbacks.beforeDestroy || []) {
            await callback.call(instance);
          }
        }

        // Perform the delete operation
        const deleted = await this.where(criteria).delete();

        // Run afterDestroy callbacks for each instance
        for (const instance of instances) {
          for (const callback of ModelClass._callbacks.afterDestroy || []) {
            await callback.call(instance);
          }
        }

        return deleted > 0;
      } catch (error) {
        throw error;
      }
    },

    /**
     * Delete all records in the table.
     * @returns {QueryBuilder} - The query builder for chaining.
     */
    async destroyAll() {
      return this.destroyBy({});
    },

    // ========================
    // Advanced CRUD Methods
    // ========================

    /**
     * Insert or update a record (upsert).
     * @param {object} data - The data to insert or update.
     * @param {array} conflictColumns - The columns to check for conflicts (default: ["id"]).
     * @returns {Promise<Model>} - The upserted model instance.
     */
    async upsert(data, conflictColumns = ["id"]) {
      const dbType = this.getDatabaseType();
      const ModelClass = this.modelClass();

      try {
        // Create a clean instance
        const instance = new ModelClass();
        Object.assign(instance, data);

        // Run beforeSave callbacks
        for (const callback of ModelClass._callbacks.beforeSave || []) {
          await callback.call(instance);
        }

        // Add timestamps
        const now = new Date().toISOString();
        if (!instance.created_at) instance.created_at = now;
        if (!instance.updated_at) instance.updated_at = now;

        let result;

        if (dbType === "postgresql") {
          // Use ON CONFLICT for PostgreSQL
          const conflictClause = conflictColumns
            .map((col) => `${col}`)
            .join(", ");
          result = await this.insert(instance)
            .onConflict(conflictClause)
            .merge()
            .returning("*")
            .first();
        } else if (dbType === "mysql") {
          // Use ON DUPLICATE KEY UPDATE for MySQL
          result = await this.insert(instance)
            .onDuplicateUpdate()
            .returning("*")
            .first();
        } else {
          // SQLite does not support ON CONFLICT, so use a workaround
          const existingRecord = await this.clone()
            .where(
              conflictColumns.reduce((acc, col) => {
                acc[col] = data[col];
                return acc;
              }, {})
            )
            .first();

          if (existingRecord) {
            result = await this.where(
              conflictColumns.reduce((acc, col) => {
                acc[col] = data[col];
                return acc;
              }, {})
            )
              .patch(data)
              .returning("*")
              .first();
          } else {
            result = await this.insert(instance).returning("*").first();
          }
        }

        if (!result) {
          throw new Error("Failed to upsert record");
        }

        // Create a fresh instance with the result data
        const upsertedInstance = new ModelClass();
        const resultData = result[0] || result;
        Object.assign(upsertedInstance, resultData);

        // Run afterSave callbacks
        for (const callback of ModelClass._callbacks.afterSave || []) {
          await callback.call(upsertedInstance);
        }

        return upsertedInstance;
      } catch (error) {
        if (error.code === "23505") {
          const field = error.constraint
            .replace(`${ModelClass.tableName}_`, "")
            .replace("_key", "");
          throw new Error(`${field} already exists`);
        }
        throw error;
      }
    },

    // ========================
    // Save Method
    // ========================

    /**
     * Save a record (insert or update based on whether it has an ID).
     * @param {object} data - The data to save.
     * @returns {Promise<Model>} - The saved model instance.
     */
    async save(data) {
      if (data.id) {
        // If the record has an ID, update it
        return this.update(data.id, data);
      } else {
        // If the record does not have an ID, insert it
        return this.create(data);
      }
    },

    // ========================
    // Soft Delete
    // ========================

    /**
     * Soft delete a record by setting a `deleted_at` timestamp.
     * @param {string|number} id - The primary key value.
     * @param {string} column - The primary key column (default: "id").
     * @returns {Promise<Model>} - The updated model instance.
     */
    async softDelete(id, column = "id") {
      return this.update(id, { deleted_at: new Date().toISOString() }, column);
    },

    /**
     * Restore a soft-deleted record by clearing the `deleted_at` timestamp.
     * @param {string|number} id - The primary key value.
     * @param {string} column - The primary key column (default: "id").
     * @returns {Promise<Model>} - The updated model instance.
     */
    async restore(id, column = "id") {
      return this.update(id, { deleted_at: null }, column);
    },

    /**
     * Include soft-deleted records in the query.
     * @returns {QueryBuilder} - The query builder for chaining.
     */
    withTrashed() {
      return this;
    },

    /**
     * Exclude soft-deleted records from the query.
     * @returns {QueryBuilder} - The query builder for chaining.
     */
    withoutTrashed() {
      return this.whereNull("deleted_at");
    },

    // ========================
    // Scopes
    // ========================

    /**
     * Apply a scope to the query.
     * @param {string} scopeName - The name of the scope to apply.
     * @param {...any} args - Arguments to pass to the scope.
     * @returns {QueryBuilder} - The query builder for chaining.
     */
    scope(scopeName, ...args) {
      if (typeof this[scopeName] === "function") {
        return this[scopeName](...args);
      }
      throw new Error(`Scope "${scopeName}" does not exist.`);
    },

    // ========================
    // Transactions
    // ========================

    /**
     * Execute the query within a transaction.
     * @param {function} callback - The callback to execute within the transaction.
     * @returns {Promise<any>} - The result of the callback.
     */
    async transaction(callback) {
      const trx = await this.knex().transaction();
      try {
        const result = await callback(trx);
        await trx.commit();
        return result;
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    },
  });
};
