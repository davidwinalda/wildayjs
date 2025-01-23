const fs = require("fs").promises;
const path = require("path");
const pluralize = require("pluralize");
const seedTemplate = require("./templates/seed");
const createTableWithSeedTemplate = require("./templates/create_table_with_seed");
const createHasOneWithSeedTemplate = require("./templates/seeds/create_has_one_with_seed");
const addColumnWithSeedTemplate = require("./templates/seeds/add_column_with_seed");
const addColumnSeedTemplate = require("./templates/seeds/add_column_seed");

class SeedGenerator {
  constructor(options = {}) {
    this.seedsDir = path.join(process.cwd(), "db", "seeds");
    this.migrationsDir = path.join(process.cwd(), "db", "migrate");
    this.options = options;
  }

  async generate(name, data = {}) {
    await this.ensureDirectories();

    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, "")
      .slice(0, 14);
    const fileName = `${timestamp}_${this.formatName(name)}.js`;
    const filePath = path.join(this.seedsDir, fileName);

    const content = seedTemplate(data.table, data.entries || []);
    await fs.writeFile(filePath, content);

    return {
      path: filePath,
      fileName,
      content,
    };
  }

  async generateWithMigration(name, data = {}) {
    await this.ensureDirectories();

    // First generate the seed file
    const seedResult = await this.generate(name, {
      table: data.table,
      entries: data.data ? JSON.parse(data.data) : [],
    });

    // Generate migration file name
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, "")
      .slice(0, 14);
    const migrationFileName = `${timestamp}_create_${data.table}.js`;
    const migrationPath = path.join(this.migrationsDir, migrationFileName);

    // Then generate migration content
    const migrationContent = createTableWithSeedTemplate(
      data.table,
      data.columns || [],
      data.data ? JSON.parse(data.data) : [],
      data.options || {}
    );

    // Write migration file
    await fs.writeFile(migrationPath, migrationContent);

    return {
      seed: seedResult,
      migration: {
        path: migrationPath,
        fileName: migrationFileName,
        content: migrationContent,
      },
    };
  }

  async generateHasOneWithSeed(name, data = {}) {
    await this.ensureDirectories();

    // Parse the migration name to get parent table
    const matches = name.match(/^CreateHasOne(\w+)For(\w+)$/);
    if (!matches) {
      throw new Error("Invalid has-one migration name format");
    }

    const [, childModel, parentModel] = matches;
    const tableName = pluralize(childModel.toLowerCase());
    const parentTable = pluralize(parentModel.toLowerCase());

    // Parse seed data properly
    let parsedSeedData = [];
    if (data.data) {
      try {
        // Handle both string JSON and already parsed JSON
        parsedSeedData =
          typeof data.data === "string"
            ? JSON.parse(data.data.trim())
            : data.data;
      } catch (error) {
        throw new Error(`Invalid seed data JSON: ${error.message}`);
      }
    }

    // First generate the seed file
    const seedResult = await this.generate(name, {
      table: tableName,
      entries: parsedSeedData,
    });

    // Generate migration file name
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, "")
      .slice(0, 14);
    const migrationFileName = `${timestamp}_${name}.js`;
    const migrationPath = path.join(this.migrationsDir, migrationFileName);

    // Generate migration content using the template
    const migrationContent = createHasOneWithSeedTemplate(
      tableName,
      parentTable,
      data.columns || [],
      parsedSeedData,
      data.options || {}
    );

    // Write migration file
    await fs.writeFile(migrationPath, migrationContent);

    return {
      seed: seedResult,
      migration: {
        path: migrationPath,
        fileName: migrationFileName,
        content: migrationContent,
      },
    };
  }

  async generateAddColumnWithSeed(name, data = {}) {
    await this.ensureDirectories();

    // Parse the migration name to get table name
    const matches = name.match(/^Add\w+To(\w+)$/);
    if (!matches) {
      throw new Error(
        "Invalid add-column migration name format. Must be in format: AddXXXToYYY"
      );
    }

    const tableName = pluralize(matches[1].toLowerCase());

    // Parse seed data properly
    let parsedSeedData = [];
    if (data.data) {
      try {
        parsedSeedData =
          typeof data.data === "string"
            ? JSON.parse(data.data.trim())
            : data.data;
      } catch (error) {
        throw new Error(`Invalid seed data JSON: ${error.message}`);
      }
    }

    // Generate timestamp for both migration and seed files
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, "")
      .slice(0, 14);

    // Generate seed file using the add-column seed template
    const seedFileName = `${timestamp}_${name}Seeder.js`;
    const seedPath = path.join(this.seedsDir, seedFileName);
    const seedContent = addColumnSeedTemplate(tableName, parsedSeedData);

    await fs.writeFile(seedPath, seedContent);

    const seedResult = {
      path: seedPath,
      fileName: seedFileName,
      content: seedContent,
    };

    // Generate migration file name (maintaining original case)
    const migrationFileName = `${timestamp}_${name}.js`;
    const migrationPath = path.join(this.migrationsDir, migrationFileName);

    // Generate migration content using the template
    const migrationContent = addColumnWithSeedTemplate(
      tableName,
      data.columns || [],
      parsedSeedData,
      {
        ...data.options,
        migrationName: name,
        timestamp: timestamp,
      }
    );

    // Write migration file
    await fs.writeFile(migrationPath, migrationContent);

    return {
      seed: seedResult,
      migration: {
        path: migrationPath,
        fileName: migrationFileName,
        content: migrationContent,
      },
    };
  }

  formatTableName(name, shouldPluralize = false) {
    let formatted = name
      .replace(/([A-Z])/g, "_$1")
      .toLowerCase()
      .replace(/^_/, "");

    if (shouldPluralize) {
      formatted = pluralize(formatted);
    }

    return formatted;
  }

  formatName(name) {
    // Remove 'Create' prefix if exists
    const baseName = name.replace(/^Create/, "");

    // Add 'Seeder' suffix if not present
    const withSuffix = baseName.endsWith("Seeder")
      ? baseName
      : baseName + "Seeder";

    return withSuffix;
  }

  async ensureDirectories() {
    try {
      // Ensure both directories exist
      await fs.mkdir(this.seedsDir, { recursive: true });
      await fs.mkdir(this.migrationsDir, { recursive: true });
    } catch (error) {
      if (error.code !== "EEXIST") {
        throw error;
      }
    }
  }
}

module.exports = SeedGenerator;
