module.exports = (tableName) => `exports.up = function(wildayjs) {
  return wildayjs.schema.dropTable('${tableName}');
};

exports.down = function(wildayjs) {
  return wildayjs.schema.createTable('${tableName}', function(table) {
    // TODO: You'll need to specify the exact table structure that existed before dropping
    // Common columns examples:
    table.increments('id');
    // table.string('title');                   // For string columns
    // table.text('content');                   // For long text
    // table.integer('user_id');                // For integer columns
    // table.decimal('price', 10, 2);           // For decimal numbers
    // table.boolean('active');                 // For boolean values
    // table.datetime('published_at');          // For datetime
    // table.jsonb('metadata');                 // For JSON data
    
    // Foreign key example:
    // table.integer('user_id')
    //   .unsigned()
    //   .references('id')
    //   .inTable('users')
    //   .onDelete('CASCADE');

    // Timestamps (created_at, updated_at)
    table.timestamp('created_at').defaultTo(wildayjs.fn.now());
    table.timestamp('updated_at').defaultTo(wildayjs.fn.now());
  });
};
`;
