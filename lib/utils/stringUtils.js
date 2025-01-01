// Capitalize first letter of a string
const capitalize = (str) => {
  if (typeof str !== "string") return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Convert camelCase to snake_case
const toSnakeCase = (str) => {
  return str
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
};

// Convert snake_case to camelCase
const toCamelCase = (str) => {
  return str
    .toLowerCase()
    .replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
};

// Pluralize a word (basic implementation)
const pluralize = (str) => {
  if (typeof str !== "string") return "";

  // Special cases
  const irregulars = {
    person: "people",
    child: "children",
    man: "men",
    woman: "women",
    tooth: "teeth",
    foot: "feet",
    mouse: "mice",
    goose: "geese",
  };

  if (irregulars[str.toLowerCase()]) {
    return irregulars[str.toLowerCase()];
  }

  // Basic rules
  if (
    str.endsWith("s") ||
    str.endsWith("sh") ||
    str.endsWith("ch") ||
    str.endsWith("x") ||
    str.endsWith("z")
  ) {
    return str + "es";
  }

  if (str.endsWith("y")) {
    if ("aeiou".includes(str[str.length - 2])) {
      return str + "s";
    }
    return str.slice(0, -1) + "ies";
  }

  return str + "s";
};

// Singularize a word (basic implementation)
const singularize = (str) => {
  if (typeof str !== "string") return "";

  // Special cases
  const irregulars = {
    people: "person",
    children: "child",
    men: "man",
    women: "woman",
    teeth: "tooth",
    feet: "foot",
    mice: "mouse",
    geese: "goose",
  };

  if (irregulars[str.toLowerCase()]) {
    return irregulars[str.toLowerCase()];
  }

  // Basic rules
  if (str.endsWith("ies")) {
    return str.slice(0, -3) + "y";
  }

  if (str.endsWith("es")) {
    if (str.endsWith("shes") || str.endsWith("ches")) {
      return str.slice(0, -2);
    }
    return str.slice(0, -1);
  }

  if (str.endsWith("s")) {
    return str.slice(0, -1);
  }

  return str;
};

module.exports = {
  capitalize,
  toSnakeCase,
  toCamelCase,
  pluralize,
  singularize,
};
