// const fs = require("fs");
// const path = require("path");
// const generateMigration = require("../generateMigration");
// const { capitalize, pluralize } = require("../utils/stringUtils");

// class ModelGenerator {
//   constructor(modelName, attributes = []) {
//     this.modelName = modelName.toLowerCase();
//     this.className = capitalize(modelName);
//     this.tableName = pluralize(this.modelName);
//     this.attributes = attributes;
//     this.modelsDir = path.join(process.cwd(), "app", "models");
//   }

//   generate() {
//     this.createModelsDirectory();
//     this.generateModelFile();
//     this.generateMigrationFiles();
//   }

//   createModelsDirectory() {
//     if (!fs.existsSync(this.modelsDir)) {
//       fs.mkdirSync(this.modelsDir, { recursive: true });
//     }
//   }

//   generateModelFile() {
//     const fileName = `${this.modelName.toLowerCase()}.js`;
//     const filePath = path.join(this.modelsDir, fileName);
//     const associations = this.parseAssociations();

//     let modelContent = `class ${this.className} extends Model {\n`;

//     // Add associations if any
//     if (associations.length > 0) {
//       modelContent += `  static initializeAssociations() {\n`;
//       associations.forEach((assoc) => {
//         switch (assoc.type) {
//           case "hasAndBelongsToMany":
//             modelContent += `    this.${assoc.type}("${assoc.name}", { through: "${assoc.joinTable}" });\n`;
//             break;
//           default:
//             modelContent += `    this.${assoc.type}("${assoc.name}", "${assoc.foreignKey}");\n`;
//         }
//       });
//       modelContent += `  }\n\n`;
//     }

//     // Add validation skeleton
//     modelContent += `  static initializeValidations() {\n`;
//     modelContent += `    // Add your validations here\n`;
//     modelContent += `    // Example:\n`;
//     modelContent += `    // this.validates("field", Validations.presence());\n`;
//     modelContent += `    // this.validates("field", Validations.length({ minimum: 3 }));\n`;
//     modelContent += `    // this.validates("field", Validations.uniqueness());\n`;
//     modelContent += `  }\n`;

//     modelContent += `}\n\nmodule.exports = ${this.className};\n`;

//     fs.writeFileSync(filePath, modelContent);
//     console.log(`Model created: app/models/${fileName}`);
//   }

//   generateMigrationFiles() {
//     if (this.attributes.length > 0) {
//       const migrationAttributes = this.processMigrationAttributes();
//       generateMigration(`Create${this.className}s`, migrationAttributes);
//     }
//   }

//   processMigrationAttributes() {
//     return this.attributes.filter((attr) => {
//       const [, type] = attr.split(":");
//       return ![
//         "has_many",
//         "has_one",
//         "has_and_belongs_to_many",
//         "habtm",
//       ].includes(type);
//     });
//   }

//   parseAssociations() {
//     const associations = [];

//     this.attributes.forEach((attr) => {
//       const [fieldName, fieldType] = attr.split(":");

//       switch (fieldType) {
//         case "references":
//         case "belongs_to":
//           associations.push({
//             type: "belongsTo",
//             name: fieldName,
//             foreignKey: `${fieldName}_id`,
//           });
//           break;

//         case "has_many":
//           associations.push({
//             type: "hasMany",
//             name: pluralize(fieldName),
//             foreignKey: `${this.modelName}_id`,
//           });
//           break;

//         case "has_one":
//           associations.push({
//             type: "hasOne",
//             name: fieldName,
//             foreignKey: `${this.modelName}_id`,
//           });
//           break;

//         case "has_and_belongs_to_many":
//         case "habtm":
//           const joinTable = [this.tableName, pluralize(fieldName)]
//             .sort()
//             .join("_");
//           associations.push({
//             type: "hasAndBelongsToMany",
//             name: pluralize(fieldName),
//             joinTable: joinTable,
//           });
//           this.generateJoinTableMigration(fieldName, joinTable);
//           break;
//       }
//     });

//     return associations;
//   }

//   generateJoinTableMigration(otherModel, joinTable) {
//     const attributes = [
//       `${this.modelName}_id:references`,
//       `${otherModel}_id:references`,
//     ];
//     generateMigration(`Create${capitalize(joinTable)}`, attributes);
//   }
// }

// // Command-line interface
// if (require.main === module) {
//   const args = process.argv.slice(2);
//   if (args.length < 1) {
//     console.error(`
// Usage:
//   Generate model:
//     wildayjs generate:model user

//   Generate model with attributes:
//     wildayjs generate:model user name:string email:string

//   Generate model with associations:
//     wildayjs generate:model post title:string body:text user:references

// Available options:
//   Column types:
//     - string
//     - text
//     - integer
//     - decimal
//     - datetime
//     - boolean
//     - references

//   Associations:
//     - belongs_to / references: Model belongs to another model
//     - has_many: Model has many of another model
//     - has_one: Model has one of another model
//     - has_and_belongs_to_many / habtm: Many-to-many relationship

// Examples:
//   # Basic model with attributes
//   wildayjs generate:model user name:string email:string

//   # One-to-many relationship
//   wildayjs generate:model post title:string user:references
//   wildayjs generate:model user name:string posts:has_many

//   # One-to-one relationship
//   wildayjs generate:model user name:string profile:has_one
//   wildayjs generate:model profile bio:text user:belongs_to

//   # Many-to-many relationship
//   wildayjs generate:model user name:string roles:has_and_belongs_to_many
//   wildayjs generate:model role name:string users:habtm

//   # Adding validations (in your model file):
//     class User extends Model {
//       static initializeValidations() {
//         this.validates("email", Validations.presence());
//         this.validates("email", Validations.uniqueness());
//         this.validates("name", Validations.length({ minimum: 2 }));
//       }
//     }
//     `);
//     process.exit(1);
//   }

//   const modelName = args[0];
//   const attributes = args.slice(1);
//   const generator = new ModelGenerator(modelName, attributes);
//   generator.generate();
// }

// module.exports = ModelGenerator;

const fs = require("fs");
const path = require("path");
const { capitalize, pluralize } = require("../utils/stringUtils");
const { AdapterFactory } = require("../migration/adapters");
const { log } = require("../utils/chalkUtils");
const {
  createTableMigration,
} = require("../migration/generators/sqlGenerators/createTableMigration");
const connectionManager = require("../database/connectionManager");

class ModelGenerator {
  constructor(modelName, attributes = []) {
    this.modelName = modelName.toLowerCase();
    this.className = capitalize(modelName);
    this.tableName = pluralize(this.modelName);
    this.attributes = attributes;
    this.modelsDir = path.join(process.cwd(), "app", "models");
    this.adapter = null;
    this.dbType = null;
  }

  async initialize() {
    console.log("\n=== Initializing ModelGenerator ===");
    const connection = await connectionManager.getConnection();
    this.adapter = await AdapterFactory.create(null, connection);
    this.dbType = this.adapter.type;

    console.log("Database type:", this.dbType);
    console.log("Adapter:", {
      type: this.dbType,
      name: this.adapter.constructor.name,
      config: this.adapter.config,
    });
  }

  async generate() {
    await this.initialize();
    this.createModelsDirectory();
    await this.generateModelFile();
    await this.generateMigrationFiles();
  }

  createModelsDirectory() {
    if (!fs.existsSync(this.modelsDir)) {
      fs.mkdirSync(this.modelsDir, { recursive: true });
    }
  }

  async generateModelFile() {
    const fileName = `${this.modelName.toLowerCase()}.js`;
    const filePath = path.join(this.modelsDir, fileName);
    const associations = this.parseAssociations();

    let modelContent = `class ${this.className} extends Model {\n`;

    // Add associations if any
    if (associations.length > 0) {
      modelContent += `  static initializeAssociations() {\n`;
      associations.forEach((assoc) => {
        switch (assoc.type) {
          case "hasAndBelongsToMany":
            modelContent += `    this.${assoc.type}("${assoc.name}", { through: "${assoc.joinTable}" });\n`;
            break;
          default:
            modelContent += `    this.${assoc.type}("${assoc.name}", "${assoc.foreignKey}");\n`;
        }
      });
      modelContent += `  }\n\n`;
    }

    // Add validation skeleton
    modelContent += `  static initializeValidations() {\n`;
    modelContent += `    // Add your validations here\n`;
    modelContent += `    // Example:\n`;
    modelContent += `    // this.validates("field", Validations.presence());\n`;
    modelContent += `    // this.validates("field", Validations.length({ minimum: 3 }));\n`;
    modelContent += `    // this.validates("field", Validations.uniqueness());\n`;
    modelContent += `  }\n`;

    modelContent += `}\n\nmodule.exports = ${this.className};\n`;

    fs.writeFileSync(filePath, modelContent);
    console.log(`Model created: app/models/${fileName}`);
  }

  async generateMigrationFiles() {
    console.log("\n=== Generating Migration Files ===");

    if (this.attributes.length > 0) {
      const timestamp = new Date()
        .toISOString()
        .replace(/\D/g, "")
        .slice(0, 14);

      // Use createTableMigration helper
      const { sql: migrationContent, downSql: downMigrationContent } =
        createTableMigration(this.tableName, this.attributes, this.adapter);

      const migrationsDir = path.join(process.cwd(), "db", "migrate");
      const downMigrationsDir = path.join(migrationsDir, "down");

      fs.mkdirSync(migrationsDir, { recursive: true });
      fs.mkdirSync(downMigrationsDir, { recursive: true });

      const migrationName = `${timestamp}_create_${this.tableName}.sql`;
      const downMigrationName = `${timestamp}_create_${this.tableName}_down.sql`;

      fs.writeFileSync(
        path.join(migrationsDir, migrationName),
        migrationContent
      );
      fs.writeFileSync(
        path.join(downMigrationsDir, downMigrationName),
        downMigrationContent
      );

      console.log(`Migration created: ${migrationName}`);
      console.log(`Down migration created: ${downMigrationName}`);
    }
  }

  parseAssociations() {
    const associations = [];

    this.attributes.forEach((attr) => {
      const [fieldName, fieldType] = attr.split(":");

      switch (fieldType) {
        case "references":
        case "belongs_to":
          associations.push({
            type: "belongsTo",
            name: fieldName,
            foreignKey: `${fieldName}_id`,
          });
          break;

        case "has_many":
          associations.push({
            type: "hasMany",
            name: pluralize(fieldName),
            foreignKey: `${this.modelName}_id`,
          });
          break;

        case "has_one":
          associations.push({
            type: "hasOne",
            name: fieldName,
            foreignKey: `${this.modelName}_id`,
          });
          break;

        case "has_and_belongs_to_many":
        case "habtm":
          const joinTable = [this.tableName, pluralize(fieldName)]
            .sort()
            .join("_");
          associations.push({
            type: "hasAndBelongsToMany",
            name: pluralize(fieldName),
            joinTable: joinTable,
          });
          this.generateJoinTableMigration(fieldName, joinTable);
          break;
      }
    });

    return associations;
  }

  generateJoinTableMigration(otherModel, joinTable) {
    const attributes = [
      `${this.modelName}_id:references`,
      `${otherModel}_id:references`,
    ];

    // Use createTableMigration for join tables too
    const { sql, downSql } = createTableMigration(
      joinTable,
      attributes,
      this.adapter
    );

    const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);

    const migrationsDir = path.join(process.cwd(), "db", "migrate");
    const downMigrationsDir = path.join(migrationsDir, "down");

    const migrationName = `${timestamp}_create_${joinTable}.sql`;
    const downMigrationName = `${timestamp}_create_${joinTable}_down.sql`;

    fs.writeFileSync(path.join(migrationsDir, migrationName), sql);
    fs.writeFileSync(path.join(downMigrationsDir, downMigrationName), downSql);

    console.log(`Join table migration created: ${migrationName}`);
    console.log(`Join table down migration created: ${downMigrationName}`);
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
    wildayjs generate:model user name:string email:string

  Generate model with associations:
    wildayjs generate:model post title:string body:text user:references

Available options:
  Column types:
    - string (VARCHAR(255) in MySQL/PostgreSQL, TEXT in SQLite)
    - text
    - integer
    - bigint
    - decimal
    - float
    - boolean
    - date
    - datetime
    - timestamp
    - binary
    - json (JSONB in PostgreSQL)

  Associations:
    - belongs_to / references: Model belongs to another model
    - has_many: Model has many of another model
    - has_one: Model has one of another model
    - has_and_belongs_to_many / habtm: Many-to-many relationship

Examples:
  # Basic model with attributes
  wildayjs generate:model user name:string email:string

  # One-to-many relationship
  wildayjs generate:model post title:string user:references
  wildayjs generate:model user name:string posts:has_many

  # One-to-one relationship
  wildayjs generate:model user name:string profile:has_one
  wildayjs generate:model profile bio:text user:belongs_to

  # Many-to-many relationship
  wildayjs generate:model user name:string roles:has_and_belongs_to_many
  wildayjs generate:model role name:string users:habtm
    `);
    process.exit(1);
  }

  const modelName = args[0];
  const attributes = args.slice(1);
  const generator = new ModelGenerator(modelName, attributes);
  generator.generate().catch((error) => {
    console.error("Error generating model:", error);
    process.exit(1);
  });
}

module.exports = ModelGenerator;
