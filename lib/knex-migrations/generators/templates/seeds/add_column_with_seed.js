function addColumnWithSeedTemplate(
  tableName,
  columns,
  seedData = [],
  options = {}
) {
  const columnDefinitions = columns
    .map((col) => `      ${col.definition}`)
    .join("\n");

  // Format the seeder name using the original migration name
  const seederName = `${options.timestamp}_${options.migrationName}Seeder.js`;

  const hasRequiredColumns = columns.some((col) =>
    col.definition.includes(".notNullable()")
  );

  return `exports.up = async function(wildayjs) {
  // First add the columns${
    hasRequiredColumns ? " without NOT NULL constraints" : ""
  }
  await wildayjs.schema.table('${tableName}', function(table) {
${
  hasRequiredColumns
    ? columnDefinitions.replace(/\.notNullable\(\)/g, "")
    : columnDefinitions
}
  });

  ${
    seedData.length
      ? `// Run the seeder
  await wildayjs.seed.run({
    specific: "${seederName}"
  });

`
      : ""
  }${
    hasRequiredColumns
      ? `  // Add NOT NULL constraints after seeding
  await wildayjs.schema.alterTable('${tableName}', function(table) {
      ${columns
        .filter((col) => col.definition.includes(".notNullable()"))
        .map((col) => {
          const type = col.definition.match(
            /^table\.(integer|string|text|date|boolean|decimal|float|time|timestamp|json|jsonb)\(/
          )[1];
          return `table.${type}('${col.name}')${
            col.definition.includes("unsigned") ? ".unsigned()" : ""
          }.notNullable().alter();`;
        })
        .join("\n      ")}
  });`
      : ""
  }
};

exports.down = function(wildayjs) {
  return wildayjs.schema.table('${tableName}', function(table) {
      table.dropColumn('${columns[0].name}');
  });
};`;
}

module.exports = addColumnWithSeedTemplate;
