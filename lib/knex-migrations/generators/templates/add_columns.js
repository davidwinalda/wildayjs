module.exports = (tableName, columns) => `exports.up = function(wildayjs) {
  return wildayjs.schema.table('${tableName}', function(table) {
${columns.map((col) => `    ${col.definition}`).join("\n")}
  });
};

exports.down = function(wildayjs) {
  return wildayjs.schema.table('${tableName}', function(table) {
${columns.map((col) => `    table.dropColumn('${col.name}');`).join("\n")}
  });
};
`;
