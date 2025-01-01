const ejs = require("ejs");
const path = require("path");
const fs = require("fs");

const render = (
  res,
  viewPath,
  data = {},
  status = 200,
  defaultTemplate = null
) => {
  // For error templates, use direct path
  if (viewPath.startsWith("errors/")) {
    try {
      // Try library's default template first (if provided)
      if (defaultTemplate && fs.existsSync(defaultTemplate)) {
        return ejs.renderFile(defaultTemplate, data, (err, content) => {
          if (err) throw err;
          res.writeHead(status, { "Content-Type": "text/html" });
          res.end(content);
        });
      }

      // Try app's error template as fallback
      const appErrorPath = path.join(
        process.cwd(),
        "app",
        "views",
        `${viewPath}.ejs`
      );

      if (fs.existsSync(appErrorPath)) {
        return ejs.renderFile(appErrorPath, data, (err, content) => {
          if (err) throw err;
          res.writeHead(status, { "Content-Type": "text/html" });
          res.end(content);
        });
      }

      // If no templates available, use fallback HTML
      res.writeHead(status, { "Content-Type": "text/html" });
      return res.end(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Error - ${data.error.status}</title>
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                background: #f8f9fa;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
              }
              .error-container {
                background: white;
                padding: 2rem;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                max-width: 600px;
                width: 90%;
                text-align: center;
              }
              .error-status { 
                color: #dc3545;
                font-size: 3rem;
                margin: 0;
              }
              .error-message {
                color: #343a40;
                margin: 1rem 0;
              }
              .error-detail {
                color: #6c757d;
                font-family: monospace;
                background: #f8f9fa;
                padding: 1rem;
                border-radius: 4px;
                white-space: pre-wrap;
                font-size: 0.9rem;
                margin-top: 1rem;
                text-align: left;
              }
            </style>
          </head>
          <body>
            <div class="error-container">
              <h1 class="error-status">${data.error.status}</h1>
              <p class="error-message">${data.error.message}</p>
              ${
                data.error.detail
                  ? `<pre class="error-detail">${data.error.detail}</pre>`
                  : ""
              }
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error rendering template:", error);
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Error - 500</title>
            <style>
              body { font-family: system-ui; padding: 2rem; text-align: center; }
              .error-status { color: #dc3545; font-size: 2rem; }
            </style>
          </head>
          <body>
            <h1 class="error-status">500</h1>
            <p>Internal Server Error</p>
            <p><small>${error.message}</small></p>
          </body>
        </html>
      `);
    }
    return;
  }

  // Regular views with layout
  const [controllerName, actionName] = viewPath.split("/");
  const viewFilePath = path.join(
    process.cwd(),
    "app",
    "views",
    controllerName,
    `${actionName}.ejs`
  );
  const layoutFilePath = path.join(
    process.cwd(),
    "app",
    "views",
    "layouts",
    "main.ejs"
  );

  // Render the view first
  ejs.renderFile(viewFilePath, data, (viewErr, viewContent) => {
    if (viewErr) {
      // Try to render error page
      render(
        res,
        "errors/500",
        {
          title: "Error",
          error: {
            status: 500,
            message: "View Error",
            detail: `View not found: ${viewFilePath}\n${viewErr.message}`,
          },
        },
        500,
        defaultTemplate
      );
      return;
    }

    // Render the layout with the view content
    ejs.renderFile(
      layoutFilePath,
      { ...data, content: viewContent },
      (layoutErr, layoutContent) => {
        if (layoutErr) {
          // Try to render error page
          render(
            res,
            "errors/500",
            {
              title: "Error",
              error: {
                status: 500,
                message: "Layout Error",
                detail: `Layout not found: ${layoutFilePath}\n${layoutErr.message}`,
              },
            },
            500,
            defaultTemplate
          );
          return;
        }

        // Send the fully rendered page
        res.writeHead(status, { "Content-Type": "text/html" });
        res.end(layoutContent);
      }
    );
  });
};

module.exports = render;
