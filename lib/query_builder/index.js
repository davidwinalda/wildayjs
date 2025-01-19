// const WhereClauseExtensions = require("./extensions/where_clauses");
// const PatternMatchingExtensions = require("./extensions/pattern_matching");
// // const OrderingExtensions = require("./extensions/ordering");
// // const AggregateExtensions = require("./extensions/aggregates");
// const TimeBasedExtensions = require("./extensions/time_based");
// const PaginationExtensions = require("./extensions/pagination");
// // const ScopingExtensions = require("./extensions/scoping");
// // const JsonOpsExtensions = require("./extensions/json_ops");
// // const ArrayOpsExtensions = require("./extensions/array_ops");
// // const MathOpsExtensions = require("./extensions/math_ops");

// class QueryBuilderExtensions {
//   static extend(builder) {
//     console.log("Debug: QueryBuilderExtensions.extend called", {
//       builderType: builder.constructor.name,
//       modelClass: builder.modelClass().name,
//       isExtended: !!builder._extended,
//       hasParent: !!builder._parent,
//     });

//     // Check if already extended using the builder's constructor
//     const builderKey = builder.constructor.name;
//     if (builder.constructor._extended) {
//       console.log(
//         `Debug: Builder ${builderKey} already extended globally, applying instance extensions`
//       );
//       this._applyInstanceExtensions(builder);
//       return builder;
//     }

//     console.log(`Debug: First time extending ${builderKey}`);

//     // Extend with all extension categories
//     WhereClauseExtensions.extend(builder);
//     PatternMatchingExtensions.extend(builder);
//     // OrderingExtensions.extend(builder);
//     // AggregateExtensions.extend(builder);
//     TimeBasedExtensions.extend(builder);
//     PaginationExtensions.extend(builder);
//     // ScopingExtensions.extend(builder);
//     // JsonOpsExtensions.extend(builder);
//     // ArrayOpsExtensions.extend(builder);
//     // MathOpsExtensions.extend(builder);

//     // Mark the constructor as extended to prevent future full extensions
//     builder.constructor._extended = true;

//     // Apply instance-specific extensions
//     this._applyInstanceExtensions(builder);
//     console.log("Debug: Extensions applied successfully");
//     return builder;
//   }

//   static _applyInstanceExtensions(builder) {
//     // Copy necessary instance properties
//     if (!builder._extended) {
//       builder._extended = true;
//       builder._orderingExtended = true;
//       // Add other instance-specific flags as needed
//     }
//   }

//   static extendStatic(ModelClass) {
//     console.log("Debug: extendStatic called for", ModelClass.name, {
//       isExtended: !!ModelClass._staticExtended,
//     });
//     // Add a flag to prevent multiple static extensions
//     if (ModelClass._staticExtended) {
//       console.log("Debug: Model class already extended statically");
//       return ModelClass;
//     }
//     ModelClass._staticExtended = true;
//     console.log("Debug: Marked model class as statically extended");

//     // Ensure query() always returns an extended builder
//     const originalQuery = ModelClass.query;
//     ModelClass.query = function (...args) {
//       console.log("Debug: Enhanced query() called");
//       const builder = originalQuery.apply(this, args);
//       return QueryBuilderExtensions.extend(builder);
//     };

//     // Static methods for Model class
//     WhereClauseExtensions.extendStatic?.(ModelClass);
//     PatternMatchingExtensions.extendStatic?.(ModelClass);
//     // OrderingExtensions.extendStatic?.(ModelClass);
//     PaginationExtensions.extendStatic?.(ModelClass);
//     TimeBasedExtensions.extendStatic?.(ModelClass);
//     console.log(
//       "QueryBuilderExtensions.extendStatic completed. Available methods:",
//       Object.keys(ModelClass)
//     );
//     return ModelClass;
//   }
// }

// module.exports = QueryBuilderExtensions;

// query-builder/index.js
const { QueryBuilder } = require("objection");

const crud = require("./extensions/crud");
const ordering = require("./extensions/ordering");
const whereClauses = require("./extensions/where_clauses");
const timeBased = require("./extensions/time_based");
const patternMatching = require("./extensions/pattern_matching");
const pagination = require("./extensions/pagination");
const aggregation = require("./extensions/aggregation");
const finder = require("./extensions/finder");
const relationships = require("./extensions/relationships");
// features
const queryLogging = require("./features/queryLogging");
const queryCaching = require("./features/queryCaching");
const queryDynamic = require("./features/queryDynamic");
const queryHooks = require("./features/queryHooks");
const queryValidation = require("./features/queryValidation");
const queryTransformation = require("./features/queryTransformation");
const queryTemplates = require("./features/queryTemplates");
const queryMetrics = require("./features/queryMetrics");
const queryMiddleware = require("./features/queryMiddleware");
class CustomQueryBuilder extends QueryBuilder {
  /**
   * Get all available query methods including Knex and Objection.js methods
   */
  static get methods() {
    const methods = {
      custom: new Set(),
      objection: new Set(),
      knex: new Set(),
    };

    // Get base Object methods to exclude
    const objectMethods = new Set(Object.getOwnPropertyNames(Object.prototype));

    // Get Objection QueryBuilder prototype methods
    const objectionPrototype = Object.getPrototypeOf(QueryBuilder.prototype);
    const objectionMethods = new Set(
      Object.getOwnPropertyNames(objectionPrototype)
    );

    // Helper to categorize methods
    const categorizeMethod = (prop, obj) => {
      if (
        typeof obj[prop] !== "function" ||
        objectMethods.has(prop) ||
        prop.startsWith("_") ||
        prop === "constructor"
      ) {
        return;
      }

      // First check if it's a custom method
      if (this.prototype.hasOwnProperty(prop)) {
        methods.custom.add(prop);
        return;
      }

      // Then check if it's an Objection.js method
      if (objectionMethods.has(prop)) {
        methods.objection.add(prop);
        return;
      }

      // Finally, assume it's a Knex method
      methods.knex.add(prop);
    };

    // Get methods from the prototype chain
    let currentObj = this.prototype;
    while (currentObj && currentObj !== Object.prototype) {
      Object.getOwnPropertyNames(currentObj).forEach((prop) =>
        categorizeMethod(prop, currentObj)
      );
      currentObj = Object.getPrototypeOf(currentObj);
    }

    // Log detailed method information
    console.log("\nQueryBuilder Methods by Category:");
    console.log("\nCustom Methods:", Array.from(methods.custom).sort());
    console.log(
      "\nObjection.js Methods:",
      Array.from(methods.objection).sort()
    );
    console.log("\nKnex Methods:", Array.from(methods.knex).sort());
    console.log(
      "\nTotal Methods:",
      methods.custom.size + methods.objection.size + methods.knex.size
    );

    return [
      ...Array.from(methods.custom),
      ...Array.from(methods.objection),
      ...Array.from(methods.knex),
    ];
  }

  /**
   * Required static method for Objection.js to instantiate the QueryBuilder for a specific model.
   * @param {ObjectionModel} modelClass
   * @returns {CustomQueryBuilder}
   */
  static forClass(modelClass) {
    return new this(modelClass);
  }

  constructor(modelClass) {
    super(modelClass);
    // Initialize any instance-specific properties here
    this._customExtended = true;
  }
}

// Apply all extensions to the CustomQueryBuilder
crud(CustomQueryBuilder);
ordering(CustomQueryBuilder);
whereClauses(CustomQueryBuilder);
timeBased(CustomQueryBuilder);
patternMatching(CustomQueryBuilder);
pagination(CustomQueryBuilder);
aggregation(CustomQueryBuilder);
finder(CustomQueryBuilder);
relationships(CustomQueryBuilder);
// features
queryLogging(CustomQueryBuilder);
queryCaching(CustomQueryBuilder);
queryDynamic(CustomQueryBuilder);
queryHooks(CustomQueryBuilder);
queryValidation(CustomQueryBuilder);
queryTransformation(CustomQueryBuilder);
queryTemplates(CustomQueryBuilder);
queryMetrics(CustomQueryBuilder);
queryMiddleware(CustomQueryBuilder);

// Debug: Log available methods
console.log("Available QueryBuilder methods:", CustomQueryBuilder.methods);

module.exports = CustomQueryBuilder;
