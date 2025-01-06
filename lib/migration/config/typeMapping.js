// Base type mappings that work across databases
const baseTypeMappings = {
  string: "TEXT",
  text: "TEXT",
  integer: "INTEGER",
  float: "FLOAT",
  decimal: "DECIMAL",
  datetime: "DATETIME",
  boolean: "BOOLEAN",
  date: "DATE",
  time: "TIME",
  binary: "BLOB",
  json: "JSON",
  timestamp: "TIMESTAMP",
  uuid: "UUID",
  enum: "VARCHAR(255)",
  jsonb: "JSONB",
  point: "POINT",
  polygon: "POLYGON",
  inet: "INET",
  macaddr: "MACADDR",
  money: "DECIMAL(19,4)",
  serial: "SERIAL",
};

// Database-specific type mappings
const databaseTypeMappings = {
  sqlite: {
    ...baseTypeMappings,
    boolean: "INTEGER", // SQLite doesn't have a native BOOLEAN
    json: "TEXT", // SQLite doesn't have a native JSON
    timestamp: "DATETIME",
    uuid: "TEXT",
    enum: "TEXT",
    point: "TEXT",
    polygon: "TEXT",
    inet: "TEXT",
    macaddr: "TEXT",
    money: "DECIMAL",
    // Add MySQL compatibility mappings
    TIMESTAMP: "DATETIME",
    DATETIME: "DATETIME",
    BOOL: "INTEGER",
    "TINYINT(1)": "INTEGER",
    BIGINT: "INTEGER",
    INT: "INTEGER",
    TINYINT: "INTEGER",
    SMALLINT: "INTEGER",
    MEDIUMINT: "INTEGER",
    LONGTEXT: "TEXT",
    MEDIUMTEXT: "TEXT",
    TINYTEXT: "TEXT",
    BINARY: "BLOB",
    VARBINARY: "BLOB",
    LONGBLOB: "BLOB",
    MEDIUMBLOB: "BLOB",
    TINYBLOB: "BLOB",
    // Add common VARCHAR types
    VARCHAR: "TEXT",
    "VARCHAR(255)": "TEXT",
    CHAR: "TEXT",
  },
  mysql: {
    ...baseTypeMappings,
    string: "VARCHAR(255)",
    text: "LONGTEXT",
    integer: "INT",
    float: "DOUBLE",
    boolean: "TINYINT(1)",
    binary: "LONGBLOB",
    enum: "ENUM",
    point: "POINT",
    polygon: "POLYGON",
    money: "DECIMAL(19,4)",
    timestamp: "TIMESTAMP",
    datetime: "DATETIME",
    json: "JSON",
  },
  postgresql: {
    ...baseTypeMappings,
    string: "VARCHAR(255)",
    float: "DOUBLE PRECISION",
    integer: "INTEGER",
    binary: "BYTEA",
    serial: "SERIAL",
    jsonb: "JSONB",
    inet: "INET",
    macaddr: "MACADDR",
    money: "MONEY",
    timestamp: "TIMESTAMP",
    datetime: "TIMESTAMP",
    json: "JSONB",
  },
};

function getTypeMappings(adapter) {
  console.log("\n=== Getting Type Mappings ===");
  console.log("Adapter:", {
    name: adapter.constructor.name,
    type: adapter.type,
    hasConfig: !!adapter.config,
  });

  // First try to get type from adapter.type
  let dbType = adapter.type;

  // If not found, try to extract from adapter name
  if (!dbType) {
    dbType = adapter.constructor.name.toLowerCase().replace("adapter", "");
  }

  console.log("Detected database type:", dbType);

  // Get the appropriate mappings
  const mappings = databaseTypeMappings[dbType] || baseTypeMappings;

  console.log("Using type mappings for:", dbType);
  console.log("Available types:", Object.keys(mappings));

  return mappings;
}

function mapColumnType(type, adapter, params = {}) {
  console.log("\n=== Mapping Column Type ===");
  console.log("Input:", { type, params });

  const mappings = getTypeMappings(adapter);

  // Handle parameterized types
  if (typeof type === "string" && type.includes("(")) {
    const [baseType, paramString] = type.split(/[\(\)]/);
    const parameters = paramString.split(",").map((p) => p.trim());
    console.log("Parameterized type:", { baseType, parameters });
    return `${mappings[baseType.toLowerCase()] || baseType}(${parameters.join(
      ","
    )})`;
  }

  // Handle basic types
  const mappedType = mappings[type.toLowerCase()];
  console.log("Mapped type:", mappedType || type);

  return mappedType || type;
}

function parseTypeWithConstraints(typeString, adapter) {
  console.log("\n=== Parsing Type With Constraints ===");
  console.log("Input type string:", typeString);

  const parts = typeString.split(":");
  const baseType = parts[0];
  const constraints = parts.slice(1);

  const mappedType = mapColumnType(baseType, adapter);

  const constraintMap = {
    "null:false": "NOT NULL",
    unique: "UNIQUE",
    primary: "PRIMARY KEY",
    index: "INDEX",
  };

  const sqlConstraints = constraints
    .map((c) => constraintMap[c])
    .filter(Boolean);

  console.log("Parsed result:", {
    baseType,
    mappedType,
    constraints,
    sqlConstraints,
  });

  return {
    type: mappedType,
    constraints: sqlConstraints,
  };
}

module.exports = {
  baseTypeMappings,
  databaseTypeMappings,
  getTypeMappings,
  mapColumnType,
  parseTypeWithConstraints,
};
