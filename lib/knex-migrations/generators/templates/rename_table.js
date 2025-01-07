module.exports = (fromTable, toTable) => `exports.up = function(wildayjs) {
  return wildayjs.schema.renameTable('${fromTable}', '${toTable}');
};

exports.down = function(wildayjs) {
  return wildayjs.schema.renameTable('${toTable}', '${fromTable}');
};
`;
