class Router {
  constructor(app) {
    this.app = app;
  }

  get routes() {
    return {
      get: (path, action) => {
        this.app.routes[`GET:${path}`] = {
          method: "GET",
          action,
          pattern: path,
        };
      },
      post: (path, action) => {
        this.app.routes[`POST:${path}`] = {
          method: "POST",
          action,
          pattern: path,
        };
      },
      put: (path, action) => {
        this.app.routes[`PUT:${path}`] = {
          method: "PUT",
          action,
          pattern: path,
        };
      },
      patch: (path, action) => {
        this.app.routes[`PATCH:${path}`] = {
          method: "PATCH",
          action,
          pattern: path,
        };
      },
      delete: (path, action) => {
        this.app.routes[`DELETE:${path}`] = {
          method: "DELETE",
          action,
          pattern: path,
        };
      },
      resources: (name) => {
        const basePath = `/${name}`;
        this.app.routes[`GET:${basePath}`] = {
          method: "GET",
          action: `${name}#index`,
          pattern: basePath,
        };
        this.app.routes[`GET:${basePath}/new`] = {
          method: "GET",
          action: `${name}#new`,
          pattern: `${basePath}/new`,
        };
        this.app.routes[`POST:${basePath}`] = {
          method: "POST",
          action: `${name}#create`,
          pattern: basePath,
        };
        this.app.routes[`GET:${basePath}/:id`] = {
          method: "GET",
          action: `${name}#show`,
          pattern: `${basePath}/:id`,
        };
        this.app.routes[`GET:${basePath}/:id/edit`] = {
          method: "GET",
          action: `${name}#edit`,
          pattern: `${basePath}/:id/edit`,
        };
        this.app.routes[`PUT:${basePath}/:id`] = {
          method: "PUT",
          action: `${name}#update`,
          pattern: `${basePath}/:id`,
        };
        this.app.routes[`PATCH:${basePath}/:id`] = {
          method: "PATCH",
          action: `${name}#update`,
          pattern: `${basePath}/:id`,
        };
        this.app.routes[`DELETE:${basePath}/:id`] = {
          method: "DELETE",
          action: `${name}#destroy`,
          pattern: `${basePath}/:id`,
        };
      },
    };
  }
}

module.exports = Router;
