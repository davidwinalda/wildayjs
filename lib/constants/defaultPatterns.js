const DEFAULT_PATTERNS = {
  id: "NEW.id", // Changed from "id" to "NEW.id" for triggers
  timestamp: "strftime('%Y%m%d%H%M%S')",
  random: "hex(randomblob(4))",
  date: "strftime('%Y%m%d')",
  time: "strftime('%H%M%S')",
};

module.exports = {
  DEFAULT_PATTERNS,
};
