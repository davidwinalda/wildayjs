module.exports = (
  tableName,
  columnName,
  newDefinition
) => `exports.up = function(wildayjs) {
  return wildayjs.schema.table('${tableName}', function(table) {
    ${newDefinition.definition.replace(";", "")}.alter();
  });
};

exports.down = function(wildayjs) {
  return wildayjs.schema.table('${tableName}', function(table) {
    // Note: You'll need to manually specify the original column definition
    // table.string('${columnName}').alter();
  });
};
`;
