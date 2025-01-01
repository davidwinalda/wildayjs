class SkipAction {
  static register(controller, methodName, options = {}, type = "before") {
    // Initialize skip containers if they don't exist
    if (!controller._skippedBeforeActions)
      controller._skippedBeforeActions = [];
    if (!controller._skippedAfterActions) controller._skippedAfterActions = [];
    if (!controller._skippedAroundActions)
      controller._skippedAroundActions = [];

    const skipData = {
      method: methodName,
      only: options.only || [],
      except: options.except || [],
    };

    // Add skip to appropriate container based on type
    switch (type) {
      case "before":
        controller._skippedBeforeActions.push(skipData);
        break;
      case "after":
        controller._skippedAfterActions.push(skipData);
        break;
      case "around":
        controller._skippedAroundActions.push(skipData);
        break;
      default:
        throw new Error(`Invalid skip action type: ${type}`);
    }
  }

  static isSkipped(instance, methodName, actionName, type = "before") {
    const constructor = instance.constructor;
    let skippedActions;

    // Get appropriate skip container based on type
    switch (type) {
      case "before":
        skippedActions = constructor._skippedBeforeActions || [];
        break;
      case "after":
        skippedActions = constructor._skippedAfterActions || [];
        break;
      case "around":
        skippedActions = constructor._skippedAroundActions || [];
        break;
      default:
        throw new Error(`Invalid skip action type: ${type}`);
    }

    return skippedActions.some((skip) => {
      if (skip.method !== methodName) return false;

      if (skip.only.length > 0) {
        return skip.only.includes(actionName);
      }
      if (skip.except.length > 0) {
        return !skip.except.includes(actionName);
      }
      return true;
    });
  }
}

module.exports = SkipAction;
