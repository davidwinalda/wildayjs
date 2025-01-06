const knexManager = require("../knexManager");
const path = require("path");
const { cli, log } = require("../../utils/chalkUtils");

async function getMigrationStatus() {
  const knex = knexManager.getInstance();

  try {
    log.info("Checking migration status...");
    console.log(`\n${cli.title("Migration Status")}`);

    // Get all migrations
    const [completed, pending] = await knex.migrate.list();

    // Show summary counts
    console.log(`\n${cli.section("Summary:")}`);
    console.log(`  ${cli.command("Completed:")} ${cli.text(completed.length)}`);
    console.log(`  ${cli.command("Pending:")} ${cli.text(pending.length)}`);
    console.log(
      `  ${cli.command("Total:")} ${cli.text(
        completed.length + pending.length
      )}`
    );

    // Show completed migrations if any
    if (completed.length > 0) {
      console.log(`\n${cli.section("Completed Migrations:")}`);
      completed.forEach((migration) => {
        const name = path.basename(migration.name);
        const date = migration.migration_time
          ? new Date(migration.migration_time).toLocaleString()
          : "Time not available";
        log.success(`  ${name}`);
        console.log(`    ${cli.comment(date)}`);
      });
    }

    // Show pending migrations if any
    if (pending.length > 0) {
      console.log(`\n${cli.section("Pending Migrations:")}`);
      pending.forEach((migration) => {
        const name = path.basename(migration.file);
        console.log(`  ${cli.command(name)}`);
      });
    }

    console.log(); // Empty line at the end

    return {
      completed,
      pending,
      total: completed.length + pending.length,
      isUpToDate: pending.length === 0,
    };
  } catch (error) {
    if (
      error.message.includes("no such table") ||
      error.message.includes("does not exist")
    ) {
      log.warn("No migration table exists yet. Run migrations first.");
    } else {
      log.error("Failed to get migration status: " + error.message);
      throw error;
    }
  }
}

module.exports = { getMigrationStatus };
