const { QueryBuilder: ObjectionBuilder } = require("objection");
const ConnectionManager = require("../../database/connectionManager");

module.exports = (QueryBuilder) => {
  console.log("queryTemplates", QueryBuilder);

  if (QueryBuilder.prototype.__queryTemplatesExtended) return;
  QueryBuilder.prototype.__queryTemplatesExtended = true;

  console.log("Initializing queryTemplates feature");

  /**
   * Define a query template.
   */
  QueryBuilder.prototype.defineTemplate = function (name, template) {
    console.log(`Defining template "${name}" for ${this.modelClass().name}`);

    if (typeof template !== "function") {
      throw new Error("Template must be a function.");
    }

    const ModelClass = this.modelClass();
    ModelClass._templates = ModelClass._templates || new Map();

    // Skip if template already exists instead of throwing error
    if (!ModelClass._templates.has(name)) {
      ModelClass._templates.set(name, template);
      console.log(`Template "${name}" registered for ${ModelClass.name}`);
    }

    return this;
  };

  /**
   * Use a registered query template.
   */
  QueryBuilder.prototype.useTemplate = function (name, ...args) {
    console.log(`Using template "${name}" for ${this.modelClass().name}`);

    const ModelClass = this.modelClass();

    // Auto-register templates if not already registered
    if (!ModelClass._templatesRegistered) {
      console.log(`Auto-registering templates for ${ModelClass.name}`);
      this.registerTemplates();
    }

    if (!ModelClass._templates || !ModelClass._templates.has(name)) {
      throw new Error(
        `Template "${name}" does not exist for ${ModelClass.name}`
      );
    }

    const template = ModelClass._templates.get(name);
    return template.apply(this, args);
  };

  /**
   * Register templates from the model's defineTemplates method
   */
  QueryBuilder.prototype.registerTemplates = function () {
    const ModelClass = this.modelClass();
    if (
      typeof ModelClass.defineTemplates === "function" &&
      !ModelClass._templatesRegistered
    ) {
      console.log(`Registering templates for ${ModelClass.name}`);
      ModelClass.defineTemplates.call(ModelClass);
      ModelClass._templatesRegistered = true;
      console.log(
        `Templates registered for ${ModelClass.name}:`,
        Array.from(ModelClass._templates?.keys() || [])
      );
    }
    return this;
  };

  // Override execute to auto-register templates
  const originalExecute = QueryBuilder.prototype.execute;
  QueryBuilder.prototype.execute = function () {
    this.registerTemplates();
    return originalExecute.apply(this, arguments);
  };

  // Add template registration to QueryBuilder's extend method
  const originalExtend = QueryBuilder.extend;
  QueryBuilder.extend = function (ModelClass) {
    console.log(`Extending QueryBuilder for ${ModelClass.name}`);
    const builder = originalExtend.call(this, ModelClass);

    // Register templates if they exist
    if (
      typeof ModelClass.defineTemplates === "function" &&
      !ModelClass._templatesRegistered
    ) {
      console.log(
        `Auto-registering templates for ${ModelClass.name} during extend`
      );
      const tempBuilder = new builder(ModelClass);
      tempBuilder.registerTemplates();
    }

    return builder;
  };
};
