module.exports = (tableName, table1, table2, options = {}) => {
  const columnDefinitions =
    options.columns?.map((col) => col.definition).join("\n    ") || "";
  const hasColumns = columnDefinitions.length > 0;
  const hasSoftDeletes = options.softDeletes === true;

  return `exports.up = function(wildayjs) {
  return wildayjs.schema.createTable('${tableName}', function(table) {
    // Primary Key
    table.increments('id');

    // Foreign Keys
    table.integer('${options.table1Column}_id').unsigned().notNullable()
      .references('id').inTable('${table1}')
      .onDelete('CASCADE').onUpdate('CASCADE');
    table.integer('${options.table2Column}_id').unsigned().notNullable()
      .references('id').inTable('${table2}')
      .onDelete('CASCADE').onUpdate('CASCADE');${
        hasColumns
          ? `

    // Additional Columns
    ${columnDefinitions}`
          : ""
      }

    // Timestamps
    table.timestamp('created_at').defaultTo(wildayjs.fn.now())
    table.timestamp('updated_at').defaultTo(wildayjs.fn.now())${
      hasSoftDeletes
        ? `
    table.timestamp('deleted_at').nullable()`
        : ""
    }

    // Composite Index
    table.index(['${options.table1Column}_id', '${
    options.table2Column
  }_id'], '${tableName}_composite_index');
  });
};

exports.down = function(wildayjs) {
  return wildayjs.schema.dropTable('${tableName}');
};`;
};
