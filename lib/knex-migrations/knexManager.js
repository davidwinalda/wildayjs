const knex = require("knex");
const { getKnexConfig } = require("./config");
const { log } = require("./utils/logger");

class KnexManager {
  constructor() {
    this.instance = null;
    this.currentType = null;
    this.config = null;
  }

  getInstance() {
    const config = getKnexConfig();
    const dbType = config.client;

    // Check if we need to create a new instance
    if (this.shouldRecreateInstance(config)) {
      this.recreateInstance(config);
    }

    return this.instance;
  }

  shouldRecreateInstance(newConfig) {
    if (!this.instance || !this.config) return true;
    if (this.currentType !== newConfig.client) return true;

    // Deep compare connection configs
    const oldConn = this.config.connection;
    const newConn = newConfig.connection;

    return JSON.stringify(oldConn) !== JSON.stringify(newConn);
  }

  recreateInstance(config) {
    log.debug("Creating new Knex instance");

    if (this.instance) {
      this.closeConnection();
    }

    this.instance = knex(config);
    this.currentType = config.client;
    this.config = config;

    // Add error handler
    this.instance.on("error", (error) => {
      log.error("Database error:", error);
    });
  }

  async closeConnection() {
    if (this.instance) {
      try {
        log.debug("Closing Knex connection");
        await this.instance.destroy();
        this.instance = null;
        this.currentType = null;
        this.config = null;
      } catch (error) {
        log.error("Error closing Knex connection:", error);
        throw error;
      }
    }
  }

  async testConnection() {
    try {
      const knex = this.getInstance();
      await knex.raw("SELECT 1");
      return true;
    } catch (error) {
      log.error("Connection test failed:", error);
      return false;
    }
  }

  getConfig() {
    return this.config;
  }

  getCurrentType() {
    return this.currentType;
  }
}

// Export singleton instance
module.exports = new KnexManager();
