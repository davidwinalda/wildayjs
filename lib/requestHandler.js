const path = require("path");
const BodyParser = require("./bodyParser");
const RouteMapper = require("./routeMapper");

class RequestHandler {
  constructor(app) {
    this.app = app;
    this.bodyParser = new BodyParser();
    this.routeMapper = new RouteMapper(app.routes);
  }

  async handle(req, res) {
    try {
      // Handle static files
      if (req.url.startsWith("/css/") || req.url.startsWith("/js/")) {
        return await this.app.staticFileHandler.handle(req, res);
      }

      // Parse request body
      await this.bodyParser.parse(req);

      // Find matching route
      const route = this.routeMapper.match(req);

      if (!route) {
        return this.handle404(req, res);
      }

      await this.executeController(route, req, res);
    } catch (err) {
      console.error("Request Processing Error:", err);
      this.handle500(err, res);
    }
  }

  handle404(req, res) {
    const availableRoutes = Object.entries(this.app.routes)
      .map(([key, r]) => `${r.method} ${r.pattern}`)
      .sort()
      .join("\n");

    this.app.render(
      res,
      "errors/404",
      {
        title: "Not Found",
        error: {
          status: 404,
          message: "Page Not Found",
          detail: `No route matches [${req.method}] "${req.url}"\n\nAvailable Routes:\n${availableRoutes}`,
        },
      },
      404,
      this.app.errorTemplates?.[404]
    );
  }

  handle500(err, res) {
    this.app.render(
      res,
      "errors/500",
      {
        title: "Error",
        error: {
          status: 500,
          message: "Request Processing Error",
          detail: err.message,
        },
      },
      500,
      this.app.errorTemplates?.[500]
    );
  }

  async executeController(route, req, res) {
    const [controllerName, actionName] = route.action.split("#");
    const controllerPath = path.join(
      process.cwd(),
      "app",
      "controllers",
      `${controllerName}Controller.js`
    );

    try {
      const controller = require(controllerPath);
      if (controller[actionName]) {
        const autoRender = (res, viewPathOrData, data = {}) => {
          if (typeof viewPathOrData === "string") {
            this.app.render(res, viewPathOrData, data);
          } else {
            this.app.render(
              res,
              `${controllerName}/${actionName}`,
              viewPathOrData
            );
          }
        };
        await controller[actionName](req, res, autoRender);
      } else {
        this.handleActionNotFound(controllerName, actionName, controller, res);
      }
    } catch (err) {
      console.error("Server Error:", err);
      this.handle500(err, res);
    }
  }
}

module.exports = RequestHandler;
