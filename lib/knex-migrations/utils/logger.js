const chalk = require("chalk");

const log = {
  debug: (...args) => {
    if (process.env.DEBUG) {
      console.log(chalk.gray("[DEBUG]"), ...args);
    }
  },
  info: (...args) => {
    console.log(chalk.blue("[INFO]"), ...args);
  },
  success: (...args) => {
    console.log(chalk.green("[SUCCESS]"), ...args);
  },
  warn: (...args) => {
    console.log(chalk.yellow("[WARN]"), ...args);
  },
  error: (...args) => {
    console.error(chalk.red("[ERROR]"), ...args);
  },
};

module.exports = { log };
