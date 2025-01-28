// const ejs = require("ejs");
// const path = require("path");

// class ViewRenderer {
//   static render(res, viewPath, defaultData, status, defaultTemplate) {
//     const [controllerName, actionName] = viewPath.split("/");
//     const viewFilePath = path.join(
//       process.cwd(),
//       "app",
//       "views",
//       controllerName,
//       `${actionName}.ejs`
//     );
//     const layoutFilePath = path.join(
//       process.cwd(),
//       "app",
//       "views",
//       "layouts",
//       "main.ejs"
//     );

//     // Get helpers from the app instance
//     const helpers = defaultData.app ? defaultData.app.getHelpers() : {};

//     // Merge helpers with default data
//     const mergedData = {
//       ...helpers,
//       ...defaultData,
//     };

//     // Render the view first
//     return this.renderView(
//       res,
//       viewPath,
//       viewFilePath,
//       layoutFilePath,
//       mergedData,
//       status,
//       defaultTemplate
//     );
//   }

//   static renderView(
//     res,
//     viewPath,
//     viewFilePath,
//     layoutFilePath,
//     mergedData,
//     status,
//     defaultTemplate
//   ) {
//     ejs.renderFile(viewFilePath, mergedData, (viewErr, viewContent) => {
//       if (viewErr) {
//         // Try to render error page
//         return this.handleViewError(
//           res,
//           viewErr,
//           viewFilePath,
//           defaultTemplate,
//           mergedData
//         );
//       }

//       // Render the layout with the view content
//       return this.renderLayout(
//         res,
//         layoutFilePath,
//         viewContent,
//         mergedData,
//         status,
//         defaultTemplate
//       );
//     });
//   }

//   static handleViewError(
//     res,
//     viewErr,
//     viewFilePath,
//     defaultTemplate,
//     mergedData
//   ) {
//     const render = require("./index"); // Circular dependency, but loaded only when needed
//     return render(
//       res,
//       "errors/500",
//       {
//         ...mergedData,
//         error: {
//           status: 500,
//           message: "View Error",
//           detail: `View not found: ${viewFilePath}\n${viewErr.message}`,
//         },
//       },
//       500,
//       defaultTemplate
//     );
//   }

//   static renderLayout(
//     res,
//     layoutFilePath,
//     viewContent,
//     mergedData,
//     status,
//     defaultTemplate
//   ) {
//     // Pass all data including helpers to the layout
//     const layoutData = {
//       ...mergedData,
//       content: viewContent,
//     };

//     ejs.renderFile(layoutFilePath, layoutData, (layoutErr, layoutContent) => {
//       if (layoutErr) {
//         console.error("Layout Error:", layoutErr);
//         console.log("Available data in layout:", Object.keys(layoutData));
//         return this.handleLayoutError(
//           res,
//           layoutErr,
//           layoutFilePath,
//           defaultTemplate
//         );
//       }

//       // Send the fully rendered page
//       res.writeHead(status, { "Content-Type": "text/html" });
//       res.end(layoutContent);
//     });
//   }

//   static handleLayoutError(res, layoutErr, layoutFilePath, defaultTemplate) {
//     const render = require("./index"); // Circular dependency, but loaded only when needed
//     return render(
//       res,
//       "errors/500",
//       {
//         error: {
//           status: 500,
//           message: "Layout Error",
//           detail: `Layout not found: ${layoutFilePath}\n${layoutErr.message}`,
//         },
//       },
//       500,
//       defaultTemplate
//     );
//   }
// }

// module.exports = ViewRenderer;

const ejs = require("ejs");
const path = require("path");
const fs = require("fs").promises;

class ViewRenderer {
  static async render(res, viewPath, data = {}, status = 200, defaultTemplate) {
    try {
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

      // Get helpers from the app instance
      const helpers = data.app?.getHelpers() || {};

      // Merge data with helpers
      const viewData = {
        ...helpers,
        ...data,
        isDevelopment: process.env.NODE_ENV === "development",
      };

      // Render the view content
      const content = await this.renderContent(viewFilePath, viewData);

      // Render the layout with the view content
      const html = await this.renderLayout(layoutFilePath, {
        ...viewData,
        content,
      });

      // Send the response
      res.writeHead(status, { "Content-Type": "text/html" });
      res.end(html);
    } catch (err) {
      console.error("Render error:", err);
      this.handleRenderError(res, err, viewPath, data, defaultTemplate);
    }
  }

  static async renderContent(viewPath, data) {
    try {
      const template = await fs.readFile(viewPath, "utf8");
      return await ejs.render(template, data, { async: true });
    } catch (err) {
      console.error("View render error:", err);
      throw err;
    }
  }

  static async renderLayout(layoutPath, data) {
    try {
      const template = await fs.readFile(layoutPath, "utf8");
      return await ejs.render(template, data, { async: true });
    } catch (err) {
      console.error("Layout render error:", err);
      throw err;
    }
  }

  static handleRenderError(res, err, viewPath, data, defaultTemplate) {
    console.error(`Error rendering ${viewPath}:`, err);

    if (defaultTemplate) {
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end(defaultTemplate);
    } else {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal Server Error");
    }
  }
}

module.exports = ViewRenderer;
