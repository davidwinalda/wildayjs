module.exports = (
  tableName,
  fromColumn,
  toColumn
) => `exports.up = function(wildayjs) {
  return wildayjs.schema.table('${tableName}', function(table) {
    table.renameColumn('${fromColumn}', '${toColumn}');
  });
};

exports.down = function(wildayjs) {
  return wildayjs.schema.table('${tableName}', function(table) {
    table.renameColumn('${toColumn}', '${fromColumn}');
  });
};
`;
