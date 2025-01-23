const { QueryBuilder: ObjectionBuilder } = require("objection");
const ConnectionManager = require("../../database/connectionManager");

module.exports = (QueryBuilder) => {
  const prototype = ObjectionBuilder.prototype;

  if (QueryBuilder.prototype.__relationshipsExtended) return;
  QueryBuilder.prototype.__relationshipsExtended = true;

  // Helper method to get the current database type
  QueryBuilder.prototype.getDatabaseType = function () {
    return ConnectionManager.getCurrentDatabaseType();
  };

  Object.assign(QueryBuilder.prototype, {
    // ========================
    // Basic Relationship Methods
    // ========================

    /**
     * Add a `hasMany` relationship query.
     * @param {string} relationName - The name of the relationship.
     * @param {function} [callback] - Optional callback to modify the related query.
     * @returns {QueryBuilder}
     */
    hasMany(relationName, callback) {
      // Get the related model and setup
      const ModelClass = this.modelClass();
      const relation = ModelClass.getRelation(relationName);
      if (!relation) {
        throw new Error(
          `Relation "${relationName}" not found in model "${ModelClass.name}".`
        );
      }

      const RelatedModel = relation.relatedModelClass;

      // Get the correct foreign key name
      const foreignKey =
        relation.foreignKey || `${ModelClass.tableName.slice(0, -1)}_id`;

      // Create a subquery to get the parent id
      const parentQuery = this.select("id");

      // Create the related query with a where clause using the subquery
      const query = RelatedModel.query().whereIn(foreignKey, parentQuery);

      // Apply any custom conditions
      if (callback && typeof callback === "function") {
        callback(query);
      }

      return query;
    },

    /**
     * Add a `belongsTo` relationship query.
     * @param {string} relationName - The name of the relationship.
     * @param {function} [callback] - Optional callback to modify the related query.
     * @returns {QueryBuilder}
     */
    belongsTo(relationName, callback) {
      const ModelClass = this.modelClass();
      const relation = ModelClass.getRelation(relationName);
      if (!relation) {
        throw new Error(
          `Relation "${relationName}" not found in model "${ModelClass.name}".`
        );
      }

      const RelatedModel = relation.relatedModelClass;
      const foreignKey = relation.foreignKey || `${relationName}_id`;

      // Create a subquery to get the foreign key value
      const parentQuery = this.select(foreignKey);

      // Create the related query
      const query = RelatedModel.query().whereIn("id", parentQuery);

      // Apply any custom conditions
      if (callback && typeof callback === "function") {
        callback(query);
      }

      return query.first();
    },

    /**
     * Add a `hasOne` relationship query.
     * @param {string} relationName - The name of the relationship.
     * @param {function} [callback] - Optional callback to modify the related query.
     * @returns {QueryBuilder}
     */
    hasOne(relationName, callback) {
      const query = this.hasMany(relationName, callback);
      return query.first();
    },

    /**
     * Add a `belongsToMany` relationship query.
     * @param {string} relationName - The name of the relationship.
     * @param {function} [callback] - Optional callback to modify the related query.
     * @returns {QueryBuilder}
     */
    belongsToMany(relationName, callback) {
      const ModelClass = this.modelClass();
      const relation = ModelClass.getRelation(relationName);
      if (!relation) {
        throw new Error(
          `Relation "${relationName}" not found in model "${ModelClass.name}".`
        );
      }

      const RelatedModel = relation.relatedModelClass;
      const joinTable = relation.joinTable;
      const foreignKey = relation.foreignKey;
      const otherKey = relation.otherKey;

      // Create a subquery to get the parent id
      const parentQuery = this.select("id");

      // Create the related query with joins
      const query = RelatedModel.query()
        .join(
          joinTable,
          `${RelatedModel.tableName}.id`,
          `${joinTable}.${otherKey}`
        )
        .whereIn(`${joinTable}.${foreignKey}`, parentQuery);

      // Apply any custom conditions
      if (callback && typeof callback === "function") {
        callback(query);
      }

      return query;
    },

    // ========================
    // Eager Loading (Rails-like `includes`)
    // ========================

    /**
     * Eager load related models (similar to Rails `includes`).
     * @param {string|array} relations - The relation(s) to eager load.
     * @returns {QueryBuilder}
     */
    includes(relations) {
      if (Array.isArray(relations)) {
        return this.withGraphFetched(`[${relations.join(", ")}]`);
      } else {
        return this.withGraphFetched(relations);
      }
    },

    /**
     * Eager load related models and modify the related query (similar to Rails `includes` with block).
     * @param {string|array} relations - The relation(s) to eager load.
     * @param {function} callback - Callback to modify the related query.
     * @returns {QueryBuilder}
     */
    includesWithModifier(relations, callback) {
      if (Array.isArray(relations)) {
        return this.withGraphFetched(`[${relations.join(", ")}]`, callback);
      } else {
        return this.withGraphFetched(relations, callback);
      }
    },

    /**
     * Eager load related models using joins (similar to Rails `eager_load`).
     * @param {string|array} relations - The relation(s) to eager load.
     * @returns {QueryBuilder}
     */
    eagerLoad(relations) {
      if (Array.isArray(relations)) {
        return this.withGraphJoined(`[${relations.join(", ")}]`);
      } else {
        return this.withGraphJoined(relations);
      }
    },

    /**
     * Eager load related models using joins and modify the related query (similar to Rails `eager_load` with block).
     * @param {string|array} relations - The relation(s) to eager load.
     * @param {function} callback - Callback to modify the related query.
     * @returns {QueryBuilder}
     */
    eagerLoadWithModifier(relations, callback) {
      if (Array.isArray(relations)) {
        return this.withGraphJoined(`[${relations.join(", ")}]`, callback);
      } else {
        return this.withGraphJoined(relations, callback);
      }
    },

    /**
     * Eager load nested relationships (similar to Rails nested `includes`).
     * @param {object} nestedRelations - An object specifying nested relationships.
     * @returns {QueryBuilder}
     */
    nestedIncludes(nestedRelations) {
      const relations = Object.entries(nestedRelations)
        .map(([relation, nested]) => {
          if (Array.isArray(nested)) {
            return `${relation}.[${nested.join(", ")}]`;
          } else if (typeof nested === "object") {
            return `${relation}.[${Object.entries(nested)
              .map(([nestedRelation, deeperNested]) => {
                if (Array.isArray(deeperNested)) {
                  return `${nestedRelation}.[${deeperNested.join(", ")}]`;
                } else {
                  return nestedRelation;
                }
              })
              .join(", ")}]`;
          } else {
            return relation;
          }
        })
        .join(", ");

      return this.withGraphFetched(`[${relations}]`);
    },

    /**
     * Alias for `withGraphFetched`.
     * @param {string|array} relations - The relation(s) to eager load.
     * @returns {QueryBuilder}
     */
    with(relations) {
      if (Array.isArray(relations)) {
        return this.withGraphFetched(`[${relations.join(", ")}]`);
      } else {
        return this.withGraphFetched(relations);
      }
    },

    // ========================
    // Joins
    // ========================

    /**
     * Join a related table.
     * @param {string} relationName - The name of the relationship.
     * @param {string} [operator] - The join operator (default: "=").
     * @param {string} [type] - The type of join (default: "inner").
     * @returns {QueryBuilder}
     */
    joins(relationName, operator = "=", type = "inner") {
      const ModelClass = this.modelClass();
      const relation = ModelClass.getRelation(relationName);
      const RelatedModel = relation.relatedModelClass;
      const foreignKey =
        relation.foreignKey || `${ModelClass.tableName.slice(0, -1)}_id`;

      return this.join(
        RelatedModel.tableName,
        `${ModelClass.tableName}.${foreignKey}`,
        operator,
        `${RelatedModel.tableName}.id`,
        type
      );
    },

    /**
     * Left join a related table.
     * @param {string} relationName - The name of the relationship.
     * @param {string} [operator] - The join operator (default: "=").
     * @returns {QueryBuilder}
     */
    leftJoins(relationName, operator = "=") {
      return this.joins(relationName, operator, "left");
    },

    /**
     * Right join a related table.
     * @param {string} relationName - The name of the relationship.
     * @param {string} [operator] - The join operator (default: "=").
     * @returns {QueryBuilder}
     */
    rightJoins(relationName, operator = "=") {
      return this.joins(relationName, operator, "right");
    },

    // ========================
    // Advanced Relationship Methods
    // ========================

    /**
     * Add a `through` relationship query.
     * @param {string} relationName - The name of the relationship.
     * @param {function} [callback] - Optional callback to modify the related query.
     * @returns {QueryBuilder}
     */
    through(relationName, callback) {
      const ModelClass = this.modelClass();
      const relation = ModelClass.getRelation(relationName);
      const ThroughModel = relation.throughModelClass;
      const foreignKey = relation.foreignKey;
      const otherKey = relation.otherKey;

      // Create a subquery to get the parent id
      const parentQuery = this.select("id");

      // Create the through query
      const query = ThroughModel.query()
        .join(
          ModelClass.tableName,
          `${ThroughModel.tableName}.${otherKey}`,
          "=",
          `${ModelClass.tableName}.id`
        )
        .whereIn(`${ThroughModel.tableName}.${foreignKey}`, parentQuery);

      // Apply any custom conditions
      if (callback && typeof callback === "function") {
        callback(query);
      }

      return query;
    },

    /**
     * Add a `hasManyThrough` relationship query.
     * @param {string} relationName - The name of the relationship.
     * @param {function} [callback] - Optional callback to modify the related query.
     * @returns {QueryBuilder}
     */
    hasManyThrough(relationName, callback) {
      const ModelClass = this.modelClass();
      const relation = ModelClass.getRelation(relationName);
      const RelatedModel = relation.relatedModelClass;
      const ThroughModel = relation.throughModelClass;
      const foreignKey = relation.foreignKey;
      const otherKey = relation.otherKey;

      // Create a subquery to get the parent id
      const parentQuery = this.select("id");

      // Create the related query with joins
      const query = RelatedModel.query()
        .join(
          ThroughModel.tableName,
          `${RelatedModel.tableName}.id`,
          "=",
          `${ThroughModel.tableName}.${otherKey}`
        )
        .whereIn(`${ThroughModel.tableName}.${foreignKey}`, parentQuery);

      // Apply any custom conditions
      if (callback && typeof callback === "function") {
        callback(query);
      }

      return query;
    },

    // ========================
    // Polymorphic Relationships
    // ========================

    /**
     * Add a `morphTo` relationship query.
     * @param {string} relationName - The name of the relationship.
     * @param {function} [callback] - Optional callback to modify the related query.
     * @returns {QueryBuilder}
     */
    morphTo(relationName, callback) {
      const ModelClass = this.modelClass();
      const relation = ModelClass.getRelation(relationName);
      const morphType = relation.morphType;
      const morphId = relation.morphId;

      // Create subqueries to get the morph type and id
      const typeQuery = this.select(morphType);
      const idQuery = this.select(morphId);

      // Create the polymorphic query
      const query = ModelClass.query()
        .whereIn(morphType, typeQuery)
        .whereIn(morphId, idQuery);

      // Apply any custom conditions
      if (callback && typeof callback === "function") {
        callback(query);
      }

      return query;
    },

    /**
     * Add a `morphMany` relationship query.
     * @param {string} relationName - The name of the relationship.
     * @param {function} [callback] - Optional callback to modify the related query.
     * @returns {QueryBuilder}
     */
    morphMany(relationName, callback) {
      const ModelClass = this.modelClass();
      const relation = ModelClass.getRelation(relationName);
      const RelatedModel = relation.relatedModelClass;
      const morphType = relation.morphType;
      const morphId = relation.morphId;

      // Create a subquery to get the parent id
      const parentQuery = this.select("id");

      // Create the polymorphic query
      const query = RelatedModel.query()
        .where(morphType, ModelClass.name)
        .whereIn(morphId, parentQuery);

      // Apply any custom conditions
      if (callback && typeof callback === "function") {
        callback(query);
      }

      return query;
    },

    /**
     * Add a `morphOne` relationship query.
     * @param {string} relationName - The name of the relationship.
     * @param {function} [callback] - Optional callback to modify the related query.
     * @returns {QueryBuilder}
     */
    morphOne(relationName, callback) {
      return this.morphMany(relationName, callback).first();
    },
  });
};
