const knex = require("knex");

class SQLConverter {
  constructor(fromDialect, toDialect) {
    this.fromDialect = fromDialect;
    this.toDialect = toDialect;
    this.knex = knex({ client: toDialect });

    console.log(`[SQLConverter] Converting ${fromDialect} -> ${toDialect}`);
  }

  convert(sql) {
    console.log(`[SQLConverter] Input SQL:`, sql);

    // Split SQL into statements
    const statements = sql
      .split(";")
      .map((stmt) => stmt.trim())
      .filter(Boolean);

    // Convert each statement
    const convertedStatements = statements.map((stmt) => {
      if (stmt.toUpperCase().startsWith("CREATE TABLE")) {
        return this.convertCreateTable(stmt);
      }
      return this.convertStatement(stmt);
    });

    return convertedStatements.filter(Boolean);
  }

  convertCreateTable(sql) {
    const match = sql.match(/CREATE TABLE [`"]?(\w+)[`"]?\s*\(([\s\S]+)\)/i);
    if (!match) return null;

    const [, tableName, columnDefs] = match;
    const columns = this.convertColumns(columnDefs);

    return this.knex.schema
      .createTable(tableName, (table) => {
        columns.forEach((col) => this.addColumn(table, col));
      })
      .toSQL().sql;
  }

  convertColumns(columnDefs) {
    return columnDefs
      .split(",")
      .map((col) => col.trim())
      .map((col) => this.parseColumn(col));
  }

  parseColumn(columnDef) {
    // Extract column parts: name, type, constraints
    const parts = columnDef.match(/[`"]?(\w+)[`"]?\s+([^,]+)/i);
    if (!parts) return null;

    const [, name, definition] = parts;
    const type = this.extractType(definition);
    const constraints = this.extractConstraints(definition);

    return { name, type, constraints };
  }

  extractType(definition) {
    const typeMatch = definition.match(/^\s*(\w+(?:\(\d+\))?)/i);
    return typeMatch ? typeMatch[1] : null;
  }

  extractConstraints(definition) {
    return definition.replace(/^\s*\w+(?:\(\d+\))?\s*/, "").trim();
  }

  addColumn(table, column) {
    if (!column) return;

    let col;

    // Handle special types
    if (column.type.match(/BIGINT.*AUTO_INCREMENT/i)) {
      col = table.bigIncrements(column.name);
    } else if (column.type.match(/INT.*AUTO_INCREMENT/i)) {
      col = table.increments(column.name);
    } else {
      col = table.specificType(column.name, this.convertType(column.type));
    }

    // Add constraints
    if (column.constraints) {
      if (column.constraints.includes("NOT NULL")) col.notNullable();
      if (column.constraints.includes("UNIQUE")) col.unique();
      if (column.constraints.includes("PRIMARY KEY")) col.primary();
      if (column.constraints.includes("DEFAULT CURRENT_TIMESTAMP"))
        col.defaultTo(this.knex.fn.now());
    }
  }

  convertType(type) {
    if (this.toDialect === "postgresql") {
      type = type.replace(/INT AUTO_INCREMENT/i, "SERIAL");
      type = type.replace(/BIGINT AUTO_INCREMENT/i, "BIGSERIAL");
    }
    return type;
  }

  convertStatement(sql) {
    return this.knex.raw(sql).toString();
  }
}

module.exports = SQLConverter;
