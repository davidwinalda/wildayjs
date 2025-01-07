module.exports = (
  tableName,
  parentTable,
  options = {}
) => `exports.up = function(wildayjs) {
  return wildayjs.schema.createTable('${tableName}', function(table) {
    table.increments('id');
    table.integer('${parentTable.slice(
      0,
      -1
    )}_id').unsigned().notNullable().unique()
      .references('id')
      .inTable('${parentTable}')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    ${options.columns?.map((col) => `    ${col.definition}`).join("\n") || ""}
    table.timestamps(true, true);
${options.softDeletes ? "\n    table.timestamp('deleted_at').nullable();" : ""}
  });
};

exports.down = function(wildayjs) {
  return wildayjs.schema.dropTable('${tableName}');
};`;
