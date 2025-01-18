function createTableWithSeedTemplate(
  tableName,
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

  // Format seed data
  const now = new Date().toISOString();
  const formattedSeedData = seedData.length
    ? JSON.stringify(
        seedData.map((entry) => ({
          ...entry,
          created_at: entry.created_at || now,
          updated_at: entry.updated_at || now,
        })),
        null,
        2
      )
        .split("\n")
        .map((line) => "      " + line)
        .join("\n")
    : "";

  return `exports.up = async function(wildayjs) {
  // First create the table without NOT NULL constraints
  await wildayjs.schema.createTable('${tableName}', function(table) {
    // Primary Key
    table.increments('id');

    // Columns
${regularColumns
  .map((col) => {
    // Remove notNullable from initial column creation
    const definition = col.definition.replace(".notNullable()", "");
    return `    ${definition}`;
  })
  .join("\n")}

    // Timestamps
${timestampColumns.map((col) => `    ${col}`).join("\n")}
  });

${
  seedData.length
    ? `
  // Insert seed data
  await wildayjs('${tableName}').insert(${formattedSeedData});
`
    : ""
}

  // Add NOT NULL constraints after seeding
  await wildayjs.schema.alterTable('${tableName}', function(table) {
${regularColumns
  .filter((col) => col.definition.includes(".notNullable()"))
  .map((col) => {
    const baseType = col.definition.split(".")[0];
    return `    table.${baseType}.notNullable().alter();`;
  })
  .join("\n")}
  });
};

exports.down = async function(wildayjs) {
  await wildayjs.schema.dropTable('${tableName}');
};
`;
}

module.exports = createTableWithSeedTemplate;
