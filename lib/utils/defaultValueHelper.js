const { DEFAULT_PATTERNS } = require("../constants/defaultPatterns");
const { log } = require("./chalkUtils");

function processDefaultValue(defaultValue) {
  if (!defaultValue) return null;

  try {
    // Get the prefix part (everything before the first {)
    const parts = defaultValue.split("{");
    const prefix = parts[0];

    // Get the placeholder part (everything between { and })
    const placeholder = parts[1]?.split("}")[0];

    if (!placeholder || !DEFAULT_PATTERNS[placeholder]) {
      return null;
    }

    // Return the concatenated string
    return `'${prefix}' || ${DEFAULT_PATTERNS[placeholder]}`;
  } catch (error) {
    log.error(`Invalid default value pattern: ${defaultValue}`);
    return null;
  }
}

function validateDefaultValue(defaultValue) {
  if (!defaultValue) return true;

  // Check for valid placeholder usage
  const placeholderPattern = /{([^}]+)}/g;
  const matches = defaultValue.match(placeholderPattern) || [];

  for (const match of matches) {
    const placeholder = match.replace(/{|}/g, "");
    if (!DEFAULT_PATTERNS[placeholder]) {
      log.error(`Invalid placeholder: ${match}`);
      log.info("Available placeholders:");
      Object.keys(DEFAULT_PATTERNS).forEach((key) => {
        log.info(`  {${key}}`);
      });
      return false;
    }
  }

  return true;
}

module.exports = {
  processDefaultValue,
  validateDefaultValue,
};
