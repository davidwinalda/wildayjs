module.exports = (fromTable, toTable) => `exports.up = function(knex) {
  return knex.schema.renameTable('${fromTable}', '${toTable}');
};

exports.down = function(knex) {
  return knex.schema.renameTable('${toTable}', '${fromTable}');
};
`;
