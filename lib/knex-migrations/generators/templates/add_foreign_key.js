module.exports = (
  tableName,
  column,
  referenceTable,
  referenceColumn = "id"
) => `exports.up = function(wildayjs) {
    return wildayjs.schema.table('${tableName}', function(table) {
      table.foreign('${column}')
        .references('${referenceColumn}')
        .inTable('${referenceTable}')
        .onDelete('RESTRICT')
        .onUpdate('RESTRICT');
    });
  };
  
  exports.down = function(wildayjs) {
    return wildayjs.schema.table('${tableName}', function(table) {
      table.dropForeign('${column}');
    });
  };
  `;
