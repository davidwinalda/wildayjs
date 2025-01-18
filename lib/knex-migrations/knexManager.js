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
    log.debug("Creating new WildayJS instance");

    if (this.instance) {
      this.closeConnection();
    }

    // Create Knex instance but alias it as wildayjs
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
        log.debug("Closing WildayJS connection");
        // Add a timeout to ensure all queries are completed
        await Promise.race([
          this.instance.destroy(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Connection close timeout")),
              5000
            )
          ),
        ]);
        this.instance = null;
        this.currentType = null;
        this.config = null;
      } catch (error) {
        log.error("Error closing WildayJS connection:", error);
        // Force cleanup even if destroy fails
        this.instance = null;
        this.currentType = null;
        this.config = null;
        throw error;
      }
    }
  }

  async testConnection() {
    try {
      const wildayjs = this.getInstance();
      await wildayjs.raw("SELECT 1");
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
