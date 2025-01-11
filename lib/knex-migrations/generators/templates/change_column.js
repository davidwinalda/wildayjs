module.exports = (tableName, columnName, newDefinition, fromType) => {
  // Helper function to build column definition with constraints
  const buildColumnDefinition = (type, constraints, isUp = true) => {
    let definition = `${type}('${columnName}'`;

    // Add type parameters only for specific types and in up migration
    if (isUp && type === "decimal" && newDefinition.typeParams) {
      definition += `, ${newDefinition.typeParams.join(", ")}`;
    }
    definition += ")";

    // Add constraints
    if (constraints && constraints.length > 0) {
      if (constraints.includes("required")) {
        definition += ".notNullable()";
      }
      if (constraints.includes("unique")) {
        definition += ".unique()";
      }
      if (constraints.includes("index")) {
        definition += ".index()";
      }
    }

    return definition;
  };

  if (!fromType) {
    return `exports.up = function(wildayjs) {
  return wildayjs.schema.table('${tableName}', function(table) {
    table.${buildColumnDefinition(
      newDefinition.type,
      newDefinition.upConstraints,
      true
    )}.alter();
  });
};

exports.down = function(wildayjs) {
  return wildayjs.schema.table('${tableName}', function(table) {
    // TODO: You must specify the previous column type for proper rollback
    // Example: table.string('${columnName}').alter();
    // 
    // Or use the explicit command format:
    // wildayjs generate:migration Change${columnName}In${tableName} ${columnName}:${
      newDefinition.type
    }:from:previous_type
  });
};
`;
  }

  return `exports.up = function(wildayjs) {
  return wildayjs.schema.table('${tableName}', function(table) {
    table.${buildColumnDefinition(
      newDefinition.type,
      newDefinition.upConstraints,
      true
    )}.alter();
  });
};

exports.down = function(wildayjs) {
  return wildayjs.schema.table('${tableName}', function(table) {
    table.${buildColumnDefinition(
      fromType,
      newDefinition.downConstraints,
      false
    )}.alter();
  });
};
`;
};
