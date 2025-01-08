module.exports = (tableName, columnName, newDefinition, fromType) => {
  // Helper function to build column definition with constraints
  const buildColumnDefinition = (type, constraints) => {
    let definition = `${type}('${columnName}'`;

    // Add type parameters if they exist
    if (newDefinition.typeParams && newDefinition.typeParams.length > 0) {
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
      newDefinition.upConstraints
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
      newDefinition.upConstraints
    )}.alter();
  });
};

exports.down = function(wildayjs) {
  return wildayjs.schema.table('${tableName}', function(table) {
    table.${buildColumnDefinition(
      fromType,
      newDefinition.downConstraints
    )}.alter();
  });
};
`;
};
