const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { log, cli } = require("../utils/chalkUtils");
const packageJson = require("../../package.json");

const createDirectoryStructure = (appPath) => {
  const directories = [
    "app/controllers",
    "app/controllers/api",
    "app/models",
    "app/views/layouts",
    "app/views/home",
    "app/assets/stylesheets",
    "app/assets/stylesheets/components",
    "app/assets/stylesheets/layouts",
    "app/assets/stylesheets/pages",
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
const { WildayJS, Model, Controller, Validations } = require("wildayjs");

// Initialize application
const app = new WildayJS();

// Make base classes available globally
global.Model = Model;
global.Controller = Controller;
global.Validations = Validations;

console.log("Environment:", process.env.NODE_ENV || "development");

// Load routes
require("./routes")(app);

// Bind handler to app instance
app.handler = app.handler.bind(app);

module.exports = app;`;

  // Server configuration
  const serverJs = `
const app = require("./application");
const http = require("http");

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await app.start();

    const server = http.createServer(app.handler());

    server.listen(PORT, () => {
      console.log(\`Server running at http://localhost:\${PORT}\`);
      console.log("Asset Pipeline Status:");
      console.log("- CSS bundler active");
      console.log(
        "- Watching for changes:",
        process.env.NODE_ENV !== "production"
      );
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

// Start server with error handling
startServer().catch((err) => {
  console.error("Server startup error:", err);
  process.exit(1);
});`;

  // Routes configuration
  const routesJs = `
module.exports = (app) => {
  app.draw((route) => {
    // Basic routes
    route.get("/", "home#index");
    route.get("/docs", "home#docs");
    
    // API routes
    route.get("/api/users", "api/users#index");
    route.get("/api/users/:id", "api/users#show");
    route.post("/api/users", "api/users#create");
    route.put("/api/users/:id", "api/users#update");
    route.delete("/api/users/:id", "api/users#destroy");
  });
};`;

  // Home controller
  const homeControllerJs = `
class HomeController extends Controller {
  index(req, res, render) {
    render(res, "home/index", { 
      title: "Welcome to WildayJS",
      message: "Your app is running successfully!" 
    });
  }

  docs(req, res, render) {
    render(res, "home/docs", {
      title: "WildayJS Documentation",
      message: "Everything you need to know to get started"
    });
  }
}

module.exports = new HomeController();`;

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

module.exports = new ApiUsersController();`;

  // Layout view
  const layoutEjs = `
<!DOCTYPE html>
<html>
  <head>
    <title><%= typeof title !== 'undefined' ? title : '${appName}' %></title>
    <link rel="stylesheet" href="/css/application.css">
    <script src="/js/application.js" defer></script>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body>
    <%- content %>
  </body>
</html>`;

  // Index view
  const indexEjs = `
<div class="container">
  <header class="header">
    <nav class="nav-menu">
      <a href="/" class="btn btn-primary">Home</a>
      <a href="/docs" class="btn">Documentation</a>
    </nav>
  </header>

  <div class="hero">
    <div class="card">
      <h1 class="welcome-message"><%= title %></h1>
      <p class="subtitle"><%= message %></p>
      <p class="subtitle">Get started by visiting our documentation page</p>
      <a href="/docs" class="btn btn-primary">View Documentation</a>
    </div>
  </div>
</div>`;

  // Documentation view
  const docsEjs = `
<div class="container">
  <header class="header">
    <nav class="nav-menu">
      <a href="/" class="btn">Home</a>
      <a href="/docs" class="btn btn-primary">Documentation</a>
    </nav>
  </header>

  <div class="hero">
    <div class="card">
      <h1 class="welcome-message"><%= title %></h1>
      <p class="subtitle"><%= message %></p>
      <div class="docs-content">
        <h2>Getting Started</h2>
        <ul>
          <li>Edit app/views/home/index.ejs to customize this page</li>
          <li>Add new routes in config/routes.js</li>
          <li>Generate controllers:</li>
          <ul>
            <li><span class="command">$ wildayjs generate:controller posts</span> # Create empty controller and views</li>
            <li><span class="command">$ wildayjs generate:controller posts index show</span> # Regular controller with views</li>
            <li><span class="command">$ wildayjs generate:controller posts index show --api</span> # API controller</li>
            <li><span class="command">$ wildayjs generate:controller admin/posts index</span> # Namespaced controller</li>
          </ul>
          <li>Then try:</li>
          <ul>
            <li><span class="command">$ wildayjs db:init</span></li>
            <li><span class="command">$ wildayjs generate:model user name:string email:string</span></li>
            <li><span class="command">$ wildayjs db:migrate</span></li>
          </ul>
          <li>Creating a new user:</li>
          <ul>
            <li><span class="command">$ wildayjs console</span></li>
            <li><span class="command"> const user = new User({ name: "John Doe", email: "john@example.com" });</span></li>
            <li><span class="command"> user.save();</span></li>
            <li><span class="command"> user.all();</span></li>
          </ul>
          <li>If you need add new columns to a table:</li>
          <ul>
            <li><span class="command">$ wildayjs generate:migration AddUsernameToUsers username:string</span></li>
            <li><span class="command">$ wildayjs db:migrate</span></li>
          </ul>
          <li>Check the data through the API endpoints:</li>
          <ul>
            <li><span class="command">GET    /api/users</span></li>
            <li><span class="command">GET    /api/users/:id</span></li>
            <li><span class="command">POST   /api/users</span></li>
            <li><span class="command">PUT    /api/users/:id</span></li>
            <li><span class="command">DELETE /api/users/:id</span></li>
          </ul>
        </ul>
      </div>
    </div>
  </div>
</div>`;

  // Application CSS
  const applicationCss = `/*
 *= require_self
 *= require_directory ./components
 *= require layouts/header
 *= require_tree ./pages
*/

/* Base styles */
:root {
  --bg-color: #0a0a0a;
  --card-bg: #1a1a1a;
  --header-bg: #111111;
  --text-color: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.7);
  --primary-color: #3b82f6;
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

body {
  font-family: var(--font-family);
  margin: 0;
  padding: 0;
  background-color: var(--bg-color);
  color: var(--text-color);
  min-height: 100vh;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}`;

  // Component CSS files
  const buttonCss = `
.btn {
  text-decoration: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s;
  font-size: 0.95rem;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn:not(.btn-primary) {
  color: var(--text-secondary);
}

.btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}`;

  const cardCss = `
.card {
  background: var(--card-bg);
  padding: 3.5rem;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
              0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}`;

  // Layout CSS
  const headerCss = `
.header {
  background: var(--header-bg);
  padding: 1rem 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-menu {
  display: flex;
  gap: 1rem;
}`;

  // Page CSS
  const homeCss = `
.hero {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 200px);
  padding: 2rem;
}

.welcome-message {
  font-size: 3.5rem;
  font-weight: 700;
  color: var(--text-color);
  margin: 0 0 1.5rem 0;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.subtitle {
  font-size: 1.25rem;
  color: var(--text-secondary);
  margin: 0 0 2rem 0;
  font-weight: 400;
}

.docs-content {
  color: var(--text-color);
  margin-top: 2rem;
  text-align: left;
}

.docs-content h2 {
  margin-top: 0;
  font-size: 1.8rem;
  color: var(--text-color);
}

.docs-content ul {
  padding-left: 1.5rem;
  margin: 1rem 0;
}

.docs-content li {
  margin: 0.5rem 0;
  line-height: 1.6;
  color: var(--text-secondary);
}

.command {
  font-family: ui-monospace, "SF Mono", Menlo, Monaco, monospace;
  background: rgba(0, 0, 0, 0.3);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.9em;
  color: var(--text-color);
}

@media (max-width: 768px) {
  .hero {
    padding: 2rem 1rem;
  }
  
  .card {
    padding: 2rem;
  }
  
  .welcome-message {
    font-size: 2.5rem;
  }
}`;

  // Environment configuration
  const envDevelopment = `
PORT=3000
NODE_ENV=development
DATABASE_URL=db/development.sqlite3`;

  // Package.json
  const newAppPackageJson = {
    name: appName,
    version: "0.1.0",
    private: true,
    scripts: {
      start: "node config/server.js",
      dev: "nodemon config/server.js",
    },
    dependencies: {
      wildayjs: `^${packageJson.version}`,
      dotenv: "^16.0.0",
    },
    devDependencies: {
      nodemon: "^3.1.0",
      jest: "^29.0.0",
    },
    engines: {
      node: ">=20.0.0",
    },
  };

  // Write all files
  const files = {
    "config/application.js": applicationJs,
    "config/server.js": serverJs,
    "config/routes.js": routesJs,
    "app/controllers/homeController.js": homeControllerJs,
    "app/controllers/api/usersController.js": apiUsersControllerJs,
    "app/views/layouts/main.ejs": layoutEjs,
    "app/views/home/index.ejs": indexEjs,
    "app/views/home/docs.ejs": docsEjs,
    "app/assets/stylesheets/application.css": applicationCss,
    "app/assets/stylesheets/components/button.css": buttonCss,
    "app/assets/stylesheets/components/card.css": cardCss,
    "app/assets/stylesheets/layouts/header.css": headerCss,
    "app/assets/stylesheets/pages/home.css": homeCss,
    "public/js/application.js": "// Add your JavaScript here",
    ".env.development": envDevelopment,
    "package.json": JSON.stringify(newAppPackageJson, null, 2),
  };

  Object.entries(files).forEach(([filePath, content]) => {
    fs.writeFileSync(
      path.join(appPath, filePath),
      typeof content === "string" ? content.trim() : content
    );
  });
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
    execSync("git init", {
      cwd: appPath,
      stdio: ["ignore", "ignore", "ignore"],
    });

    // Add .gitignore
    fs.writeFileSync(
      path.join(appPath, ".gitignore"),
      "node_modules\n.DS_Store\ndb/*.sqlite3\n.env.*\n!.env.example"
    );

    log.success(`Successfully created ${appName}!

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
