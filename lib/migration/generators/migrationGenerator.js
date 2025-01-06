const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { generateTimestamp } = require("../utils/timestamp");
const { toSnakeCase } = require("../utils/nameHelper");
const {
  parseColumns,
  parseColumnDefinition,
} = require("../parsers/columnParser");
const {
  createTableMigration,
  addColumnsMigration,
  changeColumnsMigration,
  removeColumnsMigration,
} = require("./sqlGenerators");

class MigrationGenerator {
  constructor(migrationName, columns) {
    this.migrationName = migrationName;
    this.columns = columns;
    this.timestamp = generateTimestamp();
    this.migrationDir = path.join(process.cwd(), "db", "migrate");
    this.downDir = path.join(this.migrationDir, "down");

    // Create directories if they don't exist
    if (!fs.existsSync(this.migrationDir)) {
      fs.mkdirSync(this.migrationDir, { recursive: true });
    }
    if (!fs.existsSync(this.downDir)) {
      fs.mkdirSync(this.downDir, { recursive: true });
    }
  }

  generate() {
    const { action, table, fields } = this.parseMigrationAction(
      this.migrationName
    );
    let db;

    try {
      const dbPath = path.join(process.cwd(), "db", "development.sqlite3");
      if (fs.existsSync(dbPath)) {
        db = new Database(dbPath);
      }

      if (action) {
        let { upSql, downSql } = this.generateActionMigration(
          action,
          table,
          fields,
          db
        );
        this.writeMigrationFiles(upSql, downSql);
      } else {
        this.generateCreateTableMigration();
      }
    } finally {
      if (db) db.close();
    }
  }

  parseMigrationAction(migrationName) {
    const actions = {
      Add: "add",
      Change: "change",
      Remove: "remove",
      Rename: "rename",
    };

    let action, table, fields;

    const addMatch = migrationName.match(/^Add(.+)To(\w+)$/);
    const changeMatch = migrationName.match(/^Change(.+)In(\w+)$/);
    const removeMatch = migrationName.match(/^Remove(.+)From(\w+)$/);
    const renameMatch = migrationName.match(/^Rename(.+)To(.+)In(\w+)$/);

    if (addMatch) {
      action = "add";
      fields = addMatch[1].split("And");
      table = addMatch[2].toLowerCase();
    } else if (changeMatch) {
      action = "change";
      fields = changeMatch[1].split("And");
      table = changeMatch[2].toLowerCase();
    } else if (removeMatch) {
      action = "remove";
      // Convert camelCase to snake_case for remove actions
      fields = removeMatch[1].split("And").map((field) =>
        field
          .split(/(?=[A-Z])/)
          .join("_")
          .toLowerCase()
      );
      table = removeMatch[2].toLowerCase();
    } else if (renameMatch) {
      action = "rename";
      // Convert camelCase to snake_case for both names
      const oldName = renameMatch[1]
        .split(/(?=[A-Z])/)
        .join("_")
        .toLowerCase();
      const newName = renameMatch[2]
        .split(/(?=[A-Z])/)
        .join("_")
        .toLowerCase();
      fields = [`${oldName}:${newName}`];
      table = renameMatch[3].toLowerCase();
    }

    // Debug logging
    console.log("Migration action:", action);
    console.log("Table:", table);
    console.log("Fields after conversion:", fields);

    return {
      action,
      table,
      fields: fields ? fields.map((f) => f.toLowerCase()) : [],
    };
  }

  generateActionMigration(action, table, fields, db) {
    switch (action) {
      case "add":
        return addColumnsMigration(table, this.columns, db);
      case "change":
        return changeColumnsMigration(table, this.columns, db);
      case "remove":
        return removeColumnsMigration(table, fields, db);
      case "rename":
        return changeColumnsMigration(table, fields, db);
      default:
        return { upSql: "", downSql: "" };
    }
  }

  generateCreateTableMigration() {
    const { sql, downSql } = createTableMigration(
      this.migrationName,
      this.columns
    );
    const fileName = `${this.timestamp}_create_${toSnakeCase(
      this.migrationName
    )}.sql`;

    this.writeMigrationFiles(sql, downSql, fileName);
  }

  writeMigrationFiles(upSql, downSql, fileName = null) {
    if (!fileName) {
      fileName = `${this.timestamp}_${toSnakeCase(this.migrationName)}.sql`;
    }

    const downFileName = fileName.replace(".sql", "_down.sql");

    fs.writeFileSync(path.join(this.migrationDir, fileName), upSql);
    fs.writeFileSync(path.join(this.downDir, downFileName), downSql);

    console.log(`Migration created: ${fileName}`);
    console.log(`Down migration created: ${downFileName}`);
  }
}

module.exports = MigrationGenerator;
