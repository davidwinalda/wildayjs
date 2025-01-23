const { transaction } = require("objection");

module.exports = (QueryBuilder) => {
  if (QueryBuilder.prototype.__queryTransactionsExtended) return;
  QueryBuilder.prototype.__queryTransactionsExtended = true;

  /**
   * Start a new transaction.
   * @param {object} options - Transaction options (e.g., isolationLevel).
   * @returns {Promise<Transaction>}
   */
  QueryBuilder.prototype.startTransaction = async function (options = {}) {
    console.log("Starting transaction with options:", options);
    const trx = await transaction(this.modelClass().knex(), options);

    // Initialize transaction hooks
    trx._beforeCommitHooks = [];
    trx._afterCommitHooks = [];
    trx._beforeRollbackHooks = [];
    trx._afterRollbackHooks = [];

    return trx;
  };

  /**
   * Commit a transaction.
   * @param {Transaction} trx - The transaction to commit.
   * @returns {Promise<void>}
   */
  QueryBuilder.prototype.commitTransaction = async function (trx) {
    console.log("Committing transaction");
    try {
      // Run beforeCommit hooks
      if (trx._beforeCommitHooks) {
        for (const hook of trx._beforeCommitHooks) {
          await hook(trx);
        }
      }

      await trx.commit();

      // Run afterCommit hooks
      if (trx._afterCommitHooks) {
        for (const hook of trx._afterCommitHooks) {
          await hook(trx);
        }
      }
    } catch (error) {
      console.error("Error committing transaction:", error);
      throw error;
    }
  };

  /**
   * Roll back a transaction.
   * @param {Transaction} trx - The transaction to roll back.
   * @returns {Promise<void>}
   */
  QueryBuilder.prototype.rollbackTransaction = async function (trx) {
    console.log("Rolling back transaction");
    try {
      // Run beforeRollback hooks
      if (trx._beforeRollbackHooks) {
        for (const hook of trx._beforeRollbackHooks) {
          await hook(trx);
        }
      }

      await trx.rollback();

      // Run afterRollback hooks
      if (trx._afterRollbackHooks) {
        for (const hook of trx._afterRollbackHooks) {
          await hook(trx);
        }
      }
    } catch (error) {
      console.error("Error rolling back transaction:", error);
      throw error;
    }
  };

  /**
   * Create a savepoint within a transaction.
   * @param {Transaction} trx - The transaction.
   * @param {string} savepointName - The name of the savepoint.
   * @returns {Promise<void>}
   */
  QueryBuilder.prototype.createSavepoint = async function (trx, savepointName) {
    console.log(`Creating savepoint: ${savepointName}`);
    await trx.savepoint(savepointName);
  };

  /**
   * Roll back to a savepoint within a transaction.
   * @param {Transaction} trx - The transaction.
   * @param {string} savepointName - The name of the savepoint.
   * @returns {Promise<void>}
   */
  QueryBuilder.prototype.rollbackToSavepoint = async function (
    trx,
    savepointName
  ) {
    console.log(`Rolling back to savepoint: ${savepointName}`);
    await trx.rollbackTo(savepointName);
  };

  /**
   * Add a beforeCommit hook to a transaction.
   * @param {Transaction} trx - The transaction.
   * @param {function} hook - The hook function.
   */
  QueryBuilder.prototype.beforeCommit = function (trx, hook) {
    if (!trx._beforeCommitHooks) trx._beforeCommitHooks = [];
    trx._beforeCommitHooks.push(hook);
  };

  /**
   * Add an afterCommit hook to a transaction.
   * @param {Transaction} trx - The transaction.
   * @param {function} hook - The hook function.
   */
  QueryBuilder.prototype.afterCommit = function (trx, hook) {
    if (!trx._afterCommitHooks) trx._afterCommitHooks = [];
    trx._afterCommitHooks.push(hook);
  };

  /**
   * Add a beforeRollback hook to a transaction.
   * @param {Transaction} trx - The transaction.
   * @param {function} hook - The hook function.
   */
  QueryBuilder.prototype.beforeRollback = function (trx, hook) {
    if (!trx._beforeRollbackHooks) trx._beforeRollbackHooks = [];
    trx._beforeRollbackHooks.push(hook);
  };

  /**
   * Add an afterRollback hook to a transaction.
   * @param {Transaction} trx - The transaction.
   * @param {function} hook - The hook function.
   */
  QueryBuilder.prototype.afterRollback = function (trx, hook) {
    if (!trx._afterRollbackHooks) trx._afterRollbackHooks = [];
    trx._afterRollbackHooks.push(hook);
  };

  /**
   * Execute a function within a transaction with automatic commit/rollback.
   * @param {function} fn - The function to execute.
   * @param {object} options - Transaction options (e.g., isolationLevel).
   * @returns {Promise}
   */
  QueryBuilder.prototype.transactional = async function (fn, options = {}) {
    const trx = await this.startTransaction(options);
    try {
      const result = await fn(trx);
      await this.commitTransaction(trx);
      return result;
    } catch (error) {
      await this.rollbackTransaction(trx);
      throw error;
    }
  };

  /**
   * Retry a transaction on transient errors (e.g., deadlocks).
   * @param {function} fn - The function to execute.
   * @param {object} options - Transaction options (e.g., isolationLevel, retries).
   * @returns {Promise}
   */
  QueryBuilder.prototype.retryTransaction = async function (fn, options = {}) {
    const { retries = 3, delay = 100, ...transactionOptions } = options;
    for (let i = 0; i < retries; i++) {
      try {
        return await this.transactional(fn, transactionOptions);
      } catch (error) {
        if (i === retries - 1 || !isTransientError(error)) {
          throw error;
        }
        console.warn(`Retrying transaction (attempt ${i + 1})...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  };
};

/**
 * Check if an error is transient (e.g., deadlock).
 * @param {Error} error - The error to check.
 * @returns {boolean}
 */
function isTransientError(error) {
  return error.code === "ER_LOCK_DEADLOCK" || error.code === "40P01"; // Deadlock error codes
}
