const fs = require("fs").promises;
const path = require("path");
const seedTemplate = require("./templates/seed");
const createTableWithSeedTemplate = require("./templates/create_table_with_seed");
const createHasOneWithSeedTemplate = require("./templates/seeds/create_has_one_with_seed");

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
    const tableName = this.formatTableName(childModel);
    const parentTable = this.formatTableName(parentModel, true); // true for pluralize

    // First generate the seed file
    const seedResult = await this.generate(name, {
      table: tableName,
      entries: data.data ? JSON.parse(data.data) : [],
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

  formatTableName(name, pluralize = false) {
    let formatted = name
      .replace(/([A-Z])/g, "_$1")
      .toLowerCase()
      .replace(/^_/, "");

    if (pluralize) {
      formatted += "s";
    }

    return formatted;
  }

  formatName(name) {
    return (
      name
        .replace(/^Create/, "")
        .replace(/([A-Z])/g, "_$1")
        .toLowerCase()
        .replace(/^_/, "")
        .replace(/\s+/g, "_") + "_seeder"
    );
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
