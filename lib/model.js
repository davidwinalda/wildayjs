const path = require("path");
const Database = require("better-sqlite3");
const ModelLoader = require("./modelLoader");
const Validatable = require("./validatable");

class Model {
  static dbPath = path.join(process.cwd(), "db", "development.sqlite3");

  static db() {
    if (!this._db) {
      this._db = new Database(this.dbPath, { verbose: console.log });
    }
    return this._db;
  }

  static tableName() {
    if (!this.name) {
      throw new Error(
        "Model must have a class name to determine the table name. Ensure the model is defined correctly and extends the Model class."
      );
    }
    return this.name.toLowerCase() + "s"; // Default table name is pluralized class name
  }

  // Constructor for model instances
  constructor(attributes = {}) {
    Object.assign(this, attributes);
  }

  static include(module) {
    // Copy static properties and methods
    Object.getOwnPropertyNames(module).forEach((prop) => {
      if (prop !== "prototype" && prop !== "name" && prop !== "length") {
        Object.defineProperty(this, prop, {
          value: module[prop],
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
    });

    // Copy prototype methods
    Object.getOwnPropertyNames(module.prototype).forEach((prop) => {
      if (prop !== "constructor") {
        Object.defineProperty(this.prototype, prop, {
          value: module.prototype[prop],
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
    });

    // Ensure validates method is properly bound
    if (module.validates) {
      this.validates = function (...args) {
        return module.validates.apply(this, args);
      };
    }
  }

  static getModel(modelName) {
    return ModelLoader.getModel(modelName);
  }

  // Fetch all records from the table and return model instances
  static all() {
    const stmt = this.db().prepare(`SELECT * FROM ${this.tableName()}`);
    const records = stmt.all();
    return records.map((record) => new this(record));
  }

  // Find a record by its ID and return a model instance
  static find(id) {
    const stmt = this.db().prepare(
      `SELECT * FROM ${this.tableName()} WHERE id = ?`
    );
    const record = stmt.get(id);
    return record ? new this(record) : null;
  }

  // Create a new record and return a model instance
  static create(attributes) {
    // Create a new instance
    const instance = new this(attributes);

    // Run validations before saving
    const errors = instance.validate();
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(", ")}`);
    }

    // If validations pass, save to database
    const columns = Object.keys(attributes).join(", ");
    const placeholders = Object.keys(attributes)
      .map(() => "?")
      .join(", ");
    const values = Object.values(attributes);

    const stmt = this.db().prepare(
      `INSERT INTO ${this.tableName()} (${columns}) VALUES (${placeholders})`
    );
    const info = stmt.run(...values);
    return this.find(info.lastInsertRowid);
  }

  // Delete a record by its ID
  static delete(id) {
    const stmt = this.db().prepare(
      `DELETE FROM ${this.tableName()} WHERE id = ?`
    );
    return stmt.run(id);
  }

  // Define a `has_many` relationship
  static hasMany(modelName, foreignKey, options = {}) {
    // Ensure consistent casing
    const modelNameLower = modelName.toLowerCase();
    const relatedKey = modelNameLower + "s";

    // If foreignKey not provided, generate it
    if (!foreignKey) {
      foreignKey = `${this.name.toLowerCase()}_id`;
    }

    // Store dependent option
    if (options.dependent) {
      if (!this._dependentAssociations) {
        this._dependentAssociations = new Map();
      }
      this._dependentAssociations.set(modelNameLower, {
        type: "hasMany",
        dependent: options.dependent,
        foreignKey,
      });
    }

    this.prototype[relatedKey] = function () {
      try {
        // Get the related model
        const relatedModel = ModelLoader.getModel(modelNameLower);

        if (!relatedModel) {
          throw new Error(
            `Related model "${modelName}" not found. ` +
              `Make sure app/models/${modelNameLower}.js exists`
          );
        }

        // Build and execute query
        const query = `SELECT * FROM ${relatedModel.tableName()} WHERE ${foreignKey} = ?`;

        // Debug info (optional)
        if (process.env.DEBUG) {
          console.log("Query:", query);
          console.log("ID:", this.id);
        }

        // Execute query and return results
        const stmt = this.constructor.db().prepare(query);
        const records = stmt.all(this.id);

        // Return array of model instances
        return records.map((record) => new relatedModel(record));
      } catch (error) {
        console.error(
          `Error in ${this.constructor.name}#${relatedKey}():`,
          error.message
        );
        return []; // Return empty array on error
      }
    };

    // Add convenience methods
    this.prototype[`add${modelName}`] = function (attributes = {}) {
      const relatedModel = ModelLoader.getModel(modelNameLower);
      attributes[foreignKey] = this.id;
      return relatedModel.create(attributes);
    };

    this.prototype[`remove${modelName}`] = function (id) {
      const relatedModel = ModelLoader.getModel(modelNameLower);
      return relatedModel.delete(id);
    };
  }

  // Define a `belongs_to` relationship
  static belongsTo(modelName, foreignKey) {
    const methodName = modelName.toLowerCase();

    this.prototype[methodName] = function () {
      const relatedModel = ModelLoader.getModel(modelName);
      const stmt = this.constructor
        .db()
        .prepare(`SELECT * FROM ${relatedModel.tableName()} WHERE id = ?`);
      const record = stmt.get(this[foreignKey]);
      return record ? new relatedModel(record) : null;
    };
  }

  // Find records by conditions
  static where(conditions) {
    const columns = Object.keys(conditions);
    const values = Object.values(conditions);

    const whereClause = columns.map((column) => `${column} = ?`).join(" AND ");

    const stmt = this.db().prepare(
      `SELECT * FROM ${this.tableName()} WHERE ${whereClause}`
    );
    const records = stmt.all(...values);
    return records.map((record) => new this(record));
  }

  // Find first record by conditions
  static findBy(conditions) {
    const columns = Object.keys(conditions);
    const values = Object.values(conditions);

    const whereClause = columns.map((column) => `${column} = ?`).join(" AND ");

    const stmt = this.db().prepare(
      `SELECT * FROM ${this.tableName()} WHERE ${whereClause} LIMIT 1`
    );
    const record = stmt.get(...values);
    return record ? new this(record) : null;
  }

  static hasOne(relatedModel, foreignKey, options = {}) {
    const methodName = relatedModel.toLowerCase();

    // Store dependent option
    if (options.dependent) {
      if (!this._dependentAssociations) {
        this._dependentAssociations = new Map();
      }
      this._dependentAssociations.set(methodName, {
        type: "hasOne",
        dependent: options.dependent,
        foreignKey,
      });
    }

    this.prototype[methodName] = function () {
      const RelatedModel = ModelLoader.getModel(relatedModel);
      const query = `SELECT * FROM ${RelatedModel.tableName()} WHERE ${foreignKey} = ? LIMIT 1`;
      const stmt = this.constructor.db().prepare(query);
      const record = stmt.get(this.id);
      return record ? new RelatedModel(record) : null;
    };
  }

  // Many-to-Many
  static hasAndBelongsToMany(relatedModel, options = {}) {
    // Convert to proper case for model loading (e.g., 'role' -> 'Role')
    const ModelName =
      relatedModel.charAt(0).toUpperCase() + relatedModel.slice(1);
    const methodName = relatedModel.toLowerCase() + "s";
    const throughTable =
      options.through || this._generateJoinTableName(this.name, ModelName);

    // Get collection (e.g., user.roles())
    this.prototype[methodName] = function () {
      return this._getRelatedModels(ModelName, throughTable);
    };

    // Add single (e.g., user.addRole(role))
    const addMethodName = `add${ModelName}`;
    this.prototype[addMethodName] = function (model) {
      return this._addToCollection(model, throughTable);
    };

    // Remove single (e.g., user.removeRole(role))
    const removeMethodName = `remove${ModelName}`;
    this.prototype[removeMethodName] = function (model) {
      return this._removeFromCollection(model, throughTable);
    };

    // Check existence (e.g., user.hasRole(role))
    const hasMethodName = `has${ModelName}`;
    this.prototype[hasMethodName] = function (model) {
      return this._hasInCollection(model, throughTable);
    };

    // Clear all (e.g., user.clearRoles())
    const clearMethodName = `clear${ModelName}s`; // Capitalize and pluralize
    this.prototype[clearMethodName] = function () {
      return this._clearCollection(ModelName, throughTable);
    };

    // Log the added methods for debugging
    console.log(`Added methods to ${this.name}:`, {
      get: methodName,
      add: addMethodName,
      remove: removeMethodName,
      has: hasMethodName,
      clear: clearMethodName,
    });
  }

  // Helper methods
  static _generateJoinTableName(model1, model2) {
    const names = [model1, model2]
      .map((name) => name.toLowerCase() + "s")
      .sort();
    return names.join("_");
  }

  _getRelatedModels(relatedModel, throughTable) {
    const RelatedModel = ModelLoader.getModel(relatedModel);
    const thisKey = `${this.constructor.name.toLowerCase()}_id`;
    const thatKey = `${relatedModel.toLowerCase()}_id`;

    const query = `
      SELECT DISTINCT ${RelatedModel.tableName()}.* 
      FROM ${RelatedModel.tableName()}
      JOIN ${throughTable} ON ${throughTable}.${thatKey} = ${RelatedModel.tableName()}.id
      WHERE ${throughTable}.${thisKey} = ?
    `;
    console.log("Query:", query); // Debug
    console.log("Params:", this.id); // Debug

    const stmt = this.constructor.db().prepare(query);
    const records = stmt.all(this.id);
    return records.map((record) => new RelatedModel(record));
  }

  _addToCollection(model, throughTable) {
    const db = this.constructor.db();
    const thisKey = `${this.constructor.name.toLowerCase()}_id`;
    const thatKey = `${model.constructor.name.toLowerCase()}_id`;

    // Check for existing association
    const existing = db
      .prepare(
        `
      SELECT 1 FROM ${throughTable} 
      WHERE ${thisKey} = ? AND ${thatKey} = ?
    `
      )
      .get(this.id, model.id);

    if (!existing) {
      db.prepare(
        `
        INSERT INTO ${throughTable} (${thisKey}, ${thatKey}) 
        VALUES (?, ?)
      `
      ).run(this.id, model.id);
    }

    return this;
  }

  _removeFromCollection(model, throughTable) {
    const db = this.constructor.db();
    const thisKey = `${this.constructor.name.toLowerCase()}_id`;
    const thatKey = `${model.constructor.name.toLowerCase()}_id`;

    db.prepare(
      `
      DELETE FROM ${throughTable} 
      WHERE ${thisKey} = ? AND ${thatKey} = ?
    `
    ).run(this.id, model.id);

    return this;
  }

  _hasInCollection(model, throughTable) {
    const db = this.constructor.db();
    const thisKey = `${this.constructor.name.toLowerCase()}_id`;
    const thatKey = `${model.constructor.name.toLowerCase()}_id`;

    const result = db
      .prepare(
        `
      SELECT 1 FROM ${throughTable} 
      WHERE ${thisKey} = ? AND ${thatKey} = ?
    `
      )
      .get(this.id, model.id);

    return !!result;
  }

  _clearCollection(relatedModel, throughTable) {
    const db = this.constructor.db();
    const thisKey = `${this.constructor.name.toLowerCase()}_id`;

    db.prepare(
      `
      DELETE FROM ${throughTable} 
      WHERE ${thisKey} = ?
    `
    ).run(this.id);

    return this;
  }

  static findOrCreate(conditions, attributes = {}) {
    // First try to find the record
    let record = this.findBy(conditions);

    // If not found, create it with merged attributes
    if (!record) {
      const mergedAttributes = { ...conditions, ...attributes };
      record = this.create(mergedAttributes);
    }

    return record;
  }

  // Add findOrCreateBy as an alias (Rails style)
  static findOrCreateBy(conditions, attributes = {}) {
    return this.findOrCreate(conditions, attributes);
  }

  // Has Many Through
  static hasManyThrough(relatedModel, through, options = {}) {
    const throughModel = through.toLowerCase();
    const foreignKey = options.foreignKey || `${this.name.toLowerCase()}_id`;
    const throughForeignKey =
      options.throughForeignKey || `${relatedModel.toLowerCase()}_id`;
    const methodName = relatedModel.toLowerCase() + "s";

    this.prototype[methodName] = function () {
      const RelatedModel = ModelLoader.getModel(relatedModel);
      const ThroughModel = ModelLoader.getModel(throughModel);
      const query = `
        SELECT ${RelatedModel.tableName()}.* 
        FROM ${RelatedModel.tableName()}
        JOIN ${ThroughModel.tableName()} ON ${ThroughModel.tableName()}.${throughForeignKey} = ${RelatedModel.tableName()}.id
        WHERE ${ThroughModel.tableName()}.${foreignKey} = ?
      `;
      const stmt = this.constructor.db().prepare(query);
      const records = stmt.all(this.id);
      return records.map((record) => new RelatedModel(record));
    };
  }

  save() {
    const db = this.constructor.db();
    const tableName = this.constructor.tableName();
    const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");
    const errors = this.validate();

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(", ")}`);
    }

    // Get all properties except id and timestamps
    const props = Object.keys(this).filter(
      (key) => !["id", "created_at", "updated_at"].includes(key)
    );

    if (this.id) {
      // Update existing record
      const setClause = props.map((prop) => `${prop} = ?`).join(", ");

      const sql = `
        UPDATE ${tableName}
        SET ${setClause}, updated_at = ?
        WHERE id = ?
      `;

      const values = [...props.map((prop) => this[prop]), timestamp, this.id];

      db.prepare(sql).run(...values);
    } else {
      // Insert new record
      const columns = [...props, "created_at", "updated_at"];
      const placeholders = columns.map(() => "?").join(", ");

      const sql = `
        INSERT INTO ${tableName} (${columns.join(", ")})
        VALUES (${placeholders})
      `;

      const values = [...props.map((prop) => this[prop]), timestamp, timestamp];

      const result = db.prepare(sql).run(...values);
      this.id = result.lastInsertRowid;
    }

    // Update timestamps
    this.updated_at = timestamp;
    if (!this.created_at) {
      this.created_at = timestamp;
    }

    return this;
  }

  // Add this method to lib/model.js
  update(attributes = {}) {
    if (this._destroyed) {
      return false;
    }

    if (!this.id) {
      throw new Error("Cannot update a record without an ID");
    }

    try {
      // Add updated_at timestamp
      attributes.updated_at = new Date()
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

      // Build SET clause and values array
      const sets = Object.keys(attributes)
        .map((key) => `${key} = ?`)
        .join(", ");
      const values = Object.values(attributes);

      // Add ID for WHERE clause
      values.push(this.id);

      // Prepare and execute update query
      const sql = `UPDATE ${this.constructor.tableName()} SET ${sets} WHERE id = ?`;
      const result = this.constructor
        .db()
        .prepare(sql)
        .run(...values);

      if (result.changes > 0) {
        // Update the instance with new values
        Object.assign(this, attributes);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error in update:", error);
      throw error;
    }
  }

  destroy() {
    if (!this.id) return false;
    if (this._destroyed) {
      throw new Error("Record has already been destroyed");
    }

    const db = this.constructor.db();

    try {
      // Begin transaction
      db.prepare("BEGIN TRANSACTION").run();

      // Handle dependent associations
      if (
        this.constructor._dependentAssociations &&
        this.constructor._dependentAssociations.size > 0
      ) {
        for (const [modelName, config] of this.constructor
          ._dependentAssociations) {
          const RelatedModel = ModelLoader.getModel(modelName);

          if (config.dependent === "destroy") {
            // Instead of loading and destroying each record individually,
            // just delete them directly
            db.prepare(
              `DELETE FROM ${RelatedModel.tableName()} WHERE ${
                config.foreignKey
              } = ?`
            ).run(this.id);
          } else if (config.dependent === "nullify") {
            db.prepare(
              `UPDATE ${RelatedModel.tableName()} SET ${
                config.foreignKey
              } = NULL WHERE ${config.foreignKey} = ?`
            ).run(this.id);
          }
        }
      }

      // Delete the record itself
      const sql = `DELETE FROM ${this.constructor.tableName()} WHERE id = ?`;
      const result = db.prepare(sql).run(this.id);

      // Commit transaction
      db.prepare("COMMIT").run();

      if (result.changes > 0) {
        // Mark the instance as destroyed
        Object.defineProperty(this, "_destroyed", {
          value: true,
          writable: false,
          configurable: false,
        });
        // Clear the id
        this.id = null;
        return true;
      }

      return false;
    } catch (error) {
      // Rollback on error
      db.prepare("ROLLBACK").run();
      console.error("Error in destroy:", error);
      throw error;
    }
  }

  // Add isDestroyed method to check destruction status
  isDestroyed() {
    return this._destroyed === true;
  }

  // Advanced Querying Methods
  static select(columns) {
    const query = `SELECT ${columns} FROM ${this.tableName()}`;
    return this.executeQuery(query);
  }

  static limit(count) {
    const query = `SELECT * FROM ${this.tableName()} LIMIT ${count}`;
    return this.executeQuery(query);
  }

  static offset(count) {
    const query = `SELECT * FROM ${this.tableName()} OFFSET ${count}`;
    return this.executeQuery(query);
  }

  static order(orderBy) {
    const query = `SELECT * FROM ${this.tableName()} ORDER BY ${orderBy}`;
    return this.executeQuery(query);
  }

  // Schema Information
  static get columns() {
    const query = `PRAGMA table_info(${this.tableName()})`; // Fix: use tableName()
    return this.db().prepare(query).all(); // Fix: use db()
  }

  static get schema() {
    const query = `SELECT sql FROM sqlite_master WHERE type='table' AND name=?`;
    return this.db().prepare(query).get(this.tableName()); // Fix: use db() and tableName()
  }

  // Add formatted output helpers
  static get columnInfo() {
    const columns = this.columns;
    console.log(`\nTable: ${this.tableName()}`);
    console.log("Columns:");
    columns.forEach((col) => {
      console.log(`  ${col.name}:`);
      console.log(`    type: ${col.type}`);
      console.log(`    null: ${col.notnull ? "NO" : "YES"}`);
      console.log(`    default: ${col.dflt_value || "NULL"}`);
      console.log(`    primary key: ${col.pk ? "YES" : "NO"}`);
    });
    return columns;
  }

  static get schemaInfo() {
    const schema = this.schema;
    console.log(`\nTable Definition:`);
    console.log(schema.sql);
    return schema;
  }

  static executeQuery(query, params = []) {
    const stmt = this.db().prepare(query);
    const records = stmt.all(...params);
    return records.map((record) => new this(record));
  }

  // Batch Operations
  static updateAll(conditions, attributes) {
    // Add updated_at timestamp
    attributes.updated_at = new Date()
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    const sets = Object.entries(attributes)
      .map(([key, value]) => `${key} = ?`)
      .join(", ");

    // Handle NULL conditions differently
    const where = Object.entries(conditions)
      .map(([key, value]) => {
        if (value === null) {
          return `${key} IS NULL`;
        }
        return `${key} = ?`;
      })
      .join(" AND ");

    // Only include non-null values in the values array
    const values = [
      ...Object.values(attributes),
      ...Object.values(conditions).filter((value) => value !== null),
    ];

    const query = `UPDATE ${this.tableName()} SET ${sets} WHERE ${where}`;
    console.log("Query:", query); // Debug log
    console.log("Values:", values); // Debug log
    return this.db()
      .prepare(query)
      .run(...values);
  }

  static destroyAll(conditions) {
    const db = this.db();

    try {
      // Begin transaction
      db.prepare("BEGIN TRANSACTION").run();

      // Get all records that match conditions
      const whereClause = Object.entries(conditions)
        .map(([key, value]) => {
          if (value === null) {
            return `${key} IS NULL`;
          }
          return `${key} = ?`;
        })
        .join(" AND ");

      const values = Object.values(conditions).filter(
        (value) => value !== null
      );

      // Find all matching records first
      const findQuery = `SELECT id FROM ${this.tableName()} WHERE ${whereClause}`;
      const records = db.prepare(findQuery).all(...values);

      // For each record, handle dependent associations
      if (this._dependentAssociations && this._dependentAssociations.size > 0) {
        for (const record of records) {
          for (const [modelName, config] of this._dependentAssociations) {
            const RelatedModel = ModelLoader.getModel(modelName);

            if (config.dependent === "destroy") {
              db.prepare(
                `DELETE FROM ${RelatedModel.tableName()} WHERE ${
                  config.foreignKey
                } = ?`
              ).run(record.id);
            } else if (config.dependent === "nullify") {
              db.prepare(
                `UPDATE ${RelatedModel.tableName()} SET ${
                  config.foreignKey
                } = NULL WHERE ${config.foreignKey} = ?`
              ).run(record.id);
            }
          }
        }
      }

      // Now delete the main records
      const deleteQuery = `DELETE FROM ${this.tableName()} WHERE ${whereClause}`;
      console.log("Query:", deleteQuery);
      console.log("Values:", values);
      const result = db.prepare(deleteQuery).run(...values);

      // Commit transaction
      db.prepare("COMMIT").run();

      return result;
    } catch (error) {
      // Rollback on error
      db.prepare("ROLLBACK").run();
      console.error("Error in deleteAll:", error);
      throw error;
    }
  }

  // Validation Methods
  static get validations() {
    return this._validations || {};
  }

  isValid() {
    this.errors = [];

    // Check each validation rule
    for (const [field, rules] of Object.entries(this.constructor.validations)) {
      rules.forEach((rule) => {
        if (!this.validateField(field, rule)) {
          this.errors.push(`${field} ${rule.message || "is invalid"}`);
        }
      });
    }

    return this.errors.length === 0;
  }

  validateField(field, rule) {
    const value = this[field];

    switch (rule.type) {
      case "presence":
        return value !== null && value !== undefined && value !== "";
      case "length":
        if (rule.minimum && String(value).length < rule.minimum) return false;
        if (rule.maximum && String(value).length > rule.maximum) return false;
        return true;
      case "format":
        return rule.pattern.test(value);
      case "custom":
        return rule.validate(value, this);
      default:
        return true;
    }
  }

  static count() {
    const query = `SELECT COUNT(*) as count FROM ${this.tableName()}`;
    const result = this.db().prepare(query).get();
    return result.count;
  }
}

Model.include(Validatable);

module.exports = Model;
