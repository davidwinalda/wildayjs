// const path = require("path");
// const Database = require("better-sqlite3");
// const ModelLoader = require("./modelLoader");
// const Validatable = require("./validatable");
// const connectionManager = require("./database/connectionManager");

// class Model {
//   static dbPath = path.join(process.cwd(), "db", "development.sqlite3");

//   static async getConnection() {
//     try {
//       return await connectionManager.getConnection();
//     } catch (error) {
//       if (!this._db) {
//         this._db = new Database(this.dbPath, { verbose: console.log });
//       }
//       return this._db;
//     }
//   }

//   static db() {
//     if (!this._db) {
//       this._db = new Database(this.dbPath, { verbose: console.log });
//     }
//     return this._db;
//   }

//   static async executeQuery(query, params = []) {
//     try {
//       const conn = await this.getConnection();
//       const dbType = connectionManager.getCurrentDatabaseType();

//       if (conn.query) {
//         if (dbType === "postgresql") {
//           let paramCount = 0;
//           const convertedQuery = query.replace(/\?/g, () => `$${++paramCount}`);
//           const result = await conn.query(convertedQuery, params);
//           return result.rows || result;
//         } else {
//           const [rows] = await conn.query(query, params);
//           return rows;
//         }
//       }

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
//     return this.name.toLowerCase() + "s";
//   }

//   constructor(attributes = {}) {
//     Object.assign(this, attributes);
//   }

//   static include(module) {
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

//     if (module.validates) {
//       this.validates = function (...args) {
//         return module.validates.apply(this, args);
//       };
//     }
//   }

//   static getModel(modelName) {
//     return ModelLoader.getModel(modelName);
//   }

//   static async all() {
//     const query = `SELECT * FROM ${this.tableName()}`;
//     const records = await this.executeQuery(query);
//     return records.map((record) => new this(record));
//   }

//   static async find(id) {
//     const query = `SELECT * FROM ${this.tableName()} WHERE id = ?`;
//     const records = await this.executeQuery(query, [id]);
//     const record = Array.isArray(records) ? records[0] : records;
//     return record ? new this(record) : null;
//   }

//   static async create(attributes) {
//     const instance = new this(attributes);
//     const errors = instance.validate();
//     if (errors.length > 0) {
//       throw new Error(`Validation failed: ${errors.join(", ")}`);
//     }

//     const dbType = connectionManager.getCurrentDatabaseType();
//     const columns = Object.keys(attributes);
//     const values = Object.values(attributes);

//     let query;
//     if (dbType === "postgresql") {
//       const placeholders = values.map((_, i) => `$${i + 1}`);
//       query = `
//         INSERT INTO ${this.tableName()}
//         (${columns.map((col) => `"${col}"`).join(", ")})
//         VALUES (${placeholders.join(", ")})
//         RETURNING *
//       `;
//     } else {
//       const placeholders = values.map(() => "?");
//       const columnQuotes = dbType === "mysql" ? "`" : '"';
//       query = `
//         INSERT INTO ${this.tableName()}
//         (${columns
//           .map((col) => `${columnQuotes}${col}${columnQuotes}`)
//           .join(", ")})
//         VALUES (${placeholders.join(", ")})
//       `;
//     }

//     try {
//       const result = await this.executeQuery(query, values);
//       if (dbType === "postgresql") {
//         return new this(result[0]);
//       } else if (dbType === "mysql") {
//         return this.find(result.insertId);
//       } else {
//         return this.find(result.lastInsertRowid);
//       }
//     } catch (error) {
//       console.error("Error in create:", error);
//       throw error;
//     }
//   }

//   static async delete(id) {
//     const query = `DELETE FROM ${this.tableName()} WHERE id = ?`;
//     return await this.executeQuery(query, [id]);
//   }

//   static async where(conditions) {
//     const columns = Object.keys(conditions);
//     const values = Object.values(conditions);
//     const whereClause = columns.map((column) => `${column} = ?`).join(" AND ");
//     const query = `SELECT * FROM ${this.tableName()} WHERE ${whereClause}`;
//     const records = await this.executeQuery(query, values);
//     return records.map((record) => new this(record));
//   }

//   static async findBy(conditions) {
//     const columns = Object.keys(conditions);
//     const values = Object.values(conditions);
//     const whereClause = columns.map((column) => `${column} = ?`).join(" AND ");
//     const query = `SELECT * FROM ${this.tableName()} WHERE ${whereClause} LIMIT 1`;
//     const records = await this.executeQuery(query, values);
//     const record = Array.isArray(records) ? records[0] : records;
//     return record ? new this(record) : null;
//   }

//   static hasMany(modelName, foreignKey, options = {}) {
//     const modelNameLower = modelName.toLowerCase();
//     const relatedKey = modelNameLower + "s";

//     if (!foreignKey) {
//       foreignKey = `${this.name.toLowerCase()}_id`;
//     }

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
//         const relatedModel = ModelLoader.getModel(modelNameLower);

//         if (!relatedModel) {
//           throw new Error(
//             `Related model "${modelName}" not found. Make sure app/models/${modelNameLower}.js exists`
//           );
//         }

//         const query = `SELECT * FROM ${relatedModel.tableName()} WHERE ${foreignKey} = ?`;

//         if (process.env.DEBUG) {
//           console.log("Query:", query);
//           console.log("ID:", this.id);
//         }

//         const records = await this.constructor.executeQuery(query, [this.id]);
//         return records.map((record) => new relatedModel(record));
//       } catch (error) {
//         console.error(
//           `Error in ${this.constructor.name}#${relatedKey}():`,
//           error.message
//         );
//         return [];
//       }
//     };

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

//   static hasOne(relatedModel, foreignKey, options = {}) {
//     const methodName = relatedModel.toLowerCase();

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

//   static async select(columns) {
//     const query = `SELECT ${columns} FROM ${this.tableName()}`;
//     return await this.executeQuery(query);
//   }

//   static async limit(count) {
//     const query = `SELECT * FROM ${this.tableName()} LIMIT ${count}`;
//     return await this.executeQuery(query);
//   }

//   static async offset(count) {
//     const query = `SELECT * FROM ${this.tableName()} OFFSET ${count}`;
//     return await this.executeQuery(query);
//   }

//   static async order(orderBy) {
//     const query = `SELECT * FROM ${this.tableName()} ORDER BY ${orderBy}`;
//     return await this.executeQuery(query);
//   }

//   static async columns() {
//     const dbType = connectionManager.getCurrentDatabaseType();
//     let query;

//     switch (dbType) {
//       case "postgresql":
//         query = `
//           SELECT
//             column_name as name,
//             data_type as type,
//             is_nullable,
//             column_default as default_value,
//             case when pk.column_name is not null then true else false end as is_primary
//           FROM information_schema.columns c
//           LEFT JOIN (
//             SELECT ku.column_name
//             FROM information_schema.table_constraints tc
//             JOIN information_schema.key_column_usage ku
//               ON tc.constraint_name = ku.constraint_name
//             WHERE tc.constraint_type = 'PRIMARY KEY'
//               AND tc.table_name = $1
//           ) pk ON c.column_name = pk.column_name
//           WHERE table_name = $1
//         `;
//         break;
//       case "mysql":
//         query = `DESCRIBE ${this.tableName()}`;
//         break;
//       default:
//         query = `PRAGMA table_info(${this.tableName()})`;
//     }

//     return await this.executeQuery(query, [this.tableName()]);
//   }

//   static async schema() {
//     const dbType = connectionManager.getCurrentDatabaseType();
//     let query;

//     switch (dbType) {
//       case "postgresql":
//         query = `
//           SELECT
//             'CREATE TABLE ' || quote_ident(c.table_name) || ' (' ||
//             string_agg(
//               quote_ident(c.column_name) || ' ' ||
//               c.data_type ||
//               CASE WHEN c.character_maximum_length IS NOT NULL
//                    THEN '(' || c.character_maximum_length || ')'
//                    ELSE ''
//               END ||
//               CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
//               CASE WHEN pk.column_name IS NOT NULL THEN ' PRIMARY KEY' ELSE '' END,
//               ', '
//             ) || ')' as sql
//           FROM information_schema.columns c
//           LEFT JOIN (
//             SELECT ku.column_name
//             FROM information_schema.table_constraints tc
//             JOIN information_schema.key_column_usage ku
//               ON tc.constraint_name = ku.constraint_name
//             WHERE tc.constraint_type = 'PRIMARY KEY'
//               AND tc.table_name = $1
//           ) pk ON c.column_name = pk.column_name
//           WHERE c.table_name = $1
//           GROUP BY c.table_name
//         `;
//         break;
//       case "mysql":
//         query = `SHOW CREATE TABLE ${this.tableName()}`;
//         break;
//       default:
//         query = `SELECT sql FROM sqlite_master WHERE type='table' AND name=?`;
//     }

//     const result = await this.executeQuery(
//       query,
//       dbType === "postgresql" ? [this.tableName()] : []
//     );
//     return Array.isArray(result) ? result[0] : result;
//   }

//   static async columnInfo() {
//     const columns = await this.columns();
//     console.log(`\nTable: ${this.tableName()}`);
//     console.log("Columns:");

//     columns.forEach((col) => {
//       console.log(`  ${col.name || col.Field || col.column_name}:`);
//       console.log(`    type: ${col.type || col.Type || col.data_type}`);
//       console.log(
//         `    null: ${
//           col.notnull || col.Null === "NO" || col.is_nullable === "NO"
//             ? "NO"
//             : "YES"
//         }`
//       );
//       console.log(
//         `    default: ${
//           col.dflt_value || col.Default || col.column_default || "NULL"
//         }`
//       );
//       console.log(
//         `    primary key: ${
//           col.pk || col.Key === "PRI" || col.is_primary ? "YES" : "NO"
//         }`
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

//   static async updateAll(conditions, attributes) {
//     attributes.updated_at = new Date()
//       .toISOString()
//       .slice(0, 19)
//       .replace("T", " ");

//     const sets = Object.entries(attributes)
//       .map(([key, value]) => `${key} = ?`)
//       .join(", ");

//     const where = Object.entries(conditions)
//       .map(([key, value]) => {
//         if (value === null) {
//           return `${key} IS NULL`;
//         }
//         return `${key} = ?`;
//       })
//       .join(" AND ");

//     const values = [
//       ...Object.values(attributes),
//       ...Object.values(conditions).filter((value) => value !== null),
//     ];

//     const query = `UPDATE ${this.tableName()} SET ${sets} WHERE ${where}`;
//     console.log("Query:", query);
//     console.log("Values:", values);
//     return await this.executeQuery(query, values);
//   }

//   static async destroyAll(conditions) {
//     const conn = await this.getConnection();
//     const dbType = connectionManager.getCurrentDatabaseType();

//     try {
//       // Begin transaction based on database type
//       if (conn.query) {
//         if (dbType === "postgresql") {
//           await conn.query("BEGIN");
//         } else {
//           await conn.query("START TRANSACTION");
//         }
//       } else {
//         conn.prepare("BEGIN TRANSACTION").run();
//       }

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

//       const findQuery = `SELECT id FROM ${this.tableName()} WHERE ${whereClause}`;
//       const records = await this.executeQuery(findQuery, values);

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

//       const deleteQuery = `DELETE FROM ${this.tableName()} WHERE ${whereClause}`;
//       console.log("Query:", deleteQuery);
//       console.log("Values:", values);
//       const result = await this.executeQuery(deleteQuery, values);

//       // Commit transaction based on database type
//       if (conn.query) {
//         await conn.query("COMMIT");
//       } else {
//         conn.prepare("COMMIT").run();
//       }

//       return result;
//     } catch (error) {
//       // Rollback transaction based on database type
//       if (conn.query) {
//         await conn.query("ROLLBACK");
//       } else {
//         conn.prepare("ROLLBACK").run();
//       }
//       console.error("Error in destroyAll:", error);
//       throw error;
//     }
//   }

//   isDestroyed() {
//     return this._destroyed === true;
//   }

//   static get validations() {
//     return this._validations || {};
//   }

//   isValid() {
//     this.errors = [];

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

// ------------------------------------------------------------

// const path = require("path");
// const Database = require("better-sqlite3");
// const ModelLoader = require("./modelLoader");
// const Validatable = require("./validatable");
// const connectionManager = require("./database/connectionManager");
// const knexManager = require("./knex-migrations/knexManager");
// const pluralize = require("pluralize");

// class Model {
//   static dbPath = path.join(process.cwd(), "db", "development.sqlite3");
//   static _knex = null;

//   static async getKnex() {
//     if (!this._knex) {
//       this._knex = knexManager.getInstance();
//     }
//     return this._knex;
//   }

//   static async getConnection() {
//     try {
//       // Try Knex first
//       const knex = await this.getKnex();
//       if (knex) return knex;

//       // Fallback to regular connection
//       return await connectionManager.getConnection();
//     } catch (error) {
//       if (!this._db) {
//         this._db = new Database(this.dbPath, { verbose: console.log });
//       }
//       return this._db;
//     }
//   }

//   static db() {
//     if (!this._db) {
//       this._db = new Database(this.dbPath, { verbose: console.log });
//     }
//     return this._db;
//   }

//   static async executeQuery(query, params = []) {
//     try {
//       const conn = await this.getConnection();
//       const dbType = connectionManager.getCurrentDatabaseType();
//       const knex = await this.getKnex();

//       // If we have a Knex instance, use it
//       if (knex) {
//         return await knex.raw(query, params);
//       }

//       // Otherwise use existing query execution
//       if (conn.query) {
//         if (dbType === "postgresql") {
//           let paramCount = 0;
//           const convertedQuery = query.replace(/\?/g, () => `$${++paramCount}`);
//           const result = await conn.query(convertedQuery, params);
//           return result.rows || result;
//         } else {
//           const [rows] = await conn.query(query, params);
//           return rows;
//         }
//       }

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
//     return pluralize(this.name.toLowerCase());
//   }

//   constructor(attributes = {}) {
//     Object.assign(this, attributes);
//     // Ensure the instance has the correct prototype
//     if (this.constructor.prototype instanceof Model) {
//       Object.setPrototypeOf(this, this.constructor.prototype);
//     }
//   }

//   static include(module) {
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

//     if (module.validates) {
//       this.validates = function (...args) {
//         return module.validates.apply(this, args);
//       };
//     }
//   }

//   static getModel(modelName) {
//     return ModelLoader.getModel(modelName);
//   }

//   static makeChainable(instance) {
//     console.log("Making chainable object...");

//     const queryBuilder = {
//       _conditions: [],
//       _modelClass: this,
//       _executed: false,
//       _includes: [], // For eager loading associations

//       // Chain methods
//       limit(n) {
//         console.log("Adding limit condition:", n);
//         this._conditions.push({ type: "limit", value: n });
//         console.log("Current conditions:", this._conditions);
//         return this;
//       },

//       order(orderBy) {
//         console.log("Adding order condition:", orderBy);
//         this._conditions.push({ type: "order", value: orderBy });
//         console.log("Current conditions:", this._conditions);
//         return this;
//       },

//       where(conditions) {
//         console.log("Adding where condition:", conditions);
//         this._conditions.push({ type: "where", value: conditions });
//         console.log("Current conditions:", this._conditions);
//         return this;
//       },

//       // New methods
//       includes(association) {
//         console.log("Adding include:", association);
//         this._includes.push(association);
//         return this;
//       },

//       offset(n) {
//         console.log("Adding offset condition:", n);
//         this._conditions.push({ type: "offset", value: n });
//         return this;
//       },

//       select(...columns) {
//         console.log("Adding select condition:", columns);
//         this._conditions.push({ type: "select", value: columns });
//         return this;
//       },

//       // Get first record
//       async first() {
//         console.log("Executing first()...");
//         this._conditions.push({ type: "limit", value: 1 });
//         const results = await this.execute();
//         return results[0] || null;
//       },

//       // Execute the query
//       async execute() {
//         console.log("Executing query...");
//         console.log("Conditions to apply:", this._conditions);

//         try {
//           const knex = await this._modelClass.getKnex();
//           console.log("Got knex instance");

//           let query = knex(this._modelClass.tableName());
//           console.log("Initial query:", query.toString());

//           // Apply all conditions
//           for (const condition of this._conditions) {
//             console.log("Applying condition:", condition);

//             switch (condition.type) {
//               case "limit":
//                 query = query.limit(condition.value);
//                 break;
//               case "offset":
//                 query = query.offset(condition.value);
//                 break;
//               case "order":
//                 const [column, direction = "asc"] = condition.value.split(" ");
//                 query = query.orderBy(column, direction);
//                 break;
//               case "where":
//                 query = query.where(condition.value);
//                 break;
//               case "select":
//                 query = query.select(...condition.value);
//                 break;
//             }

//             console.log("Query after condition:", query.toString());
//           }

//           console.log("Final query:", query.toString());
//           const records = await query.select("*");
//           console.log("Query results:", records);

//           let results = records.map((record) => new this._modelClass(record));

//           // Handle includes (eager loading)
//           if (this._includes.length > 0) {
//             console.log("Processing includes:", this._includes);
//             for (const association of this._includes) {
//               for (const result of results) {
//                 result[association] = await result[association]();
//               }
//             }
//           }

//           this._result = results;
//           this._executed = true;

//           console.log("Returning results");
//           return this._result;
//         } catch (error) {
//           console.error("Error executing query:", error);
//           throw error;
//         }
//       },

//       // Make thenable
//       then(resolve, reject) {
//         console.log("Then called, executing query...");
//         return this.execute().then(resolve, reject);
//       },
//     };

//     console.log("Created query builder:", queryBuilder);
//     return queryBuilder;
//   }

//   toString() {
//     return `[QueryBuilder: ${JSON.stringify(this._conditions)}]`;
//   }

//   static isChainable(obj) {
//     return (
//       obj && typeof obj.limit === "function" && typeof obj.order === "function"
//     );
//   }

//   static async all() {
//     try {
//       const knex = await this.getKnex();
//       if (knex) {
//         const query = knex(this.tableName());
//         const records = await query;
//         const instances = records.map((record) => new this(record));
//         return this.makeChainable(instances);
//       }

//       // Fallback to existing implementation
//       const query = `SELECT * FROM ${this.tableName()}`;
//       const records = await this.executeQuery(query);
//       const instances = records.map((record) => new this(record));
//       return this.makeChainable(instances);
//     } catch (error) {
//       console.error("Error in all():", error);
//       throw error;
//     }
//   }

//   // Static methods that start the chain
//   static find(id) {
//     console.log("Static find called with:", id);
//     return this.makeChainable().where({ id }).first();
//   }

//   static findBy(conditions) {
//     console.log("Static findBy called with:", conditions);
//     return this.makeChainable().where(conditions).first();
//   }

//   // static async find(id) {
//   //   console.log(`find called with id: ${id}`);
//   //   try {
//   //     const knex = await this.getKnex();
//   //     if (knex) {
//   //       console.log("Using Knex for find");
//   //       const record = await knex(this.tableName()).where("id", id).first();
//   //       console.log("Found record:", record);
//   //       const instance = record ? new this(record) : null;
//   //       console.log("Created instance:", instance);
//   //       return this.makeChainable(instance);
//   //     }

//   //     console.log("Using raw SQL for find");
//   //     const query = `SELECT * FROM ${this.tableName()} WHERE id = ?`;
//   //     const records = await this.executeQuery(query, [id]);
//   //     const record = Array.isArray(records) ? records[0] : records;
//   //     console.log("Found record:", record);
//   //     const instance = record ? new this(record) : null;
//   //     console.log("Created instance:", instance);
//   //     return this.makeChainable(instance);
//   //   } catch (error) {
//   //     console.error("Error in find():", error);
//   //     throw error;
//   //   }
//   // }

//   static async create(attributes) {
//     const instance = new this(attributes);
//     const errors = instance.validate();
//     if (errors.length > 0) {
//       throw new Error(`Validation failed: ${errors.join(", ")}`);
//     }

//     try {
//       const knex = await this.getKnex();
//       if (knex) {
//         // Fix: Handle different database types for insert
//         const dbType = connectionManager.getCurrentDatabaseType();
//         let result;

//         if (dbType === "postgresql") {
//           [result] = await knex(this.tableName())
//             .insert(attributes)
//             .returning("*");
//           return new this(result);
//         } else if (dbType === "mysql") {
//           [result] = await knex(this.tableName()).insert(attributes);
//           return await this.find(result);
//         } else {
//           // SQLite
//           result = await knex(this.tableName()).insert(attributes);
//           return await this.find(result);
//         }
//       }

//       // Fallback to existing implementation
//       const dbType = connectionManager.getCurrentDatabaseType();
//       const columns = Object.keys(attributes);
//       const values = Object.values(attributes);

//       let query;
//       if (dbType === "postgresql") {
//         const placeholders = values.map((_, i) => `$${i + 1}`);
//         query = `
//           INSERT INTO ${this.tableName()}
//           (${columns.map((col) => `"${col}"`).join(", ")})
//           VALUES (${placeholders.join(", ")})
//           RETURNING *
//         `;
//       } else {
//         const placeholders = values.map(() => "?");
//         const columnQuotes = dbType === "mysql" ? "`" : '"';
//         query = `
//           INSERT INTO ${this.tableName()}
//           (${columns
//             .map((col) => `${columnQuotes}${col}${columnQuotes}`)
//             .join(", ")})
//           VALUES (${placeholders.join(", ")})
//         `;
//       }

//       const result = await this.executeQuery(query, values);
//       if (dbType === "postgresql") {
//         return new this(result[0]);
//       } else if (dbType === "mysql") {
//         return this.find(result.insertId);
//       } else {
//         return this.find(result.lastInsertRowid);
//       }
//     } catch (error) {
//       console.error("Error in create:", error);
//       throw error;
//     }
//   }

//   static async delete(id) {
//     try {
//       const knex = await this.getKnex();
//       if (knex) {
//         await knex(this.tableName()).where("id", id).delete();
//         return true;
//       }

//       // Fallback to existing implementation
//       const query = `DELETE FROM ${this.tableName()} WHERE id = ?`;
//       return await this.executeQuery(query, [id]);
//     } catch (error) {
//       console.error("Error in delete:", error);
//       throw error;
//     }
//   }

//   // static async where(conditions) {
//   //   try {
//   //     console.log(`\nExecuting where() for ${this.name}`);
//   //     console.log("Conditions:", conditions);

//   //     const knex = await this.getKnex();
//   //     if (knex) {
//   //       console.log("Using Knex for where()");
//   //       // Execute the query immediately by adding .select('*')
//   //       const records = await knex(this.tableName())
//   //         .where(conditions)
//   //         .select("*");

//   //       console.log(`Found ${records.length} records`);
//   //       const instances = records.map((record) => {
//   //         const instance = new this(record);
//   //         console.log("Created instance:", instance);
//   //         return instance;
//   //       });
//   //       return this.makeChainable(instances);
//   //     }

//   //     // Fallback to existing implementation
//   //     console.log("Using raw SQL for where()");
//   //     const columns = Object.keys(conditions);
//   //     const values = Object.values(conditions);
//   //     const whereClause = columns
//   //       .map((column) => `${column} = ?`)
//   //       .join(" AND ");
//   //     const query = `SELECT * FROM ${this.tableName()} WHERE ${whereClause}`;
//   //     console.log("Query:", query);
//   //     console.log("Values:", values);

//   //     const records = await this.executeQuery(query, values);
//   //     console.log(`Found ${records.length} records`);
//   //     const instances = records.map((record) => {
//   //       const instance = new this(record);
//   //       console.log("Created instance:", instance);
//   //       return instance;
//   //     });
//   //     return this.makeChainable(instances);
//   //   } catch (error) {
//   //     console.error("Error in where:", error);
//   //     throw error;
//   //   }
//   // }

//   static where(conditions) {
//     console.log("Static where called with:", conditions);
//     return this.makeChainable().where(conditions);
//   }

//   // static async findBy(conditions) {
//   //   try {
//   //     const knex = await this.getKnex();
//   //     if (knex) {
//   //       const record = await knex(this.tableName()).where(conditions).first();
//   //       if (!record) {
//   //         console.log("No record found");
//   //         return null;
//   //       }
//   //       const instance = new this(record);
//   //       return this.makeChainable(instance);
//   //     }

//   //     // Fallback to existing implementation
//   //     const columns = Object.keys(conditions);
//   //     const values = Object.values(conditions);
//   //     const whereClause = columns
//   //       .map((column) => `${column} = ?`)
//   //       .join(" AND ");
//   //     const query = `SELECT * FROM ${this.tableName()} WHERE ${whereClause} LIMIT 1`;

//   //     const records = await this.executeQuery(query, values);
//   //     const record = Array.isArray(records) ? records[0] : records;
//   //     if (!record) {
//   //       return null;
//   //     }
//   //     const instance = new this(record);
//   //     return this.makeChainable(instance);
//   //   } catch (error) {
//   //     throw error;
//   //   }
//   // }

//   static hasMany(modelName, foreignKey, options = {}) {
//     console.log(`Setting up hasMany association: ${modelName}`);

//     if (!this._associations) {
//       this._associations = new Map();
//     }

//     const className =
//       modelName.charAt(0).toUpperCase() +
//       modelName.slice(1).toLowerCase().replace(/s$/, "");
//     const methodName = modelName.toLowerCase();

//     console.log(`Association details:`, {
//       className,
//       methodName,
//       foreignKey: foreignKey || `${this.name.toLowerCase()}_id`,
//     });

//     // Set up foreign key if not provided
//     if (!foreignKey) {
//       foreignKey = `${this.name.toLowerCase()}_id`;
//     }

//     // Store association metadata
//     this._associations.set(methodName, {
//       type: "hasMany",
//       model: className,
//       foreignKey: foreignKey,
//       options: options,
//     });

//     console.log("Current associations:", this._associations);

//     // Define the association method on the prototype
//     this.prototype[methodName] = async function () {
//       console.log(`Calling ${methodName} association method`);
//       const instance = await Promise.resolve(this);
//       console.log("Resolved instance:", instance);

//       if (!instance || !instance.id) {
//         console.error("No instance or instance ID found");
//         throw new Error("No instance found or instance has no ID");
//       }

//       const RelatedModel = ModelLoader.getModel(className);
//       console.log("Found related model:", RelatedModel?.name);

//       if (!RelatedModel) {
//         console.error(`Model ${className} not found`);
//         throw new Error(`Model ${className} not found. Make sure it's loaded.`);
//       }

//       try {
//         // Use the chainable query builder
//         return RelatedModel.makeChainable()
//           .where({ [foreignKey]: instance.id })
//           .order("created_at DESC"); // Optional default ordering
//       } catch (error) {
//         console.error(`Error in hasMany relation for ${methodName}:`, error);
//         throw error;
//       }
//     };

//     console.log(`Added ${methodName} method to prototype`);
//   }

//   static belongsTo(modelName, foreignKey) {
//     if (!foreignKey) {
//       foreignKey = `${modelName.toLowerCase()}_id`;
//     }

//     Object.defineProperty(this.prototype, modelName.toLowerCase(), {
//       async get() {
//         const RelatedModel = ModelLoader.getModel(modelName);
//         try {
//           const knex = await RelatedModel.getKnex();
//           if (knex) {
//             const record = await knex(RelatedModel.tableName())
//               .where("id", this[foreignKey])
//               .first();
//             return record ? new RelatedModel(record) : null;
//           }

//           // Fallback to existing implementation
//           const query = `SELECT * FROM ${RelatedModel.tableName()} WHERE id = ?`;
//           const records = await RelatedModel.executeQuery(query, [
//             this[foreignKey],
//           ]);
//           const record = Array.isArray(records) ? records[0] : records;
//           return record ? new RelatedModel(record) : null;
//         } catch (error) {
//           console.error(`Error in belongsTo relation for ${modelName}:`, error);
//           throw error;
//         }
//       },
//     });
//   }

//   static async select(columns) {
//     try {
//       const knex = await this.getKnex();
//       if (knex) {
//         const records = await knex(this.tableName()).select(columns);
//         return records;
//       }

//       // Fallback to existing implementation
//       const query = `SELECT ${columns} FROM ${this.tableName()}`;
//       return await this.executeQuery(query);
//     } catch (error) {
//       console.error("Error in select:", error);
//       throw error;
//     }
//   }

//   static limit(count) {
//     console.log("Static limit called with:", count);
//     const chain = this.makeChainable();
//     console.log("Created chain object");
//     return chain.limit(count);
//   }

//   static order(orderBy) {
//     console.log("Static order called with:", orderBy);
//     const chain = this.makeChainable();
//     console.log("Created chain object");
//     return chain.order(orderBy);
//   }

//   static offset(count) {
//     return this.makeChainable().offset(count);
//   }

//   // static async limit(count) {
//   //   try {
//   //     const knex = await this.getKnex();
//   //     if (knex) {
//   //       const query = knex(this.tableName());

//   //       // Build the query
//   //       query.limit(count).select("*");

//   //       console.log(`Executing query with limit ${count}`);
//   //       const records = await query;

//   //       console.log(`Found ${records.length} records`);
//   //       const instances = records.map((record) => {
//   //         const instance = new this(record);
//   //         return instance;
//   //       });

//   //       return this.makeChainable(instances);
//   //     }

//   //     // Fallback to raw SQL
//   //     const query = `SELECT * FROM ${this.tableName()} LIMIT ?`;
//   //     const records = await this.executeQuery(query, [count]);
//   //     const instances = records.map((record) => new this(record));
//   //     return this.makeChainable(instances);
//   //   } catch (error) {
//   //     console.error("Error in limit:", error);
//   //     throw error;
//   //   }
//   // }

//   // static async offset(count) {
//   //   try {
//   //     const knex = await this.getKnex();
//   //     if (knex) {
//   //       const records = await knex(this.tableName()).offset(count).select("*");
//   //       const instances = records.map((record) => new this(record));
//   //       return this.makeChainable(instances);
//   //     }

//   //     // Fallback to existing implementation
//   //     const query = `SELECT * FROM ${this.tableName()} OFFSET ${count}`;
//   //     const records = await this.executeQuery(query);
//   //     const instances = records.map((record) => new this(record));
//   //     return this.makeChainable(instances);
//   //   } catch (error) {
//   //     console.error("Error in offset:", error);
//   //     throw error;
//   //   }
//   // }

//   // static async order(orderBy) {
//   //   try {
//   //     const knex = await this.getKnex();
//   //     if (knex) {
//   //       // Handle both string and object formats
//   //       if (typeof orderBy === "string") {
//   //         const [column, direction] = orderBy.split(" ");
//   //         const records = await knex(this.tableName())
//   //           .orderBy(column, direction || "asc")
//   //           .select("*");
//   //         const instances = records.map((record) => new this(record));
//   //         return this.makeChainable(instances);
//   //       } else {
//   //         const records = await knex(this.tableName())
//   //           .orderBy(orderBy)
//   //           .select("*");
//   //         const instances = records.map((record) => new this(record));
//   //         return this.makeChainable(instances);
//   //       }
//   //     }

//   //     // Fallback to existing implementation
//   //     const query = `SELECT * FROM ${this.tableName()} ORDER BY ${orderBy}`;
//   //     const records = await this.executeQuery(query);
//   //     const instances = records.map((record) => new this(record));
//   //     return this.makeChainable(instances);
//   //   } catch (error) {
//   //     console.error("Error in order:", error);
//   //     throw error;
//   //   }
//   // }

//   static async columnInfo() {
//     try {
//       const knex = await this.getKnex();
//       if (knex) {
//         const info = await knex(this.tableName()).columnInfo();
//         console.log(`\nTable: ${this.tableName()}`);
//         console.log("Columns:");

//         Object.entries(info).forEach(([name, details]) => {
//           console.log(`  ${name}:`);
//           console.log(`    type: ${details.type}`);
//           console.log(`    null: ${details.nullable ? "YES" : "NO"}`);
//           console.log(`    default: ${details.defaultValue || "NULL"}`);
//           console.log(`    primary key: ${details.primary ? "YES" : "NO"}`);
//         });

//         return info;
//       }

//       // Fallback to existing implementation
//       const columns = await this.columns();
//       console.log(`\nTable: ${this.tableName()}`);
//       console.log("Columns:");

//       columns.forEach((col) => {
//         console.log(`  ${col.name || col.Field || col.column_name}:`);
//         console.log(`    type: ${col.type || col.Type || col.data_type}`);
//         console.log(
//           `    null: ${
//             col.notnull || col.Null === "NO" || col.is_nullable === "NO"
//               ? "NO"
//               : "YES"
//           }`
//         );
//         console.log(
//           `    default: ${
//             col.dflt_value || col.Default || col.column_default || "NULL"
//           }`
//         );
//         console.log(
//           `    primary key: ${
//             col.pk || col.Key === "PRI" || col.is_primary ? "YES" : "NO"
//           }`
//         );
//       });

//       return columns;
//     } catch (error) {
//       console.error("Error in columnInfo:", error);
//       throw error;
//     }
//   }

//   static async schema() {
//     try {
//       const knex = await this.getKnex();
//       if (knex) {
//         // For Knex, use raw query to get table schema based on database type
//         const dbType = connectionManager.getCurrentDatabaseType();

//         switch (dbType) {
//           case "postgresql":
//             const result = await knex.raw(
//               `
//               SELECT
//                 column_name,
//                 data_type,
//                 character_maximum_length,
//                 is_nullable,
//                 column_default
//               FROM information_schema.columns
//               WHERE table_name = ?
//             `,
//               [this.tableName()]
//             );
//             return result.rows;

//           case "mysql":
//             const [mysqlResult] = await knex.raw("SHOW CREATE TABLE ??", [
//               this.tableName(),
//             ]);
//             return mysqlResult[0];

//           default: // SQLite
//             const sqliteResult = await knex.raw(
//               "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
//               [this.tableName()]
//             );
//             return sqliteResult;
//         }
//       }

//       // Fallback to existing implementation
//       const dbType = connectionManager.getCurrentDatabaseType();
//       let query;

//       switch (dbType) {
//         case "postgresql":
//           query = `
//             SELECT
//               'CREATE TABLE ' || quote_ident(c.table_name) || ' (' ||
//               string_agg(
//                 quote_ident(c.column_name) || ' ' ||
//                 c.data_type ||
//                 CASE WHEN c.character_maximum_length IS NOT NULL
//                      THEN '(' || c.character_maximum_length || ')'
//                      ELSE ''
//                 END ||
//                 CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
//                 CASE WHEN pk.column_name IS NOT NULL THEN ' PRIMARY KEY' ELSE '' END,
//                 ', '
//               ) || ')' as sql
//             FROM information_schema.columns c
//             LEFT JOIN (
//               SELECT ku.column_name
//               FROM information_schema.table_constraints tc
//               JOIN information_schema.key_column_usage ku
//                 ON tc.constraint_name = ku.constraint_name
//               WHERE tc.constraint_type = 'PRIMARY KEY'
//                 AND tc.table_name = $1
//             ) pk ON c.column_name = pk.column_name
//             WHERE c.table_name = $1
//             GROUP BY c.table_name
//           `;
//           break;
//         case "mysql":
//           query = `SHOW CREATE TABLE ${this.tableName()}`;
//           break;
//         default:
//           query = `SELECT sql FROM sqlite_master WHERE type='table' AND name=?`;
//       }

//       const result = await this.executeQuery(query, [this.tableName()]);
//       return result;
//     } catch (error) {
//       console.error("Error in schema:", error);
//       throw error;
//     }
//   }

//   static async columns() {
//     try {
//       const knex = await this.getKnex();
//       if (knex) {
//         return await knex(this.tableName()).columnInfo();
//       }

//       // Fallback to existing implementation
//       const dbType = connectionManager.getCurrentDatabaseType();
//       let query;

//       switch (dbType) {
//         case "postgresql":
//           query = `
//             SELECT column_name, data_type, is_nullable, column_default,
//                    CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary
//             FROM information_schema.columns c
//             LEFT JOIN (
//               SELECT ku.column_name
//               FROM information_schema.table_constraints tc
//               JOIN information_schema.key_column_usage ku
//                 ON tc.constraint_name = ku.constraint_name
//               WHERE tc.constraint_type = 'PRIMARY KEY'
//                 AND tc.table_name = $1
//             ) pk ON c.column_name = pk.column_name
//             WHERE c.table_name = $1
//           `;
//           break;
//         case "mysql":
//           query = `SHOW COLUMNS FROM ${this.tableName()}`;
//           break;
//         default:
//           query = `PRAGMA table_info(${this.tableName()})`;
//       }

//       return await this.executeQuery(query, [this.tableName()]);
//     } catch (error) {
//       console.error("Error in columns:", error);
//       throw error;
//     }
//   }

//   static async updateAll(conditions, attributes) {
//     try {
//       const knex = await this.getKnex();
//       if (knex) {
//         attributes.updated_at = new Date()
//           .toISOString()
//           .slice(0, 19)
//           .replace("T", " ");
//         await knex(this.tableName()).where(conditions).update(attributes);
//         return true;
//       }

//       // Fallback to existing implementation
//       attributes.updated_at = new Date()
//         .toISOString()
//         .slice(0, 19)
//         .replace("T", " ");

//       const sets = Object.entries(attributes)
//         .map(([key, value]) => `${key} = ?`)
//         .join(", ");

//       const where = Object.entries(conditions)
//         .map(([key, value]) => {
//           if (value === null) {
//             return `${key} IS NULL`;
//           }
//           return `${key} = ?`;
//         })
//         .join(" AND ");

//       const values = [
//         ...Object.values(attributes),
//         ...Object.values(conditions).filter((value) => value !== null),
//       ];

//       const query = `UPDATE ${this.tableName()} SET ${sets} WHERE ${where}`;
//       console.log("Query:", query);
//       console.log("Values:", values);
//       return await this.executeQuery(query, values);
//     } catch (error) {
//       console.error("Error in updateAll:", error);
//       throw error;
//     }
//   }

//   async destroy() {
//     try {
//       const knex = await this.constructor.getKnex();
//       if (knex) {
//         return await knex.transaction(async (trx) => {
//           // Handle dependent associations if they exist
//           if (
//             this.constructor._dependentAssociations &&
//             this.constructor._dependentAssociations.size > 0
//           ) {
//             for (const [modelName, config] of this.constructor
//               ._dependentAssociations) {
//               const RelatedModel = ModelLoader.getModel(modelName);

//               if (config.dependent === "destroy") {
//                 await trx(RelatedModel.tableName())
//                   .where(config.foreignKey, this.id)
//                   .delete();
//               } else if (config.dependent === "nullify") {
//                 await trx(RelatedModel.tableName())
//                   .where(config.foreignKey, this.id)
//                   .update({ [config.foreignKey]: null });
//               }
//             }
//           }

//           // Delete the record
//           await trx(this.constructor.tableName()).where("id", this.id).delete();

//           this._destroyed = true;
//           return true;
//         });
//       }

//       // Fallback to existing implementation
//       const conn = await this.constructor.getConnection();
//       const dbType = connectionManager.getCurrentDatabaseType();

//       try {
//         // Begin transaction
//         if (conn.query) {
//           if (dbType === "postgresql") {
//             await conn.query("BEGIN");
//           } else {
//             await conn.query("START TRANSACTION");
//           }
//         } else {
//           conn.prepare("BEGIN TRANSACTION").run();
//         }

//         // Handle dependent associations
//         if (
//           this.constructor._dependentAssociations &&
//           this.constructor._dependentAssociations.size > 0
//         ) {
//           for (const [modelName, config] of this.constructor
//             ._dependentAssociations) {
//             const RelatedModel = ModelLoader.getModel(modelName);

//             if (config.dependent === "destroy") {
//               await this.constructor.executeQuery(
//                 `DELETE FROM ${RelatedModel.tableName()} WHERE ${
//                   config.foreignKey
//                 } = ?`,
//                 [this.id]
//               );
//             } else if (config.dependent === "nullify") {
//               await this.constructor.executeQuery(
//                 `UPDATE ${RelatedModel.tableName()} SET ${
//                   config.foreignKey
//                 } = NULL WHERE ${config.foreignKey} = ?`,
//                 [this.id]
//               );
//             }
//           }
//         }

//         // Delete the record
//         const query = `DELETE FROM ${this.constructor.tableName()} WHERE id = ?`;
//         await this.constructor.executeQuery(query, [this.id]);

//         // Commit transaction
//         if (conn.query) {
//           await conn.query("COMMIT");
//         } else {
//           conn.prepare("COMMIT").run();
//         }

//         this._destroyed = true;
//         return true;
//       } catch (error) {
//         // Rollback transaction
//         if (conn.query) {
//           await conn.query("ROLLBACK");
//         } else {
//           conn.prepare("ROLLBACK").run();
//         }
//         throw error;
//       }
//     } catch (error) {
//       console.error("Error in destroy:", error);
//       throw error;
//     }
//   }

//   static async destroyAll(conditions) {
//     const conn = await this.getConnection();
//     const dbType = connectionManager.getCurrentDatabaseType();
//     const knex = await this.getKnex();

//     try {
//       if (knex) {
//         return await knex.transaction(async (trx) => {
//           if (
//             this._dependentAssociations &&
//             this._dependentAssociations.size > 0
//           ) {
//             const records = await trx(this.tableName())
//               .where(conditions)
//               .select("id");

//             for (const record of records) {
//               for (const [modelName, config] of this._dependentAssociations) {
//                 const RelatedModel = ModelLoader.getModel(modelName);
//                 if (config.dependent === "destroy") {
//                   await trx(RelatedModel.tableName())
//                     .where(config.foreignKey, record.id)
//                     .delete();
//                 } else if (config.dependent === "nullify") {
//                   await trx(RelatedModel.tableName())
//                     .where(config.foreignKey, record.id)
//                     .update({ [config.foreignKey]: null });
//                 }
//               }
//             }
//           }
//           return await trx(this.tableName()).where(conditions).delete();
//         });
//       }

//       // Fallback to existing implementation
//       // Begin transaction based on database type
//       if (conn.query) {
//         if (dbType === "postgresql") {
//           await conn.query("BEGIN");
//         } else {
//           await conn.query("START TRANSACTION");
//         }
//       } else {
//         conn.prepare("BEGIN TRANSACTION").run();
//       }

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

//       const findQuery = `SELECT id FROM ${this.tableName()} WHERE ${whereClause}`;
//       const records = await this.executeQuery(findQuery, values);

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

//       const deleteQuery = `DELETE FROM ${this.tableName()} WHERE ${whereClause}`;
//       console.log("Query:", deleteQuery);
//       console.log("Values:", values);
//       const result = await this.executeQuery(deleteQuery, values);

//       // Commit transaction based on database type
//       if (conn.query) {
//         await conn.query("COMMIT");
//       } else {
//         conn.prepare("COMMIT").run();
//       }

//       return result;
//     } catch (error) {
//       // Rollback transaction based on database type
//       if (conn.query) {
//         await conn.query("ROLLBACK");
//       } else {
//         conn.prepare("ROLLBACK").run();
//       }
//       console.error("Error in destroyAll:", error);
//       throw error;
//     }
//   }

//   isDestroyed() {
//     return this._destroyed === true;
//   }

//   static get validations() {
//     return this._validations || {};
//   }

//   isValid() {
//     this.errors = [];

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
//     try {
//       const knex = await this.getKnex();
//       if (knex) {
//         const result = await knex(this.tableName()).count("* as count").first();
//         return parseInt(result.count);
//       }

//       // Fallback to existing implementation
//       const query = `SELECT COUNT(*) as count FROM ${this.tableName()}`;
//       const result = await this.executeQuery(query);
//       return Array.isArray(result) ? result[0].count : result.count;
//     } catch (error) {
//       console.error("Error in count:", error);
//       throw error;
//     }
//   }

//   static async schemaInfo() {
//     try {
//       const knex = await this.getKnex();
//       if (knex) {
//         const info = await knex(this.tableName()).columnInfo();
//         console.log(`\nTable Definition for ${this.tableName()}:`);
//         Object.entries(info).forEach(([column, details]) => {
//           console.log(`\nColumn: ${column}`);
//           console.log(details);
//         });
//         return info;
//       }

//       // Fallback to existing implementation
//       const schema = await this.schema();
//       console.log(`\nTable Definition:`);
//       console.log(schema.sql || schema["Create Table"]);
//       return schema;
//     } catch (error) {
//       console.error("Error in schemaInfo:", error);
//       throw error;
//     }
//   }

//   // Add Knex-specific query builder methods
//   static query() {
//     return this.getKnex().then((knex) => knex(this.tableName()));
//   }

//   static async transaction(callback) {
//     const knex = await this.getKnex();
//     if (knex) {
//       return knex.transaction(callback);
//     }
//     throw new Error("Transactions require Knex to be configured");
//   }

//   // Add method to get the Knex schema builder
//   static async getSchemaBuilder() {
//     const knex = await this.getKnex();
//     if (knex) {
//       return knex.schema;
//     }
//     throw new Error("Schema operations require Knex to be configured");
//   }

//   // Add method to check if Knex is available
//   static async hasKnex() {
//     try {
//       const knex = await this.getKnex();
//       return !!knex;
//     } catch (error) {
//       return false;
//     }
//   }

//   // Add method to force raw SQL usage even when Knex is available
//   static async rawSQL() {
//     return {
//       executeQuery: this.executeQuery.bind(this),
//       getConnection: this.getConnection.bind(this),
//     };
//   }
// }

// // Include Validatable module
// Model.include(Validatable);

// module.exports = Model;

// const { Model: ObjectionModel } = require("objection");
// const path = require("path");
// const Database = require("better-sqlite3");
// const ModelLoader = require("./modelLoader");
// const Validatable = require("./validatable");
// const connectionManager = require("./database/connectionManager");
// const knexManager = require("./knex-migrations/knexManager");
// const pluralize = require("pluralize");

// class Model extends ObjectionModel {
//   // Database Configuration
//   static dbPath = path.join(process.cwd(), "db", "development.sqlite3");
//   static _knex = null;
//   static _db = null;
//   static _modelLoader = null;

//   // ModelLoader Configuration
//   static get modelLoader() {
//     if (!this._modelLoader) {
//       this._modelLoader = ModelLoader;
//     }
//     return this._modelLoader;
//   }

//   static register() {
//     this.modelLoader.registerModel(this.name, this);
//     return this;
//   }

//   static getRelatedModel(modelName) {
//     return this.modelLoader.getModel(modelName);
//   }

//   // Core Database Methods
//   static async getKnex() {
//     if (!this._knex) {
//       this._knex = knexManager.getInstance();
//       // Bind knex instance to Objection.js
//       ObjectionModel.knex(this._knex);
//     }
//     return this._knex;
//   }

//   static async getConnection() {
//     try {
//       const knex = await this.getKnex();
//       if (knex) return knex;
//       return await connectionManager.getConnection();
//     } catch (error) {
//       if (!this._db) {
//         this._db = new Database(this.dbPath, { verbose: console.log });
//       }
//       return this._db;
//     }
//   }

//   static db() {
//     if (!this._db) {
//       this._db = new Database(this.dbPath, { verbose: console.log });
//     }
//     return this._db;
//   }

//   // Initialize database connection
//   static async initialize() {
//     if (!this.knex()) {
//       const knex = await this.getKnex();
//       ObjectionModel.knex(knex);
//     }
//   }

//   // Table naming convention
//   static get tableName() {
//     return pluralize(this.name.toLowerCase());
//   }

//   static get timestamps() {
//     return true;
//   }

//   // Query Builder Methods - Basic Finders
//   static async all() {
//     return await this.query();
//   }

//   static async find(id) {
//     if (Array.isArray(id)) {
//       return await this.query().findByIds(id);
//     }
//     return await this.query().findById(id);
//   }

//   static async find_by(conditions) {
//     try {
//       return await this.query().findOne(conditions);
//     } catch (error) {
//       console.error("Error in find_by:", error);
//       throw error;
//     }
//   }

//   static async first() {
//     return await this.query().orderBy("id", "asc").first();
//   }

//   static async last() {
//     return await this.query().orderBy("id", "desc").first();
//   }

//   static async take(limit = 1) {
//     const query = this.query().limit(limit);
//     return await (limit === 1 ? query.first() : query);
//   }

//   // Query Builder Methods - Where Clauses
//   static where(conditions) {
//     if (typeof conditions === "function") {
//       return this.query().where(conditions);
//     }
//     return this.query().where(conditions);
//   }

//   static not(conditions) {
//     return this.query().whereNot(conditions);
//   }

//   static or(conditions) {
//     return this.query().orWhere(conditions);
//   }

//   static where_not(conditions) {
//     return this.not(conditions);
//   }

//   static where_in(column, values) {
//     return this.query().whereIn(column, values);
//   }

//   static where_not_in(column, values) {
//     return this.query().whereNotIn(column, values);
//   }

//   static where_null(column) {
//     return this.query().whereNull(column);
//   }

//   static where_not_null(column) {
//     return this.query().whereNotNull(column);
//   }

//   static where_between(column, range) {
//     return this.query().whereBetween(column, range);
//   }

//   static where_not_between(column, range) {
//     return this.query().whereNotBetween(column, range);
//   }

//   static where_raw(sql, bindings) {
//     return this.query().whereRaw(sql, bindings);
//   }

//   // Query Builder Methods - Order and Limit
//   static order(column, direction = "asc") {
//     if (typeof column === "object") {
//       const orders = Object.entries(column).map(([col, dir]) => ({
//         column: col,
//         order: dir,
//       }));
//       return this.query().orderBy(orders);
//     }
//     return this.query().orderBy(column, direction);
//   }

//   static order_by(column, direction = "asc") {
//     return this.order(column, direction);
//   }

//   static limit(value) {
//     return this.query().limit(value);
//   }

//   static offset(value) {
//     return this.query().offset(value);
//   }

//   static async create(attributes) {
//     try {
//       const instance = new this();
//       Object.assign(instance, attributes);

//       // Run validations
//       await instance.validate();

//       // Insert into database
//       const result = await instance.$query().insert();
//       return result;
//     } catch (error) {
//       console.error("Error in create:", error);
//       throw error;
//     }
//   }

//   static async create_with(attributes) {
//     const transaction = await this.transaction();
//     try {
//       const result = await this.create(attributes);
//       await transaction.commit();
//       return result;
//     } catch (error) {
//       await transaction.rollback();
//       throw error;
//     }
//   }

//   static async create_or_find_by(attributes) {
//     try {
//       const existing = await this.find_by(attributes);
//       if (existing) return existing;
//       return await this.create(attributes);
//     } catch (error) {
//       console.error("Error in create_or_find_by:", error);
//       throw error;
//     }
//   }

//   static async create_or_initialize_by(attributes) {
//     try {
//       const existing = await this.find_by(attributes);
//       if (existing) return existing;

//       const instance = new this();
//       Object.assign(instance, attributes);
//       return instance;
//     } catch (error) {
//       console.error("Error in create_or_initialize_by:", error);
//       throw error;
//     }
//   }

//   // Bulk Creation Methods
//   static async create_many(arrayOfAttributes) {
//     const transaction = await this.transaction();
//     try {
//       const results = await Promise.all(
//         arrayOfAttributes.map(attrs => this.create(attrs))
//       );
//       await transaction.commit();
//       return results;
//     } catch (error) {
//       await transaction.rollback();
//       console.error("Error in create_many:", error);
//       throw error;
//     }
//   }

//   // Relationship Loading Methods
//   static async includes(...relations) {
//     // Load related models before executing the query
//     relations.forEach((relation) => {
//       if (typeof relation === "string") {
//         const modelName = relation.split(".")[0];
//         this.modelLoader.getModel(modelName);
//       }
//     });

//     const graphExpression = this._normalizeIncludes(relations);
//     return await this.query().withGraphFetched(graphExpression);
//   }

//   static eager(...relations) {
//     return this.includes(...relations);
//   }

//   static preload(...relations) {
//     return this.includes(...relations);
//   }

//   static with(...relations) {
//     return this.includes(...relations);
//   }

//   static joins(...relations) {
//     return this.query().joinRelated(relations);
//   }

//   static left_joins(...relations) {
//     return this.query().leftJoinRelated(relations);
//   }

//   static right_joins(...relations) {
//     return this.query().rightJoinRelated(relations);
//   }

//   // Aggregation Methods
//   static async count(column = "*") {
//     const result = await this.query().count(`${column} as count`).first();
//     return parseInt(result?.count || 0);
//   }

//   static async sum(column) {
//     const result = await this.query().sum(`${column} as sum`).first();
//     return parseFloat(result?.sum || 0);
//   }

//   static async avg(column) {
//     const result = await this.query().avg(`${column} as avg`).first();
//     return parseFloat(result?.avg || 0);
//   }

//   static average(column) {
//     return this.avg(column);
//   }

//   static async min(column) {
//     const result = await this.query().min(`${column} as min`).first();
//     return result?.min;
//   }

//   static minimum(column) {
//     return this.min(column);
//   }

//   static async max(column) {
//     const result = await this.query().max(`${column} as max`).first();
//     return result?.max;
//   }

//   static maximum(column) {
//     return this.max(column);
//   }

//   // Group and Having
//   static group(...columns) {
//     return this.query().groupBy(...columns);
//   }

//   static group_by(...columns) {
//     return this.group(...columns);
//   }

//   static having(conditions) {
//     return this.query().having(conditions);
//   }

//   // Instance Methods
//   async save() {
//     try {
//       await this.runCallbacks("beforeValidation");
//       await this.validate();

//       if (this.id) {
//         await this.runCallbacks("beforeUpdate");
//         await this.runCallbacks("beforeSave");
//         const updated = await this.$query().updateAndFetch();
//         Object.assign(this, updated);
//         await this.runCallbacks("afterUpdate");
//         await this.runCallbacks("afterSave");
//       } else {
//         await this.runCallbacks("beforeCreate");
//         await this.runCallbacks("beforeSave");
//         const created = await this.$query().insertAndFetch();
//         Object.assign(this, created);
//         await this.runCallbacks("afterCreate");
//         await this.runCallbacks("afterSave");
//       }
//       return this;
//     } catch (error) {
//       console.error("Error in save:", error);
//       throw error;
//     }
//   }

//   async update(attributes) {
//     try {
//       await this.runCallbacks("beforeValidation");
//       Object.assign(this, attributes);
//       await this.validate();
//       await this.runCallbacks("beforeUpdate");
//       await this.runCallbacks("beforeSave");

//       const updated = await this.$query().patchAndFetch(attributes);
//       Object.assign(this, updated);

//       await this.runCallbacks("afterUpdate");
//       await this.runCallbacks("afterSave");
//       return this;
//     } catch (error) {
//       console.error("Error in update:", error);
//       throw error;
//     }
//   }

//   async destroy() {
//     try {
//       await this.runCallbacks("beforeDestroy");
//       await this.$query().delete();
//       this._destroyed = true;
//       await this.runCallbacks("afterDestroy");
//       return true;
//     } catch (error) {
//       console.error("Error in destroy:", error);
//       throw error;
//     }
//   }

//   static async find_each(batchSize = 1000, callback) {
//     let offset = 0;
//     let records;
//     do {
//       records = await this.query().limit(batchSize).offset(offset);
//       for (const record of records) {
//         await callback(record);
//       }
//       offset += batchSize;
//     } while (records.length === batchSize);
//   }

//   static async find_in_batches(batchSize = 1000, callback) {
//     let offset = 0;
//     let records;
//     do {
//       records = await this.query().limit(batchSize).offset(offset);
//       if (records.length > 0) {
//         await callback(records);
//       }
//       offset += batchSize;
//     } while (records.length === batchSize);
//   }

//   static async exists(conditions) {
//     const count = await this.where(conditions).count();
//     return count > 0;
//   }

//   // Additional Query Methods
//   static select(...columns) {
//     return this.query().select(...columns);
//   }

//   static distinct(...columns) {
//     return this.query().distinct(...columns);
//   }

//   static pluck(column) {
//     return this.query().pluck(column);
//   }

//   static pick(column) {
//     return this.pluck(column);
//   }

//   // Additional Where Clauses
//   static where_like(column, pattern) {
//     return this.query().where(column, 'like', pattern);
//   }

//   static where_ilike(column, pattern) {
//     return this.query().where(column, 'ilike', pattern);
//   }

//   static where_json(column, value) {
//     return this.query().whereJsonEquals(column, value);
//   }

//   static where_json_contains(column, value) {
//     return this.query().whereJsonSupersetOf(column, value);
//   }

//   // Scoping Methods
//   static unscoped() {
//     return this.query().clearEager().clearOrder().clearWhere();
//   }

//   static default_scope(callback) {
//     this._defaultScope = callback;
//     return this;
//   }

//   // Calculation Methods
//   static async calculate(operation, column) {
//     const result = await this.query()
//       .select(this.knex().raw(`${operation}(${column}) as result`))
//       .first();
//     return result?.result;
//   }

//   // Additional Aggregation Methods
//   static async ids() {
//     const records = await this.query().select('id');
//     return records.map(r => r.id);
//   }

//   static async pluck_all(...columns) {
//     return await this.query().select(...columns);
//   }

//   // Time-based Query Methods
//   static recent(limit = 5) {
//     return this.query().orderBy('created_at', 'desc').limit(limit);
//   }

//   static older(limit = 5) {
//     return this.query().orderBy('created_at', 'asc').limit(limit);
//   }

//   // Batch Operations
//   static async update_all(attributes) {
//     return await this.query().patch(attributes);
//   }

//   static async delete_all() {
//     return await this.query().delete();
//   }

//   static async destroy_all() {
//     const records = await this.all();
//     for (const record of records) {
//       await record.destroy();
//     }
//     return records;
//   }

//   // Instance Methods
//   async increment(field, amount = 1) {
//     return await this.$query().increment(field, amount);
//   }

//   async decrement(field, amount = 1) {
//     return await this.$query().decrement(field, amount);
//   }

//   async toggle(field) {
//     const currentValue = this[field];
//     return await this.update({ [field]: !currentValue });
//   }

//   // Persistence Methods
//   async save_changes() {
//     return await this.save();
//   }

//   async touch() {
//     return await this.update({ updated_at: new Date().toISOString() });
//   }

//   // Relation Methods
//   static has_many(relation, options = {}) {
//     return this.relationMappings = {
//       ...this.relationMappings,
//       [relation]: {
//         relation: ObjectionModel.HasManyRelation,
//         modelClass: options.modelClass || relation,
//         join: {
//           from: `${this.tableName}.id`,
//           to: `${pluralize(relation)}.${options.foreignKey || `${this.name.toLowerCase()}_id`}`
//         },
//         ...options
//       }
//     };
//   }

//   static belongs_to(relation, options = {}) {
//     return this.relationMappings = {
//       ...this.relationMappings,
//       [relation]: {
//         relation: ObjectionModel.BelongsToOneRelation,
//         modelClass: options.modelClass || relation,
//         join: {
//           from: `${this.tableName}.${options.foreignKey || `${relation}_id`}`,
//           to: `${pluralize(relation)}.id`
//         },
//         ...options
//       }
//     };
//   }

//   static has_one(relation, options = {}) {
//     return this.relationMappings = {
//       ...this.relationMappings,
//       [relation]: {
//         relation: ObjectionModel.HasOneRelation,
//         modelClass: options.modelClass || relation,
//         join: {
//           from: `${this.tableName}.id`,
//           to: `${pluralize(relation)}.${options.foreignKey || `${this.name.toLowerCase()}_id`}`
//         },
//         ...options
//       }
//     };
//   }

//   // Serialization Methods
//   static serialize(attributes) {
//     this._serializedAttributes = attributes;
//   }

//   toJSON() {
//     const json = super.toJSON();
//     if (this.constructor._serializedAttributes) {
//       return this.constructor._serializedAttributes.reduce((obj, attr) => {
//         obj[attr] = json[attr];
//         return obj;
//       }, {});
//     }
//     return json;
//   }

//   // Lifecycle Callbacks
//   async $beforeInsert(context) {
//     await super.$beforeInsert(context);

//     if (this.constructor.timestamps) {
//       const now = new Date().toISOString();
//       this.created_at = now;
//       this.updated_at = now;
//     }
//   }

//   async $beforeUpdate(opt, context) {
//     await super.$beforeUpdate(opt, context);

//     if (this.constructor.timestamps) {
//       this.updated_at = new Date().toISOString();
//     }
//   }

//   // Callback Registration
//   static before_validation(callback) {
//     this._callbacks.beforeValidation.push(callback);
//   }

//   static before_create(callback) {
//     this._callbacks.beforeCreate.push(callback);
//   }

//   static before_update(callback) {
//     this._callbacks.beforeUpdate.push(callback);
//   }

//   static before_save(callback) {
//     this._callbacks.beforeSave.push(callback);
//   }

//   static before_destroy(callback) {
//     this._callbacks.beforeDestroy.push(callback);
//   }

//   static after_create(callback) {
//     this._callbacks.afterCreate.push(callback);
//   }

//   static after_update(callback) {
//     this._callbacks.afterUpdate.push(callback);
//   }

//   static after_save(callback) {
//     this._callbacks.afterSave.push(callback);
//   }

//   static after_destroy(callback) {
//     this._callbacks.afterDestroy.push(callback);
//   }

//   async runCallbacks(type) {
//     const callbacks = this.constructor._callbacks?.[type] || [];
//     for (const callback of callbacks) {
//       await callback.call(this);
//     }
//   }

//   // Override $beforeInsert to run callbacks
//   async $beforeInsert(context) {
//     await super.$beforeInsert(context);
//     await this.runCallbacks("beforeValidation");
//     await this.runCallbacks("beforeCreate");
//     await this.runCallbacks("beforeSave");
//   }

//   // Override $afterInsert to run callbacks
//   async $afterInsert(context) {
//     await super.$afterInsert(context);
//     await this.runCallbacks("afterCreate");
//     await this.runCallbacks("afterSave");
//   }

//   // Override $beforeUpdate to run callbacks
//   async $beforeUpdate(opt, context) {
//     await super.$beforeUpdate(opt, context);
//     await this.runCallbacks("beforeValidation");
//     await this.runCallbacks("beforeUpdate");
//     await this.runCallbacks("beforeSave");
//   }

//   // Override $afterUpdate to run callbacks
//   async $afterUpdate(opt, context) {
//     await super.$afterUpdate(opt, context);
//     await this.runCallbacks("afterUpdate");
//     await this.runCallbacks("afterSave");
//   }

//   // Validation Integration
//   async validate() {
//     if (!this.constructor.validations) return true;

//     this.errors = [];
//     const validations = this.constructor.validations;

//     for (const [field, rules] of Object.entries(validations)) {
//       for (const rule of rules) {
//         if (!(await this.validateField(field, rule))) {
//           this.errors.push(`${field} ${rule.message || "is invalid"}`);
//         }
//       }
//     }

//     if (this.errors.length > 0) {
//       throw new this.constructor.ValidationError(this.errors);
//     }

//     return true;
//   }

//   // Helper Methods for Relationships
//   static _normalizeIncludes(relations) {
//     const normalized = relations.map((relation) => {
//       if (typeof relation === "object") {
//         return this._convertToGraphNotation(relation);
//       }
//       return relation;
//     });
//     return `[${normalized.join(", ")}]`;
//   }

//   static _convertToGraphNotation(obj, prefix = "") {
//     return Object.entries(obj)
//       .map(([key, value]) => {
//         if (typeof value === "object") {
//           const nested = this._convertToGraphNotation(value, `${key}.`);
//           return nested.map((n) => `${prefix}${n}`);
//         }
//         return `${prefix}${key}`;
//       })
//       .flat();
//   }

//   // Module Inclusion System
//   static include(module) {
//     // Copy static methods
//     Object.getOwnPropertyNames(module).forEach((prop) => {
//       if (prop !== "prototype" && prop !== "name" && prop !== "length") {
//         try {
//           const descriptor = Object.getOwnPropertyDescriptor(module, prop);
//           if (descriptor.configurable) {
//             Object.defineProperty(this, prop, descriptor);
//           } else {
//             this[prop] = module[prop];
//           }
//         } catch (error) {
//           console.warn(`Warning: Could not copy property ${prop}`, error);
//         }
//       }
//     });

//     // Copy instance methods
//     Object.getOwnPropertyNames(module.prototype).forEach((prop) => {
//       if (prop !== "constructor") {
//         try {
//           const descriptor = Object.getOwnPropertyDescriptor(
//             module.prototype,
//             prop
//           );
//           Object.defineProperty(this.prototype, prop, descriptor);
//         } catch (error) {
//           console.warn(
//             `Warning: Could not copy prototype property ${prop}`,
//             error
//           );
//         }
//       }
//     });
//   }

//   // JSON Serialization
//   toJSON() {
//     const json = { ...this };
//     delete json._destroyed;
//     delete json.errors;
//     return json;
//   }

//   // Utility Methods
//   static scope(name, callback) {
//     if (!this._scopes) {
//       this._scopes = new Map();
//     }
//     this._scopes.set(name, callback);

//     // Add the scope as a static method
//     this[name] = function (...args) {
//       return callback.apply(this, args);
//     };
//   }

//   // Add lifecycle callbacks support
//   static _callbacks = {
//     beforeValidation: [],
//     beforeCreate: [],
//     beforeUpdate: [],
//     beforeSave: [],
//     beforeDestroy: [],
//     afterCreate: [],
//     afterUpdate: [],
//     afterSave: [],
//     afterDestroy: [],
//   };

//   isNewRecord() {
//     return !this.id;
//   }

//   isDestroyed() {
//     return this._destroyed === true;
//   }

//   reload() {
//     return this.$query().findById(this.id);
//   }

//   // Error Classes
//   static get ValidationError() {
//     return class ValidationError extends Error {
//       constructor(errors) {
//         super("Validation failed");
//         this.errors = errors;
//       }
//     };
//   }
// }

// // Include Validatable by default
// Model.include(Validatable);

// module.exports = Model;

const { Model: ObjectionModel } = require("objection");
const path = require("path");
const Database = require("better-sqlite3");
const ModelLoader = require("./modelLoader");
const Validatable = require("./validatable");
const connectionManager = require("./database/connectionManager");
const knexManager = require("./knex-migrations/knexManager");
const CustomQueryBuilder = require("./query_builder");
const pluralize = require("pluralize");
const dayjs = require("dayjs");
const { v4: uuidv4 } = require("uuid");

class Model extends ObjectionModel {
  // Database Configuration
  static dbPath = path.join(process.cwd(), "db", "development.sqlite3");
  static _knex = null;
  static _db = null;
  static _modelLoader = null;
  static _defaultScope = null;
  static _scopes = new Map();
  static _includes = new Set();
  static _eager = new Set();
  static _validators = new Map();
  static _callbacks = {
    beforeValidation: [],
    beforeCreate: [],
    beforeUpdate: [],
    beforeSave: [],
    beforeDestroy: [],
    afterCreate: [],
    afterUpdate: [],
    afterSave: [],
    afterDestroy: [],
    afterFind: [],
    afterInitialize: [],
  };

  // Constructor with initialization
  constructor(attributes = {}) {
    super();
    this._initializeAttributes(attributes);
    this._runAfterInitialize();
  }

  // Add this method
  async _runAfterInitialize() {
    if (this.constructor._callbacks.afterInitialize) {
      for (const callback of this.constructor._callbacks.afterInitialize) {
        await callback.call(this);
      }
    }
  }

  // Modify _initializeAttributes to be synchronous
  _initializeAttributes(attributes) {
    Object.assign(this, attributes);
    if (this.constructor.timestamps) {
      this.created_at = this.created_at || new Date().toISOString();
      this.updated_at = this.updated_at || new Date().toISOString();
    }
  }

  // ModelLoader Configuration
  static get modelLoader() {
    if (!this._modelLoader) {
      this._modelLoader = ModelLoader;
    }
    return this._modelLoader;
  }

  static register() {
    this.modelLoader.registerModel(this.name, this);
    return this;
  }

  static getRelatedModel(modelName) {
    return this.modelLoader.getModel(modelName);
  }

  // Core Database Methods
  static async getKnex() {
    if (!this._knex) {
      this._knex = knexManager.getInstance();
      ObjectionModel.knex(this._knex);
    }
    return this._knex;
  }

  static async getConnection() {
    try {
      const knex = await this.getKnex();
      if (knex) return knex;
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

  // Initialize database connection
  static async initialize() {
    if (!this.knex()) {
      const knex = await this.getKnex();
      ObjectionModel.knex(knex);
    }
  }

  static _QueryBuilder = CustomQueryBuilder; // Private property to store the QueryBuilder

  static get QueryBuilder() {
    return this._QueryBuilder;
  }

  static set QueryBuilder(value) {
    this._QueryBuilder = value;
  }

  static hasBooted = false;

  static boot() {
    if (this.hasBooted) {
      // Already booted, do nothing
      return;
    }
    this.hasBooted = true;

    console.log(`Booting model: ${this.name}`);

    // Check if super has boot method before calling it
    if (super.boot) {
      super.boot();
    }

    // Include Validatable during boot
    this.include(Validatable);

    // Register static methods to forward to QueryBuilder
    this.registerQueryBuilderMethods();

    console.log(
      `Debug: ${this.name} class booted and static methods registered.`
    );
  }

  /**
   * Dynamically register static methods from QueryBuilder to the Model class.
   * This enables syntax like User.whereLike(...).orderByTheme(...)
   */
  static registerQueryBuilderMethods() {
    const qbPrototype = this.QueryBuilder.prototype;

    // Get all method names from QueryBuilder prototype, excluding constructor
    const qbMethods = Object.getOwnPropertyNames(qbPrototype).filter(
      (prop) =>
        typeof qbPrototype[prop] === "function" && prop !== "constructor"
    );

    console.log(`Found QueryBuilder methods for ${this.name}:`, qbMethods);

    qbMethods.forEach((methodName) => {
      // Avoid overriding existing static methods
      if (typeof this[methodName] === "undefined") {
        this[methodName] = (...args) => {
          return this.query()[methodName](...args);
        };
      }
    });

    // Log all registered methods
    console.log(
      `All registered QueryBuilder static methods for ${this.name}:`,
      qbMethods
    );
  }

  // Table naming convention
  static get tableName() {
    return pluralize(this.name.toLowerCase());
  }

  static include(module) {
    // Copy all static methods from the module to the class
    for (const [key, value] of Object.entries(module)) {
      if (typeof value === "function" && key !== "prototype") {
        this[key] = value;
      }
    }

    // Copy all instance methods from the module to the class prototype
    if (module.prototype) {
      for (const [key, value] of Object.entries(
        Object.getOwnPropertyDescriptors(module.prototype)
      )) {
        if (key !== "constructor") {
          Object.defineProperty(this.prototype, key, value);
        }
      }
    }
  }

  static get timestamps() {
    return true;
  }

  // UUID Support
  static get useUUID() {
    return false;
  }

  async $beforeInsert(context) {
    await super.$beforeInsert(context);
    if (this.constructor.useUUID && !this.id) {
      this.id = uuidv4();
    }
    if (this.constructor.timestamps) {
      const now = new Date().toISOString();
      this.created_at = now;
      this.updated_at = now;
    }
  }

  async $beforeUpdate(opt, context) {
    await super.$beforeUpdate(opt, context);
    if (this.constructor.timestamps) {
      this.updated_at = new Date().toISOString();
    }
  }

  // ------------------------------------------------------------

  // Existence Checks
  // static async exists(conditions) {
  //   const result = await this.where(conditions).count().first();
  //   return parseInt(result?.count || 0) > 0;
  // }

  // static async any() {
  //   return await this.exists({});
  // }

  // static async none() {
  //   return !(await this.any());
  // }

  // static async many() {
  //   const count = await this.count();
  //   return count > 1;
  // }

  // ------------------------------------------------------------

  // Date/Time Where Clauses
  static where_date(column, date) {
    const start = dayjs(date).startOf("day").toDate();
    const end = dayjs(date).endOf("day").toDate();
    return this.query().whereBetween(column, [start, end]);
  }

  static where_time(column, time) {
    const timeStr = dayjs(time, "HH:mm:ss").format("HH:mm:ss");
    return this.query().whereRaw(`CAST(CAST(?? as TIME) as TEXT) = ?`, [
      column,
      timeStr,
    ]);
  }

  static where_year(column, year) {
    const start = dayjs().year(year).startOf("year").toDate();
    const end = dayjs().year(year).endOf("year").toDate();
    return this.query().whereBetween(column, [start, end]);
  }

  static where_month(column, month) {
    const start = dayjs()
      .month(month - 1)
      .startOf("month")
      .toDate();
    const end = dayjs()
      .month(month - 1)
      .endOf("month")
      .toDate();
    return this.query().whereBetween(column, [start, end]);
  }

  static where_day(column, day) {
    const start = dayjs().date(day).startOf("day").toDate();
    const end = dayjs().date(day).endOf("day").toDate();
    return this.query().whereBetween(column, [start, end]);
  }

  static where_week(column, week) {
    const start = dayjs().week(week).startOf("week").toDate();
    const end = dayjs().week(week).endOf("week").toDate();
    return this.query().whereBetween(column, [start, end]);
  }

  static where_quarter(column, quarter) {
    const start = dayjs().quarter(quarter).startOf("quarter").toDate();
    const end = dayjs().quarter(quarter).endOf("quarter").toDate();
    return this.query().whereBetween(column, [start, end]);
  }

  // Comparison Where Clauses
  static where_gt(column, value) {
    return this.query().where(column, ">", value);
  }

  static where_gte(column, value) {
    return this.query().where(column, ">=", value);
  }

  static where_lt(column, value) {
    return this.query().where(column, "<", value);
  }

  static where_lte(column, value) {
    return this.query().where(column, "<=", value);
  }

  static where_ne(column, value) {
    return this.query().where(column, "!=", value);
  }

  // ------------------------------------------------------------

  // Statistical Methods
  static async variance(column) {
    const result = await this.query()
      .select(this.knex().raw("VARIANCE(??) as variance", [column]))
      .first();
    return parseFloat(result?.variance || 0);
  }

  static async stddev(column) {
    const result = await this.query()
      .select(this.knex().raw("STDDEV(??) as stddev", [column]))
      .first();
    return parseFloat(result?.stddev || 0);
  }

  static async median(column) {
    // Note: This is PostgreSQL specific
    const result = await this.query()
      .select(
        this.knex().raw(
          "PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ??) as median",
          [column]
        )
      )
      .first();
    return parseFloat(result?.median || 0);
  }

  // Window Functions
  static rank(column, direction = "asc") {
    return this.query()
      .select("*")
      .select(
        this.knex().raw("RANK() OVER (ORDER BY ?? ??) as rank", [
          column,
          direction,
        ])
      );
  }

  static dense_rank(column, direction = "asc") {
    return this.query()
      .select("*")
      .select(
        this.knex().raw("DENSE_RANK() OVER (ORDER BY ?? ??) as dense_rank", [
          column,
          direction,
        ])
      );
  }

  static row_number() {
    return this.query()
      .select("*")
      .select(this.knex().raw("ROW_NUMBER() OVER () as row_num"));
  }

  // Pagination Methods
  static async paginate(page = 1, perPage = 10) {
    const total = await this.count();
    const totalPages = Math.ceil(total / perPage);
    const offset = (page - 1) * perPage;

    const records = await this.query().offset(offset).limit(perPage);

    return {
      records,
      pagination: {
        total,
        perPage,
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  // ------------------------------------------------------------

  // Creation Methods
  // static async create(attributes) {
  //   try {
  //     const instance = new this();
  //     Object.assign(instance, attributes);

  //     await instance.runCallbacks("beforeValidation");
  //     await instance.validate();
  //     await instance.runCallbacks("beforeCreate");
  //     await instance.runCallbacks("beforeSave");

  //     const result = await instance.$query().insert().returning("*");
  //     Object.assign(instance, result);

  //     await instance.runCallbacks("afterCreate");
  //     await instance.runCallbacks("afterSave");

  //     return instance;
  //   } catch (error) {
  //     console.error("Error in create:", error);
  //     throw error;
  //   }
  // }

  // static async createStrict(attributes) {
  //   const instance = await this.create(attributes);
  //   if (!instance.id) throw new Error("Failed to create record");
  //   return instance;
  // }

  // static async create_or_find_by(attributes) {
  //   try {
  //     const existing = await this.find_by(attributes);
  //     if (existing) return existing;
  //     return await this.create(attributes);
  //   } catch (error) {
  //     console.error("Error in create_or_find_by:", error);
  //     throw error;
  //   }
  // }

  // static async create_or_initialize_by(attributes) {
  //   try {
  //     const existing = await this.find_by(attributes);
  //     if (existing) return existing;

  //     const instance = new this();
  //     Object.assign(instance, attributes);
  //     return instance;
  //   } catch (error) {
  //     console.error("Error in create_or_initialize_by:", error);
  //     throw error;
  //   }
  // }

  // // Bulk Creation Methods
  // static async create_many(arrayOfAttributes) {
  //   const transaction = await this.transaction();
  //   try {
  //     const results = await Promise.all(
  //       arrayOfAttributes.map((attrs) => this.create(attrs))
  //     );
  //     await transaction.commit();
  //     return results;
  //   } catch (error) {
  //     await transaction.rollback();
  //     console.error("Error in create_many:", error);
  //     throw error;
  //   }
  // }

  // static async insert_all(arrayOfAttributes) {
  //   return await this.query().insert(arrayOfAttributes).returning("*");
  // }

  // // Update Methods
  // async update(attributes) {
  //   try {
  //     await this.runCallbacks("beforeValidation");

  //     const originalAttributes = { ...this };
  //     Object.assign(this, attributes);

  //     await this.validate();
  //     await this.runCallbacks("beforeUpdate");
  //     await this.runCallbacks("beforeSave");

  //     const updated = await this.$query().patchAndFetch(attributes);

  //     if (!updated) {
  //       Object.assign(this, originalAttributes);
  //       throw new Error("Failed to update record");
  //     }

  //     Object.assign(this, updated);

  //     await this.runCallbacks("afterUpdate");
  //     await this.runCallbacks("afterSave");

  //     return this;
  //   } catch (error) {
  //     console.error("Error in update:", error);
  //     throw error;
  //   }
  // }

  // async updateStrict(attributes) {
  //   const result = await this.update(attributes);
  //   if (!result) throw new Error("Failed to update record");
  //   return result;
  // }

  // // Single Attribute Updates
  // async update_attribute(name, value) {
  //   return await this.update({ [name]: value });
  // }

  // async update_attributes(attributes) {
  //   return await this.update(attributes);
  // }

  // async update_column(name, value) {
  //   return await this.$query().patch({ [name]: value });
  // }

  // async update_columns(attributes) {
  //   return await this.$query().patch(attributes);
  // }

  // Increment/Decrement
  async increment(field, by = 1) {
    await this.$query().increment(field, by);
    return await this.reload();
  }

  async decrement(field, by = 1) {
    await this.$query().decrement(field, by);
    return await this.reload();
  }

  // Toggle Boolean
  async toggle(field) {
    const currentValue = this[field];
    if (typeof currentValue !== "boolean") {
      throw new Error(`Field ${field} is not a boolean`);
    }
    return await this.update({ [field]: !currentValue });
  }

  // Bulk Updates
  // static async update_all(attributes) {
  //   const transaction = await this.transaction();
  //   try {
  //     const records = await this.all();
  //     const results = await Promise.all(
  //       records.map((record) => record.update(attributes))
  //     );
  //     await transaction.commit();
  //     return results;
  //   } catch (error) {
  //     await transaction.rollback();
  //     throw error;
  //   }
  // }

  // Touch - Update Timestamps
  async touch(field = "updated_at") {
    return await this.update({
      [field]: new Date().toISOString(),
    });
  }

  // Save Methods
  // async save(options = {}) {
  //   try {
  //     await this.runCallbacks("beforeValidation");
  //     await this.validate();

  //     if (this.id) {
  //       await this.runCallbacks("beforeUpdate");
  //       await this.runCallbacks("beforeSave");

  //       const updated = await this.$query().patchAndFetch(this);
  //       Object.assign(this, updated);

  //       await this.runCallbacks("afterUpdate");
  //       await this.runCallbacks("afterSave");
  //     } else {
  //       await this.runCallbacks("beforeCreate");
  //       await this.runCallbacks("beforeSave");

  //       const created = await this.$query().insertAndFetch();
  //       Object.assign(this, created);

  //       await this.runCallbacks("afterCreate");
  //       await this.runCallbacks("afterSave");
  //     }

  //     return this;
  //   } catch (error) {
  //     console.error("Error in save:", error);
  //     throw error;
  //   }
  // }

  // async saveStrict(options = {}) {
  //   const result = await this.save(options);
  //   if (!result.id) throw new Error("Failed to save record");
  //   return result;
  // }

  // // ------------------------------------------------------------

  // // Deletion Methods
  // async destroy() {
  //   try {
  //     await this.runCallbacks("beforeDestroy");

  //     const transaction = await this.constructor.transaction();

  //     try {
  //       // Handle dependent associations if they exist
  //       if (this.constructor._dependentAssociations?.size > 0) {
  //         for (const [modelName, config] of this.constructor
  //           ._dependentAssociations) {
  //           const RelatedModel = this.constructor.getRelatedModel(modelName);

  //           if (config.dependent === "destroy") {
  //             await RelatedModel.query(transaction)
  //               .where(config.foreignKey, this.id)
  //               .delete();
  //           } else if (config.dependent === "nullify") {
  //             await RelatedModel.query(transaction)
  //               .where(config.foreignKey, this.id)
  //               .update({ [config.foreignKey]: null });
  //           }
  //         }
  //       }

  //       await this.$query(transaction).delete();
  //       await transaction.commit();

  //       this._destroyed = true;
  //       await this.runCallbacks("afterDestroy");

  //       return true;
  //     } catch (error) {
  //       await transaction.rollback();
  //       throw error;
  //     }
  //   } catch (error) {
  //     console.error("Error in destroy:", error);
  //     throw error;
  //   }
  // }

  // async destroyStrict() {
  //   const result = await this.destroy();
  //   if (!result) throw new Error("Failed to destroy record");
  //   return result;
  // }

  // // Bulk Deletion Methods
  // static async destroy_all(conditions = {}) {
  //   const transaction = await this.transaction();
  //   try {
  //     if (this._dependentAssociations?.size > 0) {
  //       const records = await this.where(conditions).select("id");

  //       for (const record of records) {
  //         for (const [modelName, config] of this._dependentAssociations) {
  //           const RelatedModel = this.getRelatedModel(modelName);

  //           if (config.dependent === "destroy") {
  //             await RelatedModel.query(transaction)
  //               .where(config.foreignKey, record.id)
  //               .delete();
  //           } else if (config.dependent === "nullify") {
  //             await RelatedModel.query(transaction)
  //               .where(config.foreignKey, record.id)
  //               .update({ [config.foreignKey]: null });
  //           }
  //         }
  //       }
  //     }

  //     const result = await this.query(transaction).where(conditions).delete();

  //     await transaction.commit();
  //     return result;
  //   } catch (error) {
  //     await transaction.rollback();
  //     console.error("Error in destroy_all:", error);
  //     throw error;
  //   }
  // }

  // static async delete_all(conditions = {}) {
  //   return await this.query().where(conditions).delete();
  // }

  // // Soft Delete Support
  // static get softDelete() {
  //   return false;
  // }

  // async softDestroy() {
  //   if (!this.constructor.softDelete) {
  //     throw new Error("Soft delete is not enabled for this model");
  //   }
  //   return await this.update({
  //     deleted_at: new Date().toISOString(),
  //   });
  // }

  // async restore() {
  //   if (!this.constructor.softDelete) {
  //     throw new Error("Soft delete is not enabled for this model");
  //   }
  //   return await this.update({
  //     deleted_at: null,
  //   });
  // }

  // Relationship Configuration
  // static hasMany(relation, options = {}) {
  //   this.relationMappings = {
  //     ...this.relationMappings,
  //     [relation]: {
  //       relation: ObjectionModel.HasManyRelation,
  //       modelClass: options.modelClass || relation,
  //       join: {
  //         from: `${this.tableName}.id`,
  //         to: `${pluralize(relation)}.${
  //           options.foreignKey || `${this.name.toLowerCase()}_id`
  //         }`,
  //       },
  //       ...options,
  //     },
  //   };
  // }

  // static belongsTo(relation, options = {}) {
  //   this.relationMappings = {
  //     ...this.relationMappings,
  //     [relation]: {
  //       relation: ObjectionModel.BelongsToOneRelation,
  //       modelClass: options.modelClass || relation,
  //       join: {
  //         from: `${this.tableName}.${options.foreignKey || `${relation}_id`}`,
  //         to: `${pluralize(relation)}.id`,
  //       },
  //       ...options,
  //     },
  //   };
  // }

  // static hasOne(relation, options = {}) {
  //   this.relationMappings = {
  //     ...this.relationMappings,
  //     [relation]: {
  //       relation: ObjectionModel.HasOneRelation,
  //       modelClass: options.modelClass || relation,
  //       join: {
  //         from: `${this.tableName}.id`,
  //         to: `${pluralize(relation)}.${
  //           options.foreignKey || `${this.name.toLowerCase()}_id`
  //         }`,
  //       },
  //       ...options,
  //     },
  //   };
  // }

  // static manyToMany(relation, options = {}) {
  //   const throughTable =
  //     options.through || `${this.name.toLowerCase()}_${relation.toLowerCase()}`;

  //   this.relationMappings = {
  //     ...this.relationMappings,
  //     [relation]: {
  //       relation: ObjectionModel.ManyToManyRelation,
  //       modelClass: options.modelClass || relation,
  //       join: {
  //         from: `${this.tableName}.id`,
  //         through: {
  //           from: `${throughTable}.${
  //             options.fromKey || `${this.name.toLowerCase()}_id`
  //           }`,
  //           to: `${throughTable}.${
  //             options.toKey || `${relation.toLowerCase()}_id`
  //           }`,
  //         },
  //         to: `${pluralize(relation)}.id`,
  //       },
  //       ...options,
  //     },
  //   };
  // }

  // // Dependent Associations
  // static _dependentAssociations = new Map();

  // static dependent(relation, options = {}) {
  //   this._dependentAssociations.set(relation, {
  //     dependent: options.dependent || "nullify",
  //     foreignKey: options.foreignKey || `${this.name.toLowerCase()}_id`,
  //   });
  // }

  // ------------------------------------------------------------

  // // Scoping Methods
  static scope(name, callback) {
    if (!this._scopes) {
      this._scopes = new Map();
    }
    this._scopes.set(name, callback);

    // Add the scope as a static method
    this[name] = function (...args) {
      return callback.apply(this.query(), args);
    };
  }

  static defaultScope(callback) {
    this._defaultScope = callback;
  }

  static unscoped() {
    return this.query().modify((builder) => {
      builder._defaultScope = null;
    });
  }

  // Validation Configuration
  static validates(field, options = {}) {
    if (!this._validations) {
      this._validations = new Map();
    }
    this._validations.set(field, options);
  }

  // Validation Methods
  async validate() {
    this.errors = [];

    if (!this.constructor._validations) return true;

    for (const [field, rules] of this.constructor._validations) {
      await this.validateField(field, rules);
    }

    if (this.errors.length > 0) {
      throw new this.constructor.ValidationError(this.errors);
    }

    return true;
  }

  async validateField(field, rules) {
    const value = this[field];

    // Presence validation
    if (
      rules.presence &&
      (value === null || value === undefined || value === "")
    ) {
      this.errors.push(`${field} can't be blank`);
    }

    // Length validation
    if (rules.length) {
      if (rules.length.minimum && String(value).length < rules.length.minimum) {
        this.errors.push(
          `${field} is too short (minimum is ${rules.length.minimum} characters)`
        );
      }
      if (rules.length.maximum && String(value).length > rules.length.maximum) {
        this.errors.push(
          `${field} is too long (maximum is ${rules.length.maximum} characters)`
        );
      }
    }

    // Format validation
    if (rules.format && !rules.format.test(value)) {
      this.errors.push(`${field} is invalid`);
    }

    // Numericality validation
    if (rules.numericality) {
      const num = Number(value);
      if (isNaN(num)) {
        this.errors.push(`${field} is not a number`);
      } else {
        if (
          rules.numericality.greaterThan &&
          !(num > rules.numericality.greaterThan)
        ) {
          this.errors.push(
            `${field} must be greater than ${rules.numericality.greaterThan}`
          );
        }
        if (
          rules.numericality.lessThan &&
          !(num < rules.numericality.lessThan)
        ) {
          this.errors.push(
            `${field} must be less than ${rules.numericality.lessThan}`
          );
        }
      }
    }

    // Inclusion validation
    if (rules.inclusion && !rules.inclusion.includes(value)) {
      this.errors.push(`${field} is not included in the list`);
    }

    // Exclusion validation
    if (rules.exclusion && rules.exclusion.includes(value)) {
      this.errors.push(`${field} is reserved`);
    }

    // Uniqueness validation
    if (rules.uniqueness) {
      const query = this.constructor.where({ [field]: value });
      if (this.id) {
        query.whereNot({ id: this.id });
      }
      const exists = await query.first();
      if (exists) {
        this.errors.push(`${field} has already been taken`);
      }
    }

    // Custom validation
    if (rules.validate) {
      const result = await rules.validate.call(this, value);
      if (result !== true) {
        this.errors.push(result || `${field} is invalid`);
      }
    }
  }

  // Callback Registration
  static before(callback, ...methods) {
    console.log("Before called in model.js");
    methods.forEach((method) => {
      const callbackArray =
        this._callbacks[
          `before${method.charAt(0).toUpperCase() + method.slice(1)}`
        ];
      if (callbackArray) {
        callbackArray.push(callback);
      }
    });
  }

  static after(callback, ...methods) {
    methods.forEach((method) => {
      const callbackArray =
        this._callbacks[
          `after${method.charAt(0).toUpperCase() + method.slice(1)}`
        ];
      if (callbackArray) {
        callbackArray.push(callback);
      }
    });
  }

  // Callback Execution
  async runCallbacks(type) {
    console.log(`Running ${type} callbacks`); // Debugging
    const callbacks = this.constructor._callbacks[type] || [];
    for (const callback of callbacks) {
      console.log(`Invoking ${type} callback`); // Debugging
      await callback.call(this);
    }
  }

  // Validation State
  isValid() {
    try {
      this.validate();
      return true;
    } catch (error) {
      if (error instanceof this.constructor.ValidationError) {
        return false;
      }
      throw error;
    }
  }

  isInvalid() {
    return !this.isValid();
  }

  // Error Handling
  static get ValidationError() {
    return class ValidationError extends Error {
      constructor(errors) {
        super("Validation failed");
        this.errors = errors;
      }
    };
  }

  // ------------------------------------------------------------

  // Callback Registration Methods
  static before_validation(callback) {
    if (!this._callbacks.beforeValidation) {
      this._callbacks.beforeValidation = [];
    }
    this._callbacks.beforeValidation.push(callback);
  }

  static before_create(callback) {
    if (!this._callbacks.beforeCreate) {
      this._callbacks.beforeCreate = [];
    }
    this._callbacks.beforeCreate.push(callback);
  }

  static before_update(callback) {
    if (!this._callbacks.beforeUpdate) {
      this._callbacks.beforeUpdate = [];
    }
    this._callbacks.beforeUpdate.push(callback);
  }

  static before_save(callback) {
    console.log("Registering before_save callback");
    if (!this._callbacks.beforeSave) {
      this._callbacks.beforeSave = [];
    }
    this._callbacks.beforeSave.push(callback);
  }

  static before_destroy(callback) {
    if (!this._callbacks.beforeDestroy) {
      this._callbacks.beforeDestroy = [];
    }
    this._callbacks.beforeDestroy.push(callback);
  }

  static after_validation(callback) {
    if (!this._callbacks.afterValidation) {
      this._callbacks.afterValidation = [];
    }
    this._callbacks.afterValidation.push(callback);
  }

  static after_create(callback) {
    if (!this._callbacks.afterCreate) {
      this._callbacks.afterCreate = [];
    }
    this._callbacks.afterCreate.push(callback);
  }

  static after_update(callback) {
    if (!this._callbacks.afterUpdate) {
      this._callbacks.afterUpdate = [];
    }
    this._callbacks.afterUpdate.push(callback);
  }

  static after_save(callback) {
    if (!this._callbacks.afterSave) {
      this._callbacks.afterSave = [];
    }
    this._callbacks.afterSave.push(callback);
  }

  static after_destroy(callback) {
    if (!this._callbacks.afterDestroy) {
      this._callbacks.afterDestroy = [];
    }
    this._callbacks.afterDestroy.push(callback);
  }

  static after_find(callback) {
    if (!this._callbacks.afterFind) {
      this._callbacks.afterFind = [];
    }
    this._callbacks.afterFind.push(callback);
  }

  static after_initialize(callback) {
    if (!this._callbacks.afterInitialize) {
      this._callbacks.afterInitialize = [];
    }
    this._callbacks.afterInitialize.push(callback);
  }

  // ------------------------------------------------------------

  // Attribute Handling
  static _attributes = new Set();
  static _virtualAttributes = new Map();
  static _hiddenAttributes = new Set();
  static _readOnlyAttributes = new Set();
  static _encryptedAttributes = new Set();

  // Attribute Definition Methods
  static attribute(name, options = {}) {
    this._attributes.add(name);
    if (options.virtual) {
      this._virtualAttributes.set(name, options.get || (() => null));
    }
    if (options.hidden) {
      this._hiddenAttributes.add(name);
    }
    if (options.readOnly) {
      this._readOnlyAttributes.add(name);
    }
    if (options.encrypted) {
      this._encryptedAttributes.add(name);
    }
  }

  // Serialization Methods
  toJSON(options = {}) {
    const json = {};

    // Get all attributes
    const attributes = new Set([
      ...Object.keys(this),
      ...this.constructor._attributes,
      ...this.constructor._virtualAttributes.keys(),
    ]);

    // Filter out hidden attributes unless explicitly included
    for (const attr of attributes) {
      if (
        !this.constructor._hiddenAttributes.has(attr) ||
        options.includeHidden
      ) {
        // Get virtual attribute value if it exists
        if (this.constructor._virtualAttributes.has(attr)) {
          const getter = this.constructor._virtualAttributes.get(attr);
          json[attr] = getter.call(this);
        } else {
          json[attr] = this[attr];
        }
      }
    }

    // Remove internal properties
    delete json._destroyed;
    delete json.errors;

    // Handle relationships
    if (options.include) {
      for (const relation of options.include) {
        if (this[relation]) {
          json[relation] = Array.isArray(this[relation])
            ? this[relation].map((r) => r.toJSON())
            : this[relation].toJSON();
        }
      }
    }

    return json;
  }

  serialize(options = {}) {
    return this.toJSON(options);
  }

  // Attribute Type Casting
  static _attributeTypes = new Map();

  static attributeType(name, type) {
    this._attributeTypes.set(name, type);
  }

  _castAttribute(name, value) {
    const type = this.constructor._attributeTypes.get(name);
    if (!type) return value;

    switch (type) {
      case "boolean":
        return Boolean(value);
      case "number":
        return Number(value);
      case "string":
        return String(value);
      case "date":
        return value instanceof Date ? value : new Date(value);
      case "json":
        return typeof value === "string" ? JSON.parse(value) : value;
      default:
        return value;
    }
  }

  // Attribute Access Methods
  getAttribute(name) {
    if (this.constructor._virtualAttributes.has(name)) {
      const getter = this.constructor._virtualAttributes.get(name);
      return getter.call(this);
    }
    return this[name];
  }

  setAttribute(name, value) {
    if (this.constructor._readOnlyAttributes.has(name)) {
      throw new Error(`Cannot set read-only attribute: ${name}`);
    }
    this[name] = this._castAttribute(name, value);
  }

  getAttributes() {
    const attributes = {};
    for (const attr of this.constructor._attributes) {
      attributes[attr] = this.getAttribute(attr);
    }
    return attributes;
  }

  // Mass Assignment Protection
  static _protectedAttributes = new Set(["id", "created_at", "updated_at"]);

  assignAttributes(attributes) {
    for (const [key, value] of Object.entries(attributes)) {
      if (!this.constructor._protectedAttributes.has(key)) {
        this.setAttribute(key, value);
      }
    }
  }

  // Utility Methods
  isDirty(attribute) {
    if (attribute) {
      return this._originalAttributes?.[attribute] !== this[attribute];
    }
    return Object.keys(this._originalAttributes || {}).some(
      (key) => this._originalAttributes[key] !== this[key]
    );
  }

  wasChanged(attribute) {
    if (attribute) {
      return this._previousChanges?.[attribute] !== undefined;
    }
    return Object.keys(this._previousChanges || {}).length > 0;
  }

  changedAttributes() {
    const changes = {};
    for (const [key, value] of Object.entries(this)) {
      if (this._originalAttributes?.[key] !== value) {
        changes[key] = [this._originalAttributes?.[key], value];
      }
    }
    return changes;
  }

  resetAttribute(name) {
    if (this._originalAttributes?.[name] !== undefined) {
      this[name] = this._originalAttributes[name];
    }
  }

  resetAttributes() {
    Object.assign(this, this._originalAttributes || {});
  }

  // Clone
  clone() {
    return new this.constructor(this.toJSON());
  }

  // Inspection
  inspect() {
    return {
      id: this.id,
      attributes: this.getAttributes(),
      changes: this.changedAttributes(),
      errors: this.errors,
    };
  }

  // ------------------------------------------------------------

  // Caching Configuration
  static _cacheEnabled = false;
  static _cacheStore = null;
  static _cacheTTL = 3600; // 1 hour default

  // Cache Configuration Methods
  static enableCaching(options = {}) {
    this._cacheEnabled = true;
    this._cacheStore = options.store;
    this._cacheTTL = options.ttl || this._cacheTTL;
  }

  static disableCaching() {
    this._cacheEnabled = false;
  }

  // Cache Key Generation
  static _generateCacheKey(queryString, bindings) {
    const queryData = JSON.stringify({ query: queryString, bindings });
    return `${this.name}:${crypto
      .createHash("md5")
      .update(queryData)
      .digest("hex")}`;
  }

  // Cached Query Methods
  static async findCached(id) {
    if (!this._cacheEnabled) return this.find(id);

    const cacheKey = `${this.name}:${id}`;
    const cached = await this._cacheStore.get(cacheKey);

    if (cached) {
      return new this(JSON.parse(cached));
    }

    const record = await this.find(id);
    if (record) {
      await this._cacheStore.set(
        cacheKey,
        JSON.stringify(record),
        this._cacheTTL
      );
    }

    return record;
  }

  static async queryCached(callback) {
    if (!this._cacheEnabled) return callback(this.query());

    const query = this.query();
    const originalExec = query.execute;

    query.execute = async () => {
      const cacheKey = this._generateCacheKey(
        query.toString(),
        query.getBindings()
      );
      const cached = await this._cacheStore.get(cacheKey);

      if (cached) {
        return JSON.parse(cached).map((data) => new this(data));
      }

      const results = await originalExec.call(query);
      await this._cacheStore.set(
        cacheKey,
        JSON.stringify(results),
        this._cacheTTL
      );
      return results;
    };

    return callback(query);
  }

  // Cache Invalidation
  async invalidateCache() {
    if (!this.constructor._cacheEnabled) return;

    const cacheKey = `${this.constructor.name}:${this.id}`;
    await this.constructor._cacheStore.del(cacheKey);
  }

  static async invalidateAllCache() {
    if (!this._cacheEnabled) return;

    const pattern = `${this.name}:*`;
    await this._cacheStore.delPattern(pattern);
  }

  // Locking Mechanisms
  static async withLock(callback, options = {}) {
    const lockKey = `lock:${this.name}:${options.key || "global"}`;
    const lockTTL = options.timeout || 30000; // 30 seconds default

    try {
      const lock = await this._acquireLock(lockKey, lockTTL);
      if (!lock) throw new Error("Failed to acquire lock");

      const result = await callback();

      await this._releaseLock(lockKey);
      return result;
    } catch (error) {
      await this._releaseLock(lockKey);
      throw error;
    }
  }

  async withRowLock(callback, options = {}) {
    return await this.constructor.transaction(async (trx) => {
      const locked = await this.$query(trx)
        .forUpdate()
        .skipLocked(options.skipLocked)
        .timeout(options.timeout || 5000)
        .first();

      if (!locked) {
        throw new Error("Row lock could not be acquired");
      }

      return await callback(locked, trx);
    });
  }

  // Advanced Query Features
  static async explain() {
    const query = this.query();
    return await query.explain();
  }

  static async analyze() {
    const query = this.query();
    return await query.analyze();
  }

  // Query Statistics
  static async queryStats() {
    const stats = await this.query()
      .select(
        this.knex().raw("COUNT(*) as total"),
        this.knex().raw("COUNT(DISTINCT id) as unique_ids"),
        this.knex().raw("MIN(created_at) as oldest"),
        this.knex().raw("MAX(created_at) as newest")
      )
      .first();

    return {
      ...stats,
      table: this.tableName,
      model: this.name,
    };
  }

  // Batch Processing with Cursors
  static async *cursor(batchSize = 1000, options = {}) {
    let lastId = 0;

    while (true) {
      const batch = await this.query()
        .where("id", ">", lastId)
        .orderBy("id")
        .limit(batchSize);

      if (batch.length === 0) break;

      yield* batch;

      lastId = batch[batch.length - 1].id;

      if (batch.length < batchSize) break;
    }
  }

  // Streaming Support
  static createReadStream(options = {}) {
    const batchSize = options.batchSize || 1000;
    let currentBatch = [];
    let currentIndex = 0;

    return new Readable({
      objectMode: true,
      async read() {
        try {
          if (currentIndex >= currentBatch.length) {
            currentBatch = await this.query()
              .offset(currentIndex)
              .limit(batchSize);
            currentIndex = 0;

            if (currentBatch.length === 0) {
              this.push(null);
              return;
            }
          }

          this.push(currentBatch[currentIndex++]);
        } catch (error) {
          this.destroy(error);
        }
      },
    });
  }

  // Query Debugging
  static debug() {
    return this.query().debug();
  }

  // ------------------------------------------------------------

  static async profile() {
    const startTime = process.hrtime();
    const result = await this.query();
    const [seconds, nanoseconds] = process.hrtime(startTime);

    return {
      result,
      executionTime: seconds * 1000 + nanoseconds / 1e6,
    };
  }

  // ------------------------------------------------------------

  // Event System
  static _events = new Map();
  static _observers = new Set();
  static _globalEvents = new Map();

  // Event Registration
  static on(eventName, callback) {
    if (!this._events.has(eventName)) {
      this._events.set(eventName, new Set());
    }
    this._events.get(eventName).add(callback);
  }

  static off(eventName, callback) {
    if (this._events.has(eventName)) {
      this._events.get(eventName).delete(callback);
    }
  }

  // Global Events
  static onAny(callback) {
    this._globalEvents.set(callback, true);
  }

  static offAny(callback) {
    this._globalEvents.delete(callback);
  }

  // Event Emission
  async emit(eventName, data = {}) {
    const events = this.constructor._events.get(eventName) || new Set();
    const promises = [];

    // Run specific event callbacks
    for (const callback of events) {
      promises.push(callback.call(this, data));
    }

    // Run global event callbacks
    for (const callback of this.constructor._globalEvents.keys()) {
      promises.push(callback.call(this, eventName, data));
    }

    await Promise.all(promises);
  }

  // Observer Pattern
  static observe(observer) {
    if (typeof observer === "function") {
      observer = new observer();
    }
    this._observers.add(observer);
  }

  static unobserve(observer) {
    this._observers.delete(observer);
  }

  // Observer Notification
  async notifyObservers(event, data = {}) {
    const methodName = `on${event.charAt(0).toUpperCase()}${event.slice(1)}`;
    const promises = [];

    for (const observer of this.constructor._observers) {
      if (typeof observer[methodName] === "function") {
        promises.push(observer[methodName].call(observer, this, data));
      }
    }

    await Promise.all(promises);
  }

  // Advanced Relationship Features
  static hasAndBelongsToMany(relation, options = {}) {
    const throughTable =
      options.through || `${this.name.toLowerCase()}_${relation.toLowerCase()}`;

    this.relationMappings = {
      ...this.relationMappings,
      [relation]: {
        relation: ObjectionModel.ManyToManyRelation,
        modelClass: options.modelClass || relation,
        join: {
          from: `${this.tableName}.id`,
          through: {
            from: `${throughTable}.${
              options.fromKey || `${this.name.toLowerCase()}_id`
            }`,
            to: `${throughTable}.${
              options.toKey || `${relation.toLowerCase()}_id`
            }`,
            extra: options.extra || [],
          },
          to: `${pluralize(relation)}.id`,
        },
        ...options,
      },
    };
  }

  // Polymorphic Relationships
  static morphTo(name, options = {}) {
    this.relationMappings = {
      ...this.relationMappings,
      [name]: {
        relation: ObjectionModel.BelongsToOneRelation,
        modelClass: (row) => {
          const type = row[options.typeField || `${name}_type`];
          return this.getRelatedModel(type);
        },
        join: {
          from: `${this.tableName}.${options.foreignKey || `${name}_id`}`,
          to: (table) => `${table}.id`,
        },
        ...options,
      },
    };
  }

  static morphMany(relation, options = {}) {
    this.relationMappings = {
      ...this.relationMappings,
      [relation]: {
        relation: ObjectionModel.HasManyRelation,
        modelClass: options.modelClass || relation,
        join: {
          from: `${this.tableName}.id`,
          to: `${pluralize(relation)}.${options.foreignKey || "morphable_id"}`,
        },
        filter: (query) => {
          query.where(options.typeField || "morphable_type", this.name);
        },
        ...options,
      },
    };
  }

  static morphOne(relation, options = {}) {
    this.relationMappings = {
      ...this.relationMappings,
      [relation]: {
        relation: ObjectionModel.HasOneRelation,
        modelClass: options.modelClass || relation,
        join: {
          from: `${this.tableName}.id`,
          to: `${pluralize(relation)}.${options.foreignKey || "morphable_id"}`,
        },
        filter: (query) => {
          query.where(options.typeField || "morphable_type", this.name);
        },
        ...options,
      },
    };
  }

  // Relationship Loading Methods
  async loadMissing(...relations) {
    if (!this.id) return this;
    await this.$fetchGraph(this.constructor._normalizeIncludes(relations));
    return this;
  }

  static async loadMissingAll(models, ...relations) {
    if (!models.length) return models;
    await this.loadRelated(models, this._normalizeIncludes(relations));
    return models;
  }

  // Relationship Existence Queries
  static whereHas(relation, callback = null) {
    const query = this.query().whereExists(this.relatedQuery(relation));

    if (callback) {
      query.modify(callback);
    }

    return query;
  }

  static whereDoesntHave(relation, callback = null) {
    const query = this.query().whereNotExists(this.relatedQuery(relation));

    if (callback) {
      query.modify(callback);
    }

    return query;
  }

  // Relationship Counting
  static withCount(relations) {
    const query = this.query();

    for (const [relation, callback] of Object.entries(relations)) {
      query
        .withGraphFetched(`${relation} as ${relation}Count`)
        .modifyGraph(relation, callback);
    }

    return query;
  }

  // ------------------------------------------------------------

  // Transaction Management
  static async transaction(callback) {
    const trx = await this.startTransaction();

    try {
      const result = await callback(trx);
      await trx.commit();
      return result;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  static async startTransaction() {
    return await this.knex().transaction();
  }

  // Advanced Transaction Methods
  static async transactionWithSavepoint(callback) {
    return await this.transaction(async (trx) => {
      const savepoint = await trx.raw("SAVEPOINT sp1");

      try {
        const result = await callback(trx);
        await trx.raw("RELEASE SAVEPOINT sp1");
        return result;
      } catch (error) {
        await trx.raw("ROLLBACK TO SAVEPOINT sp1");
        throw error;
      }
    });
  }

  static async withDeadlockRetry(callback, maxRetries = 3, delay = 100) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.transaction(callback);
      } catch (error) {
        lastError = error;

        if (!this.isDeadlockError(error) || attempt === maxRetries) {
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, delay * attempt));
      }
    }

    throw lastError;
  }

  // Advanced Query Builder Methods
  static queryBuilder() {
    return new QueryBuilder(this);
  }

  static raw(sql, bindings) {
    return this.knex().raw(sql, bindings);
  }

  // Complex Queries
  static async findByComplex(conditions) {
    const query = this.query();

    for (const [field, condition] of Object.entries(conditions)) {
      if (typeof condition === "object") {
        for (const [operator, value] of Object.entries(condition)) {
          switch (operator) {
            case "$eq":
              query.where(field, "=", value);
              break;
            case "$ne":
              query.where(field, "!=", value);
              break;
            case "$gt":
              query.where(field, ">", value);
              break;
            case "$gte":
              query.where(field, ">=", value);
              break;
            case "$lt":
              query.where(field, "<", value);
              break;
            case "$lte":
              query.where(field, "<=", value);
              break;
            case "$in":
              query.whereIn(field, value);
              break;
            case "$nin":
              query.whereNotIn(field, value);
              break;
            case "$like":
              query.where(field, "like", value);
              break;
            case "$ilike":
              query.where(field, "ilike", value);
              break;
            case "$between":
              query.whereBetween(field, value);
              break;
            case "$notBetween":
              query.whereNotBetween(field, value);
              break;
            case "$null":
              value ? query.whereNull(field) : query.whereNotNull(field);
              break;
          }
        }
      } else {
        query.where(field, condition);
      }
    }

    return await query;
  }

  // Database Operations
  static async truncate(cascade = false) {
    const trx = await this.startTransaction();

    try {
      if (cascade) {
        await trx.raw(`TRUNCATE TABLE ${this.tableName} CASCADE`);
      } else {
        await trx.raw(`TRUNCATE TABLE ${this.tableName}`);
      }

      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  static async vacuum(options = {}) {
    return await this.knex().raw(
      `VACUUM ${this.tableName} ${options.full ? "FULL" : ""}`
    );
  }

  static async analyze() {
    return await this.knex().raw(`ANALYZE ${this.tableName}`);
  }

  // Database Maintenance
  static async reindex() {
    return await this.knex().raw(`REINDEX TABLE ${this.tableName}`);
  }

  static async optimizeTable() {
    return await this.knex().raw(`OPTIMIZE TABLE ${this.tableName}`);
  }

  // Query Execution Control
  static async withTimeout(timeout, callback) {
    const query = this.query().timeout(timeout);
    return await callback(query);
  }

  static async withQueryLimit(limit, callback) {
    const originalLimit = this.query()._limit;

    try {
      this.query()._limit = limit;
      return await callback();
    } finally {
      this.query()._limit = originalLimit;
    }
  }

  // Query Plan Methods
  static async explainQuery(sql, bindings) {
    return await this.knex().raw(`EXPLAIN ${sql}`, bindings);
  }

  static async explainAnalyzeQuery(sql, bindings) {
    return await this.knex().raw(`EXPLAIN ANALYZE ${sql}`, bindings);
  }

  // Database Health Checks
  static async checkConnection() {
    try {
      await this.knex().raw("SELECT 1");
      return true;
    } catch (error) {
      return false;
    }
  }

  static async tableExists() {
    const result = await this.knex().schema.hasTable(this.tableName);
    return result;
  }

  static async columnExists(columnName) {
    const result = await this.knex().schema.hasColumn(
      this.tableName,
      columnName
    );
    return result;
  }

  // ------------------------------------------------------------

  isNewRecord() {
    return !this.id;
  }

  // isDestroyed() {
  //   return this._destroyed === true;
  // }

  // reload() {
  //   return this.$query().findById(this.id);
  // }
}

// // Include Validatable by default
// Model.include(Validatable);

module.exports = Model;
