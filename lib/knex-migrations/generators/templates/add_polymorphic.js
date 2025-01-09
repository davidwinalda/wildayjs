module.exports = (tableName, polymorphicName, options = {}) => {
  const isCreate = options.action === "create";
  const columnDefinitions =
    options.columns?.map((col) => col.definition).join("\n    ") || "";
  const hasColumns = columnDefinitions.length > 0;

  if (isCreate) {
    return `exports.up = function(wildayjs) {
  return wildayjs.schema.createTable('${tableName}', function(table) {
    // Primary Key
    table.increments('id');
${
  hasColumns
    ? `
    // Regular Columns
    ${columnDefinitions}`
    : ""
}

    // Polymorphic Columns
    table.integer('${polymorphicName}_id').unsigned().notNullable();
    table.string('${polymorphicName}_type').notNullable();
    
    // Polymorphic Index
    table.index(['${polymorphicName}_id', '${polymorphicName}_type'], '${tableName}_${polymorphicName}_index');

    // Timestamps
    table.timestamp('created_at').defaultTo(wildayjs.fn.now())
    table.timestamp('updated_at').defaultTo(wildayjs.fn.now())
  });
};

exports.down = function(wildayjs) {
  return wildayjs.schema.dropTable('${tableName}');
};`;
  }

  // For adding polymorphic columns to existing table
  return `exports.up = function(wildayjs) {
  return wildayjs.schema.table('${tableName}', function(table) {
    // Add Polymorphic Columns
    table.integer('${polymorphicName}_id').unsigned().notNullable();
    table.string('${polymorphicName}_type').notNullable();
    
    // Add Polymorphic Index
    table.index(['${polymorphicName}_id', '${polymorphicName}_type'], '${tableName}_${polymorphicName}_index');
  });
};

exports.down = function(wildayjs) {
  return wildayjs.schema.table('${tableName}', function(table) {
    // Drop Polymorphic Index First
    table.dropIndex(['${polymorphicName}_id', '${polymorphicName}_type'], '${tableName}_${polymorphicName}_index');
    
    // Then Drop Polymorphic Columns
    table.dropColumn('${polymorphicName}_type');
    table.dropColumn('${polymorphicName}_id');
  });
};`;
};
