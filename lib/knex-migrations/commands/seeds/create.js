const SeedGenerator = require("../../generators/seed");
const { log } = require("../../utils/logger");

// async function createSeedCommand(name, options = {}) {
//   try {
//     const generator = new SeedGenerator();

//     // Check if this is a migration with seed
//     if (options.withMigration) {
//       const result = await generator.generateWithMigration(name, {
//         table: options.table,
//         columns: options.columns || [],
//         entries: options.data ? JSON.parse(options.data) : [],
//         options: {
//           softDeletes: options.softDeletes,
//           timestamps: options.timestamps !== false,
//         },
//       });

//       log.success(`Created seed file: ${result.seed.fileName}`);
//       log.success(`Created migration with seed integration`);
//       return result;
//     }

//     // Regular seed generation
//     const result = await generator.generate(name, {
//       table: options.table,
//       entries: options.data ? JSON.parse(options.data) : [],
//     });

//     log.success(`Created seed file: ${result.fileName}`);
//     return result;
//   } catch (error) {
//     log.error("Failed to create seed file:", error.message);
//     throw error;
//   }
// }

// module.exports = { createSeedCommand };

async function createSeedCommand(name, options = {}) {
  try {
    const generator = new SeedGenerator();

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
