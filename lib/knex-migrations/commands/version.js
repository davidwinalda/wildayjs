const knexManager = require("../knexManager");
const path = require("path");
const { cli, log } = require("../../utils/chalkUtils");

async function getCurrentVersion() {
  const knex = knexManager.getInstance();
  try {
    // Get current version
    const version = await knex.migrate.currentVersion();

    // Print header
    console.log(`\n${cli.title("Migration Version")}\n`);

    if (version === "none") {
      console.log(`${cli.section("Current State:")}`);
      console.log(
        `  ${cli.text("•")} ${cli.text("Status:")} ${cli.param(
          "No migrations have been run yet"
        )}\n`
      );
      return version;
    }

    // Query the migrations table directly for more accurate information
    const migrationRecord = await knex("knex_migrations")
      .where("name", "like", `${version}%`)
      .first();

    if (migrationRecord) {
      // Print migration details
      console.log(`${cli.section("Current State:")}`);
      console.log(
        `  ${cli.text("•")} ${cli.text("Version:")} ${cli.command(version)}`
      );
      console.log(
        `  ${cli.text("•")} ${cli.text("Migration:")} ${cli.command(
          migrationRecord.name
        )}`
      );

      if (migrationRecord.migration_time) {
        const migrationDate = new Date(migrationRecord.migration_time);
        console.log(
          `  ${cli.text("•")} ${cli.text("Executed:")} ${cli.param(
            migrationDate.toLocaleString()
          )}\n`
        );
      } else {
        // Fallback to batch information if no timestamp
        console.log(
          `  ${cli.text("•")} ${cli.text("Batch:")} ${cli.param(
            `#${migrationRecord.batch}`
          )}`
        );
        log.warn(
          `  ${cli.text("•")} ${cli.comment(
            "Note: Exact execution time not recorded"
          )}\n`
        );
      }
    } else {
      log.warn("Migration record not found in database\n");
    }

    return version;
  } catch (error) {
    if (error.message.includes("knex_migrations")) {
      log.warn("\nNo migration table exists yet. Run migrations first.\n");
    } else {
      log.error("\nFailed to get current version: " + error.message + "\n");
    }
    throw error;
  }
}

module.exports = { getCurrentVersion };
