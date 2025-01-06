const ejs = require("ejs");
const path = require("path");
const fs = require("fs");
const {
  fallbackErrorTemplate,
  fallbackServerErrorTemplate,
} = require("./templates");

class ErrorRenderer {
  static render(res, viewPath, defaultData, status, defaultTemplate) {
    try {
      // Try library's default template first (if provided)
      if (defaultTemplate && fs.existsSync(defaultTemplate)) {
        return this.renderTemplate(defaultTemplate, defaultData, res, status);
      }

      // Try app's error template as fallback
      const appErrorPath = path.join(
        process.cwd(),
        "app",
        "views",
        `${viewPath}.ejs`
      );

      if (fs.existsSync(appErrorPath)) {
        return this.renderTemplate(appErrorPath, defaultData, res, status);
      }

      // If no templates available, use fallback HTML
      return this.renderFallbackTemplate(res, defaultData, status);
    } catch (error) {
      console.error("Error rendering template:", error);
      return this.renderServerErrorTemplate(res, error);
    }
  }

  static renderTemplate(templatePath, data, res, status) {
    return ejs.renderFile(templatePath, data, (err, content) => {
      if (err) throw err;
      res.writeHead(status, { "Content-Type": "text/html" });
      res.end(content);
    });
  }

  static renderFallbackTemplate(res, data, status) {
    res.writeHead(status, { "Content-Type": "text/html" });
    return res.end(fallbackErrorTemplate(data));
  }

  static renderServerErrorTemplate(res, error) {
    res.writeHead(500, { "Content-Type": "text/html" });
    return res.end(fallbackServerErrorTemplate(error));
  }
}

module.exports = ErrorRenderer;
