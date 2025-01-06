const knexManager = require("../knexManager");
const path = require("path");
const { cli, log } = require("../../utils/chalkUtils");

async function listMigrations() {
  const knex = knexManager.getInstance();
  try {
    console.log(`\n${cli.title("Migration Status")}\n`);

    // Get both completed and pending migrations
    const [completed, pending] = await knex.migrate.list();

    // Get migration timestamps from the database
    const migrationRecords = await knex("knex_migrations")
      .select("name", "migration_time")
      .orderBy("id", "asc");

    // Create a map of migration names to their timestamps
    const migrationTimeMap = new Map(
      migrationRecords.map((record) => [
        path.basename(record.name),
        record.migration_time,
      ])
    );

    // Show completed migrations
    console.log(cli.section("Completed Migrations:"));
    if (completed.length === 0) {
      console.log(`  ${cli.comment("No completed migrations")}`);
    } else {
      completed.forEach((migration) => {
        const name = path.basename(migration.name);
        const migrationTime = migrationTimeMap.get(name);
        const date = migrationTime
          ? new Date(migrationTime).toLocaleString()
          : "Time not available";
        log.success(`  ${name}`);
        console.log(`    ${cli.comment(date)}`);
      });
    }

    // Show pending migrations
    console.log(`\n${cli.section("Pending Migrations:")}`);
    if (pending.length === 0) {
      console.log(`  ${cli.comment("No pending migrations")}`);
    } else {
      pending.forEach((migration) => {
        const name = path.basename(migration.file);
        console.log(`  ${cli.command(name)}`);
      });
    }

    // Show summary
    console.log(`\n${cli.section("Summary:")}`);
    console.log(
      `  ${cli.command("Total:")} ${cli.text(
        completed.length + pending.length
      )}`
    );
    console.log(`  ${cli.command("Completed:")} ${cli.text(completed.length)}`);
    console.log(`  ${cli.command("Pending:")} ${cli.text(pending.length)}`);
    console.log(); // Empty line at the end

    return { completed, pending };
  } catch (error) {
    if (
      error.message.includes("no such table") ||
      error.message.includes("does not exist")
    ) {
      log.warn("No migration table exists yet. Run migrations first.");
    } else {
      log.error("Failed to list migrations: " + error.message);
      throw error;
    }
  }
}

module.exports = { listMigrations };
