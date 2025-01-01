const SkipAction = require("./skipAction");
const { errorTemplates } = require("../../config/paths");
const fs = require("fs");
const path = require("path");

class AroundAction {
  static register(controller, methodName, options = {}) {
    if (!controller._aroundActions) controller._aroundActions = [];
    controller._aroundActions.push({
      method: methodName,
      only: options.only || [],
      except: options.except || [],
    });
  }

  static get defaultErrorTemplate() {
    const templatePath = errorTemplates[500];

    // Debug template path
    console.log("Template path:", templatePath);
    console.log("Template exists:", fs.existsSync(templatePath));

    // If template doesn't exist, try to find it relative to __dirname
    if (!fs.existsSync(templatePath)) {
      const altPath = path.resolve(__dirname, "../../views/errors/500.ejs");
      console.log("Trying alternative path:", altPath);
      console.log("Alternative exists:", fs.existsSync(altPath));
      return altPath;
    }

    return templatePath;
  }

  static async executeWithAroundActions(
    instance,
    actionName,
    req,
    res,
    render,
    mainAction
  ) {
    const aroundActions = instance.constructor._aroundActions || [];
    const applicableActions = aroundActions.filter(
      (action) =>
        !SkipAction.isSkipped(instance, action.method, actionName, "around") &&
        instance._shouldApplyAction(action, actionName)
    );

    if (applicableActions.length === 0) {
      return mainAction();
    }

    let currentAction = mainAction;

    for (const action of applicableActions.reverse()) {
      const previousAction = currentAction;
      currentAction = async () => {
        return new Promise((resolve) => {
          let nextCalled = false;

          const next = async () => {
            nextCalled = true;
            const result = await previousAction();
            resolve(result);
          };

          try {
            // Execute around action
            instance[action.method](req, res, render, next);

            // Check immediately if next() wasn't called
            if (!nextCalled) {
              const errorMessage = `WARNING: next() was not called in around_action "${action.method}". This will break the action chain!
              
Example of correct usage:
  ${action.method}(req, res, render, next) {
    // Before main action
    next();  // <-- You must call this!
    // After main action
  }`;

              console.error("\x1b[31m%s\x1b[0m", errorMessage);

              // Get template path and verify it exists
              const templatePath = this.defaultErrorTemplate;
              console.log("Using template:", templatePath);
              console.log("Template exists:", fs.existsSync(templatePath));

              // Render error page with helpful message
              render(
                res,
                "errors/500",
                {
                  title: "Error",
                  error: {
                    status: 500,
                    message: "Around Action Error",
                    detail: errorMessage,
                  },
                },
                500,
                templatePath
              );

              resolve();
            }
          } catch (error) {
            console.error(`Error in around_action "${action.method}":`, error);

            // Get template path for error case
            const templatePath = this.defaultErrorTemplate;
            console.log("Using template (error case):", templatePath);

            render(
              res,
              "errors/500",
              {
                title: "Error",
                error: {
                  status: 500,
                  message: "Internal Server Error",
                  detail: error.message,
                },
              },
              500,
              templatePath
            );

            resolve();
          }
        });
      };
    }

    return currentAction();
  }

  // Keep these for compatibility
  static start() {
    return [];
  }
  static async end() {}
}

module.exports = AroundAction;
