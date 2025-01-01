const fs = require("fs");
const path = require("path");
const generateMigration = require("../generateMigration");
const { capitalize, pluralize } = require("../utils/stringUtils");

class ModelGenerator {
  constructor(modelName, attributes = []) {
    this.modelName = modelName.toLowerCase();
    this.className = capitalize(modelName);
    this.tableName = pluralize(this.modelName);
    this.attributes = attributes;
    this.modelsDir = path.join(process.cwd(), "app", "models");
  }

  generate() {
    this.createModelsDirectory();
    this.generateModelFile();
    this.generateMigrationFiles();
  }

  createModelsDirectory() {
    if (!fs.existsSync(this.modelsDir)) {
      fs.mkdirSync(this.modelsDir, { recursive: true });
    }
  }

  generateModelFile() {
    const fileName = `${this.modelName.toLowerCase()}.js`;
    const filePath = path.join(this.modelsDir, fileName);
    const { associations, validations } = this.parseAttributesAndRelations();

    let modelContent = `class ${this.className} extends Model {\n`;

    // Add associations if any
    if (associations.length > 0) {
      modelContent += `  static initializeAssociations() {\n`;
      associations.forEach((assoc) => {
        modelContent += `    this.${assoc.type}("${assoc.name}", "${assoc.foreignKey}");\n`;
      });
      modelContent += `  }\n\n`;
    }

    // Add validations if any
    if (validations.length > 0) {
      modelContent += `  static initializeValidations() {\n`;
      modelContent += `    console.log("Initializing ${this.className} validations");\n\n`;
      validations.forEach((validation) => {
        modelContent += `    this.validates(\n`;
        modelContent += `      "${validation.field}",\n`;
        modelContent += `      Validations.${validation.type}("${validation.field}"${validation.options})\n`;
        modelContent += `    );\n`;
      });
      modelContent += `\n    console.log("${this.className} validations:", this.validations[this.name]);\n`;
      modelContent += `  }\n`;
    }

    modelContent += `}\n\nmodule.exports = ${this.className};\n`;

    fs.writeFileSync(filePath, modelContent);
    console.log(`Model created: app/models/${fileName}`);
  }

  generateMigrationFiles() {
    if (this.attributes.length > 0) {
      // Pass the original attributes, not the processed ones
      const originalAttributes = [...this.attributes];
      generateMigration(`Create${this.className}s`, originalAttributes);
    }
  }

  parseAttributesAndRelations() {
    const associations = [];
    const validations = [];
    const processedAttributes = [...this.attributes]; // Create a copy instead of modifying original

    this.attributes.forEach((attr) => {
      const parts = attr.split(":");
      const fieldName = parts[0];
      const fieldType = parts[1];
      const modifiers = parts.slice(2);

      // Handle associations
      if (fieldType === "references" || fieldType === "belongs_to") {
        const foreignKey = `${fieldName}_id`;
        associations.push({
          type: "belongsTo",
          name: fieldName,
          foreignKey,
        });
        // Add presence validation for foreign key
        validations.push({
          field: foreignKey,
          type: "presence",
          options: `, {\n        message: "${this.className} must belong to a ${fieldName}"\n      }`,
        });
        return;
      }

      // Handle basic validations
      if (fieldType) {
        // Presence validation
        if (modifiers.includes("null:false")) {
          validations.push({
            field: fieldName,
            type: "presence",
            options: `, {\n        message: "${fieldName} cannot be empty"\n      }`,
          });
        }

        // Uniqueness validation
        if (modifiers.includes("unique")) {
          validations.push({
            field: fieldName,
            type: "uniqueness",
            options: "",
          });
        }

        // Length validation for strings
        if (fieldType === "string") {
          validations.push({
            field: fieldName,
            type: "length",
            options: `, {\n        minimum: 3,\n        maximum: 255,\n        message: "${fieldName} must be between 3 and 255 characters"\n      }`,
          });
        }
      }

      processedAttributes.push(attr);
    });

    return { associations, validations };
  }
}

// Command-line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error(`
Usage: 
  Generate model:
    wildayjs generate:model user

  Generate model with attributes:
    wildayjs generate:model user name:string:null:false:unique email:string:null:false:unique

  Generate model with associations:
    wildayjs generate:model post title:string:null:false body:text:null:false user:references

Available options:
  - Column types: string, text, integer, decimal, datetime, boolean, references
  - Modifiers: null:false, unique, default=value
  - Associations: references, belongs_to

Examples:
  wildayjs generate:model user name:string email:string:null:false:unique
  wildayjs generate:model post title:string:null:false body:text user:references
  wildayjs generate:model comment body:text:null:false user:references post:belongs_to
    `);
    process.exit(1);
  }

  const modelName = args[0];
  const attributes = args.slice(1);
  const generator = new ModelGenerator(modelName, attributes);
  generator.generate();
}

module.exports = ModelGenerator;
