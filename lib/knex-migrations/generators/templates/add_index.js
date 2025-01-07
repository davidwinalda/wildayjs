module.exports = (
  tableName,
  columns,
  indexName
) => `exports.up = function(wildayjs) {
  return wildayjs.schema.table('${tableName}', function(table) {
    table.index(${JSON.stringify(columns)}, '${indexName}');
  });
};

exports.down = function(wildayjs) {
  return wildayjs.schema.table('${tableName}', function(table) {
    table.dropIndex(${JSON.stringify(columns)}, '${indexName}');
  });
};
`;
