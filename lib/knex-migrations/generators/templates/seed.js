const formatSeedData = require("./utils/formatSeedData");

module.exports = (tableName, data = []) => {
  const now = new Date().toISOString();
  const formattedData =
    formatSeedData(data) ||
    `  // Example seed entries:
    // [
    //  {
    //    id: 1,
    //    column1: 'value1',
    //    column2: 'value2',
    //    created_at: '${now}',
    //    updated_at: '${now}'
    //  },
    //  {
    //    id: 2,
    //    column1: 'value3',
    //    column2: 'value4',
    //    created_at: '${now}',
    //    updated_at: '${now}'
    //  }
    // ]`;

  return `exports.seed = async function(wildayjs) {
  // Deletes ALL existing entries
  await wildayjs('${tableName}').del();
  
  // Inserts seed entries
  await wildayjs('${tableName}').insert(${formattedData});
};`;
};
