const { singularize } = require("../../../utils/stringUtils");

module.exports = (table1, table2, options = {}) => {
  // Get the table name from options or use default
  const tableName = options.tableName || `${table1}_${table2}`;
  const table1Column = options.table1Column || singularize(table1);
  const table2Column = options.table2Column || singularize(table2);
  const { columns = [], timestamps = true, softDeletes = false } = options;

  // Build additional columns string if any exist
  const additionalColumns =
    columns.length > 0
      ? `\n    // Additional columns\n    ${columns
          .map((col) => col.definition)
          .join("\n    ")}\n`
      : "";

  // Build timestamps string if enabled
  const timestampsString = timestamps
    ? "\n    // Timestamps\n    table.timestamps(true, true);"
    : "";

  // Build soft deletes string if enabled
  const softDeletesString = softDeletes
    ? "\n    // Soft deletes\n    table.timestamp('deleted_at').nullable();"
    : "";

  return `exports.up = function(wildayjs) {
  return wildayjs.schema.createTable('${tableName}', function(table) {
    table.increments('id');

    // Foreign keys
    table.integer('${table1Column}_id').unsigned().notNullable()
      .references('id')
      .inTable('${table1}')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.integer('${table2Column}_id').unsigned().notNullable()
      .references('id')
      .inTable('${table2}')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');${additionalColumns}
    
    // Composite unique index
    table.unique(['${table1Column}_id', '${table2Column}_id']);${timestampsString}${softDeletesString}
  });
};

exports.down = function(wildayjs) {
  return wildayjs.schema.dropTable('${tableName}');
};`;
};
