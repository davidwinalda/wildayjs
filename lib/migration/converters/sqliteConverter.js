const knex = require("knex");

class SQLiteConverter {
  constructor() {
    this.mysql = knex({ client: "mysql" });
    this.sqlite = knex({ client: "sqlite3" });

    this.typeMappings = {
      // ... keep your existing type mappings
    };
  }

  convertOtherStatement(sql) {
    console.log("\n=== Converting Statement ===");
    console.log("Original SQL:", sql);

    try {
      // Use Knex to build the query
      let converted = sql;

      // Handle special cases first
      if (sql.includes("TRIGGER")) {
        converted = this.convertTriggerStatement(sql);
      } else if (sql.includes("UPDATE") && sql.includes("token")) {
        converted = this.convertTokenUpdate(sql);
      } else {
        // Let Knex handle the basic conversion
        converted = this.sqlite.raw(this.mysql.raw(sql).toString()).toString();
      }

      console.log("Converted SQL:", converted);
      return converted;
    } catch (error) {
      console.error("Conversion error:", error);
      return sql; // Return original if conversion fails
    }
  }

  convertTokenUpdate(sql) {
    return this.sqlite
      .raw(
        `
      UPDATE users 
      SET token = (
        substr(hex(RANDOM()), 1, 8) || '_' || 
        strftime('%Y%m%d%H%M%S', CURRENT_TIMESTAMP)
      )
      WHERE token IS NULL
    `
      )
      .toString();
  }

  convertTriggerStatement(sql) {
    if (sql.toLowerCase().includes("before insert")) {
      return this.sqlite
        .raw(
          `
        CREATE TRIGGER generate_users_token 
        BEFORE INSERT ON users 
        FOR EACH ROW 
        WHEN NEW.token IS NULL
        BEGIN
          UPDATE users 
          SET token = (
            substr(hex(RANDOM()), 1, 8) || '_' || 
            strftime('%Y%m%d%H%M%S', CURRENT_TIMESTAMP)
          )
          WHERE rowid = NEW.rowid;
        END;
      `
        )
        .toString();
    }
    return sql;
  }

  convertIdentifiers(sql) {
    try {
      return this.sqlite.raw(sql).toString();
    } catch (error) {
      console.error("Identifier conversion error:", error);
      return sql;
    }
  }

  convertCreateTableStatement(sql) {
    try {
      // Remove MySQL-specific table options
      let converted = sql
        .replace(/\s+ENGINE\s*=\s*\w+/gi, "")
        .replace(/\s+CHARSET\s*=\s*\w+/gi, "")
        .replace(/\s+COLLATE\s*=\s*\w+/gi, "");

      // Let Knex handle the basic conversion
      converted = this.sqlite
        .raw(this.mysql.raw(converted).toString())
        .toString();

      console.log("Converted CREATE TABLE:", converted);
      return converted;
    } catch (error) {
      console.error("Create table conversion error:", error);
      return sql;
    }
  }

  // Helper method to check if a string is a valid SQL identifier
  isValidIdentifier(str) {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(str);
  }

  // Helper method to safely quote identifiers
  quoteIdentifier(identifier) {
    if (this.isValidIdentifier(identifier)) {
      return `"${identifier}"`;
    }
    return identifier;
  }
}

module.exports = SQLiteConverter;
