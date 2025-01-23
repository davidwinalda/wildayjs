const formatSeedData = require("../utils/formatSeedData");

function addColumnSeedTemplate(tableName, data = []) {
  const formattedData = data.map((entry) => {
    const { id, created_at, ...updateData } = entry;
    // Remove null values from the update
    Object.keys(updateData).forEach(
      (key) => updateData[key] === null && delete updateData[key]
    );
    return {
      id,
      ...updateData,
      updated_at: new Date().toISOString(),
    };
  });

  return `exports.seed = async function(wildayjs) {
  // Update existing entries with new column data
  ${formattedData
    .map(
      (data) => `
  await wildayjs('${tableName}')
    .where('id', ${data.id})
    .update(${formatSeedData([data])});`
    )
    .join("\n")}
};`;
}

module.exports = addColumnSeedTemplate;
