module.exports = (tableName, columns) => `exports.up = function(knex) {
  return knex.schema.table('${tableName}', function(table) {
${columns.map((col) => `    ${col.definition}`).join("\n")}
  });
};

exports.down = function(knex) {
  return knex.schema.table('${tableName}', function(table) {
${columns.map((col) => `    table.dropColumn('${col.name}');`).join("\n")}
  });
};
`;
