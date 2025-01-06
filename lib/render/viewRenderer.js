const ejs = require("ejs");
const path = require("path");

class ViewRenderer {
  static render(res, viewPath, defaultData, status, defaultTemplate) {
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
    return this.renderView(
      res,
      viewPath,
      viewFilePath,
      layoutFilePath,
      defaultData,
      status,
      defaultTemplate
    );
  }

  static renderView(
    res,
    viewPath,
    viewFilePath,
    layoutFilePath,
    defaultData,
    status,
    defaultTemplate
  ) {
    ejs.renderFile(viewFilePath, defaultData, (viewErr, viewContent) => {
      if (viewErr) {
        // Try to render error page
        return this.handleViewError(
          res,
          viewErr,
          viewFilePath,
          defaultTemplate,
          defaultData
        );
      }

      // Render the layout with the view content
      return this.renderLayout(
        res,
        layoutFilePath,
        viewContent,
        defaultData,
        status,
        defaultTemplate
      );
    });
  }

  static handleViewError(
    res,
    viewErr,
    viewFilePath,
    defaultTemplate,
    defaultData
  ) {
    const render = require("./index"); // Circular dependency, but loaded only when needed
    return render(
      res,
      "errors/500",
      {
        error: {
          status: 500,
          message: "View Error",
          detail: `View not found: ${viewFilePath}\n${viewErr.message}`,
        },
      },
      500,
      defaultTemplate
    );
  }

  static renderLayout(
    res,
    layoutFilePath,
    viewContent,
    defaultData,
    status,
    defaultTemplate
  ) {
    ejs.renderFile(
      layoutFilePath,
      { ...defaultData, content: viewContent },
      (layoutErr, layoutContent) => {
        if (layoutErr) {
          return this.handleLayoutError(
            res,
            layoutErr,
            layoutFilePath,
            defaultTemplate
          );
        }

        // Send the fully rendered page
        res.writeHead(status, { "Content-Type": "text/html" });
        res.end(layoutContent);
      }
    );
  }

  static handleLayoutError(res, layoutErr, layoutFilePath, defaultTemplate) {
    const render = require("./index"); // Circular dependency, but loaded only when needed
    return render(
      res,
      "errors/500",
      {
        error: {
          status: 500,
          message: "Layout Error",
          detail: `Layout not found: ${layoutFilePath}\n${layoutErr.message}`,
        },
      },
      500,
      defaultTemplate
    );
  }
}

module.exports = ViewRenderer;
