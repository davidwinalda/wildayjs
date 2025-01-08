module.exports = (tableName, columns, indexName = null) => {
  // Ensure columns is an array and extract column names
  const columnNames = Array.isArray(columns)
    ? columns.map((col) => col.name)
    : [columns.name];

  // Generate default index name if not provided
  const finalIndexName =
    indexName || `idx_${tableName}_${columnNames.join("_")}`;

  const template = `exports.up = function(wildayjs) {
  return wildayjs.schema.table('${tableName}', function(table) {
    table.index(${JSON.stringify(columnNames)}, '${finalIndexName}');
  });
};

exports.down = function(wildayjs) {
  return wildayjs.schema.table('${tableName}', function(table) {
    table.dropIndex(${JSON.stringify(columnNames)}, '${finalIndexName}');
  });
};
`;

  return template;
};
