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
