function isJoinTable(tableName, columns) {
  const references = columns.filter(
    (col) => col.split(":")[1] === "references"
  );
  return references.length === 2;
}

function toSnakeCase(str, columns = []) {
  str = str.replace(/Create/, "");

  if (isJoinTable(str, columns)) {
    const parts = str
      .match(/[A-Z][a-z]+/g)
      .map((part) => part.replace(/s$/, ""));

    if (parts.length === 2) {
      return parts
        .map((part) => part.toLowerCase() + "s")
        .sort()
        .join("_");
    }
  }

  return str
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}

module.exports = { isJoinTable, toSnakeCase };
