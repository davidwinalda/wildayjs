module.exports = (tableName, columnName) => `exports.up = function(knex) {
  return knex.schema.table('${tableName}', function(table) {
    table.dropColumn('${columnName}');
  });
};

exports.down = function(knex) {
  return knex.schema.table('${tableName}', function(table) {
    // Note: You'll need to manually specify the column definition
    // table.string('${columnName}');
  });
};
`;
