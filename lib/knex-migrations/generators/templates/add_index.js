module.exports = (
  tableName,
  columns,
  indexName
) => `exports.up = function(knex) {
  return knex.schema.table('${tableName}', function(table) {
    table.index(${JSON.stringify(columns)}, '${indexName}');
  });
};

exports.down = function(knex) {
  return knex.schema.table('${tableName}', function(table) {
    table.dropIndex(${JSON.stringify(columns)}, '${indexName}');
  });
};
`;
