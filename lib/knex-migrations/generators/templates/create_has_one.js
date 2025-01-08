module.exports = (tableName, parentModel, foreignKey, columns) => {
  console.log("[DEBUG] Has One template inputs:", {
    tableName,
    parentModel,
    foreignKey,
    columns,
  });

  const columnDefinitions = columns
    .map((col) => `    ${col.definition}`)
    .join("\n");
  const constraintName = `fk_${tableName}_${foreignKey}`;
  const uniqueConstraintName = `uniq_${tableName}_${foreignKey}`;

  return `exports.up = function(wildayjs) {
  return wildayjs.schema.createTable('${tableName}', function(table) {
    // Primary Key
    table.increments('id');

    // Foreign Key
    table.integer('${foreignKey}').unsigned().notNullable();
    table.foreign('${foreignKey}', '${constraintName}')
      .references('id')
      .inTable('${parentModel}')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.unique(['${foreignKey}'], '${uniqueConstraintName}');

    // Columns
${columnDefinitions}

    // Timestamps
    table.timestamp('created_at').defaultTo(wildayjs.fn.now())
    table.timestamp('updated_at').defaultTo(wildayjs.fn.now())
  });
};

exports.down = function(wildayjs) {
  return wildayjs.schema.dropTable('${tableName}');
};
`;
};
