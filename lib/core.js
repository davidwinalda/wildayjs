const path = require("path");
const fs = require("fs").promises;
const render = require("./render");
const { errorTemplates } = require("./config/paths");
const querystring = require("querystring");
const CssBundler = require("./asset-pipeline/cssBundler");
class WildayJS {
  constructor() {
    this.routes = {};
    this.render = render;
    this.staticExtensions = {
      ".css": "text/css",
      ".js": "application/javascript",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
    };

    // Initialize asset pipeline
    this.cssBundler = new CssBundler(process.cwd());

    // Bind methods
    this.handler = this.handler.bind(this);
    this.start = this.start.bind(this);
  }

  async start() {
    console.log("\n🚀 Starting WildayJS...");

    try {
      // Initialize asset pipeline
      console.log("\n🔍 Starting asset pipeline...");
      await this.cssBundler.bundle();

      // Watch for changes in development
      if (process.env.NODE_ENV !== "production") {
        await this.cssBundler.watch();
      }
    } catch (err) {
      console.error("Failed to start asset pipeline:", err);
      throw err;
    }
  }

  draw(callback) {
    const route = {
      // Standard HTTP methods
      get: (path, action) => {
        this.routes[`GET:${path}`] = { method: "GET", action, pattern: path };
      },
      post: (path, action) => {
        this.routes[`POST:${path}`] = { method: "POST", action, pattern: path };
      },
      put: (path, action) => {
        this.routes[`PUT:${path}`] = { method: "PUT", action, pattern: path };
      },
      patch: (path, action) => {
        this.routes[`PATCH:${path}`] = {
          method: "PATCH",
          action,
          pattern: path,
        };
      },
      delete: (path, action) => {
        this.routes[`DELETE:${path}`] = {
          method: "DELETE",
          action,
          pattern: path,
        };
      },
      // Resources helper (RESTful routes)
      resources: (name) => {
        const basePath = `/${name}`;
        this.routes[`GET:${basePath}`] = {
          method: "GET",
          action: `${name}#index`,
          pattern: basePath,
        };
        this.routes[`GET:${basePath}/new`] = {
          method: "GET",
          action: `${name}#new`,
          pattern: `${basePath}/new`,
        };
        this.routes[`POST:${basePath}`] = {
          method: "POST",
          action: `${name}#create`,
          pattern: basePath,
        };
        this.routes[`GET:${basePath}/:id`] = {
          method: "GET",
          action: `${name}#show`,
          pattern: `${basePath}/:id`,
        };
        this.routes[`GET:${basePath}/:id/edit`] = {
          method: "GET",
          action: `${name}#edit`,
          pattern: `${basePath}/:id/edit`,
        };
        this.routes[`PUT:${basePath}/:id`] = {
          method: "PUT",
          action: `${name}#update`,
          pattern: `${basePath}/:id`,
        };
        this.routes[`PATCH:${basePath}/:id`] = {
          method: "PATCH",
          action: `${name}#update`,
          pattern: `${basePath}/:id`,
        };
        this.routes[`DELETE:${basePath}/:id`] = {
          method: "DELETE",
          action: `${name}#destroy`,
          pattern: `${basePath}/:id`,
        };
      },
    };
    callback(route);
  }

  async parseBody(req) {
    if (
      req.method === "POST" ||
      req.method === "PUT" ||
      req.method === "PATCH"
    ) {
      return new Promise((resolve, reject) => {
        let rawBody = "";

        req.on("data", (chunk) => {
          rawBody += chunk.toString();
        });

        req.on("end", () => {
          console.log("Raw body received:", rawBody);
          console.log("Content-Type:", req.headers["content-type"]);

          try {
            if (req.headers["content-type"]?.includes("application/json")) {
              const parsedBody = JSON.parse(rawBody);
              // Create a regular object from the parsed JSON
              req.body = Object.assign({}, parsedBody);
              console.log("Parsed JSON body:", req.body);
            } else {
              const parsedBody = querystring.parse(rawBody);
              // Create a regular object from the parsed form data
              req.body = Object.assign({}, parsedBody);
              console.log("Parsed form body:", req.body);
            }

            // Handle method override after parsing
            if (req.body._method) {
              req.originalMethod = req.method;
              req.method = req.body._method.toUpperCase();
            } else if (req.url.includes("_method=")) {
              const match = req.url.match(/_method=([^&]+)/i);
              if (match) {
                req.originalMethod = req.method;
                req.method = match[1].toUpperCase();
                req.url = req.url
                  .replace(/_method=[^&]+&?/, "")
                  .replace(/\?$/, "");
              }
            }

            resolve();
          } catch (error) {
            console.error("Body parse error:", error);
            req.body = {};
            resolve();
          }
        });

        req.on("error", (error) => {
          console.error("Request error:", error);
          req.body = {};
          resolve();
        });
      });
    } else {
      // For non-POST/PUT/PATCH requests, initialize empty body
      req.body = {};
    }
  }

  handler() {
    return async (req, res) => {
      try {
        // Handle static files first
        if (req.url.startsWith("/css/") || req.url.startsWith("/js/")) {
          const filePath = path.join(process.cwd(), "public", req.url);
          const ext = path.extname(filePath);

          try {
            const content = await fs.readFile(filePath);
            res.writeHead(200, {
              "Content-Type": this.staticExtensions[ext] || "text/plain",
              "Cache-Control": "public, max-age=31536000",
            });
            res.end(content);
            return;
          } catch (err) {
            console.error("Static file error:", err);
            if (err.code === "ENOENT") {
              console.log(`Static file not found: ${filePath}`);
            } else {
              throw err;
            }
          }
        }

        // Initialize body as empty object
        req.body = {};

        // Parse body for POST/PUT/PATCH requests
        if (
          req.method === "POST" ||
          req.method === "PUT" ||
          req.method === "PATCH"
        ) {
          await new Promise((resolve, reject) => {
            let rawBody = "";

            req.on("data", (chunk) => {
              rawBody += chunk.toString();
            });

            req.on("end", () => {
              try {
                console.log("Raw body received:", rawBody);
                console.log("Content-Type:", req.headers["content-type"]);

                if (req.headers["content-type"]?.includes("application/json")) {
                  req.body = JSON.parse(rawBody);
                  console.log("Parsed JSON body:", req.body);
                } else {
                  req.body = querystring.parse(rawBody);
                  console.log("Parsed form body:", req.body);
                }

                // Handle method override
                if (req.body._method) {
                  req.originalMethod = req.method;
                  req.method = req.body._method.toUpperCase();
                } else if (req.url.includes("_method=")) {
                  const match = req.url.match(/_method=([^&]+)/i);
                  if (match) {
                    req.originalMethod = req.method;
                    req.method = match[1].toUpperCase();
                    req.url = req.url
                      .replace(/_method=[^&]+&?/, "")
                      .replace(/\?$/, "");
                  }
                }

                resolve();
              } catch (error) {
                console.error("Body parse error:", error);
                req.body = {};
                resolve();
              }
            });

            req.on("error", (error) => {
              console.error("Request error:", error);
              req.body = {};
              resolve();
            });
          });
        }

        // Debug logging
        // console.log("\n=== Route Debugging ===");
        // console.log("Request URL:", req.url);
        // console.log("Content-Type:", req.headers["content-type"]);
        // console.log("Original Method:", req.originalMethod || req.method);
        // console.log("Final Method:", req.method);
        // console.log("Body:", req.body);
        // console.log("\nRegistered Routes:");
        // Object.entries(this.routes).forEach(([pattern, route]) => {
        //   console.log(
        //     `${pattern} => ${route.action} (Pattern: ${route.pattern})`
        //   );
        // });

        // Find matching route by checking patterns
        const matchRoute = () => {
          for (const [key, route] of Object.entries(this.routes)) {
            const [method, _] = key.split(":", 2);

            // console.log("\nTrying to match:", key);
            // console.log("Method:", method, "(Request:", req.method, ")");
            // console.log("Route Pattern:", route.pattern);

            // Skip if method doesn't match
            if (method !== req.method) {
              // console.log("→ Method mismatch, skipping");
              continue;
            }

            // Convert route pattern to regex
            const paramNames = [];
            const regexPattern = route.pattern
              .replace(/\//g, "\\/")
              .replace(/:(\w+)/g, (_, paramName) => {
                paramNames.push(paramName);
                return "([^/]+)";
              });

            const regex = new RegExp(`^${regexPattern}$`);
            // console.log("→ Regex Pattern:", regex);
            // console.log("→ Testing URL:", req.url);
            // console.log(
            //   "→ Has parameters:",
            //   paramNames.length > 0 ? paramNames : "none"
            // );

            const match = req.url.match(regex);
            // console.log("→ Match result:", match ? "YES" : "NO");

            if (match) {
              req.params = {};
              paramNames.forEach((name, index) => {
                req.params[name] = match[index + 1];
                // console.log(`→ Extracted param ${name}:`, match[index + 1]);
              });
              return route;
            }
          }
          return null;
        };

        const route = matchRoute();

        // console.log("\n=== Final Result ===");
        // console.log(
        //   "Found route:",
        //   route ? `${route.method} ${route.action}` : "NO MATCH"
        // );
        // console.log("Params:", req.params || "none");

        // Handle 404 Not Found
        if (!route) {
          const availableRoutes = Object.entries(this.routes)
            .map(([key, r]) => `${r.method} ${r.pattern}`)
            .sort()
            .join("\n");

          this.render(
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
            errorTemplates[404]
          );
          return;
        }

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
                this.render(res, viewPathOrData, data);
              } else {
                this.render(
                  res,
                  `${controllerName}/${actionName}`,
                  viewPathOrData
                );
              }
            };
            await controller[actionName](req, res, autoRender);
          } else {
            const availableActions = Object.getOwnPropertyNames(controller)
              .filter((prop) => typeof controller[prop] === "function")
              .join("\n");

            this.render(
              res,
              "errors/404",
              {
                title: "Not Found",
                error: {
                  status: 404,
                  message: "Action Not Found",
                  detail: `Action "${actionName}" not found in controller "${controllerName}"\n\nAvailable Actions:\n${availableActions}`,
                },
              },
              404,
              errorTemplates[404]
            );
          }
        } catch (err) {
          console.error("Server Error:", err);
          this.render(
            res,
            "errors/500",
            {
              title: "Error",
              error: {
                status: 500,
                message: "Internal Server Error",
                detail: err.message,
              },
            },
            500,
            errorTemplates[500]
          );
        }
      } catch (err) {
        console.error("Request Processing Error:", err);
        this.render(
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
          errorTemplates[500]
        );
      }
    };
  }
}

module.exports = WildayJS;
