function createTableTemplate(tableName, columns, options = {}) {
  // Separate timestamps from regular columns
  const regularColumns = columns.filter(
    (col) => !["created_at", "updated_at", "deleted_at"].includes(col.name)
  );

  // Define default timestamps
  const timestampColumns = [
    "table.timestamp('created_at').defaultTo(wildayjs.fn.now())",
    "table.timestamp('updated_at').defaultTo(wildayjs.fn.now())",
  ];

  // Add deleted_at if softDeletes is enabled
  if (options.softDeletes) {
    timestampColumns.push("table.timestamp('deleted_at').nullable()");
  }

  return `exports.up = function(wildayjs) {
  return wildayjs.schema.createTable('${tableName}', function(table) {
    // Primary Key
    table.increments('id');

    // Columns
${regularColumns.map((col) => `    ${col.definition}`).join("\n")}

    // Timestamps
${timestampColumns.map((col) => `    ${col}`).join("\n")}
  });
};

exports.down = function(wildayjs) {
  return wildayjs.schema.dropTable('${tableName}');
};
`;
}

module.exports = createTableTemplate;
