module.exports = (tableName) => `exports.up = function(wildayjs) {
  return wildayjs.schema.dropTable('${tableName}');
};

exports.down = function(wildayjs) {
  return wildayjs.schema.createTable('${tableName}', function(table) {
    // Note: You'll need to manually specify the table structure
    table.increments('id');
    table.timestamps();
  });
};
`;
