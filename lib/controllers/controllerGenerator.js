const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const { capitalize } = require("../utils/stringUtils");

class ControllerGenerator {
  constructor(name, actions = [], options = {}) {
    this.name = name;
    this.actions = actions;
    this.options = options;
    this.isApi = options.api || false;
    this.controllerName = this._formatName(name);
    this.skipViews = this.isApi || options.skipViews;
    this.skipRoutes = options.skipRoutes || false;
  }

  generate() {
    // Generate controller
    this._generateController();

    // Generate views unless skipped
    if (!this.skipViews) {
      this._generateViews();
    }

    // Generate routes unless skipped
    if (!this.skipRoutes) {
      this._addRoutes();
    }
  }

  _generateController() {
    const baseDir = path.join(process.cwd(), "app", "controllers");
    const controllerDir = this.isApi ? path.join(baseDir, "api") : baseDir;
    const fileName = `${this.name.toLowerCase()}Controller.js`;
    const filePath = path.join(controllerDir, fileName);

    if (!fs.existsSync(controllerDir)) {
      fs.mkdirSync(controllerDir, { recursive: true });
    }

    if (fs.existsSync(filePath)) {
      console.error(chalk.red(`Controller ${fileName} already exists!`));
      process.exit(1);
    }

    fs.writeFileSync(filePath, this._controllerTemplate());
    console.log(
      chalk.green(
        `Created controller at ${path.relative(process.cwd(), filePath)}`
      )
    );
  }

  _generateViews() {
    const viewsDir = path.join(
      process.cwd(),
      "app",
      "views",
      this.name.toLowerCase()
    );

    // Create views directory
    if (!fs.existsSync(viewsDir)) {
      fs.mkdirSync(viewsDir, { recursive: true });
      console.log(
        chalk.green(
          `Created views directory at ${path.relative(process.cwd(), viewsDir)}`
        )
      );
    }

    // Only generate view files if actions were specified
    if (this.actions.length > 0) {
      this.actions.forEach((action) => {
        const viewPath = path.join(viewsDir, `${action}.ejs`); // Changed from .html.ejs to .ejs
        if (!fs.existsSync(viewPath)) {
          fs.writeFileSync(viewPath, this._viewTemplate(action));
          console.log(
            chalk.green(
              `Created view at ${path.relative(process.cwd(), viewPath)}`
            )
          );
        }
      });
    }
  }

  _addRoutes() {
    // Skip route generation if no actions specified or skip-routes option is true
    if (this.actions.length === 0 || this.skipRoutes) {
      return;
    }

    const routesPath = path.join(process.cwd(), "config", "routes.js");

    if (!fs.existsSync(routesPath)) {
      console.error(
        chalk.yellow("Routes file not found. Skipping route generation.")
      );
      return;
    }

    let routesContent = fs.readFileSync(routesPath, "utf8");
    const newRoutes = this._routeTemplate();

    // Find the app.draw block
    const drawMatch = routesContent.match(
      /app\.draw\(\(route\)\s*=>\s*{([^}]*)}\);/
    );

    if (drawMatch) {
      // Insert new routes before the closing of app.draw block
      const position = drawMatch.index + drawMatch[0].length - 4; // Position before '});'
      routesContent =
        routesContent.slice(0, position).trimEnd() +
        "\n\n" +
        newRoutes +
        "\n" +
        routesContent.slice(position);

      // Clean up multiple empty lines
      routesContent = routesContent.replace(/\n\s*\n\s*\n/g, "\n\n");

      fs.writeFileSync(routesPath, routesContent);
      console.log(chalk.green("Routes added to config/routes.js"));
    } else {
      console.error(chalk.yellow("Could not find app.draw block in routes.js"));
    }
  }

  _controllerTemplate() {
    let template = "";

    template += `class ${this.controllerName} extends Controller {\n`;

    // Add action methods if specified
    if (this.actions.length > 0) {
      this.actions.forEach((action) => {
        if (this.isApi) {
          template += `  ${action}(req, res) {\n`;
          template += `    try {\n`;
          template += `      this.renderJson(res, { message: "${this.name.toLowerCase()} ${action} endpoint" });\n`;
          template += `    } catch (error) {\n`;
          template += `      this.renderError(res, error.message);\n`;
          template += `    }\n`;
          template += `  }\n`;
        } else {
          template += `  ${action}(req, res, render) {\n`;
          template += `    render(res, "${this.name.toLowerCase()}/${action}", { title: "${capitalize(
            this.name
          )} - ${capitalize(action)}" });\n`;
          template += `  }\n\n`;
        }
      });
    }

    template += `}\n\nmodule.exports = new ${this.controllerName}();\n`;

    return template;
  }

  _viewTemplate(action) {
    return `<h1>${this.controllerName}#${action}</h1>
<p>Find me in app/views/${this.name.toLowerCase()}/${action}.ejs</p>`; // Changed from .html.ejs to .ejs
  }

  _routeTemplate() {
    // Only generate routes if actions are specified
    if (this.actions.length > 0) {
      // Generate routes for specified actions
      const routes = this.actions.map((action) => {
        const basePath = this.isApi
          ? `/api/${this.name.toLowerCase()}`
          : `/${this.name.toLowerCase()}`;
        const controllerPath = this.isApi
          ? `api/${this.name.toLowerCase()}`
          : this.name.toLowerCase();
        return `    route.get("${basePath}/${action}", "${controllerPath}#${action}");`;
      });

      return `    // ${this.controllerName} routes\n${routes.join("\n")}`;
    }

    return "";
  }

  _formatName(name) {
    const baseName = name
      .split(/[-_]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");

    if (this.isApi === true) {
      return `Api${baseName}Controller`;
    }
    return `${baseName}Controller`;
  }
}

module.exports = ControllerGenerator;
