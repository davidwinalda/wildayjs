const path = require("path");
const fs = require("fs").promises;
const {
  toSnakeCase,
  pluralize,
  singularize,
} = require("../../utils/stringUtils");
const { log } = require("../utils/logger");
const {
  createTableTemplate,
  addColumnsTemplate,
  removeColumnsTemplate,
  renameColumnTemplate,
  changeColumnTemplate,
  dropTableTemplate,
  renameTableTemplate,
  addIndexTemplate,
  addForeignKeyTemplate,
  createHasOneTemplate,
  addBelongsToTemplate,
  createJoinTableTemplate,
  addPolymorphicTemplate,
  createThroughTableTemplate,
} = require("./templates");

const COLUMN_TYPES = {
  // String types
  string: { name: "string", params: ["length"] },
  text: { name: "text" },
  char: { name: "char", params: ["length"] },
  varchar: { name: "string", params: ["length"] },

  // Numeric types
  integer: { name: "integer" },
  bigInteger: { name: "bigInteger" },
  float: { name: "float", params: ["precision", "scale"] },
  decimal: { name: "decimal", params: ["precision", "scale"] },
  boolean: { name: "boolean" },

  // Date/Time types
  date: { name: "date" },
  datetime: { name: "datetime" },
  time: { name: "time" },
  timestamp: { name: "timestamp" },

  // Special types
  binary: { name: "binary" },
  json: { name: "json" },
  jsonb: { name: "jsonb" },
  uuid: { name: "uuid" },
  enum: { name: "enum", params: ["values"] },

  // Association types
  references: {
    name: "integer",
    params: ["table", "column"],
    modifiers: ["unsigned"],
  },

  polymorphic: {
    name: "polymorphic",
    isComplex: true,
    generateColumns: (name) => [
      {
        name: `${name}_id`,
        type: "integer",
        options: {
          unsigned: true,
          nullable: false,
          polymorphic: true,
          polymorphicName: name,
        },
      },
      {
        name: `${name}_type`,
        type: "string",
        options: {
          length: 255,
          nullable: false,
          polymorphic: true,
          polymorphicName: name,
        },
      },
    ],
  },
};

const SAFE_TYPE_CHANGES = {
  string: ["text", "varchar"],
  text: ["string", "varchar"],
  integer: ["bigInteger", "decimal"],
  float: ["decimal"],
  decimal: ["float"],
};

const TEMPLATE_TYPES = {
  CREATE_TABLE: "createTable",
  ADD_COLUMNS: "addColumns",
  REMOVE_COLUMNS: "removeColumns",
  RENAME_COLUMN: "renameColumn",
  CHANGE_COLUMN: "changeColumn",
  DROP_TABLE: "dropTable",
  RENAME_TABLE: "renameTable",
  ADD_INDEX: "addIndex",
  ADD_FOREIGN_KEY: "addForeignKey",
  CREATE_HAS_ONE: "createHasOne",
  ADD_BELONGS_TO: "addBelongsTo",
  CREATE_JOIN_TABLE: "createJoinTable",
  ADD_POLYMORPHIC: "addPolymorphic",
  CREATE_THROUGH_TABLE: "createThroughTable",
};

class ColumnBuilder {
  constructor(name, type, options = {}) {
    this.name = name;
    this.type = type;
    this.options = options;
    this.templateType = options.templateType || TEMPLATE_TYPES.ADD_COLUMNS;
  }

  build() {
    // Special handling for polymorphic columns
    if (this.options.polymorphic) {
      const name = this.options.polymorphicName;
      return [
        {
          name: `${name}_id`,
          definition: `table.integer('${name}_id').unsigned().notNullable();`,
          type: "integer",
          options: { unsigned: true },
        },
        {
          name: `${name}_type`,
          definition: `table.string('${name}_type').notNullable();`,
          type: "string",
          options: { length: 255 },
        },
      ];
    }

    const typeInfo = COLUMN_TYPES[this.type.toLowerCase()];
    if (!typeInfo) {
      throw new Error(`Unknown column type: ${this.type}`);
    }

    let definition;

    // Handle special cases
    if (this.type === "references") {
      definition = this.buildForeignKey();
    } else if (this.type === "decimal") {
      definition = this.buildDecimalColumn(typeInfo);
    } else {
      definition = this.buildStandardColumn(typeInfo);
    }

    return {
      name: this.name,
      definition: definition,
      type: this.type,
      options: this.options,
    };
  }

  buildStandardColumn(typeInfo) {
    let definition = `table.${typeInfo.name}('${this.name}')`;

    // Add type parameters if specified
    if (typeInfo.params && this.options.typeParams) {
      const params = Array.isArray(this.options.typeParams)
        ? this.options.typeParams
        : [this.options.typeParams];
      definition += `(${params.join(", ")})`;
    }

    return this.addModifiers(definition) + ";";
  }

  buildDecimalColumn(typeInfo) {
    const precision = this.options.typeParams?.[0] || 10;
    const scale = this.options.typeParams?.[1] || 2;
    let definition = `table.${typeInfo.name}('${this.name}', ${precision}, ${scale})`;
    return this.addModifiers(definition) + ";";
  }

  buildForeignKey() {
    const referencedTable =
      this.options.typeParams?.[0] || pluralize(this.name);
    let definition = `table.integer('${this.name}_id').unsigned()`;
    definition += `.references('id').inTable('${referencedTable}')`;

    if (this.options.onDelete) {
      definition += `.onDelete('${this.options.onDelete}')`;
    }
    if (this.options.onUpdate) {
      definition += `.onUpdate('${this.options.onUpdate}')`;
    }

    return this.addModifiers(definition) + ";";
  }

  addModifiers(definition) {
    // Add basic modifiers
    if (this.options.nullable === false) definition += ".notNullable()";
    if (this.options.unique) definition += ".unique()";
    if (this.options.index) definition += ".index()";
    if (this.options.primary) definition += ".primary()";
    if (this.options.unsigned && !definition.includes(".unsigned()"))
      definition += ".unsigned()";

    // Add default value if specified
    if (this.options.defaultValue !== undefined) {
      if (typeof this.options.defaultValue === "string") {
        definition += `.defaultTo('${this.options.defaultValue}')`;
      } else {
        definition += `.defaultTo(${this.options.defaultValue})`;
      }
    }

    // Add references if specified (for non-foreign key columns)
    if (this.options.references && this.type !== "references") {
      definition +=
        `.references('${this.options.references.column}')` +
        `.inTable('${this.options.references.table}')`;

      if (this.options.references.onDelete) {
        definition += `.onDelete('${this.options.references.onDelete}')`;
      }
      if (this.options.references.onUpdate) {
        definition += `.onUpdate('${this.options.references.onUpdate}')`;
      }
    }

    return definition;
  }
}

class MigrationGenerator {
  constructor() {
    this.migrationsDir = path.join(process.cwd(), "db", "migrate");
  }

  static currentAction = null;

  async createMigration(name, columns = [], options = {}) {
    await this.ensureMigrationsDir();

    console.log("[DEBUG] Creating migration with options:", options);

    // Parse migration type from name and set action
    const migrationInfo = this.parseMigrationName(
      name,
      columns,
      options.tableName
    );
    MigrationGenerator.currentAction = migrationInfo.action;

    try {
      // For join tables, we don't process columns as regular columns
      const columnsToProcess =
        migrationInfo.action === "createJoinTable"
          ? [] // Empty array for join tables since they have predefined structure
          : columns;

      // Process remaining columns if any
      const builtColumns = columnsToProcess
        .map((col) => {
          if (typeof col === "string") {
            console.log(`[DEBUG] Processing column string:`, col);
            const parsedColumn = MigrationGenerator.parseColumnString(col);
            if (parsedColumn.isTableName) return null;

            // Handle polymorphic columns
            if (parsedColumn.isPolymorphic) {
              return new ColumnBuilder(
                parsedColumn.name,
                "polymorphic",
                parsedColumn.options
              ).build();
            }

            const builder = new ColumnBuilder(
              parsedColumn.name,
              parsedColumn.type,
              parsedColumn.options
            );
            return builder.build();
          }
          return new ColumnBuilder(col.name, col.type, col.options).build();
        })
        .flat()
        .filter(Boolean);

      console.log("[DEBUG] Built columns:", builtColumns);

      // Generate migration content
      const content = this.generateMigrationContent(
        migrationInfo,
        builtColumns,
        options
      );

      // Create migration file
      const timestamp = new Date()
        .toISOString()
        .replace(/[^0-9]/g, "")
        .slice(0, 14);
      const filename = `${timestamp}_${name}.js`;
      const filepath = path.join(this.migrationsDir, filename);

      await fs.writeFile(filepath, content);
      console.log("[SUCCESS] Created migration:", filename);
      console.log("[SUCCESS] Migration file created at:", filepath);

      return { filename, filepath };
    } finally {
      MigrationGenerator.currentAction = null;
    }
  }

  getTemplateType(action) {
    switch (action) {
      case "create":
        return TEMPLATE_TYPES.CREATE_TABLE;
      case "add":
        return TEMPLATE_TYPES.ADD_COLUMNS;
      case "remove":
        return TEMPLATE_TYPES.REMOVE_COLUMNS;
      case "rename":
        return TEMPLATE_TYPES.RENAME_COLUMN;
      case "change":
        return TEMPLATE_TYPES.CHANGE_COLUMN;
      case "drop":
        return TEMPLATE_TYPES.DROP_TABLE;
      case "addIndex":
        return TEMPLATE_TYPES.ADD_INDEX;
      case "addForeignKey":
        return TEMPLATE_TYPES.ADD_FOREIGN_KEY;
      case "createHasOne":
        return TEMPLATE_TYPES.CREATE_HAS_ONE;
      case "addBelongsTo":
        return TEMPLATE_TYPES.ADD_BELONGS_TO;
      case "createJoinTable":
        return TEMPLATE_TYPES.CREATE_JOIN_TABLE;
      case "addPolymorphic":
        return TEMPLATE_TYPES.ADD_POLYMORPHIC;
      case "createThrough":
        return TEMPLATE_TYPES.CREATE_THROUGH_TABLE;
      default:
        return TEMPLATE_TYPES.ADD_COLUMNS;
    }
  }

  async ensureMigrationsDir() {
    try {
      await fs.mkdir(this.migrationsDir, { recursive: true });
    } catch (error) {
      if (error.code !== "EEXIST") {
        throw new Error(
          `Failed to create migrations directory: ${error.message}`
        );
      }
    }
  }

  async writeMigrationFile(name, content) {
    const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
    const filename = `${timestamp}_${name}.js`;
    const filepath = path.join(this.migrationsDir, filename);

    await fs.writeFile(filepath, content);
    log.success(`Created migration: ${filename}`);
    log.success(`Migration file created at: ${filepath}`);

    return { filename, filepath };
  }

  generateMigrationContent(migrationInfo, columns, options = {}) {
    console.log("[DEBUG] Generating migration content with:", {
      migrationInfo,
      columns,
      options,
    });

    // Handle special cases that need complex processing
    if (this.isComplexMigration(migrationInfo.action)) {
      return this.handleComplexMigrations(migrationInfo, columns, options);
    }

    // Process columns for standard migrations
    const validColumns = this.prepareColumns(columns);

    // Handle standard migrations
    return this.handleStandardMigrations(migrationInfo, validColumns, options);
  }

  isComplexMigration(action) {
    return [
      "change",
      "remove",
      "createJoinTable",
      "createThroughTable",
    ].includes(action);
  }

  handleComplexMigrations(migrationInfo, columns, options) {
    switch (migrationInfo.action) {
      case "change": {
        // Find the column definition that matches the column we want to change
        const columnDef = columns.find(
          (col) => col.name === migrationInfo.columnName
        );

        if (!columnDef) {
          throw new Error(
            `Column definition not found for ${migrationInfo.columnName}`
          );
        }

        // Extract fromType directly from columnDef.options
        const fromType = columnDef.options.fromType;

        // Create new definition object
        const newDefinition = {
          type: columnDef.type,
          typeParams: columnDef.type === "decimal" ? [10, 2] : undefined,
          upConstraints: [
            ...(columnDef.options?.required ? ["required"] : []),
            ...(columnDef.options?.unique ? ["unique"] : []),
            ...(columnDef.options?.index ? ["index"] : []),
            ...(columnDef.options?.upConstraints || []),
          ],
          downConstraints: columnDef.options?.downConstraints || [],
        };

        // Validate type change if fromType is specified
        if (fromType) {
          this.validateTypeChange(columnDef.type, fromType);
        }

        console.log("[DEBUG] Change column details:", {
          tableName: migrationInfo.tableName,
          columnName: migrationInfo.columnName,
          newDefinition,
          fromType,
        });

        return changeColumnTemplate(
          migrationInfo.tableName,
          migrationInfo.columnName,
          newDefinition,
          fromType
        );
      }
      case "remove": {
        // If columns are provided with constraints
        if (columns && columns.length > 0) {
          const columnsWithDownInfo = columns.map((col) => ({
            name: col.name || migrationInfo.columnName,
            type: col.type || "string",
            options: {
              ...col.options,
              downConstraints: [
                ...(col.options?.required ? ["required"] : []),
                ...(col.options?.unique ? ["unique"] : []),
                ...(col.options?.index ? ["index"] : []),
                ...(col.options?.upConstraints || []),
              ],
            },
          }));
          return removeColumnsTemplate(
            migrationInfo.tableName,
            columnsWithDownInfo
          );
        }

        // Default case when no columns provided
        const defaultColumn = {
          name: migrationInfo.columnName,
          type: "string",
          options: {
            downConstraints: [],
          },
        };
        return removeColumnsTemplate(migrationInfo.tableName, [defaultColumn]);
      }

      case "createJoinTable": {
        console.log("[DEBUG] Generating join table migration:", {
          tableName: migrationInfo.tableName,
          table1: migrationInfo.table1,
          table2: migrationInfo.table2,
        });
        return createJoinTableTemplate(
          migrationInfo.table1,
          migrationInfo.table2,
          {
            tableName: migrationInfo.tableName,
            columns,
            softDeletes: options.softDeletes,
            timestamps: true,
          }
        );
      }

      case "createThroughTable": {
        console.log("[DEBUG] Using through table template:", {
          tableName: migrationInfo.tableName,
          table1: migrationInfo.table1,
          table2: migrationInfo.table2,
        });
        return createThroughTableTemplate(
          migrationInfo.tableName,
          migrationInfo.table1,
          migrationInfo.table2,
          {
            table1Column: migrationInfo.table1Column,
            table2Column: migrationInfo.table2Column,
            columns: columns.filter((col) => !col.name.endsWith("_id")),
            softDeletes: options.softDeletes,
            timestamps: true,
          }
        );
      }
    }
  }

  prepareColumns(columns) {
    return columns.map((col) => ({
      name: col.name,
      definition: col.definition,
      type: col.type,
      options: col.options || {},
    }));
  }

  handleStandardMigrations(migrationInfo, validColumns, options) {
    switch (migrationInfo.action) {
      case "create": {
        if (migrationInfo.hasPolymorphic) {
          console.log("[DEBUG] Using polymorphic template:", {
            tableName: migrationInfo.tableName,
            polymorphicName:
              migrationInfo.polymorphicColumns[0].options.polymorphicName,
          });

          const nonPolymorphicColumns = validColumns.filter(
            (col) =>
              !col.name.includes(
                migrationInfo.polymorphicColumns[0].options.polymorphicName
              )
          );

          return addPolymorphicTemplate(
            migrationInfo.tableName,
            migrationInfo.polymorphicColumns[0].options.polymorphicName,
            {
              action: "create",
              columns: nonPolymorphicColumns,
              timestamps: options.timestamps,
            }
          );
        }
        return createTableTemplate(
          migrationInfo.tableName,
          validColumns,
          options
        );
      }

      case "add":
        return addColumnsTemplate(migrationInfo.tableName, validColumns);

      case "rename":
        return renameColumnTemplate(
          migrationInfo.tableName,
          migrationInfo.oldName,
          migrationInfo.newName
        );

      case "renameTable":
        return renameTableTemplate(
          migrationInfo.fromTable,
          migrationInfo.toTable
        );

      case "drop":
        return dropTableTemplate(migrationInfo.tableName);

      case "addIndex":
        return addIndexTemplate(
          migrationInfo.tableName,
          [{ name: migrationInfo.columnName }],
          `idx_${migrationInfo.tableName}_${migrationInfo.columnName}`
        );

      case "addForeignKey":
        return addForeignKeyTemplate(
          migrationInfo.tableName,
          migrationInfo.columnName,
          migrationInfo.referenceTable
        );

      case "createHasOne":
        return createHasOneTemplate(
          migrationInfo.tableName,
          migrationInfo.parentModel,
          migrationInfo.foreignKey,
          validColumns
        );

      case "addBelongsTo": {
        const constraintName = `fk_${migrationInfo.tableName}_${migrationInfo.columnName}`;
        return addBelongsToTemplate(
          migrationInfo.tableName,
          migrationInfo.columnName,
          migrationInfo.referenceTable,
          {
            constraintName,
            onDelete: "RESTRICT",
            onUpdate: "RESTRICT",
          }
        );
      }

      case "addPolymorphic":
        return addPolymorphicTemplate(
          migrationInfo.tableName,
          migrationInfo.polymorphicName,
          {
            action: "add",
            columns: validColumns.filter((col) => !col.options?.polymorphic),
            timestamps: false,
          }
        );

      default:
        throw new Error(`Unknown migration action: ${migrationInfo.action}`);
    }
  }

  static parseColumnString(columnStr) {
    console.log("[DEBUG] Starting parseColumnString:", {
      columnStr,
      currentAction: MigrationGenerator.currentAction,
    });

    const [name, type = "string", ...options] = columnStr.split(":");
    console.log("[DEBUG] Parsed column parts:", {
      name,
      type,
      options,
      currentAction: MigrationGenerator.currentAction,
    });

    // Handle special tableName format
    if (columnStr.startsWith("tableName:")) {
      const [, value] = columnStr.split(":");
      console.log("[DEBUG] Found table name:", value);
      return {
        isTableName: true,
        value,
        type: "tableName",
      };
    }

    // Handle polymorphic type
    if (type === "polymorphic") {
      console.log("[DEBUG] Processing polymorphic columns for:", name);
      const polymorphicColumns = COLUMN_TYPES.polymorphic.generateColumns(name);
      console.log("[DEBUG] Generated polymorphic columns:", polymorphicColumns);

      return {
        name,
        type: "polymorphic",
        isComplex: true,
        columns: polymorphicColumns,
        options: {
          polymorphic: true,
          polymorphicName: name,
          upConstraints: [],
          downConstraints: [],
        },
      };
    }

    // Special handling for references type
    if (type === "references") {
      const referencedTable = options[0] || pluralize(name);
      return {
        name: `${name}_id`,
        type: "integer",
        options: {
          unsigned: true,
          references: {
            table: referencedTable,
            column: "id",
            onDelete: "RESTRICT",
            onUpdate: "RESTRICT",
          },
        },
      };
    }

    // Initialize options and constraints
    const columnOptions = {};
    let fromType = null;
    const upConstraints = [];
    const downConstraints = [];
    let beforeFromOptions = [];
    let afterFromOptions = [];
    let foundFrom = false;

    // Separate options before and after 'from' keyword
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      if (!opt) continue;

      if (opt === "from") {
        foundFrom = true;
        if (i + 1 < options.length) {
          fromType = options[i + 1];
          i++; // Skip the next item (fromType)
        }
      } else {
        if (foundFrom) {
          afterFromOptions.push(opt);
        } else {
          beforeFromOptions.push(opt);
        }
      }
    }

    // Process options based on current action
    const optionsToProcess =
      MigrationGenerator.currentAction === "remove"
        ? options // For remove, all options go to down migration
        : beforeFromOptions;

    optionsToProcess.forEach((opt) => {
      switch (opt) {
        case "required":
          columnOptions.nullable = false;
          if (MigrationGenerator.currentAction === "remove") {
            downConstraints.push(opt);
          } else {
            upConstraints.push(opt);
          }
          break;
        case "unique":
          columnOptions.unique = true;
          if (MigrationGenerator.currentAction === "remove") {
            downConstraints.push(opt);
          } else {
            upConstraints.push(opt);
          }
          break;
        case "index":
          columnOptions.index = true;
          if (MigrationGenerator.currentAction === "remove") {
            downConstraints.push(opt);
          } else {
            upConstraints.push(opt);
          }
          break;
        case "unsigned":
          columnOptions.unsigned = true;
          break;
        case "foreign":
          MigrationGenerator.handleForeignOption(name, columnOptions);
          if (MigrationGenerator.currentAction === "remove") {
            downConstraints.push(opt);
          } else {
            upConstraints.push(opt);
          }
          break;
        default:
          if (opt.startsWith("default=")) {
            const value = opt.split("=")[1];
            columnOptions.defaultValue =
              !isNaN(value) && value !== "" ? Number(value) : value;
          } else if (opt.startsWith("ref=")) {
            const [table, column = "id"] = opt.split("=")[1].split(".");
            columnOptions.references = {
              table,
              column,
              onDelete: "RESTRICT",
              onUpdate: "RESTRICT",
            };
          }
      }
    });

    // Process 'after from' options for down constraints in change migrations
    if (MigrationGenerator.currentAction === "change") {
      afterFromOptions.forEach((opt) => {
        switch (opt) {
          case "required":
          case "unique":
          case "index":
            downConstraints.push(opt);
            break;
        }
      });
    }

    // Validate type
    if (!COLUMN_TYPES[type.toLowerCase()]) {
      throw new Error(`Invalid column type: ${type}`);
    }

    const result = {
      name,
      type,
      fromType, // Include fromType at the top level
      options: {
        ...columnOptions,
        upConstraints,
        downConstraints,
        fromType, // Also include in options for backward compatibility
      },
    };

    console.log("[DEBUG] Parsed column result:", result);

    return result;
  }

  static handleForeignOption(name, columnOptions) {
    const tableName = name.replace(/_id$/, "s");
    columnOptions.unsigned = true;
    columnOptions.references = {
      table: tableName,
      column: "id",
      onDelete: "RESTRICT",
      onUpdate: "RESTRICT",
    };
  }

  validateTypeChange(newType, oldType) {
    if (!oldType || !newType) return true;
    if (newType === oldType) return true;

    const safeChanges = SAFE_TYPE_CHANGES[oldType] || [];
    if (!safeChanges.includes(newType)) {
      console.warn(
        `[WARNING] Changing from ${oldType} to ${newType} might result in data loss.`
      );
    }
    return true;
  }

  parseMigrationName(name, columns = [], customTableName = null) {
    console.log("[DEBUG] Parsing migration name:", name);
    console.log("[DEBUG] With columns:", columns);
    console.log("[DEBUG] Custom table name:", customTableName);

    const handleName = (str) => {
      console.log("[DEBUG] Handling name:", str);

      // 1. Convert to singular form using our utility function
      const singular = singularize(str);
      console.log("[DEBUG] Singular form:", singular);

      // 2. Convert to snake_case
      const snakeCase = toSnakeCase(singular);
      console.log("[DEBUG] Snake case:", snakeCase);

      // 3. Convert to plural form
      const result = pluralize(snakeCase);
      console.log("[DEBUG] Final result:", result);

      return result;
    };

    // Collect all possible matches
    const matches = {
      createThroughTable: name.match(
        /^CreateThrough([A-Z][a-zA-Z]+)For([A-Z][a-zA-Z]+)And([A-Z][a-zA-Z]+)$/
      ),
      createJoin: name.match(
        /^CreateJoinTable([A-Z][a-zA-Z]+)And([A-Z][a-zA-Z]+)$/
      ),
      hasOne: name.match(/^CreateHasOne(.+)For(.+)$/),
      create: name.match(/^Create(?!JoinTable|HasOne|Through)(.+)$/),
      change: name.match(/^Change(.+)In(.+)$/),
      addBelongsTo: name.match(/^Add(.+)To(.+)$/),
      addIndex: name.match(/^AddIndexTo([A-Z][a-z]+)([A-Z][a-zA-Z]+)$/),
      addForeignKey: name.match(/^AddForeignKeyTo(\w+?)([A-Z]\w+)$/),
      addPolymorphic: name.match(/^Add(.+)To(.+)$/),
      add: name.match(/^Add(?!IndexTo)(.+)To(.+)$/),
      remove: name.match(/^Remove(.+)From(.+)$/),
      renameTable: name.match(
        /^RenameTable([A-Z][a-zA-Z]+)To([A-Z][a-zA-Z]+)$/
      ),
      rename: name.match(/^Rename(.+)To(.+)In(.+)$/),
      drop: name.match(/^Drop(.+)$/),
    };

    console.log("[DEBUG] All matches:", matches);

    if (
      matches.addPolymorphic &&
      columns.some((col) => col.type === "polymorphic")
    ) {
      console.log(
        "[DEBUG] Found add polymorphic match:",
        matches.addPolymorphic
      );
      const tableName = handleName(matches.addPolymorphic[2]);
      const polymorphicColumn = columns.find(
        (col) => col.type === "polymorphic"
      );

      return {
        action: "addPolymorphic",
        tableName,
        polymorphicName: polymorphicColumn.options.polymorphicName,
      };
    }

    // Check for belongs-to relationship first
    if (matches.addBelongsTo && this.hasReferencesColumn(columns)) {
      console.log("[DEBUG] Belongs To match found:", matches.addBelongsTo);

      const relationName = toSnakeCase(matches.addBelongsTo[1]); // e.g., "author"
      const tableName = handleName(matches.addBelongsTo[2]); // e.g., "posts"
      const columnName = `${relationName}_id`; // e.g., "author_id"

      // Get the reference table from the column definition
      const referenceColumn = columns[0];
      const referenceTable =
        typeof referenceColumn === "string"
          ? referenceColumn.split(":")[2] || pluralize(relationName) // Get "users" from "author:references:users"
          : referenceColumn.options?.references?.table ||
            pluralize(relationName); // Get from column options or fallback

      console.log("[DEBUG] Belongs To relationship details:", {
        relationName,
        tableName,
        columnName,
        referenceTable,
      });

      return {
        action: "addBelongsTo",
        tableName,
        columnName,
        referenceTable,
      };
    }

    // Then check other matches in order of specificity
    if (matches.hasOne) {
      const relationName = toSnakeCase(matches.hasOne[1]);
      const parentModel = toSnakeCase(matches.hasOne[2]);

      console.log("[DEBUG] Has One relationship details:", {
        relationName,
        parentModel,
      });

      return {
        action: "createHasOne",
        tableName: pluralize(relationName),
        parentModel: pluralize(parentModel),
        foreignKey: `${parentModel}_id`,
      };
    }

    if (matches.create) {
      console.log("[DEBUG] Found create match:", matches.create);

      // Check for polymorphic columns
      const polymorphicColumns = columns.filter(
        (col) =>
          col.type === "polymorphic" || (col.options && col.options.polymorphic)
      );

      console.log("[DEBUG] Found polymorphic columns:", polymorphicColumns);

      const hasPolymorphic = polymorphicColumns.length > 0;
      const tableName = handleName(matches.create[1]);

      return {
        action: "create",
        tableName,
        hasPolymorphic,
        polymorphicColumns,
      };
    }

    if (matches.change) {
      return {
        action: "change",
        columnName: toSnakeCase(matches.change[1]),
        tableName: handleName(matches.change[2]),
      };
    }

    if (matches.addIndex) {
      const tableName = handleName(matches.addIndex[1]);
      const columnName = toSnakeCase(matches.addIndex[2]);

      console.log("[DEBUG] Index migration details:");
      console.log("  Table:", tableName);
      console.log("  Column:", columnName);

      return {
        action: "addIndex",
        tableName,
        columnName,
      };
    }

    if (matches.addForeignKey) {
      const tableName = handleName(matches.addForeignKey[1]);
      const columnName = toSnakeCase(matches.addForeignKey[2]);
      const referenceTable = pluralize(columnName.replace(/_id$/, ""));

      console.log("[DEBUG] Foreign key details:", {
        tableName,
        columnName,
        referenceTable,
      });

      return {
        action: "addForeignKey",
        tableName,
        columnName,
        referenceTable,
      };
    }

    if (matches.add && !this.hasReferencesColumn(columns)) {
      return {
        action: "add",
        columnName: toSnakeCase(matches.add[1]),
        tableName: handleName(matches.add[2]),
      };
    }

    if (matches.remove) {
      return {
        action: "remove",
        columnName: toSnakeCase(matches.remove[1]),
        tableName: handleName(matches.remove[2]),
      };
    }

    // Handling for renameTable
    if (matches.renameTable) {
      console.log("[DEBUG] Found rename table match:", matches.renameTable);
      const fromTable = toSnakeCase(matches.renameTable[1]);
      const toTable = toSnakeCase(matches.renameTable[2]);

      console.log("[DEBUG] Rename table details:", {
        fromTable,
        toTable,
      });

      return {
        action: "renameTable",
        fromTable,
        toTable,
      };
    }

    if (matches.rename) {
      return {
        action: "rename",
        oldName: toSnakeCase(matches.rename[1]),
        newName: toSnakeCase(matches.rename[2]),
        tableName: handleName(matches.rename[3]),
      };
    }

    if (matches.drop) {
      return {
        action: "drop",
        tableName: handleName(matches.drop[1]),
      };
    }

    if (matches.createJoin) {
      console.log("[DEBUG] Found createJoin match:", matches.createJoin);

      // Get singular forms first
      const table1Singular = singularize(matches.createJoin[1]);
      const table2Singular = singularize(matches.createJoin[2]);

      // Convert to snake_case and get plural forms
      const table1 = pluralize(toSnakeCase(table1Singular));
      const table2 = pluralize(toSnakeCase(table2Singular));

      // Get singular snake_case forms for column names
      const table1Column = toSnakeCase(table1Singular);
      const table2Column = toSnakeCase(table2Singular);

      // Use custom table name if provided, otherwise use default
      const tableName = customTableName
        ? toSnakeCase(customTableName)
        : `${table1}_${table2}`;

      console.log("[DEBUG] Join Table details:", {
        tableName,
        table1,
        table2,
        table1Column,
        table2Column,
        customTableName,
      });

      return {
        action: "createJoinTable",
        tableName,
        table1,
        table2,
        table1Column,
        table2Column,
      };
    }

    // createThrough handling
    if (matches.createThroughTable) {
      console.log(
        "[DEBUG] Found createThroughTable match:",
        matches.createThroughTable
      );
      const [, tableName, model1, model2] = matches.createThroughTable;

      // Convert models to proper format - no need to pluralize here as models are already plural
      const table1 = toSnakeCase(model1); // 'Students' -> 'students'
      const table2 = toSnakeCase(model2); // 'Courses' -> 'courses'
      const table1Column = singularize(table1); // 'students' -> 'student'
      const table2Column = singularize(table2); // 'courses' -> 'course'

      console.log("[DEBUG] Through table details:", {
        tableName: toSnakeCase(tableName),
        table1,
        table2,
        table1Column,
        table2Column,
      });

      return {
        action: "createThroughTable",
        tableName: toSnakeCase(tableName), // 'enrollments'
        table1: table1.toLowerCase(), // 'students' (already plural)
        table2: table2.toLowerCase(), // 'courses' (already plural)
        table1Column, // 'student'
        table2Column, // 'course'
      };
    }

    throw new Error("Invalid migration name format");
  }

  hasReferencesColumn(columns) {
    return columns.some((col) => {
      if (typeof col === "string") {
        const parts = col.split(":");
        return parts[1] === "references";
      }
      return (
        col.type === "references" ||
        (col.options && col.options.references) ||
        (col.definition && col.definition.includes("references"))
      );
    });
  }
}

// Export the necessary classes and constants
module.exports = {
  MigrationGenerator,
  COLUMN_TYPES,
  SAFE_TYPE_CHANGES,
  TEMPLATE_TYPES,
};
