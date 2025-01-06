module.exports = (
  tableName,
  column,
  referenceTable,
  referenceColumn = "id"
) => `exports.up = function(knex) {
    return knex.schema.table('${tableName}', function(table) {
      table.foreign('${column}')
        .references('${referenceColumn}')
        .inTable('${referenceTable}')
        .onDelete('RESTRICT')
        .onUpdate('RESTRICT');
    });
  };
  
  exports.down = function(knex) {
    return knex.schema.table('${tableName}', function(table) {
      table.dropForeign('${column}');
    });
  };
  `;
