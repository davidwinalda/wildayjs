const ModelLoader = require("../modelLoader");
const Base = require("./base");
const BeforeAction = require("./action_callbacks/beforeAction");
const AfterAction = require("./action_callbacks/afterAction");
const AroundAction = require("./action_callbacks/aroundAction");
const SkipAction = require("./action_callbacks/skipAction");

class Controller extends Base {
  constructor() {
    super();

    // Create getters for each model
    const models = ModelLoader.models;
    Object.keys(models).forEach((modelName) => {
      const capitalizedName =
        modelName.charAt(0).toUpperCase() + modelName.slice(1);
      Object.defineProperty(this, capitalizedName, {
        get: function () {
          return ModelLoader.getModel(modelName);
        },
        configurable: true,
      });
    });

    // Initialize request tracking
    this._processedRequests = new Set();

    // Wrap all action methods with callback handling
    this._wrapActions();
  }

  // Action registration methods
  static before_action(methodName, options = {}) {
    BeforeAction.register(this, methodName, options);
  }

  static after_action(methodName, options = {}) {
    AfterAction.register(this, methodName, options);
  }

  static around_action(methodName, options = {}) {
    AroundAction.register(this, methodName, options);
  }

  // Skip action methods
  static skip_before_action(methodName, options = {}) {
    SkipAction.register(this, methodName, options, "before");
  }

  static skip_after_action(methodName, options = {}) {
    SkipAction.register(this, methodName, options, "after");
  }

  static skip_around_action(methodName, options = {}) {
    SkipAction.register(this, methodName, options, "around");
  }

  _wrapActions() {
    const proto = Object.getPrototypeOf(this);
    const methods = Object.getOwnPropertyNames(proto);

    methods.forEach((methodName) => {
      if (methodName === "constructor" || methodName.startsWith("_")) return;
      if (typeof this[methodName] !== "function") return;

      const originalMethod = proto[methodName];

      if (!originalMethod._isWrapped && !this._isCallback(methodName)) {
        const wrappedMethod = async (req, res, render) => {
          try {
            // Clear processed requests
            this._processedRequests.clear();

            // Check if it's an API request
            const isApi = this.isApiRequest(req);

            // Run before actions
            if (
              !(await BeforeAction.run(
                this,
                methodName,
                req,
                res,
                isApi ? this.renderJson.bind(this) : render
              ))
            ) {
              return;
            }

            // Create main action function
            const mainAction = async () => {
              try {
                // Call the original method with appropriate render function
                const result = await originalMethod.call(
                  this,
                  req,
                  res,
                  isApi ? this.renderJson.bind(this) : render
                );

                // Run after actions
                await AfterAction.run(
                  this,
                  methodName,
                  req,
                  res,
                  isApi ? this.renderJson.bind(this) : render
                );

                return result;
              } catch (error) {
                if (isApi) {
                  this.renderError(res, error.message, error.status || 500);
                } else {
                  throw error;
                }
              }
            };

            // Execute with around actions
            return await AroundAction.executeWithAroundActions(
              this,
              methodName,
              req,
              res,
              isApi ? this.renderJson.bind(this) : render,
              mainAction
            );
          } catch (error) {
            console.error(`Error in ${methodName}:`, error);

            if (isApi) {
              // Handle API errors with proper status codes
              let status = 500;
              if (error.name === "ValidationError") status = 422;
              if (error.name === "NotFoundError") status = 404;

              this.renderError(res, error.message, status);
            } else {
              // For web requests, throw the error to be handled by error middleware
              throw error;
            }
          }
        };

        // Mark the method as wrapped
        wrappedMethod._isWrapped = true;
        this[methodName] = wrappedMethod;
      }
    });
  }

  // Debug method to help trace action execution
  _debugActions(methodName) {
    const constructor = this.constructor;
    console.log("\nAction Configuration for:", methodName);
    console.log("Before Actions:", constructor._beforeActions);
    console.log("After Actions:", constructor._afterActions);
    console.log("Around Actions:", constructor._aroundActions);
    console.log("Skipped Before Actions:", constructor._skippedBeforeActions);
    console.log("Skipped After Actions:", constructor._skippedAfterActions);
    console.log("Skipped Around Actions:", constructor._skippedAroundActions);
  }
}

module.exports = Controller;
