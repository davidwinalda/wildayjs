const path = require("path");

module.exports = {
  errorTemplates: {
    500: path.resolve(__dirname, "../views/errors/500.ejs"),
    404: path.resolve(__dirname, "../views/errors/404.ejs"),
  },
};
