const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { log } = require("../utils/chalkUtils");

const createDirectoryStructure = (appPath) => {
  const directories = [
    "app/controllers",
    "app/controllers/api",
    "app/models",
    "app/views/layouts",
    "app/views/home",
    "config",
    "db",
    "db/migrate",
    "public/css",
    "public/js",
  ];

  directories.forEach((dir) => {
    fs.mkdirSync(path.join(appPath, dir), { recursive: true });
  });
};

const generateFiles = (appPath, appName) => {
  // Application configuration
  const applicationJs = `
require("dotenv").config();
const { WildayJS, Model, Controller } = require("wildayjs");

// Initialize application
const app = new WildayJS();

// Make base classes available globally
global.Model = Model;
global.Controller = Controller;

// Load models
const ModelLoader = require("wildayjs").ModelLoader;
const models = ModelLoader.loadModels();

console.log("Environment:", process.env.NODE_ENV || "development");
console.log("Loaded models:", Object.keys(models));

// Load routes
require("./routes")(app);

module.exports = app;
`;

  // Server configuration
  const serverJs = `
const app = require("./application");
const http = require("http");

const PORT = process.env.PORT || 3000;
const server = http.createServer(app.handler());

server.listen(PORT, () => {
  console.log(\`Server running at http://localhost:\${PORT}\`);
});
`;

  // Routes configuration
  const routesJs = `
module.exports = (app) => {
  app.draw((route) => {
    // Basic routes
    route.get("/", "home#index");
    
    // API routes
    route.get("/api/users", "api/users#index");
    route.get("/api/users/:id", "api/users#show");
    route.post("/api/users", "api/users#create");
    route.put("/api/users/:id", "api/users#update");
    route.delete("/api/users/:id", "api/users#destroy");
  });
};
`;

  // Home controller
  const homeControllerJs = `
class HomeController extends Controller {
  index(req, res, render) {
    render(res, "home/index", { 
      title: "Welcome to WildayJS",
      message: "Your app is running successfully!" 
    });
  }
}

module.exports = new HomeController();
`;

  // API Users controller
  const apiUsersControllerJs = `
class ApiUsersController extends Controller {
  index(req, res) {
    try {
      const users = this.User.all();
      this.renderJson(res, { users });
    } catch (error) {
      this.renderError(res, error.message);
    }
  }

  show(req, res) {
    try {
      const user = this.User.find(req.params.id);
      if (user) {
        this.renderJson(res, { user });
      } else {
        this.renderError(res, "User not found", 404);
      }
    } catch (error) {
      this.renderError(res, error.message);
    }
  }

  create(req, res) {
    try {
      const user = new this.User(req.body);
      if (user.save()) {
        this.renderJson(res, { user }, 201);
      } else {
        this.renderError(res, user.errors, 422);
      }
    } catch (error) {
      this.renderError(res, error.message);
    }
  }

  update(req, res) {
    try {
      const user = this.User.find(req.params.id);
      if (!user) {
        return this.renderError(res, "User not found", 404);
      }

      if (user.update(req.body)) {
        this.renderJson(res, { user });
      } else {
        this.renderError(res, user.errors, 422);
      }
    } catch (error) {
      this.renderError(res, error.message);
    }
  }

  destroy(req, res) {
    try {
      const user = this.User.find(req.params.id);
      if (!user) {
        return this.renderError(res, "User not found", 404);
      }

      if (user.destroy()) {
        this.renderJson(res, null, 204);
      } else {
        this.renderError(res, "Failed to delete user", 422);
      }
    } catch (error) {
      this.renderError(res, error.message);
    }
  }
}

module.exports = new ApiUsersController();
`;

  // Layout view
  const layoutEjs = `
<!DOCTYPE html>
<html>
  <head>
    <title><%= title %></title>
    <link rel="stylesheet" href="/css/application.css">
  </head>
  <body>
    <%- content %>
    <script src="/js/application.js"></script>
  </body>
</html>
`;

  // Home view
  const indexEjs = `
<style>
  @import url("https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;700&display=swap");

  body {
    font-family: "Inter", sans-serif;
    margin: 0;
    padding: 0;
    line-height: 1.6;
    background-color: #0a0a0a;
    color: rgba(255, 255, 255, 0.85);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .container {
    max-width: 800px;
    margin: 0 20px;
    width: 100%;
  }

  h1 {
    color: #bfa76a;
    font-size: 4em;
    margin-bottom: 0.3em;
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1.1;
  }

  p {
    font-size: 1.2em;
    font-weight: 300;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 2em;
  }

  h2 {
    color: #d4af37;
    font-weight: 500;
    font-size: 2em;
    margin: 0 0 32px 0;
    letter-spacing: -0.02em;
  }

  .getting-started {
    background: rgba(30, 30, 30, 0.6);
    padding: 40px;
    border-radius: 16px;
    margin-top: 20px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
      0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }

  ul {
    padding-left: 24px;
    margin: 0;
  }

  li {
    padding: 16px 0;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 300;
    line-height: 1.5;
  }

  li:first-child {
    padding-top: 0;
  }

  li:last-child {
    padding-bottom: 0;
  }

  .command {
    font-family: ui-monospace, "SF Mono", Menlo, Monaco, monospace;
    color: rgba(255, 255, 255, 0.9);
    background: rgba(0, 0, 0, 0.3);
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 0.9em;
    margin-left: 8px;
  }

  @media (max-width: 768px) {
    body {
      align-items: flex-start;
      padding: 20px 0;
    }

    .container {
      margin: 0 20px;
    }

    h1 {
      font-size: 2.8em;
    }

    h2 {
      font-size: 1.6em;
      margin-bottom: 24px;
    }

    .getting-started {
      padding: 32px;
      margin-top: 32px;
    }

    li {
      padding: 12px 0;
    }
  }
</style>

<div class="container">
  <h1><%= title %></h1>
  <p><%= message %></p>

  <div class="getting-started">
    <h2>Getting Started</h2>
    <ul>
      <li>Edit app/views/home/index.ejs to customize this page</li>
      <li>Add new routes in config/routes.js</li>
      <li>
        Create models using:
        <span class="command">wildayjs generate:model ModelName</span>
      </li>
      <li>
        Create controllers using:
        <span class="command">wildayjs generate:controller ControllerName</span>
      </li>
    </ul>
  </div>
</div>
`;

  // Basic CSS
  const applicationCss = `
body {
  font-family: system-ui, -apple-system, sans-serif;
  margin: 0;
  padding: 20px;
  line-height: 1.6;
}

.container {
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  color: #2c3e50;
}

.getting-started {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-top: 20px;
}
`;

  // Environment configuration
  const envDevelopment = `
PORT=3000
NODE_ENV=development
DATABASE_URL=db/development.sqlite3
`;

  // Package.json
  const packageJson = {
    name: appName,
    version: "0.1.0",
    private: true,
    scripts: {
      start: "node config/server.js",
      console: "wildayjs console",
      "db:migrate": "wildayjs db:migrate",
      "db:rollback": "wildayjs db:rollback",
      "generate:migration": "wildayjs generate:migration",
      "generate:model": "wildayjs generate:model",
    },
    dependencies: {
      "better-sqlite3": "^11.7.0",
      chalk: "^4.1.2",
      ejs: "^3.1.10",
      dotenv: "^16.0.0",
    },
    engines: {
      node: ">=20.0.0",
    },
  };

  // Write all files
  fs.writeFileSync(
    path.join(appPath, "config", "application.js"),
    applicationJs.trim()
  );
  fs.writeFileSync(path.join(appPath, "config", "server.js"), serverJs.trim());
  fs.writeFileSync(path.join(appPath, "config", "routes.js"), routesJs.trim());
  fs.writeFileSync(
    path.join(appPath, "app/controllers", "homeController.js"),
    homeControllerJs.trim()
  );
  fs.writeFileSync(
    path.join(appPath, "app/controllers/api", "usersController.js"),
    apiUsersControllerJs.trim()
  );
  fs.writeFileSync(
    path.join(appPath, "app/views/layouts", "main.ejs"),
    layoutEjs.trim()
  );
  fs.writeFileSync(
    path.join(appPath, "app/views/home", "index.ejs"),
    indexEjs.trim()
  );
  fs.writeFileSync(
    path.join(appPath, "public/css", "application.css"),
    applicationCss.trim()
  );
  fs.writeFileSync(
    path.join(appPath, "public/js", "application.js"),
    "// Add your JavaScript here"
  );
  fs.writeFileSync(
    path.join(appPath, ".env.development"),
    envDevelopment.trim()
  );
  fs.writeFileSync(
    path.join(appPath, "package.json"),
    JSON.stringify(packageJson, null, 2)
  );
};

const newApp = (appName) => {
  const appPath = path.join(process.cwd(), appName);

  try {
    // Create app directory
    fs.mkdirSync(appPath);

    // Create directory structure
    createDirectoryStructure(appPath);

    // Generate template files
    generateFiles(appPath, appName);

    // Initialize git repository
    execSync("git init", { cwd: appPath });

    // Add .gitignore
    fs.writeFileSync(
      path.join(appPath, ".gitignore"),
      "node_modules\n.DS_Store\ndb/*.sqlite3\n.env.*\n!.env.example"
    );

    log.success(`
Successfully created ${appName}!

Next steps:
  $ cd ${appName}
  $ npm install
  $ npm start

Then open http://localhost:3000 in your browser.

Then try:
  $ wildayjs db:init
  $ wildayjs generate:model user name:string email:string
  $ wildayjs db:migrate

Creating a new user:
  $ wildayjs console
  > const user = new User({ name: "John Doe", email: "john@example.com" });
  > user.save();
  > user.all();

If you need add new columns to a table:
  $ wildayjs generate:migration AddUsernameToUsers username:string
  $ wildayjs db:migrate

Check the data through the API endpoints:
  GET    /api/users
  GET    /api/users/:id
  POST   /api/users
  PUT    /api/users/:id
  DELETE /api/users/:id
    `);
  } catch (error) {
    log.error(`Failed to create application: ${error.message}`);
    process.exit(1);
  }
};

module.exports = newApp;
