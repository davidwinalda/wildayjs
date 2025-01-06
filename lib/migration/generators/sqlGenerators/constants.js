const getDefaultPatterns = (adapter) => {
  // Base patterns that use adapter methods
  const basePatterns = {
    id: adapter.getCastToTextSql("id"),
    random: adapter.getRandomSql(8),
    year: adapter.getDateFormatSql("%Y"),
    month: adapter.getDateFormatSql("%m"),
    day: adapter.getDateFormatSql("%d"),
    hour: adapter.getDateFormatSql("%H"),
    minute: adapter.getDateFormatSql("%i"), // Changed from %M to %i for minutes
    second: adapter.getDateFormatSql("%s"), // Changed from %S to %s for seconds
  };

  // Database-specific timestamp formats
  switch (adapter.type) {
    case "mysql":
      return {
        ...basePatterns,
        timestamp: adapter.getDateFormatSql("%Y%m%d%H%i%s"),
        date: adapter.getDateFormatSql("%Y%m%d"),
        time: adapter.getDateFormatSql("%H%i%s"),
      };

    case "postgresql":
      return {
        ...basePatterns,
        timestamp: "TO_CHAR(NOW(), 'YYYYMMDDHH24MISS')",
        date: "TO_CHAR(NOW(), 'YYYYMMDD')",
        time: "TO_CHAR(NOW(), 'HH24MISS')",
      };

    case "sqlite":
      return {
        ...basePatterns,
        timestamp: "strftime('%Y%m%d%H%M%S', 'now')",
        date: "strftime('%Y%m%d', 'now')",
        time: "strftime('%H%M%S', 'now')",
      };

    default:
      return {
        ...basePatterns,
        timestamp: adapter.getDateFormatSql("%Y%m%d%H%i%s"),
        date: adapter.getDateFormatSql("%Y%m%d"),
        time: adapter.getDateFormatSql("%H%i%s"),
      };
  }
};

module.exports = {
  getDefaultPatterns,
};
