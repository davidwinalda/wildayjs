const SkipAction = require("./skipAction");

class BeforeAction {
  static register(controller, methodName, options = {}) {
    if (!controller._beforeActions) controller._beforeActions = [];
    controller._beforeActions.push({
      method: methodName,
      only: options.only || [],
      except: options.except || [],
    });
  }

  static async run(instance, actionName, req, res, render) {
    const beforeActions = instance.constructor._beforeActions || [];

    for (const action of beforeActions) {
      if (SkipAction.isSkipped(instance, action.method, actionName, "before")) {
        continue;
      }

      const requestId = `${action.method}-${req.method}-${req.originalUrl}`;

      if (instance._processedRequests.has(requestId)) {
        continue;
      }

      if (instance._shouldApplyAction(action, actionName)) {
        instance._processedRequests.add(requestId);
        const result = await instance[action.method](req, res, render);

        if (result === false || res.headersSent) {
          return false;
        }
      }
    }
    return true;
  }
}

module.exports = BeforeAction;
