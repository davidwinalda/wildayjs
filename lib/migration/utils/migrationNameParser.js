const { toSnakeCase } = require("../../utils/stringUtils");
const { databaseTypeMappings } = require("../config/typeMapping");

function parseMigrationName(migrationName) {
  // Get all available types from type mappings
  const availableTypes = new Set(Object.keys(databaseTypeMappings.mysql));

  // Legacy format (RenameXToYInZ)
  const renamePattern = /^Rename(.+)To(.+)In(.+)$/;
  const renameMatch = migrationName.match(renamePattern);

  if (renameMatch) {
    const [_, oldNameRaw, newNameRaw, tableRaw] = renameMatch;
    return {
      type: "rename_column",
      oldName: toSnakeCase(oldNameRaw),
      newName: toSnakeCase(newNameRaw),
      table: tableRaw.toLowerCase(),
    };
  }

  // Direct format (rename:column table old_name new_name)
  const renameDirectPattern = /^rename:column\s+(\w+)\s+(\w+)\s+(\w+)$/i; // added 'i' flag for case-insensitive
  const renameDirectMatch = migrationName
    .toLowerCase()
    .match(renameDirectPattern);

  if (renameDirectMatch) {
    const [_, table, oldName, newName] = renameDirectMatch;
    return {
      type: "rename_column",
      table: table.toLowerCase(),
      oldName,
      newName,
    };
  }

  // Match pattern: Change{Column}TypeTo{Type}In{Table}
  const changePattern = /^Change(.+)TypeTo(.+)In(.+)$/;
  const changeMatch = migrationName.match(changePattern);

  if (changeMatch) {
    return {
      type: "change_column",
      columnName: changeMatch[1]
        .replace(/([A-Z])/g, "_$1")
        .toLowerCase()
        .slice(1),
      newType: changeMatch[2].toLowerCase(),
      table: changeMatch[3].toLowerCase(),
    };
  }

  // Add direct format support
  const changeDirectPattern = /^change:column\s+(\w+)\s+(\w+)\s+(\w+)$/;
  const changeDirectMatch = migrationName.match(changeDirectPattern);

  if (changeDirectMatch) {
    const [_, table, columnName, newType] = changeDirectMatch;
    return {
      type: "change_column",
      table: table.toLowerCase(),
      columnName,
      newType: newType.toLowerCase(),
    };
  }

  // Match pattern: Remove{Column}From{Table}
  // Existing legacy format
  const removePattern = /^Remove(.+)From(.+)$/;
  const removeMatch = migrationName.match(removePattern);

  if (removeMatch) {
    return {
      type: "remove_column",
      columnName: removeMatch[1]
        .replace(/([A-Z])/g, "_$1")
        .toLowerCase()
        .slice(1),
      table: removeMatch[2].toLowerCase(),
    };
  }

  // Add direct format support
  const removeDirectPattern = /^remove:column\s+(\w+)\s+(\w+)$/;
  const removeDirectMatch = migrationName.match(removeDirectPattern);

  if (removeDirectMatch) {
    const [_, table, columnName] = removeDirectMatch;
    return {
      type: "remove_column",
      table: table.toLowerCase(),
      columnName,
    };
  }

  // Add direct format support
  // Example: create:table users name:string:null email:string:not_null:unique
  console.log("\n=== Migration Parser Called ===");
  console.log("Migration Name:", migrationName);
  console.log("Stack:", new Error().stack);

  // Add direct format support
  const createDirectPattern = /^create:table\s+(\w+)(?:\s+(.+))?$/;
  const createDirectMatch = migrationName.match(createDirectPattern);

  if (createDirectMatch) {
    const [_, tableName, columnDefinitions = ""] = createDirectMatch;

    // Get columns without including the table name
    const columns = columnDefinitions
      ? columnDefinitions
          .trim()
          .split(/\s+/)
          .filter((col) => {
            const colName = col.split(":")[0];
            return colName !== tableName && colName.length > 0;
          })
      : [];

    const result = {
      type: "create_table",
      table: tableName.toLowerCase(),
      columns: columns,
    };

    console.log("Returning result:", result);
    console.log("=== End Migration Parser ===\n");

    return result;
  }

  // Legacy format with inline columns and --columns/-c flag support
  const createPattern = /^Create(\w+?)(?:\s+(.+))?$/;
  const createMatch = migrationName.match(createPattern);

  if (createMatch) {
    const [_, tableName, columnDefinitions = ""] = createMatch;
    let columns = [];

    // Check for inline columns first
    if (columnDefinitions) {
      columns = columnDefinitions.trim().split(/\s+/);
    }
    // Then check for --columns/-c flag
    else if (options && (options.columns || options.c)) {
      const flagColumns = options.columns || options.c;
      columns = Array.isArray(flagColumns)
        ? flagColumns
        : flagColumns.trim().split(/\s+/);
    }

    return {
      type: "create_table",
      table: tableName.toLowerCase(),
      columns: columns,
    };
  }

  // Add direct format support for index
  // Example: add:index users email
  // Example: add:unique_index users email
  const indexDirectPattern = /^add:(unique_)?index\s+(\w+)\s+(\w+)$/;
  const indexDirectMatch = migrationName.match(indexDirectPattern);

  if (indexDirectMatch) {
    const [_, isUnique, tableName, columnName] = indexDirectMatch;
    return {
      type: "add_index",
      table: tableName.toLowerCase(),
      column: columnName.toLowerCase(),
      isUnique: !!isUnique,
    };
  }

  // Add index patterns
  const addIndexPattern = /^AddIndexTo(.+)$/;
  const addUniqueIndexPattern = /^AddUniqueIndexTo(.+)$/;

  if (
    addIndexPattern.test(migrationName) ||
    addUniqueIndexPattern.test(migrationName)
  ) {
    return {
      type: "add_index",
      name: migrationName,
    };
  }

  // Direct format
  // Example: add:foreign_key articles authors
  const fkDirectPattern = /^add:foreign_key\s+(\w+)\s+(\w+)$/;
  const fkDirectMatch = migrationName.match(fkDirectPattern);

  if (fkDirectMatch) {
    const [_, fromTable, toTable] = fkDirectMatch;
    return {
      type: "add_foreign_key",
      table: fromTable.toLowerCase(),
      column: `${toTable.slice(0, -1).toLowerCase()}_id`,
      referencedTable: toTable.toLowerCase(),
    };
  }

  // Legacy format patterns
  const patterns = {
    // Format 1: AddForeignKeyToArticleAuthor
    standard: /^AddForeignKeyTo(\w+)([A-Z]\w+)$/,

    // Format 2: AddAuthorToArticle
    simple: /^Add(\w+)To(\w+)$/,

    // Format 3: AddAuthorRefToArticle
    reference: /^Add(\w+)RefTo(\w+)$/,

    // Format 4: AddAuthorIdToArticle
    explicit: /^Add(\w+)IdTo(\w+)$/,
  };

  for (const [format, pattern] of Object.entries(patterns)) {
    const match = migrationName.match(pattern);
    if (match) {
      let modelName, referencedModel;

      switch (format) {
        case "standard":
          [_, modelName, referencedModel] = match;
          break;
        case "simple":
        case "reference":
        case "explicit":
          [_, referencedModel, modelName] = match;
          break;
      }

      return {
        type: "add_foreign_key",
        table: `${modelName.toLowerCase()}s`,
        column: `${referencedModel.toLowerCase()}_id`,
        referencedTable: `${referencedModel.toLowerCase()}s`,
      };
    }
  }

  // Direct format for adding column
  // Example: add:column articles author_id:integer
  const addColumnDirectPattern = /^add:column\s+(\w+)\s+(\w+):(\w+)(?::(.+))?$/;
  const addColumnDirectMatch = migrationName.match(addColumnDirectPattern);

  if (addColumnDirectMatch) {
    const [_, table, columnName, columnType, constraints] =
      addColumnDirectMatch;

    if (!availableTypes.has(columnType.toLowerCase())) {
      throw new Error(
        `Invalid column type: ${columnType}. Available types: ${[
          ...availableTypes,
        ].join(", ")}`
      );
    }

    const columnDef = constraints
      ? `${columnName}:${columnType}:${constraints}`
      : `${columnName}:${columnType}`;

    return {
      type: "add_column",
      table: table.toLowerCase(),
      columns: [columnDef],
    };
  }

  // Legacy format with column definition
  // Examples:
  // - AddAddressToUsers address:string
  // - AddTokenToUsers token:string:default=TKN_{random}_{timestamp}
  const addColumnWithDefPattern = /^Add(\w+)To(\w+)\s+(\w+):(\w+)(?::(.+))?$/;
  const addColumnWithDefMatch = migrationName.match(addColumnWithDefPattern);

  if (addColumnWithDefMatch) {
    const [_, _columnName, table, columnName, columnType, constraints] =
      addColumnWithDefMatch;

    if (!availableTypes.has(columnType.toLowerCase())) {
      throw new Error(
        `Invalid column type: ${columnType}. Available types: ${[
          ...availableTypes,
        ].join(", ")}`
      );
    }

    const columnDef = constraints
      ? `${columnName}:${columnType}:${constraints}`
      : `${columnName}:${columnType}`;

    return {
      type: "add_column",
      table: table.toLowerCase(),
      columns: [columnDef],
    };
  }

  // Legacy format without column definition (fallback)
  // Example: AddEmailToUsers -> adds email:string
  const addColumnPattern = /^Add(\w+)To(\w+?)(?:([A-Z]\w+))?$/;
  const addColumnMatch = migrationName.match(addColumnPattern);

  if (addColumnMatch) {
    const [_, columnName, table, typeOrConstraint] = addColumnMatch;

    const typeMap = {
      String: "string",
      Integer: "integer",
      Text: "text",
      Boolean: "boolean",
      Datetime: "datetime",
      Float: "float",
      Decimal: "decimal",
      Date: "date",
      Time: "time",
      Binary: "binary",
      Json: "json",
      Timestamp: "timestamp",
      Uuid: "uuid",
      NotNull: "string:null:false",
      Unique: "string:unique",
      StringNotNull: "string:null:false",
      IntegerNotNull: "integer:null:false",
    };

    let columnType = typeOrConstraint
      ? typeMap[typeOrConstraint] || "string"
      : "string";

    return {
      type: "add_column",
      table: table.toLowerCase(),
      columns: [`${columnName.toLowerCase()}:${columnType}`],
    };
  }

  // Direct format for drop table
  const dropDirectPattern = /^drop:table\s+(\w+)$/;
  const dropDirectMatch = migrationName.match(dropDirectPattern);

  if (dropDirectMatch) {
    const [_, tableName] = dropDirectMatch;
    return {
      type: "drop_table",
      table: tableName.toLowerCase(),
    };
  }

  // Legacy format patterns for drop table
  const dropPatterns = {
    standard: /^DropTable(\w+)$/,
    reversed: /^Drop(\w+)Table$/,
    snake: /^drop_table_(\w+)$/,
    simplified: /^Drop(\w+s)$/,
  };

  for (const [format, pattern] of Object.entries(dropPatterns)) {
    const match = migrationName.match(pattern);
    if (match) {
      let tableName;

      switch (format) {
        case "standard":
        case "simplified":
          [_, tableName] = match;
          break;
        case "reversed":
          [_, tableName] = match;
          tableName = tableName.endsWith("s") ? tableName : `${tableName}s`;
          break;
        case "snake":
          [_, tableName] = match;
          break;
      }

      return {
        type: "drop_table",
        table: tableName.toLowerCase(),
      };
    }
  }

  return null;
}

module.exports = {
  parseMigrationName,
};
