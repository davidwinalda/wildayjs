class Base {
  _shouldApplyAction(action, methodName) {
    if (action.only.length > 0) {
      return action.only.includes(methodName);
    }
    if (action.except.length > 0) {
      return !action.except.includes(methodName);
    }
    return true;
  }

  _isActionSkipped(actionMethod, methodName, skippedActions) {
    return skippedActions.some(
      (skipped) =>
        skipped.method === actionMethod &&
        this._shouldApplyAction(skipped, methodName)
    );
  }

  _isCallback(methodName) {
    const constructor = this.constructor;
    return [
      ...(constructor._beforeActions || []),
      ...(constructor._afterActions || []),
      ...(constructor._aroundActions || []),
    ].some((action) => action.method === methodName);
  }

  static only(...methods) {
    return { only: methods };
  }

  static except(...methods) {
    return { except: methods };
  }

  // API support methods
  isApiRequest(req) {
    // Use req.url instead of req.path
    return req.url.startsWith("/api/");
  }

  renderJson(res, data, status = 200) {
    res.setHeader("Content-Type", "application/json");
    res.statusCode = status;
    res.end(JSON.stringify(data));
  }

  renderError(res, message, status = 500) {
    this.renderJson(res, { error: message }, status);
  }
}

module.exports = Base;
