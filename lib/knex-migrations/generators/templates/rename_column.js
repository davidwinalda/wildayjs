module.exports = (
  tableName,
  fromColumn,
  toColumn
) => `exports.up = function(knex) {
  return knex.schema.table('${tableName}', function(table) {
    table.renameColumn('${fromColumn}', '${toColumn}');
  });
};

exports.down = function(knex) {
  return knex.schema.table('${tableName}', function(table) {
    table.renameColumn('${toColumn}', '${fromColumn}');
  });
};
`;
