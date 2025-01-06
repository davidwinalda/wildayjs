const { getDatabaseConfig } = require("../config/database");

class SQLTemplates {
  constructor(adapter) {
    this.adapter = adapter;
    this.config = getDatabaseConfig(adapter);
  }

  createTable(tableName, columns) {
    return `CREATE TABLE ${this.adapter.escapeIdentifier(
      tableName
    )} (\n${columns.join(",\n")}\n)`;
  }

  createTempTable(tableName, columns) {
    const tempName = `${tableName}_temp`;
    return `CREATE TEMPORARY TABLE ${this.adapter.escapeIdentifier(
      tempName
    )} AS\nSELECT ${columns}\nFROM ${this.adapter.escapeIdentifier(tableName)}`;
  }

  dropTable(tableName) {
    return `DROP TABLE IF EXISTS ${this.adapter.escapeIdentifier(tableName)}`;
  }

  createTrigger(tableName, triggerName, columnName, defaultValue) {
    const dbType = this.adapter.constructor.name
      .toLowerCase()
      .replace("adapter", "");

    switch (dbType) {
      case "postgresql":
        return `
CREATE OR REPLACE FUNCTION tr_${tableName}_${columnName}_default()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.${columnName} IS NULL THEN
    NEW.${columnName} := ${defaultValue};
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ${triggerName}
BEFORE INSERT ON ${this.adapter.escapeIdentifier(tableName)}
FOR EACH ROW
EXECUTE FUNCTION tr_${tableName}_${columnName}_default();`;

      case "mysql":
        return `
CREATE TRIGGER ${triggerName}
BEFORE INSERT ON ${this.adapter.escapeIdentifier(tableName)}
FOR EACH ROW
BEGIN
  IF NEW.${columnName} IS NULL THEN
    SET NEW.${columnName} = ${defaultValue};
  END IF;
END;`;

      default: // sqlite
        return `
CREATE TRIGGER IF NOT EXISTS ${triggerName}
AFTER INSERT ON ${this.adapter.escapeIdentifier(tableName)}
WHEN NEW.${columnName} IS NULL
BEGIN
   UPDATE ${this.adapter.escapeIdentifier(tableName)}
   SET ${columnName} = ${defaultValue}
   WHERE id = NEW.id;
END;`;
    }
  }
}

module.exports = SQLTemplates;
