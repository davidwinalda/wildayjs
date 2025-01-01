const chalk = require("chalk");

// CLI specific color combinations
const cli = {
  title: (text) => chalk.bold.blue(text),
  section: (text) => chalk.yellow(text),
  command: (text) => chalk.green(text),
  param: (text) => chalk.gray(text),
  example: (text) => chalk.cyan(text),
  code: (text) => chalk.magenta(text),
  comment: (text) => chalk.gray(text),
};

// Logging utilities
const log = {
  success: (msg) => console.log(chalk.green("✓"), chalk.green(msg)),
  error: (msg) => console.error(chalk.red("✗"), chalk.red(msg)),
  warn: (msg) => console.log(chalk.yellow("⚠"), chalk.yellow(msg)),
  info: (msg) => console.log(chalk.blue("ℹ"), chalk.blue(msg)),
};

// Error messages
const errors = {
  missingArgument: (arg) => {
    log.error(`Error: Missing required argument: ${arg}`);
  },
  migrationNameRequired: () => {
    log.error("Migration name is required");
    console.log(
      "\nUsage:",
      cli.command("wildayjs generate:migration"),
      cli.param("<MigrationName> <columns...>")
    );
  },
  invalidMigrationFormat: () => {
    log.error("Invalid migration name format");
    console.log("\nValid formats:");
    console.log("  " + cli.example("CreateUsers"));
    console.log("  " + cli.example("AddPasswordToUsers"));
    console.log("  " + cli.example("ChangeEmailInUsers"));
    console.log("  " + cli.example("RemovePhoneFromUsers"));
  },
  columnsRequired: () => log.error("Columns are required for table creation"),
  invalidStepNumber: () => {
    log.error("✗ Invalid step number. Must be a positive integer.");
  },
  invalidVersion: () => {
    log.error(
      "✗ Invalid version format. Must be a 14-digit timestamp (YYYYMMDDHHMMSS)."
    );
  },
  unknownCommand: (cmd) => {
    log.error(`Unknown command: ${cmd}`);
    console.log(
      "\nRun",
      cli.command("'wildayjs help'"),
      "for usage information"
    );
  },
};

module.exports = {
  chalk,
  cli,
  log,
  errors,
  showHelp: () => {
    console.log(`
${cli.title("WildayJS CLI Usage:")}
  
  ${cli.section("New App Commands:")}
    ${cli.command("new")} ${cli.param("<app-name>")}
    ${cli.comment("# Create a new WildayJS app")}
    ${cli.command("wildayjs new")} ${cli.example("my-app")}

  ${cli.section("Migration Commands:")}
    ${cli.command("generate:migration")} ${cli.param(
      "<MigrationName> <columns...>"
    )}
    ${cli.command("db:migrate")}                ${cli.comment(
      "# Run all pending migrations"
    )}
    ${cli.command("db:migrate:up")} ${cli.param("--version <version>")}
    ${cli.command("db:migrate:down")} ${cli.param("--version <version>")}
    ${cli.command("db:migrate:reset")}
    ${cli.command("db:rollback")} ${cli.param("[--step <number>]")}

  ${cli.section("Examples:")}
    ${cli.comment("# Create new table")}
    ${cli.command("wildayjs generate:migration")} ${cli.example(
      "CreateUsers"
    )} ${cli.code("name:string email:string:null:false:unique")}

    ${cli.comment("# Add columns to existing table")}
    ${cli.command("wildayjs generate:migration")} ${cli.example(
      "AddPasswordToUsers"
    )} ${cli.code("password:string:null:false")}
    ${cli.command("wildayjs generate:migration")} ${cli.example(
      "AddAgeAndPhoneToUsers"
    )} ${cli.code("age:integer phone:string")}

    ${cli.comment("# Modify existing columns")}
    ${cli.command("wildayjs generate:migration")} ${cli.example(
      "ChangeEmailInUsers"
    )} ${cli.code("email:string:null:false:unique")}

    ${cli.comment("# Remove columns")}
    ${cli.command("wildayjs generate:migration")} ${cli.example(
      "RemovePhoneFromUsers"
    )} ${cli.code("phone")}

    ${cli.comment("# Migration Commands")}
    ${cli.command("wildayjs db:migrate")}                    ${cli.comment(
      "# Run all pending migrations"
    )}
    ${cli.command("wildayjs db:migrate:up --version")} ${cli.example(
      "20240101123456"
    )}   ${cli.comment("# Migrate up to specific version")}
    ${cli.command("wildayjs db:migrate:down --version")} ${cli.example(
      "20240101123456"
    )} ${cli.comment("# Revert specific version")}
    ${cli.command("wildayjs db:migrate:reset")}              ${cli.comment(
      "# Reset and reapply all migrations"
    )}
    ${cli.command("wildayjs db:rollback")}                   ${cli.comment(
      "# Rollback last migration"
    )}
    ${cli.command("wildayjs db:rollback --step")} ${cli.example(
      "3"
    )}         ${cli.comment("# Rollback last 3 migrations")}

  ${cli.section("Console Command:")}
    ${cli.command("console")}         ${cli.comment(
      "# Start interactive console"
    )}
      ${cli.comment("# Start console")}
      ${cli.command("wildayjs console")}
  
  ${cli.section("Column Types:")}
    ${cli.comment("# String Types")}
    ${cli.command("string")}    : ${cli.comment("TEXT - For short strings")}
    ${cli.command("text")}      : ${cli.comment("TEXT - For longer text")}
    ${cli.command("binary")}    : ${cli.comment("BLOB - For binary data")}

    ${cli.comment("# Numeric Types")}
    ${cli.command("integer")}   : ${cli.comment("INTEGER - Standard integers")}
    ${cli.command("bigint")}    : ${cli.comment("INTEGER - Large integers")}
    ${cli.command("decimal")}   : ${cli.comment(
      "DECIMAL - Precise decimal numbers"
    )}
    ${cli.command("float")}     : ${cli.comment(
      "REAL - Floating point numbers"
    )}
    ${cli.command("number")}    : ${cli.comment(
      "NUMERIC - Generic numeric type"
    )}

    ${cli.comment("# Date/Time Types")}
    ${cli.command("datetime")}  : ${cli.comment("DATETIME - Date and time")}
    ${cli.command("timestamp")} : ${cli.comment(
      "DATETIME - Alias for datetime"
    )}
    ${cli.command("date")}      : ${cli.comment("DATE - Just date")}
    ${cli.command("time")}      : ${cli.comment("TIME - Just time")}

    ${cli.comment("# Other Types")}
    ${cli.command("boolean")}   : ${cli.comment("BOOLEAN - True/False values")}
    ${cli.command("json")}      : ${cli.comment("TEXT - JSON data")}
    ${cli.command("references")}: ${cli.comment(
      "INTEGER + FOREIGN KEY (user:references creates user_id)"
    )}
    ${cli.command("belongs_to")}: ${cli.comment("Alias for references")}

  ${cli.section("Column Modifiers:")}
    ${cli.command("null:false")}  : ${cli.comment("NOT NULL constraint")}
    ${cli.command("unique")}      : ${cli.comment("UNIQUE constraint")}
    ${cli.command("primary")}     : ${cli.comment("PRIMARY KEY constraint")}
    ${cli.command("default=value")}: ${cli.comment("Sets default value")}
`);
  },
};
