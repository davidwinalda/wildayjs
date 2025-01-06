module.exports = (
  table1,
  table2,
  options = {}
) => `exports.up = function(knex) {
  return knex.schema.createTable('${table1}_${table2}', function(table) {
    table.increments('id');
    table.integer('${table1.slice(0, -1)}_id').unsigned().notNullable()
      .references('id')
      .inTable('${table1}')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.integer('${table2.slice(0, -1)}_id').unsigned().notNullable()
      .references('id')
      .inTable('${table2}')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    
    // Composite unique index
    table.unique(['${table1.slice(0, -1)}_id', '${table2.slice(0, -1)}_id']);
    
    // Optional extra columns for the relationship
    ${options.columns?.map((col) => `    ${col.definition}`).join("\n") || ""}
    
    table.timestamps(true, true);
${options.softDeletes ? "\n    table.timestamp('deleted_at').nullable();" : ""}
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('${table1}_${table2}');
};`;
