module.exports = (tableName, columns) => {
  // Ensure columns is an array
  const columnsList = Array.isArray(columns)
    ? columns
    : [
        {
          name: columns,
          type: "string",
          constraints: [],
        },
      ];

  // Generate drop statements for up migration
  const dropStatements = columnsList
    .map((col) => `    table.dropColumn('${col.name}');`)
    .join("\n");

  // Generate create statements with constraints for down migration
  const createStatements = columnsList
    .map((col) => {
      let stmt = `    table.${col.type}('${col.name}')`;

      // Add constraints
      if (col.constraints) {
        col.constraints.forEach((constraint) => {
          switch (constraint) {
            case "required":
              stmt += ".notNullable()";
              break;
            case "unique":
              stmt += ".unique()";
              break;
            case "index":
              stmt += ".index()";
              break;
          }
        });
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
