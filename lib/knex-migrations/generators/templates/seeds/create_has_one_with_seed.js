const pluralize = require("pluralize");

function createHasOneWithSeedTemplate(
  tableName,
  parentTable,
  columns,
  seedData = [],
  options = {}
) {
  // Separate timestamps from regular columns
  const regularColumns = columns.filter(
    (col) => !["created_at", "updated_at", "deleted_at"].includes(col.name)
  );

  // Define default timestamps
  const timestampColumns = [
    "table.timestamp('created_at').defaultTo(wildayjs.fn.now())",
    "table.timestamp('updated_at').defaultTo(wildayjs.fn.now())",
  ];

  // Add deleted_at if softDeletes is enabled
  if (options.softDeletes) {
    timestampColumns.push("table.timestamp('deleted_at').nullable()");
  }

  // Get the current timestamp (should match the file name)
  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14);

  // Create foreign key column name using singular form of parent table
  const foreignKeyColumn = `${pluralize.singular(parentTable)}_id`;

  // Format the seeder name in PascalCase
  const childModel = pluralize.singular(
    tableName
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join("")
  );
  const parentModel = pluralize.singular(
    parentTable
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join("")
  );
  const seederName = `HasOne${childModel}For${parentModel}Seeder`;

  return `exports.up = async function(wildayjs) {
  // First create the table without NOT NULL constraints
  await wildayjs.schema.createTable('${tableName}', function(table) {
    // Primary Key
    table.increments('id');

    // Foreign Key (Has One relationship)
    table.integer('${foreignKeyColumn}').unsigned();
    table.foreign('${foreignKeyColumn}', 'fk_${tableName}_${foreignKeyColumn}')
      .references('id')
      .inTable('${parentTable}')
      .onDelete('RESTRICT')
      .onUpdate('RESTRICT');
    table.unique(['${foreignKeyColumn}'], 'uniq_${tableName}_${foreignKeyColumn}'); // Ensure Has One relationship

    // Columns
${regularColumns
  .map((col) => {
    // Remove notNullable from initial column creation
    const definition = col.definition.replace(".notNullable()", "");
    // Handle additional foreign keys if any
    if (definition.includes("references")) {
      return `    table.integer('${col.name}').unsigned();
    table.foreign('${col.name}', 'fk_${tableName}_${col.name}')
      .references('id')
      .inTable('${col.name.replace(/_id$/, "s")}')
      .onDelete('RESTRICT')
      .onUpdate('RESTRICT');`;
    }
    return `    ${definition}`;
  })
  .join("\n")}

    // Timestamps
${timestampColumns.map((col) => `    ${col}`).join("\n")}
  });

${
  seedData.length
    ? `
  // Run the seeder
  await wildayjs.seed.run({
    specific: "${timestamp}_${seederName}.js"
  });`
    : ""
}

  // Add NOT NULL constraints after seeding
  await wildayjs.schema.alterTable('${tableName}', function(table) {
    // Make foreign key required
    table.integer('${foreignKeyColumn}').unsigned().notNullable().alter();${
    regularColumns.filter((col) => col.definition.includes(".notNullable()"))
      .length > 0
      ? "\n"
      : ""
  }${regularColumns
    .filter((col) => col.definition.includes(".notNullable()"))
    .map((col) => {
      // Extract the column type from the original definition
      const type = col.definition.match(
        /^table\.(integer|string|text|date|boolean|decimal|float|time|timestamp|json|jsonb)\(/
      )[1];
      return `    table.${type}('${col.name}')${
        col.definition.includes("unsigned") ? ".unsigned()" : ""
      }.notNullable().alter();`;
    })
    .join("\n")}
  });
};

exports.down = async function(wildayjs) {
  await wildayjs.schema.dropTable('${tableName}');
};
`;
}

module.exports = createHasOneWithSeedTemplate;
