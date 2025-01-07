module.exports = (
  tableName,
  parentTable,
  options = {}
) => `exports.up = function(wildayjs) {
  return wildayjs.schema.table('${tableName}', function(table) {
    table.integer('${parentTable.slice(0, -1)}_id').unsigned()
      .references('id')
      .inTable('${parentTable}')
      .onDelete('${options.onDelete || "CASCADE"}')
      .onUpdate('${options.onUpdate || "CASCADE"}');
    table.index('${parentTable.slice(0, -1)}_id');
  });
};

exports.down = function(wildayjs) {
  return wildayjs.schema.table('${tableName}', function(table) {
    table.dropForeign('${parentTable.slice(0, -1)}_id');
    table.dropIndex('${parentTable.slice(0, -1)}_id');
    table.dropColumn('${parentTable.slice(0, -1)}_id');
  });
};`;
