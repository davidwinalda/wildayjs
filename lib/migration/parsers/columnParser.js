const {
  getTypeMappings,
  parseTypeWithConstraints,
} = require("../config/typeMapping");
const {
  validateDefaultValue,
  processDefaultValue,
} = require("../../utils/defaultValueHelper");
const { pluralize } = require("../../utils/stringUtils");

function parseColumns(columns, adapter) {
  console.log("\n=== Parsing Columns ===");
  console.log("Input columns:", columns);
  console.log("Adapter type:", adapter.type);

  const regularColumns = [];
  const foreignKeys = [];
  const typeMappings = getTypeMappings(adapter);

  try {
    columns.forEach((column) => {
      console.log("\nProcessing column:", column);

      const parts = column.split(":");
      if (parts.length < 2) {
        throw new Error(
          `Invalid column format: ${column}. Expected format: name:type[:modifiers]`
        );
      }

      const name = parts[0];
      const type = parts[1].toLowerCase();
      const modifiers = parts.slice(2);

      // Validate column name
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
        throw new Error(
          `Invalid column name: ${name}. Must start with letter or underscore`
        );
      }

      console.log("Column details:", { name, type, modifiers });

      // Handle references and belongs_to relationships
      if (type === "references" || type === "belongs_to") {
        const targetTable = pluralize(name);
        const columnName = `${name}_id`;
        const columnType = typeMappings["integer"] || "INTEGER";

        console.log("Creating foreign key:", {
          columnName,
          targetTable,
          columnType,
        });

        regularColumns.push(
          `${adapter.escapeIdentifier(columnName)} ${columnType} NOT NULL`
        );

        foreignKeys.push(
          `CONSTRAINT ${adapter.escapeIdentifier(`fk_${name}`)} ` +
            `FOREIGN KEY (${adapter.escapeIdentifier(columnName)}) ` +
            `REFERENCES ${adapter.escapeIdentifier(
              targetTable
            )} (${adapter.escapeIdentifier("id")})`
        );
      }
      // Handle regular columns
      else {
        const { type: mappedType, constraints } = parseTypeWithConstraints(
          type,
          adapter
        );

        // Process modifiers
        let columnConstraints = [];

        if (modifiers.includes("null") && modifiers.includes("false")) {
          columnConstraints.push("NOT NULL");
        }
        if (modifiers.includes("unique")) {
          columnConstraints.push("UNIQUE");
        }

        // Handle default values
        const defaultModifier = modifiers.find((mod) =>
          mod.startsWith("default=")
        );
        if (defaultModifier) {
          const rawDefaultValue = defaultModifier.split("=")[1];
          if (validateDefaultValue(rawDefaultValue)) {
            const processedDefault = processDefaultValue(rawDefaultValue);
            columnConstraints.push(`DEFAULT ${processedDefault}`);
          }
        }

        const columnDefinition = [
          adapter.escapeIdentifier(name),
          mappedType,
          ...columnConstraints,
          ...constraints,
        ].join(" ");

        console.log("Column definition:", columnDefinition);
        regularColumns.push(columnDefinition);
      }
    });

    console.log("\nParsed columns:", {
      regularColumns,
      foreignKeys,
    });

    return { regularColumns, foreignKeys };
  } catch (error) {
    console.error("Error parsing columns:", error);
    throw new Error(`Error parsing columns: ${error.message}`);
  }
}

function parseColumnDefinition(column, adapter) {
  console.log("\n=== Parsing Column Definition ===");
  console.log("Input:", column);

  const parts = column.split(":");
  const name = parts[0];
  const type = parts[1];
  const modifiers = parts.slice(2);

  console.log("Parts:", { name, type, modifiers });

  const { type: mappedType, constraints: typeConstraints } =
    parseTypeWithConstraints(type, adapter);
  let constraints = [...typeConstraints];
  let defaultValue = null;

  // Parse default value if exists
  const defaultModifier = modifiers.find((mod) => mod.startsWith("default="));
  if (defaultModifier) {
    const rawDefaultValue = defaultModifier.split("=")[1];

    if (!validateDefaultValue(rawDefaultValue)) {
      throw new Error(`Invalid default value pattern for column ${name}`);
    }

    defaultValue = `DEFAULT ${processDefaultValue(rawDefaultValue)}`;
    modifiers.splice(modifiers.indexOf(defaultModifier), 1);
  }

  // Process other modifiers
  if (modifiers.includes("null") && modifiers.includes("false")) {
    constraints.push("NOT NULL");
  }
  if (modifiers.includes("unique")) {
    constraints.push("UNIQUE");
  }
  if (modifiers.includes("primary")) {
    constraints.push("PRIMARY KEY");
  }

  // Build column definition
  const columnParts = [adapter.escapeIdentifier(name), mappedType];

  if (constraints.length > 0) {
    columnParts.push(constraints.join(" "));
  }
  if (defaultValue) {
    columnParts.push(defaultValue);
  }

  const columnDef = columnParts.join(" ");
  console.log("Generated column definition:", columnDef);

  return {
    columnDef,
    name,
    type: mappedType,
    constraints,
    defaultValue,
  };
}

module.exports = {
  parseColumns,
  parseColumnDefinition,
};
