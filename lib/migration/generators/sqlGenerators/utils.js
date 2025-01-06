const { getDefaultPatterns } = require("./constants");

const processDefaultValue = (value, options = {}) => {
  const { useNewPrefix = false, adapter } = options;
  const DEFAULT_PATTERNS = getDefaultPatterns(adapter);

  console.log("\nprocessDefaultValue input:", { value, options });

  if (!value.includes("{")) {
    console.log("No dynamic parts found, returning simple value");
    return adapter.escapeString(value);
  }

  const parts = value.split(/(\{[^}]+\})/);
  console.log("Split parts:", parts);

  const sqlParts = parts
    .map((part) => {
      console.log("\nProcessing part:", part);
      const pattern = part.match(/\{([^}]+)\}/);

      if (pattern) {
        const fieldName = pattern[1];
        console.log("Found field reference:", fieldName);

        // First check if it's a special pattern
        if (DEFAULT_PATTERNS[fieldName]) {
          console.log("Using special pattern:", fieldName);
          return DEFAULT_PATTERNS[fieldName];
        }

        // If not a special pattern, treat as field reference
        const fieldRef = useNewPrefix ? `NEW.${fieldName}` : fieldName;
        console.log("Field reference:", fieldRef);
        return adapter.getCastToTextSql(fieldRef);
      }

      // String literals
      if (part.trim()) {
        console.log("Processing string literal:", part);
        return adapter.escapeString(part);
      }

      console.log("Skipping empty part");
      return null;
    })
    .filter(Boolean);

  const result = sqlParts.join(" || ");
  console.log("\nFinal SQL expression:", result);
  return result;
};

const isSpecialPattern = (fieldName) => {
  return DEFAULT_PATTERNS.hasOwnProperty(fieldName);
};

module.exports = {
  processDefaultValue,
  isSpecialPattern,
};
