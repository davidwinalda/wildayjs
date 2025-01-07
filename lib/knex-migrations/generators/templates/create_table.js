module.exports = (
  tableName,
  columns,
  options = {}
) => `exports.up = function(wildayjs) {
  return wildayjs.schema.createTable('${tableName}', function(table) {
    // Primary Key
    table.increments('id');

    // Columns
${columns.map((col) => `    ${col.definition}`).join("\n")}

    // Timestamps
    table.timestamp('created_at').defaultTo(wildayjs.fn.now());
    table.timestamp('updated_at').defaultTo(wildayjs.fn.now());
${options.softDeletes ? "\n    table.timestamp('deleted_at').nullable();" : ""}
  });
};

exports.down = function(wildayjs) {
  return wildayjs.schema.dropTable('${tableName}');
};
`;
