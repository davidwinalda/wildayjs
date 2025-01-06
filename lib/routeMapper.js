class RouteMapper {
  constructor(routes) {
    this.routes = routes;
  }

  match(req) {
    for (const [key, route] of Object.entries(this.routes)) {
      const [method, _] = key.split(":", 2);

      if (method !== req.method) {
        continue;
      }

      const paramNames = [];
      const regexPattern = route.pattern
        .replace(/\//g, "\\/")
        .replace(/:(\w+)/g, (_, paramName) => {
          paramNames.push(paramName);
          return "([^/]+)";
        });

      const regex = new RegExp(`^${regexPattern}$`);
      const match = req.url.match(regex);

      if (match) {
        req.params = {};
        paramNames.forEach((name, index) => {
          req.params[name] = match[index + 1];
        });
        return route;
      }
    }
    return null;
  }
}

module.exports = RouteMapper;
