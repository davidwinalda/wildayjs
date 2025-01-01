const SkipAction = require("./skipAction");

class AfterAction {
  static register(controller, methodName, options = {}) {
    if (!controller._afterActions) controller._afterActions = [];
    controller._afterActions.push({
      method: methodName,
      only: options.only || [],
      except: options.except || [],
    });
  }

  static async run(instance, actionName, req, res, render) {
    const afterActions = instance.constructor._afterActions || [];

    for (const action of afterActions) {
      if (SkipAction.isSkipped(instance, action.method, actionName, "after")) {
        continue;
      }

      if (instance._shouldApplyAction(action, actionName)) {
        await instance[action.method](req, res, render);
      }
    }
  }
}

module.exports = AfterAction;
