module.exports = (
  throughTable,
  sourceTable,
  targetTable,
  options = {}
) => `exports.up = function(knex) {
  return knex.schema.createTable('${throughTable}', function(table) {
    table.increments('id');
    table.integer('${sourceTable.slice(0, -1)}_id').unsigned().notNullable()
      .references('id')
      .inTable('${sourceTable}')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.integer('${targetTable.slice(0, -1)}_id').unsigned().notNullable()
      .references('id')
      .inTable('${targetTable}')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    
    // Optional extra columns for the relationship
    ${options.columns?.map((col) => `    ${col.definition}`).join("\n") || ""}
    
    table.timestamps(true, true);
${options.softDeletes ? "\n    table.timestamp('deleted_at').nullable();" : ""}
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('${throughTable}');
};`;
