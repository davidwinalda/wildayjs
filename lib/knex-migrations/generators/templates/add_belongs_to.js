module.exports = (tableName, columnName, referenceTable, options = {}) => {
  const constraintName =
    options.constraintName || `fk_${tableName}_${columnName}`;

  return `exports.up = function(wildayjs) {
  return wildayjs.schema.table('${tableName}', function(table) {
    table.integer('${columnName}').unsigned();
    table.foreign('${columnName}', '${constraintName}')
      .references('id')
      .inTable('${referenceTable}')
      .onDelete('${options.onDelete || "RESTRICT"}')
      .onUpdate('${options.onUpdate || "RESTRICT"}');
  });
};

exports.down = function(wildayjs) {
  return wildayjs.schema.table('${tableName}', function(table) {
    table.dropForeign('${columnName}', '${constraintName}');
    table.dropColumn('${columnName}');
  });
};`;
};
