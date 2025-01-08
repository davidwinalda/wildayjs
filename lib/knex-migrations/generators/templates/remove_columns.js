const { capitalize } = require("../../../utils/stringUtils");

module.exports = (tableName, columns) => {
  // Ensure columns is an array
  const columnsList = Array.isArray(columns) ? columns : [columns];

  // Generate drop statements for up migration
  const dropStatements = columnsList
    .map((col) => `    table.dropColumn('${col.name}');`)
    .join("\n");

  // Check if we have explicit down migration info
  const hasDownMigrationInfo = columnsList.every(
    (col) => col.type && col.options?.downConstraints?.length > 0
  );

  if (!hasDownMigrationInfo) {
    // Convert snake_case to PascalCase for the example command
    const columnPascalCase = columnsList[0].name
      .split("_")
      .map((word) => capitalize(word))
      .join("");
    const tablePascalCase = tableName
      .split("_")
      .map((word) => capitalize(word))
      .join("");

    return `exports.up = function(wildayjs) {
  return wildayjs.schema.table('${tableName}', function(table) {
${dropStatements}
  });
};

exports.down = function(wildayjs) {
  return wildayjs.schema.table('${tableName}', function(table) {
    // TODO: You must specify the column type and constraints for proper rollback
    // Example: table.string('${columnsList[0].name}').notNullable();
    // 
    // Or use the explicit command format:
    // wildayjs generate:migration Remove${columnPascalCase}From${tablePascalCase} ${columnsList[0].name}:string:required:unique:index
  });
};
`;
  }

  // Generate create statements with constraints for down migration
  const createStatements = columnsList
    .map((col) => {
      let stmt = `    table.${col.type}('${col.name}')`;

      // Add constraints for down migration
      if (col.options?.downConstraints?.length > 0) {
        if (col.options.downConstraints.includes("required")) {
          stmt += ".notNullable()";
        }
        if (col.options.downConstraints.includes("unique")) {
          stmt += ".unique()";
        }
        if (col.options.downConstraints.includes("index")) {
          stmt += ".index()";
        }
      }

      // Add references if specified
      if (col.options?.references) {
        stmt +=
          `.unsigned()` +
          `.references('${col.options.references.column}')` +
          `.inTable('${col.options.references.table}')` +
          `.onDelete('${col.options.references.onDelete}')` +
          `.onUpdate('${col.options.references.onUpdate}')`;
      }

      // Add default value if specified
      if (col.options?.defaultValue !== undefined) {
        const value =
          typeof col.options.defaultValue === "string"
            ? `'${col.options.defaultValue}'`
            : col.options.defaultValue;
        stmt += `.defaultTo(${value})`;
      }

      return stmt + ";";
    })
    .join("\n");

  return `exports.up = function(wildayjs) {
  return wildayjs.schema.table('${tableName}', function(table) {
${dropStatements}
  });
};

exports.down = function(wildayjs) {
  return wildayjs.schema.table('${tableName}', function(table) {
${createStatements}
  });
};
`;
};
