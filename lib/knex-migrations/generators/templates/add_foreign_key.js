module.exports = (
  tableName,
  column,
  referenceTable,
  referenceColumn = "id"
) => {
  console.log("[DEBUG] Foreign key template inputs:", {
    tableName,
    column,
    referenceTable,
    referenceColumn,
  });

  const constraintName = `fk_${tableName}_${column}`;

  return `exports.up = function(wildayjs) {
  return wildayjs.schema.table('${tableName}', function(table) {
    table.foreign('${column}', '${constraintName}')
      .references('${referenceColumn}')
      .inTable('${referenceTable}')
      .onDelete('RESTRICT')
      .onUpdate('RESTRICT');
  });
};

exports.down = function(wildayjs) {
  return wildayjs.schema.table('${tableName}', function(table) {
    table.dropForeign('${column}', '${constraintName}');
  });
};
`;
};
