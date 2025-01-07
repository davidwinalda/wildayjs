module.exports = (
  tableName,
  polymorphicName,
  options = {}
) => `exports.up = function(wildayjs) {
  return wildayjs.schema.table('${tableName}', function(table) {
    table.integer('${polymorphicName}_id').unsigned();
    table.string('${polymorphicName}_type');
    
    // Index for better query performance
    table.index(['${polymorphicName}_id', '${polymorphicName}_type'], '${tableName}_${polymorphicName}_index');
    
    ${options.columns?.map((col) => `    ${col.definition}`).join("\n") || ""}
  });
};

exports.down = function(wildayjs) {
  return wildayjs.schema.table('${tableName}', function(table) {
    table.dropIndex(['${polymorphicName}_id', '${polymorphicName}_type'], '${tableName}_${polymorphicName}_index');
    table.dropColumn('${polymorphicName}_type');
    table.dropColumn('${polymorphicName}_id');
  });
};`;
