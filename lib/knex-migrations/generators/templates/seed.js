module.exports = (tableName, data = []) => {
  // Add timestamps to each entry if they don't exist
  const now = new Date().toISOString();
  const dataWithTimestamps = data.map((entry) => ({
    ...entry,
    created_at: entry.created_at || now,
    updated_at: entry.updated_at || now,
  }));

  // Convert data to string with proper indentation
  const seedEntries = dataWithTimestamps.length
    ? JSON.stringify(dataWithTimestamps, null, 2)
        .split("\n")
        .map((line, index, array) => {
          // First line is opening bracket
          if (index === 0) return "" + line;
          // Last line is closing bracket
          if (index === array.length - 1) return "  " + line;
          // All other lines get additional indentation
          return "    " + line;
        })
        .join("\n")
    : `  // Example seed entries:
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
    await wildayjs('${tableName}').insert(${seedEntries});
  };`;
};
