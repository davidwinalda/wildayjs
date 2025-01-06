// const path = require("path");
// const Database = require("better-sqlite3");
// const ModelLoader = require("./modelLoader");
// const Validatable = require("./validatable");

// class Model {
//   static dbPath = path.join(process.cwd(), "db", "development.sqlite3");

//   static db() {
//     if (!this._db) {
//       this._db = new Database(this.dbPath, { verbose: console.log });
//     }
//     return this._db;
//   }

//   static tableName() {
//     if (!this.name) {
//       throw new Error(
//         "Model must have a class name to determine the table name. Ensure the model is defined correctly and extends the Model class."
//       );
//     }
//     return this.name.toLowerCase() + "s"; // Default table name is pluralized class name
//   }

//   // Constructor for model instances
//   constructor(attributes = {}) {
//     Object.assign(this, attributes);
//   }

//   static include(module) {
//     // Copy static properties and methods
//     Object.getOwnPropertyNames(module).forEach((prop) => {
//       if (prop !== "prototype" && prop !== "name" && prop !== "length") {
//         Object.defineProperty(this, prop, {
//           value: module[prop],
//           writable: true,
//           configurable: true,
//           enumerable: true,
//         });
//       }
//     });

//     // Copy prototype methods
//     Object.getOwnPropertyNames(module.prototype).forEach((prop) => {
//       if (prop !== "constructor") {
//         Object.defineProperty(this.prototype, prop, {
//           value: module.prototype[prop],
//           writable: true,
//           configurable: true,
//           enumerable: true,
//         });
//       }
//     });

//     // Ensure validates method is properly bound
//     if (module.validates) {
//       this.validates = function (...args) {
//         return module.validates.apply(this, args);
//       };
//     }
//   }

//   static getModel(modelName) {
//     return ModelLoader.getModel(modelName);
//   }

//   // Fetch all records from the table and return model instances
//   static all() {
//     const stmt = this.db().prepare(`SELECT * FROM ${this.tableName()}`);
//     const records = stmt.all();
//     return records.map((record) => new this(record));
//   }

//   // Find a record by its ID and return a model instance
//   static find(id) {
//     const stmt = this.db().prepare(
//       `SELECT * FROM ${this.tableName()} WHERE id = ?`
//     );
//     const record = stmt.get(id);
//     return record ? new this(record) : null;
//   }

//   // Create a new record and return a model instance
//   static create(attributes) {
//     // Create a new instance
//     const instance = new this(attributes);

//     // Run validations before saving
//     const errors = instance.validate();
//     if (errors.length > 0) {
//       throw new Error(`Validation failed: ${errors.join(", ")}`);
//     }

//     // If validations pass, save to database
//     const columns = Object.keys(attributes).join(", ");
//     const placeholders = Object.keys(attributes)
//       .map(() => "?")
//       .join(", ");
//     const values = Object.values(attributes);

//     const stmt = this.db().prepare(
//       `INSERT INTO ${this.tableName()} (${columns}) VALUES (${placeholders})`
//     );
//     const info = stmt.run(...values);
//     return this.find(info.lastInsertRowid);
//   }

//   // Delete a record by its ID
//   static delete(id) {
//     const stmt = this.db().prepare(
//       `DELETE FROM ${this.tableName()} WHERE id = ?`
//     );
//     return stmt.run(id);
//   }

//   // Define a `has_many` relationship
//   static hasMany(modelName, foreignKey, options = {}) {
//     // Ensure consistent casing
//     const modelNameLower = modelName.toLowerCase();
//     const relatedKey = modelNameLower + "s";

//     // If foreignKey not provided, generate it
//     if (!foreignKey) {
//       foreignKey = `${this.name.toLowerCase()}_id`;
//     }

//     // Store dependent option
//     if (options.dependent) {
//       if (!this._dependentAssociations) {
//         this._dependentAssociations = new Map();
//       }
//       this._dependentAssociations.set(modelNameLower, {
//         type: "hasMany",
//         dependent: options.dependent,
//         foreignKey,
//       });
//     }

//     this.prototype[relatedKey] = function () {
//       try {
//         // Get the related model
//         const relatedModel = ModelLoader.getModel(modelNameLower);

//         if (!relatedModel) {
//           throw new Error(
//             `Related model "${modelName}" not found. ` +
//               `Make sure app/models/${modelNameLower}.js exists`
//           );
//         }

//         // Build and execute query
//         const query = `SELECT * FROM ${relatedModel.tableName()} WHERE ${foreignKey} = ?`;

//         // Debug info (optional)
//         if (process.env.DEBUG) {
//           console.log("Query:", query);
//           console.log("ID:", this.id);
//         }

//         // Execute query and return results
//         const stmt = this.constructor.db().prepare(query);
//         const records = stmt.all(this.id);

//         // Return array of model instances
//         return records.map((record) => new relatedModel(record));
//       } catch (error) {
//         console.error(
//           `Error in ${this.constructor.name}#${relatedKey}():`,
//           error.message
//         );
//         return []; // Return empty array on error
//       }
//     };

//     // Add convenience methods
//     this.prototype[`add${modelName}`] = function (attributes = {}) {
//       const relatedModel = ModelLoader.getModel(modelNameLower);
//       attributes[foreignKey] = this.id;
//       return relatedModel.create(attributes);
//     };

//     this.prototype[`remove${modelName}`] = function (id) {
//       const relatedModel = ModelLoader.getModel(modelNameLower);
//       return relatedModel.delete(id);
//     };
//   }

//   // Define a `belongs_to` relationship
//   static belongsTo(modelName, foreignKey) {
//     const methodName = modelName.toLowerCase();

//     this.prototype[methodName] = function () {
//       const relatedModel = ModelLoader.getModel(modelName);
//       const stmt = this.constructor
//         .db()
//         .prepare(`SELECT * FROM ${relatedModel.tableName()} WHERE id = ?`);
//       const record = stmt.get(this[foreignKey]);
//       return record ? new relatedModel(record) : null;
//     };
//   }

//   // Find records by conditions
//   static where(conditions) {
//     const columns = Object.keys(conditions);
//     const values = Object.values(conditions);

//     const whereClause = columns.map((column) => `${column} = ?`).join(" AND ");

//     const stmt = this.db().prepare(
//       `SELECT * FROM ${this.tableName()} WHERE ${whereClause}`
//     );
//     const records = stmt.all(...values);
//     return records.map((record) => new this(record));
//   }

//   // Find first record by conditions
//   static findBy(conditions) {
//     const columns = Object.keys(conditions);
//     const values = Object.values(conditions);

//     const whereClause = columns.map((column) => `${column} = ?`).join(" AND ");

//     const stmt = this.db().prepare(
//       `SELECT * FROM ${this.tableName()} WHERE ${whereClause} LIMIT 1`
//     );
//     const record = stmt.get(...values);
//     return record ? new this(record) : null;
//   }

//   static hasOne(relatedModel, foreignKey, options = {}) {
//     const methodName = relatedModel.toLowerCase();

//     // Store dependent option
//     if (options.dependent) {
//       if (!this._dependentAssociations) {
//         this._dependentAssociations = new Map();
//       }
//       this._dependentAssociations.set(methodName, {
//         type: "hasOne",
//         dependent: options.dependent,
//         foreignKey,
//       });
//     }

//     this.prototype[methodName] = function () {
//       const RelatedModel = ModelLoader.getModel(relatedModel);
//       const query = `SELECT * FROM ${RelatedModel.tableName()} WHERE ${foreignKey} = ? LIMIT 1`;
//       const stmt = this.constructor.db().prepare(query);
//       const record = stmt.get(this.id);
//       return record ? new RelatedModel(record) : null;
//     };
//   }

//   // Many-to-Many
//   static hasAndBelongsToMany(relatedModel, options = {}) {
//     // Convert to proper case for model loading (e.g., 'role' -> 'Role')
//     const ModelName =
//       relatedModel.charAt(0).toUpperCase() + relatedModel.slice(1);
//     const methodName = relatedModel.toLowerCase() + "s";
//     const throughTable =
//       options.through || this._generateJoinTableName(this.name, ModelName);

//     // Get collection (e.g., user.roles())
//     this.prototype[methodName] = function () {
//       return this._getRelatedModels(ModelName, throughTable);
//     };

//     // Add single (e.g., user.addRole(role))
//     const addMethodName = `add${ModelName}`;
//     this.prototype[addMethodName] = function (model) {
//       return this._addToCollection(model, throughTable);
//     };

//     // Remove single (e.g., user.removeRole(role))
//     const removeMethodName = `remove${ModelName}`;
//     this.prototype[removeMethodName] = function (model) {
//       return this._removeFromCollection(model, throughTable);
//     };

//     // Check existence (e.g., user.hasRole(role))
//     const hasMethodName = `has${ModelName}`;
//     this.prototype[hasMethodName] = function (model) {
//       return this._hasInCollection(model, throughTable);
//     };

//     // Clear all (e.g., user.clearRoles())
//     const clearMethodName = `clear${ModelName}s`; // Capitalize and pluralize
//     this.prototype[clearMethodName] = function () {
//       return this._clearCollection(ModelName, throughTable);
//     };

//     // Log the added methods for debugging
//     console.log(`Added methods to ${this.name}:`, {
//       get: methodName,
//       add: addMethodName,
//       remove: removeMethodName,
//       has: hasMethodName,
//       clear: clearMethodName,
//     });
//   }

//   // Helper methods
//   static _generateJoinTableName(model1, model2) {
//     const names = [model1, model2]
//       .map((name) => name.toLowerCase() + "s")
//       .sort();
//     return names.join("_");
//   }

//   _getRelatedModels(relatedModel, throughTable) {
//     const RelatedModel = ModelLoader.getModel(relatedModel);
//     const thisKey = `${this.constructor.name.toLowerCase()}_id`;
//     const thatKey = `${relatedModel.toLowerCase()}_id`;

//     const query = `
//       SELECT DISTINCT ${RelatedModel.tableName()}.*
//       FROM ${RelatedModel.tableName()}
//       JOIN ${throughTable} ON ${throughTable}.${thatKey} = ${RelatedModel.tableName()}.id
//       WHERE ${throughTable}.${thisKey} = ?
//     `;
//     console.log("Query:", query); // Debug
//     console.log("Params:", this.id); // Debug

//     const stmt = this.constructor.db().prepare(query);
//     const records = stmt.all(this.id);
//     return records.map((record) => new RelatedModel(record));
//   }

//   _addToCollection(model, throughTable) {
//     const db = this.constructor.db();
//     const thisKey = `${this.constructor.name.toLowerCase()}_id`;
//     const thatKey = `${model.constructor.name.toLowerCase()}_id`;

//     // Check for existing association
//     const existing = db
//       .prepare(
//         `
//       SELECT 1 FROM ${throughTable}
//       WHERE ${thisKey} = ? AND ${thatKey} = ?
//     `
//       )
//       .get(this.id, model.id);

//     if (!existing) {
//       db.prepare(
//         `
//         INSERT INTO ${throughTable} (${thisKey}, ${thatKey})
//         VALUES (?, ?)
//       `
//       ).run(this.id, model.id);
//     }

//     return this;
//   }

//   _removeFromCollection(model, throughTable) {
//     const db = this.constructor.db();
//     const thisKey = `${this.constructor.name.toLowerCase()}_id`;
//     const thatKey = `${model.constructor.name.toLowerCase()}_id`;

//     db.prepare(
//       `
//       DELETE FROM ${throughTable}
//       WHERE ${thisKey} = ? AND ${thatKey} = ?
//     `
//     ).run(this.id, model.id);

//     return this;
//   }

//   _hasInCollection(model, throughTable) {
//     const db = this.constructor.db();
//     const thisKey = `${this.constructor.name.toLowerCase()}_id`;
//     const thatKey = `${model.constructor.name.toLowerCase()}_id`;

//     const result = db
//       .prepare(
//         `
//       SELECT 1 FROM ${throughTable}
//       WHERE ${thisKey} = ? AND ${thatKey} = ?
//     `
//       )
//       .get(this.id, model.id);

//     return !!result;
//   }

//   _clearCollection(relatedModel, throughTable) {
//     const db = this.constructor.db();
//     const thisKey = `${this.constructor.name.toLowerCase()}_id`;

//     db.prepare(
//       `
//       DELETE FROM ${throughTable}
//       WHERE ${thisKey} = ?
//     `
//     ).run(this.id);

//     return this;
//   }

//   static findOrCreate(conditions, attributes = {}) {
//     // First try to find the record
//     let record = this.findBy(conditions);

//     // If not found, create it with merged attributes
//     if (!record) {
//       const mergedAttributes = { ...conditions, ...attributes };
//       record = this.create(mergedAttributes);
//     }

//     return record;
//   }

//   // Add findOrCreateBy as an alias (Rails style)
//   static findOrCreateBy(conditions, attributes = {}) {
//     return this.findOrCreate(conditions, attributes);
//   }

//   // Has Many Through
//   static hasManyThrough(relatedModel, through, options = {}) {
//     const throughModel = through.toLowerCase();
//     const foreignKey = options.foreignKey || `${this.name.toLowerCase()}_id`;
//     const throughForeignKey =
//       options.throughForeignKey || `${relatedModel.toLowerCase()}_id`;
//     const methodName = relatedModel.toLowerCase() + "s";

//     this.prototype[methodName] = function () {
//       const RelatedModel = ModelLoader.getModel(relatedModel);
//       const ThroughModel = ModelLoader.getModel(throughModel);
//       const query = `
//         SELECT ${RelatedModel.tableName()}.*
//         FROM ${RelatedModel.tableName()}
//         JOIN ${ThroughModel.tableName()} ON ${ThroughModel.tableName()}.${throughForeignKey} = ${RelatedModel.tableName()}.id
//         WHERE ${ThroughModel.tableName()}.${foreignKey} = ?
//       `;
//       const stmt = this.constructor.db().prepare(query);
//       const records = stmt.all(this.id);
//       return records.map((record) => new RelatedModel(record));
//     };
//   }

//   save() {
//     const db = this.constructor.db();
//     const tableName = this.constructor.tableName();
//     const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");
//     const errors = this.validate();

//     if (errors.length > 0) {
//       throw new Error(`Validation failed: ${errors.join(", ")}`);
//     }

//     // Get all properties except id and timestamps
//     const props = Object.keys(this).filter(
//       (key) => !["id", "created_at", "updated_at"].includes(key)
//     );

//     if (this.id) {
//       // Update existing record
//       const setClause = props.map((prop) => `${prop} = ?`).join(", ");

//       const sql = `
//         UPDATE ${tableName}
//         SET ${setClause}, updated_at = ?
//         WHERE id = ?
//       `;

//       const values = [...props.map((prop) => this[prop]), timestamp, this.id];

//       db.prepare(sql).run(...values);
//     } else {
//       // Insert new record
//       const columns = [...props, "created_at", "updated_at"];
//       const placeholders = columns.map(() => "?").join(", ");

//       const sql = `
//         INSERT INTO ${tableName} (${columns.join(", ")})
//         VALUES (${placeholders})
//       `;

//       const values = [...props.map((prop) => this[prop]), timestamp, timestamp];

//       const result = db.prepare(sql).run(...values);
//       this.id = result.lastInsertRowid;
//     }

//     // Update timestamps
//     this.updated_at = timestamp;
//     if (!this.created_at) {
//       this.created_at = timestamp;
//     }

//     return this;
//   }

//   // Add this method to lib/model.js
//   update(attributes = {}) {
//     if (this._destroyed) {
//       return false;
//     }

//     if (!this.id) {
//       throw new Error("Cannot update a record without an ID");
//     }

//     try {
//       // Add updated_at timestamp
//       attributes.updated_at = new Date()
//         .toISOString()
//         .slice(0, 19)
//         .replace("T", " ");

//       // Build SET clause and values array
//       const sets = Object.keys(attributes)
//         .map((key) => `${key} = ?`)
//         .join(", ");
//       const values = Object.values(attributes);

//       // Add ID for WHERE clause
//       values.push(this.id);

//       // Prepare and execute update query
//       const sql = `UPDATE ${this.constructor.tableName()} SET ${sets} WHERE id = ?`;
//       const result = this.constructor
//         .db()
//         .prepare(sql)
//         .run(...values);

//       if (result.changes > 0) {
//         // Update the instance with new values
//         Object.assign(this, attributes);
//         return true;
//       }

//       return false;
//     } catch (error) {
//       console.error("Error in update:", error);
//       throw error;
//     }
//   }

//   destroy() {
//     if (!this.id) return false;
//     if (this._destroyed) {
//       throw new Error("Record has already been destroyed");
//     }

//     const db = this.constructor.db();

//     try {
//       // Begin transaction
//       db.prepare("BEGIN TRANSACTION").run();

//       // Handle dependent associations
//       if (
//         this.constructor._dependentAssociations &&
//         this.constructor._dependentAssociations.size > 0
//       ) {
//         for (const [modelName, config] of this.constructor
//           ._dependentAssociations) {
//           const RelatedModel = ModelLoader.getModel(modelName);

//           if (config.dependent === "destroy") {
//             // Instead of loading and destroying each record individually,
//             // just delete them directly
//             db.prepare(
//               `DELETE FROM ${RelatedModel.tableName()} WHERE ${
//                 config.foreignKey
//               } = ?`
//             ).run(this.id);
//           } else if (config.dependent === "nullify") {
//             db.prepare(
//               `UPDATE ${RelatedModel.tableName()} SET ${
//                 config.foreignKey
//               } = NULL WHERE ${config.foreignKey} = ?`
//             ).run(this.id);
//           }
//         }
//       }

//       // Delete the record itself
//       const sql = `DELETE FROM ${this.constructor.tableName()} WHERE id = ?`;
//       const result = db.prepare(sql).run(this.id);

//       // Commit transaction
//       db.prepare("COMMIT").run();

//       if (result.changes > 0) {
//         // Mark the instance as destroyed
//         Object.defineProperty(this, "_destroyed", {
//           value: true,
//           writable: false,
//           configurable: false,
//         });
//         // Clear the id
//         this.id = null;
//         return true;
//       }

//       return false;
//     } catch (error) {
//       // Rollback on error
//       db.prepare("ROLLBACK").run();
//       console.error("Error in destroy:", error);
//       throw error;
//     }
//   }

//   // Add isDestroyed method to check destruction status
//   isDestroyed() {
//     return this._destroyed === true;
//   }

//   // Advanced Querying Methods
//   static select(columns) {
//     const query = `SELECT ${columns} FROM ${this.tableName()}`;
//     return this.executeQuery(query);
//   }

//   static limit(count) {
//     const query = `SELECT * FROM ${this.tableName()} LIMIT ${count}`;
//     return this.executeQuery(query);
//   }

//   static offset(count) {
//     const query = `SELECT * FROM ${this.tableName()} OFFSET ${count}`;
//     return this.executeQuery(query);
//   }

//   static order(orderBy) {
//     const query = `SELECT * FROM ${this.tableName()} ORDER BY ${orderBy}`;
//     return this.executeQuery(query);
//   }

//   // Schema Information
//   static get columns() {
//     const query = `PRAGMA table_info(${this.tableName()})`; // Fix: use tableName()
//     return this.db().prepare(query).all(); // Fix: use db()
//   }

//   static get schema() {
//     const query = `SELECT sql FROM sqlite_master WHERE type='table' AND name=?`;
//     return this.db().prepare(query).get(this.tableName()); // Fix: use db() and tableName()
//   }

//   // Add formatted output helpers
//   static get columnInfo() {
//     const columns = this.columns;
//     console.log(`\nTable: ${this.tableName()}`);
//     console.log("Columns:");
//     columns.forEach((col) => {
//       console.log(`  ${col.name}:`);
//       console.log(`    type: ${col.type}`);
//       console.log(`    null: ${col.notnull ? "NO" : "YES"}`);
//       console.log(`    default: ${col.dflt_value || "NULL"}`);
//       console.log(`    primary key: ${col.pk ? "YES" : "NO"}`);
//     });
//     return columns;
//   }

//   static get schemaInfo() {
//     const schema = this.schema;
//     console.log(`\nTable Definition:`);
//     console.log(schema.sql);
//     return schema;
//   }

//   static executeQuery(query, params = []) {
//     const stmt = this.db().prepare(query);
//     const records = stmt.all(...params);
//     return records.map((record) => new this(record));
//   }

//   // Batch Operations
//   static updateAll(conditions, attributes) {
//     // Add updated_at timestamp
//     attributes.updated_at = new Date()
//       .toISOString()
//       .slice(0, 19)
//       .replace("T", " ");

//     const sets = Object.entries(attributes)
//       .map(([key, value]) => `${key} = ?`)
//       .join(", ");

//     // Handle NULL conditions differently
//     const where = Object.entries(conditions)
//       .map(([key, value]) => {
//         if (value === null) {
//           return `${key} IS NULL`;
//         }
//         return `${key} = ?`;
//       })
//       .join(" AND ");

//     // Only include non-null values in the values array
//     const values = [
//       ...Object.values(attributes),
//       ...Object.values(conditions).filter((value) => value !== null),
//     ];

//     const query = `UPDATE ${this.tableName()} SET ${sets} WHERE ${where}`;
//     console.log("Query:", query); // Debug log
//     console.log("Values:", values); // Debug log
//     return this.db()
//       .prepare(query)
//       .run(...values);
//   }

//   static destroyAll(conditions) {
//     const db = this.db();

//     try {
//       // Begin transaction
//       db.prepare("BEGIN TRANSACTION").run();

//       // Get all records that match conditions
//       const whereClause = Object.entries(conditions)
//         .map(([key, value]) => {
//           if (value === null) {
//             return `${key} IS NULL`;
//           }
//           return `${key} = ?`;
//         })
//         .join(" AND ");

//       const values = Object.values(conditions).filter(
//         (value) => value !== null
//       );

//       // Find all matching records first
//       const findQuery = `SELECT id FROM ${this.tableName()} WHERE ${whereClause}`;
//       const records = db.prepare(findQuery).all(...values);

//       // For each record, handle dependent associations
//       if (this._dependentAssociations && this._dependentAssociations.size > 0) {
//         for (const record of records) {
//           for (const [modelName, config] of this._dependentAssociations) {
//             const RelatedModel = ModelLoader.getModel(modelName);

//             if (config.dependent === "destroy") {
//               db.prepare(
//                 `DELETE FROM ${RelatedModel.tableName()} WHERE ${
//                   config.foreignKey
//                 } = ?`
//               ).run(record.id);
//             } else if (config.dependent === "nullify") {
//               db.prepare(
//                 `UPDATE ${RelatedModel.tableName()} SET ${
//                   config.foreignKey
//                 } = NULL WHERE ${config.foreignKey} = ?`
//               ).run(record.id);
//             }
//           }
//         }
//       }

//       // Now delete the main records
//       const deleteQuery = `DELETE FROM ${this.tableName()} WHERE ${whereClause}`;
//       console.log("Query:", deleteQuery);
//       console.log("Values:", values);
//       const result = db.prepare(deleteQuery).run(...values);

//       // Commit transaction
//       db.prepare("COMMIT").run();

//       return result;
//     } catch (error) {
//       // Rollback on error
//       db.prepare("ROLLBACK").run();
//       console.error("Error in deleteAll:", error);
//       throw error;
//     }
//   }

//   // Validation Methods
//   static get validations() {
//     return this._validations || {};
//   }

//   isValid() {
//     this.errors = [];

//     // Check each validation rule
//     for (const [field, rules] of Object.entries(this.constructor.validations)) {
//       rules.forEach((rule) => {
//         if (!this.validateField(field, rule)) {
//           this.errors.push(`${field} ${rule.message || "is invalid"}`);
//         }
//       });
//     }

//     return this.errors.length === 0;
//   }

//   validateField(field, rule) {
//     const value = this[field];

//     switch (rule.type) {
//       case "presence":
//         return value !== null && value !== undefined && value !== "";
//       case "length":
//         if (rule.minimum && String(value).length < rule.minimum) return false;
//         if (rule.maximum && String(value).length > rule.maximum) return false;
//         return true;
//       case "format":
//         return rule.pattern.test(value);
//       case "custom":
//         return rule.validate(value, this);
//       default:
//         return true;
//     }
//   }

//   static count() {
//     const query = `SELECT COUNT(*) as count FROM ${this.tableName()}`;
//     const result = this.db().prepare(query).get();
//     return result.count;
//   }
// }

// Model.include(Validatable);

// module.exports = Model;

// -------------------

// const path = require("path");
// const Database = require("better-sqlite3");
// const ModelLoader = require("./modelLoader");
// const Validatable = require("./validatable");
// const connectionManager = require("./database/connectionManager");

// class Model {
//   static dbPath = path.join(process.cwd(), "db", "development.sqlite3");

//   static async getConnection() {
//     // Try to get connection from connectionManager first (for MySQL/PostgreSQL)
//     try {
//       return await connectionManager.getConnection();
//     } catch (error) {
//       // Fallback to SQLite if connectionManager fails
//       if (!this._db) {
//         this._db = new Database(this.dbPath, { verbose: console.log });
//       }
//       return this._db;
//     }
//   }

//   static db() {
//     // For backward compatibility with SQLite
//     if (!this._db) {
//       this._db = new Database(this.dbPath, { verbose: console.log });
//     }
//     return this._db;
//   }

//   static async executeQuery(query, params = []) {
//     try {
//       const conn = await this.getConnection();

//       // If it's a MySQL/PostgreSQL connection
//       if (conn.query) {
//         const [rows] = await conn.query(query, params);
//         return rows;
//       }

//       // If it's a SQLite connection
//       const stmt = conn.prepare(query);
//       return stmt.all(...params);
//     } catch (error) {
//       console.error("Query error:", error);
//       throw error;
//     }
//   }

//   static tableName() {
//     if (!this.name) {
//       throw new Error(
//         "Model must have a class name to determine the table name. Ensure the model is defined correctly and extends the Model class."
//       );
//     }
//     return this.name.toLowerCase() + "s"; // Default table name is pluralized class name
//   }

//   // Constructor for model instances
//   constructor(attributes = {}) {
//     Object.assign(this, attributes);
//   }

//   static include(module) {
//     // Copy static properties and methods
//     Object.getOwnPropertyNames(module).forEach((prop) => {
//       if (prop !== "prototype" && prop !== "name" && prop !== "length") {
//         Object.defineProperty(this, prop, {
//           value: module[prop],
//           writable: true,
//           configurable: true,
//           enumerable: true,
//         });
//       }
//     });

//     // Copy prototype methods
//     Object.getOwnPropertyNames(module.prototype).forEach((prop) => {
//       if (prop !== "constructor") {
//         Object.defineProperty(this.prototype, prop, {
//           value: module.prototype[prop],
//           writable: true,
//           configurable: true,
//           enumerable: true,
//         });
//       }
//     });

//     // Ensure validates method is properly bound
//     if (module.validates) {
//       this.validates = function (...args) {
//         return module.validates.apply(this, args);
//       };
//     }
//   }

//   static getModel(modelName) {
//     return ModelLoader.getModel(modelName);
//   }

//   // Fetch all records from the table and return model instances
//   static async all() {
//     const query = `SELECT * FROM ${this.tableName()}`;
//     const records = await this.executeQuery(query);
//     return records.map((record) => new this(record));
//   }

//   // Find a record by its ID and return a model instance
//   static async find(id) {
//     const query = `SELECT * FROM ${this.tableName()} WHERE id = ?`;
//     const records = await this.executeQuery(query, [id]);
//     const record = Array.isArray(records) ? records[0] : records;
//     return record ? new this(record) : null;
//   }

//   // Create a new record and return a model instance
//   static async create(attributes) {
//     // Create a new instance
//     const instance = new this(attributes);

//     // Run validations before saving
//     const errors = instance.validate();
//     if (errors.length > 0) {
//       throw new Error(`Validation failed: ${errors.join(", ")}`);
//     }

//     // If validations pass, save to database
//     const columns = Object.keys(attributes).join(", ");
//     const placeholders = Object.keys(attributes)
//       .map(() => "?")
//       .join(", ");
//     const values = Object.values(attributes);

//     const query = `INSERT INTO ${this.tableName()} (${columns}) VALUES (${placeholders})`;
//     const result = await this.executeQuery(query, values);

//     // Handle different database responses
//     const insertId = result.lastInsertRowid || result.insertId;
//     return this.find(insertId);
//   }

//   // Delete a record by its ID
//   static async delete(id) {
//     const query = `DELETE FROM ${this.tableName()} WHERE id = ?`;
//     return await this.executeQuery(query, [id]);
//   }

//   // Define a `has_many` relationship
//   static hasMany(modelName, foreignKey, options = {}) {
//     // Ensure consistent casing
//     const modelNameLower = modelName.toLowerCase();
//     const relatedKey = modelNameLower + "s";

//     // If foreignKey not provided, generate it
//     if (!foreignKey) {
//       foreignKey = `${this.name.toLowerCase()}_id`;
//     }

//     // Store dependent option
//     if (options.dependent) {
//       if (!this._dependentAssociations) {
//         this._dependentAssociations = new Map();
//       }
//       this._dependentAssociations.set(modelNameLower, {
//         type: "hasMany",
//         dependent: options.dependent,
//         foreignKey,
//       });
//     }

//     this.prototype[relatedKey] = async function () {
//       try {
//         // Get the related model
//         const relatedModel = ModelLoader.getModel(modelNameLower);

//         if (!relatedModel) {
//           throw new Error(
//             `Related model "${modelName}" not found. ` +
//               `Make sure app/models/${modelNameLower}.js exists`
//           );
//         }

//         // Build and execute query
//         const query = `SELECT * FROM ${relatedModel.tableName()} WHERE ${foreignKey} = ?`;

//         // Debug info (optional)
//         if (process.env.DEBUG) {
//           console.log("Query:", query);
//           console.log("ID:", this.id);
//         }

//         // Execute query and return results
//         const records = await this.constructor.executeQuery(query, [this.id]);

//         // Return array of model instances
//         return records.map((record) => new relatedModel(record));
//       } catch (error) {
//         console.error(
//           `Error in ${this.constructor.name}#${relatedKey}():`,
//           error.message
//         );
//         return []; // Return empty array on error
//       }
//     };

//     // Add convenience methods
//     this.prototype[`add${modelName}`] = function (attributes = {}) {
//       const relatedModel = ModelLoader.getModel(modelNameLower);
//       attributes[foreignKey] = this.id;
//       return relatedModel.create(attributes);
//     };

//     this.prototype[`remove${modelName}`] = function (id) {
//       const relatedModel = ModelLoader.getModel(modelNameLower);
//       return relatedModel.delete(id);
//     };
//   }

//   // Define a `belongs_to` relationship
//   static belongsTo(modelName, foreignKey) {
//     const methodName = modelName.toLowerCase();

//     this.prototype[methodName] = async function () {
//       const relatedModel = ModelLoader.getModel(modelName);
//       const query = `SELECT * FROM ${relatedModel.tableName()} WHERE id = ?`;
//       const records = await this.constructor.executeQuery(query, [
//         this[foreignKey],
//       ]);
//       const record = Array.isArray(records) ? records[0] : records;
//       return record ? new relatedModel(record) : null;
//     };
//   }

//   // Find records by conditions
//   static async where(conditions) {
//     const columns = Object.keys(conditions);
//     const values = Object.values(conditions);
//     const whereClause = columns.map((column) => `${column} = ?`).join(" AND ");
//     const query = `SELECT * FROM ${this.tableName()} WHERE ${whereClause}`;
//     const records = await this.executeQuery(query, values);
//     return records.map((record) => new this(record));
//   }

//   // Find first record by conditions
//   static async findBy(conditions) {
//     const columns = Object.keys(conditions);
//     const values = Object.values(conditions);
//     const whereClause = columns.map((column) => `${column} = ?`).join(" AND ");
//     const query = `SELECT * FROM ${this.tableName()} WHERE ${whereClause} LIMIT 1`;
//     const records = await this.executeQuery(query, values);
//     const record = Array.isArray(records) ? records[0] : records;
//     return record ? new this(record) : null;
//   }

//   static hasOne(relatedModel, foreignKey, options = {}) {
//     const methodName = relatedModel.toLowerCase();

//     // Store dependent option
//     if (options.dependent) {
//       if (!this._dependentAssociations) {
//         this._dependentAssociations = new Map();
//       }
//       this._dependentAssociations.set(methodName, {
//         type: "hasOne",
//         dependent: options.dependent,
//         foreignKey,
//       });
//     }

//     this.prototype[methodName] = async function () {
//       const RelatedModel = ModelLoader.getModel(relatedModel);
//       const query = `SELECT * FROM ${RelatedModel.tableName()} WHERE ${foreignKey} = ? LIMIT 1`;
//       const records = await this.constructor.executeQuery(query, [this.id]);
//       const record = Array.isArray(records) ? records[0] : records;
//       return record ? new RelatedModel(record) : null;
//     };
//   }

//   async destroy() {
//     const conn = await this.constructor.getConnection();

//     try {
//       // Begin transaction
//       if (conn.query) {
//         await conn.query("BEGIN");
//       } else {
//         conn.prepare("BEGIN TRANSACTION").run();
//       }

//       // Handle dependent associations
//       if (this.constructor._dependentAssociations) {
//         for (const [modelName, config] of this.constructor
//           ._dependentAssociations) {
//           const RelatedModel = ModelLoader.getModel(modelName);

//           if (config.dependent === "destroy") {
//             const deleteQuery = `DELETE FROM ${RelatedModel.tableName()} WHERE ${
//               config.foreignKey
//             } = ?`;
//             await this.constructor.executeQuery(deleteQuery, [this.id]);
//           } else if (config.dependent === "nullify") {
//             const nullifyQuery = `UPDATE ${RelatedModel.tableName()} SET ${
//               config.foreignKey
//             } = NULL WHERE ${config.foreignKey} = ?`;
//             await this.constructor.executeQuery(nullifyQuery, [this.id]);
//           }
//         }
//       }

//       // Delete the record itself
//       const query = `DELETE FROM ${this.constructor.tableName()} WHERE id = ?`;
//       const result = await this.constructor.executeQuery(query, [this.id]);

//       // Commit transaction
//       if (conn.query) {
//         await conn.query("COMMIT");
//       } else {
//         conn.prepare("COMMIT").run();
//       }

//       // Check if record was deleted
//       const deleted = result.affectedRows > 0 || result.changes > 0;

//       if (deleted) {
//         // Mark the instance as destroyed
//         Object.defineProperty(this, "_destroyed", {
//           value: true,
//           writable: false,
//           configurable: false,
//         });
//         // Clear the id
//         this.id = null;
//         return true;
//       }

//       return false;
//     } catch (error) {
//       // Rollback on error
//       if (conn.query) {
//         await conn.query("ROLLBACK");
//       } else {
//         conn.prepare("ROLLBACK").run();
//       }
//       console.error("Error in destroy:", error);
//       throw error;
//     }
//   }

//   // Add isDestroyed method to check destruction status
//   isDestroyed() {
//     return this._destroyed === true;
//   }

//   // Advanced Querying Methods
//   static async select(columns) {
//     const query = `SELECT ${columns} FROM ${this.tableName()}`;
//     return this.executeQuery(query);
//   }

//   static async limit(count) {
//     const query = `SELECT * FROM ${this.tableName()} LIMIT ${count}`;
//     return this.executeQuery(query);
//   }

//   static async offset(count) {
//     const query = `SELECT * FROM ${this.tableName()} OFFSET ${count}`;
//     return this.executeQuery(query);
//   }

//   static async order(orderBy) {
//     const query = `SELECT * FROM ${this.tableName()} ORDER BY ${orderBy}`;
//     return this.executeQuery(query);
//   }

//   // Schema Information
//   static async columns() {
//     const conn = await this.getConnection();
//     let query;

//     if (conn.query) {
//       // MySQL
//       query = `SHOW COLUMNS FROM ${this.tableName()}`;
//     } else {
//       // SQLite
//       query = `PRAGMA table_info(${this.tableName()})`;
//     }

//     return await this.executeQuery(query);
//   }

//   static async schema() {
//     const conn = await this.getConnection();
//     let query;

//     if (conn.query) {
//       // MySQL
//       query = `SHOW CREATE TABLE ${this.tableName()}`;
//     } else {
//       // SQLite
//       query = `SELECT sql FROM sqlite_master WHERE type='table' AND name=?`;
//     }

//     const result = await this.executeQuery(
//       query,
//       conn.query ? [] : [this.tableName()]
//     );
//     return Array.isArray(result) ? result[0] : result;
//   }

//   // Add formatted output helpers
//   static async columnInfo() {
//     const columns = await this.columns();
//     console.log(`\nTable: ${this.tableName()}`);
//     console.log("Columns:");

//     columns.forEach((col) => {
//       console.log(`  ${col.name || col.Field}:`);
//       console.log(`    type: ${col.type || col.Type}`);
//       console.log(
//         `    null: ${col.notnull || col.Null === "NO" ? "NO" : "YES"}`
//       );
//       console.log(`    default: ${col.dflt_value || col.Default || "NULL"}`);
//       console.log(
//         `    primary key: ${col.pk || col.Key === "PRI" ? "YES" : "NO"}`
//       );
//     });

//     return columns;
//   }

//   static async schemaInfo() {
//     const schema = await this.schema();
//     console.log(`\nTable Definition:`);
//     console.log(schema.sql || schema["Create Table"]);
//     return schema;
//   }

//   // Batch Operations
//   static async updateAll(conditions, attributes) {
//     // Add updated_at timestamp
//     attributes.updated_at = new Date()
//       .toISOString()
//       .slice(0, 19)
//       .replace("T", " ");

//     const sets = Object.entries(attributes)
//       .map(([key, value]) => `${key} = ?`)
//       .join(", ");

//     // Handle NULL conditions differently
//     const where = Object.entries(conditions)
//       .map(([key, value]) => {
//         if (value === null) {
//           return `${key} IS NULL`;
//         }
//         return `${key} = ?`;
//       })
//       .join(" AND ");

//     // Only include non-null values in the values array
//     const values = [
//       ...Object.values(attributes),
//       ...Object.values(conditions).filter((value) => value !== null),
//     ];

//     const query = `UPDATE ${this.tableName()} SET ${sets} WHERE ${where}`;
//     console.log("Query:", query); // Debug log
//     console.log("Values:", values); // Debug log
//     return await this.executeQuery(query, values);
//   }

//   static async destroyAll(conditions) {
//     const conn = await this.getConnection();

//     try {
//       // Begin transaction
//       if (conn.query) {
//         await conn.query("BEGIN");
//       } else {
//         conn.prepare("BEGIN TRANSACTION").run();
//       }

//       // Handle NULL conditions differently
//       const whereClause = Object.entries(conditions)
//         .map(([key, value]) => {
//           if (value === null) {
//             return `${key} IS NULL`;
//           }
//           return `${key} = ?`;
//         })
//         .join(" AND ");

//       const values = Object.values(conditions).filter(
//         (value) => value !== null
//       );

//       // Find all matching records first
//       const findQuery = `SELECT id FROM ${this.tableName()} WHERE ${whereClause}`;
//       const records = await this.executeQuery(findQuery, values);

//       // For each record, handle dependent associations
//       if (this._dependentAssociations && this._dependentAssociations.size > 0) {
//         for (const record of records) {
//           for (const [modelName, config] of this._dependentAssociations) {
//             const RelatedModel = ModelLoader.getModel(modelName);

//             if (config.dependent === "destroy") {
//               await this.executeQuery(
//                 `DELETE FROM ${RelatedModel.tableName()} WHERE ${
//                   config.foreignKey
//                 } = ?`,
//                 [record.id]
//               );
//             } else if (config.dependent === "nullify") {
//               await this.executeQuery(
//                 `UPDATE ${RelatedModel.tableName()} SET ${
//                   config.foreignKey
//                 } = NULL WHERE ${config.foreignKey} = ?`,
//                 [record.id]
//               );
//             }
//           }
//         }
//       }

//       // Now delete the main records
//       const deleteQuery = `DELETE FROM ${this.tableName()} WHERE ${whereClause}`;
//       console.log("Query:", deleteQuery);
//       console.log("Values:", values);
//       const result = await this.executeQuery(deleteQuery, values);

//       // Commit transaction
//       if (conn.query) {
//         await conn.query("COMMIT");
//       } else {
//         conn.prepare("COMMIT").run();
//       }

//       return result;
//     } catch (error) {
//       // Rollback on error
//       if (conn.query) {
//         await conn.query("ROLLBACK");
//       } else {
//         conn.prepare("ROLLBACK").run();
//       }
//       console.error("Error in destroyAll:", error);
//       throw error;
//     }
//   }

//   // Validation Methods
//   static get validations() {
//     return this._validations || {};
//   }

//   isValid() {
//     this.errors = [];

//     // Check each validation rule
//     for (const [field, rules] of Object.entries(this.constructor.validations)) {
//       rules.forEach((rule) => {
//         if (!this.validateField(field, rule)) {
//           this.errors.push(`${field} ${rule.message || "is invalid"}`);
//         }
//       });
//     }

//     return this.errors.length === 0;
//   }

//   validateField(field, rule) {
//     const value = this[field];

//     switch (rule.type) {
//       case "presence":
//         return value !== null && value !== undefined && value !== "";
//       case "length":
//         if (rule.minimum && String(value).length < rule.minimum) return false;
//         if (rule.maximum && String(value).length > rule.maximum) return false;
//         return true;
//       case "format":
//         return rule.pattern.test(value);
//       case "custom":
//         return rule.validate(value, this);
//       default:
//         return true;
//     }
//   }

//   static async count() {
//     const query = `SELECT COUNT(*) as count FROM ${this.tableName()}`;
//     const result = await this.executeQuery(query);
//     return Array.isArray(result) ? result[0].count : result.count;
//   }
// }

// Model.include(Validatable);

// module.exports = Model;

const path = require("path");
const Database = require("better-sqlite3");
const ModelLoader = require("./modelLoader");
const Validatable = require("./validatable");
const connectionManager = require("./database/connectionManager");

class Model {
  static dbPath = path.join(process.cwd(), "db", "development.sqlite3");

  static async getConnection() {
    try {
      return await connectionManager.getConnection();
    } catch (error) {
      if (!this._db) {
        this._db = new Database(this.dbPath, { verbose: console.log });
      }
      return this._db;
    }
  }

  static db() {
    if (!this._db) {
      this._db = new Database(this.dbPath, { verbose: console.log });
    }
    return this._db;
  }

  static async executeQuery(query, params = []) {
    try {
      const conn = await this.getConnection();
      const dbType = connectionManager.getCurrentDatabaseType();

      if (conn.query) {
        if (dbType === "postgresql") {
          let paramCount = 0;
          const convertedQuery = query.replace(/\?/g, () => `$${++paramCount}`);
          const result = await conn.query(convertedQuery, params);
          return result.rows || result;
        } else {
          const [rows] = await conn.query(query, params);
          return rows;
        }
      }

      const stmt = conn.prepare(query);
      return stmt.all(...params);
    } catch (error) {
      console.error("Query error:", error);
      throw error;
    }
  }

  static tableName() {
    if (!this.name) {
      throw new Error(
        "Model must have a class name to determine the table name. Ensure the model is defined correctly and extends the Model class."
      );
    }
    return this.name.toLowerCase() + "s";
  }

  constructor(attributes = {}) {
    Object.assign(this, attributes);
  }

  static include(module) {
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

    if (module.validates) {
      this.validates = function (...args) {
        return module.validates.apply(this, args);
      };
    }
  }

  static getModel(modelName) {
    return ModelLoader.getModel(modelName);
  }

  static async all() {
    const query = `SELECT * FROM ${this.tableName()}`;
    const records = await this.executeQuery(query);
    return records.map((record) => new this(record));
  }

  static async find(id) {
    const query = `SELECT * FROM ${this.tableName()} WHERE id = ?`;
    const records = await this.executeQuery(query, [id]);
    const record = Array.isArray(records) ? records[0] : records;
    return record ? new this(record) : null;
  }

  static async create(attributes) {
    const instance = new this(attributes);
    const errors = instance.validate();
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(", ")}`);
    }

    const dbType = connectionManager.getCurrentDatabaseType();
    const columns = Object.keys(attributes);
    const values = Object.values(attributes);

    let query;
    if (dbType === "postgresql") {
      const placeholders = values.map((_, i) => `$${i + 1}`);
      query = `
        INSERT INTO ${this.tableName()} 
        (${columns.map((col) => `"${col}"`).join(", ")}) 
        VALUES (${placeholders.join(", ")})
        RETURNING *
      `;
    } else {
      const placeholders = values.map(() => "?");
      const columnQuotes = dbType === "mysql" ? "`" : '"';
      query = `
        INSERT INTO ${this.tableName()} 
        (${columns
          .map((col) => `${columnQuotes}${col}${columnQuotes}`)
          .join(", ")}) 
        VALUES (${placeholders.join(", ")})
      `;
    }

    try {
      const result = await this.executeQuery(query, values);
      if (dbType === "postgresql") {
        return new this(result[0]);
      } else if (dbType === "mysql") {
        return this.find(result.insertId);
      } else {
        return this.find(result.lastInsertRowid);
      }
    } catch (error) {
      console.error("Error in create:", error);
      throw error;
    }
  }

  static async delete(id) {
    const query = `DELETE FROM ${this.tableName()} WHERE id = ?`;
    return await this.executeQuery(query, [id]);
  }

  static async where(conditions) {
    const columns = Object.keys(conditions);
    const values = Object.values(conditions);
    const whereClause = columns.map((column) => `${column} = ?`).join(" AND ");
    const query = `SELECT * FROM ${this.tableName()} WHERE ${whereClause}`;
    const records = await this.executeQuery(query, values);
    return records.map((record) => new this(record));
  }

  static async findBy(conditions) {
    const columns = Object.keys(conditions);
    const values = Object.values(conditions);
    const whereClause = columns.map((column) => `${column} = ?`).join(" AND ");
    const query = `SELECT * FROM ${this.tableName()} WHERE ${whereClause} LIMIT 1`;
    const records = await this.executeQuery(query, values);
    const record = Array.isArray(records) ? records[0] : records;
    return record ? new this(record) : null;
  }

  static hasMany(modelName, foreignKey, options = {}) {
    const modelNameLower = modelName.toLowerCase();
    const relatedKey = modelNameLower + "s";

    if (!foreignKey) {
      foreignKey = `${this.name.toLowerCase()}_id`;
    }

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

    this.prototype[relatedKey] = async function () {
      try {
        const relatedModel = ModelLoader.getModel(modelNameLower);

        if (!relatedModel) {
          throw new Error(
            `Related model "${modelName}" not found. Make sure app/models/${modelNameLower}.js exists`
          );
        }

        const query = `SELECT * FROM ${relatedModel.tableName()} WHERE ${foreignKey} = ?`;

        if (process.env.DEBUG) {
          console.log("Query:", query);
          console.log("ID:", this.id);
        }

        const records = await this.constructor.executeQuery(query, [this.id]);
        return records.map((record) => new relatedModel(record));
      } catch (error) {
        console.error(
          `Error in ${this.constructor.name}#${relatedKey}():`,
          error.message
        );
        return [];
      }
    };

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

  static belongsTo(modelName, foreignKey) {
    const methodName = modelName.toLowerCase();

    this.prototype[methodName] = async function () {
      const relatedModel = ModelLoader.getModel(modelName);
      const query = `SELECT * FROM ${relatedModel.tableName()} WHERE id = ?`;
      const records = await this.constructor.executeQuery(query, [
        this[foreignKey],
      ]);
      const record = Array.isArray(records) ? records[0] : records;
      return record ? new relatedModel(record) : null;
    };
  }

  static hasOne(relatedModel, foreignKey, options = {}) {
    const methodName = relatedModel.toLowerCase();

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

    this.prototype[methodName] = async function () {
      const RelatedModel = ModelLoader.getModel(relatedModel);
      const query = `SELECT * FROM ${RelatedModel.tableName()} WHERE ${foreignKey} = ? LIMIT 1`;
      const records = await this.constructor.executeQuery(query, [this.id]);
      const record = Array.isArray(records) ? records[0] : records;
      return record ? new RelatedModel(record) : null;
    };
  }

  static async select(columns) {
    const query = `SELECT ${columns} FROM ${this.tableName()}`;
    return await this.executeQuery(query);
  }

  static async limit(count) {
    const query = `SELECT * FROM ${this.tableName()} LIMIT ${count}`;
    return await this.executeQuery(query);
  }

  static async offset(count) {
    const query = `SELECT * FROM ${this.tableName()} OFFSET ${count}`;
    return await this.executeQuery(query);
  }

  static async order(orderBy) {
    const query = `SELECT * FROM ${this.tableName()} ORDER BY ${orderBy}`;
    return await this.executeQuery(query);
  }

  static async columns() {
    const dbType = connectionManager.getCurrentDatabaseType();
    let query;

    switch (dbType) {
      case "postgresql":
        query = `
          SELECT 
            column_name as name,
            data_type as type,
            is_nullable,
            column_default as default_value,
            case when pk.column_name is not null then true else false end as is_primary
          FROM information_schema.columns c
          LEFT JOIN (
            SELECT ku.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage ku
              ON tc.constraint_name = ku.constraint_name
            WHERE tc.constraint_type = 'PRIMARY KEY'
              AND tc.table_name = $1
          ) pk ON c.column_name = pk.column_name
          WHERE table_name = $1
        `;
        break;
      case "mysql":
        query = `DESCRIBE ${this.tableName()}`;
        break;
      default:
        query = `PRAGMA table_info(${this.tableName()})`;
    }

    return await this.executeQuery(query, [this.tableName()]);
  }

  static async schema() {
    const dbType = connectionManager.getCurrentDatabaseType();
    let query;

    switch (dbType) {
      case "postgresql":
        query = `
          SELECT
            'CREATE TABLE ' || quote_ident(c.table_name) || ' (' ||
            string_agg(
              quote_ident(c.column_name) || ' ' ||
              c.data_type ||
              CASE WHEN c.character_maximum_length IS NOT NULL
                   THEN '(' || c.character_maximum_length || ')'
                   ELSE ''
              END ||
              CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
              CASE WHEN pk.column_name IS NOT NULL THEN ' PRIMARY KEY' ELSE '' END,
              ', '
            ) || ')' as sql
          FROM information_schema.columns c
          LEFT JOIN (
            SELECT ku.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage ku
              ON tc.constraint_name = ku.constraint_name
            WHERE tc.constraint_type = 'PRIMARY KEY'
              AND tc.table_name = $1
          ) pk ON c.column_name = pk.column_name
          WHERE c.table_name = $1
          GROUP BY c.table_name
        `;
        break;
      case "mysql":
        query = `SHOW CREATE TABLE ${this.tableName()}`;
        break;
      default:
        query = `SELECT sql FROM sqlite_master WHERE type='table' AND name=?`;
    }

    const result = await this.executeQuery(
      query,
      dbType === "postgresql" ? [this.tableName()] : []
    );
    return Array.isArray(result) ? result[0] : result;
  }

  static async columnInfo() {
    const columns = await this.columns();
    console.log(`\nTable: ${this.tableName()}`);
    console.log("Columns:");

    columns.forEach((col) => {
      console.log(`  ${col.name || col.Field || col.column_name}:`);
      console.log(`    type: ${col.type || col.Type || col.data_type}`);
      console.log(
        `    null: ${
          col.notnull || col.Null === "NO" || col.is_nullable === "NO"
            ? "NO"
            : "YES"
        }`
      );
      console.log(
        `    default: ${
          col.dflt_value || col.Default || col.column_default || "NULL"
        }`
      );
      console.log(
        `    primary key: ${
          col.pk || col.Key === "PRI" || col.is_primary ? "YES" : "NO"
        }`
      );
    });

    return columns;
  }

  static async schemaInfo() {
    const schema = await this.schema();
    console.log(`\nTable Definition:`);
    console.log(schema.sql || schema["Create Table"]);
    return schema;
  }

  static async updateAll(conditions, attributes) {
    attributes.updated_at = new Date()
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    const sets = Object.entries(attributes)
      .map(([key, value]) => `${key} = ?`)
      .join(", ");

    const where = Object.entries(conditions)
      .map(([key, value]) => {
        if (value === null) {
          return `${key} IS NULL`;
        }
        return `${key} = ?`;
      })
      .join(" AND ");

    const values = [
      ...Object.values(attributes),
      ...Object.values(conditions).filter((value) => value !== null),
    ];

    const query = `UPDATE ${this.tableName()} SET ${sets} WHERE ${where}`;
    console.log("Query:", query);
    console.log("Values:", values);
    return await this.executeQuery(query, values);
  }

  static async destroyAll(conditions) {
    const conn = await this.getConnection();
    const dbType = connectionManager.getCurrentDatabaseType();

    try {
      // Begin transaction based on database type
      if (conn.query) {
        if (dbType === "postgresql") {
          await conn.query("BEGIN");
        } else {
          await conn.query("START TRANSACTION");
        }
      } else {
        conn.prepare("BEGIN TRANSACTION").run();
      }

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

      const findQuery = `SELECT id FROM ${this.tableName()} WHERE ${whereClause}`;
      const records = await this.executeQuery(findQuery, values);

      if (this._dependentAssociations && this._dependentAssociations.size > 0) {
        for (const record of records) {
          for (const [modelName, config] of this._dependentAssociations) {
            const RelatedModel = ModelLoader.getModel(modelName);

            if (config.dependent === "destroy") {
              await this.executeQuery(
                `DELETE FROM ${RelatedModel.tableName()} WHERE ${
                  config.foreignKey
                } = ?`,
                [record.id]
              );
            } else if (config.dependent === "nullify") {
              await this.executeQuery(
                `UPDATE ${RelatedModel.tableName()} SET ${
                  config.foreignKey
                } = NULL WHERE ${config.foreignKey} = ?`,
                [record.id]
              );
            }
          }
        }
      }

      const deleteQuery = `DELETE FROM ${this.tableName()} WHERE ${whereClause}`;
      console.log("Query:", deleteQuery);
      console.log("Values:", values);
      const result = await this.executeQuery(deleteQuery, values);

      // Commit transaction based on database type
      if (conn.query) {
        await conn.query("COMMIT");
      } else {
        conn.prepare("COMMIT").run();
      }

      return result;
    } catch (error) {
      // Rollback transaction based on database type
      if (conn.query) {
        await conn.query("ROLLBACK");
      } else {
        conn.prepare("ROLLBACK").run();
      }
      console.error("Error in destroyAll:", error);
      throw error;
    }
  }

  isDestroyed() {
    return this._destroyed === true;
  }

  static get validations() {
    return this._validations || {};
  }

  isValid() {
    this.errors = [];

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

  static async count() {
    const query = `SELECT COUNT(*) as count FROM ${this.tableName()}`;
    const result = await this.executeQuery(query);
    return Array.isArray(result) ? result[0].count : result.count;
  }
}

Model.include(Validatable);

module.exports = Model;
