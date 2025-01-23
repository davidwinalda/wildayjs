const assetHelper = require("./asset_helper");
const formHelper = require("./form_helper");

// Debug log
const helpers = {
  ...assetHelper,
  ...formHelper,
};

console.log("🔍 Helpers loaded:", Object.keys(helpers));

module.exports = helpers;
