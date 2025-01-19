const SeedGenerator = require("../../generators/seed");
const { log } = require("../../utils/logger");

async function createSeedCommand(name, options = {}) {
  try {
    const generator = new SeedGenerator();

    if (options.hasOne) {
      const result = await generator.generateHasOneWithSeed(name, {
        columns: options.columns,
        data: options.data,
        options: options.options,
      });

      log.success(`Created seed file: ${result.seed.fileName}`);
      log.success(`Created has-one migration with seed integration`);
      return result;
    }

    if (options.withMigration) {
      const result = await generator.generateWithMigration(name, options);

      log.success(`Created seed file: ${result.seed.fileName}`);
      log.success(`Created migration with seed integration`);
      return result;
    }

    const result = await generator.generate(name, {
      table: options.table,
      entries: options.data ? JSON.parse(options.data) : [],
    });

    log.success(`Created seed file: ${result.fileName}`);
    return { seed: result };
  } catch (error) {
    throw error;
  }
}

module.exports = { createSeedCommand };
