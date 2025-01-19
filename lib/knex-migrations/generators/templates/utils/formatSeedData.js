function formatSeedData(data = [], options = {}) {
  const now = new Date().toISOString();
  const dataWithTimestamps = data.map((entry) => ({
    ...entry,
    created_at: entry.created_at || now,
    updated_at: entry.updated_at || now,
  }));

  if (!dataWithTimestamps.length) return "";

  const baseIndent = options.indent || " ";
  const contentIndent = baseIndent + " "; // 2 spaces for content
  const closingIndent = "  "; // 1 space for closing bracket

  // Format the seed entries with proper indentation
  return JSON.stringify(dataWithTimestamps, null, 2)
    .split("\n")
    .map((line, index, array) => {
      // First line (opening bracket)
      if (index === 0) return "[";
      // Last line (closing bracket)
      if (index === array.length - 1) return closingIndent + line;
      // Content lines
      return contentIndent + line;
    })
    .join("\n");
}

module.exports = formatSeedData;
