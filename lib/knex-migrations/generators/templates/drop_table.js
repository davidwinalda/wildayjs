module.exports = (tableName) => `exports.up = function(knex) {
  return knex.schema.dropTable('${tableName}');
};

exports.down = function(knex) {
  return knex.schema.createTable('${tableName}', function(table) {
    // Note: You'll need to manually specify the table structure
    table.increments('id');
    table.timestamps();
  });
};
`;
