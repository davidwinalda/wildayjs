// const http = require("http");
// const StaticFileHandler = require("./staticFileHandler");
// const path = require("path");

// class WildayServer {
//   constructor(app, options = {}) {
//     this.app = app;
//     this.port = options.port || process.env.PORT || 3000;
//     this.isDev = process.env.NODE_ENV === "development";
//     this.vite = null;
//   }

//   async initialize() {
//     if (this.isDev) {
//       const { createServer } = await import("vite");
//       this.vite = await createServer({
//         configFile: path.join(process.cwd(), "vite.config.js"),
//         server: {
//           middlewareMode: true,
//           hmr: true,
//         },
//       });
//     }
//     await this.app.start();
//   }

//   createRequestHandler() {
//     return async (req, res) => {
//       try {
//         // In development, let Vite handle all asset requests
//         if (
//           this.isDev &&
//           (req.url.startsWith("/@vite/") ||
//             req.url.startsWith("/assets/") ||
//             req.url.includes("hmr"))
//         ) {
//           console.log("🔄 Vite handling request:", req.url);
//           return this.vite.middlewares(req, res);
//         }

//         // Handle application routes
//         return this.app.handler()(req, res);
//       } catch (e) {
//         console.error("Request handler error:", e);
//         res.statusCode = 500;
//         res.end("Internal Server Error");
//       }
//     };
//   }

//   setupWebSocket(server) {
//     if (this.isDev && this.vite?.ws) {
//       server.on("upgrade", (req, socket, head) => {
//         if (req.url.startsWith("/@vite/") || req.url.includes("hmr")) {
//           console.log("🔌 WebSocket upgrade:", req.url);
//           this.vite.ws.handleUpgrade(req, socket, head);
//         }
//       });
//     }
//   }

//   async start() {
//     try {
//       await this.initialize();
//       const server = http.createServer(this.createRequestHandler());
//       this.setupWebSocket(server);
//       server.listen(this.port, () => {
//         console.log(`\n🚀 Server running at http://localhost:${this.port}`);
//         console.log("\n📦 Asset Pipeline Status:");
//         console.log(`- Mode: ${this.isDev ? "development" : "production"}`);
//         console.log(`- Vite: ${this.isDev ? "active" : "disabled"}`);
//       });
//     } catch (err) {
//       console.error("Failed to start server:", err);
//       process.exit(1);
//     }
//   }
// }

// module.exports = WildayServer;

const http = require("http");
const path = require("path");
const WebpackDevServer = require("./asset-pipeline/webpackDevMiddleware");
const StaticFileHandler = require("./staticFileHandler");

class WildayServer {
  constructor(app, options = {}) {
    this.app = app;
    this.port = options.port || process.env.PORT || 3000;
    this.isDev = process.env.NODE_ENV === "development";
    this.webpackServer = null;
    this.staticHandler = new StaticFileHandler();
  }

  async initialize() {
    if (this.isDev) {
      this.webpackServer = new WebpackDevServer();
      await this.webpackServer.initialize();
    }
    await this.app.start();
  }

  createRequestHandler() {
    return async (req, res) => {
      try {
        if (this.isDev) {
          // Handle webpack assets in development
          const handled = await this.webpackServer.handleRequest(
            req,
            res,
            () => {}
          );
          if (handled) return;
        } else {
          // Handle static assets in production using StaticFileHandler
          const handled = await this.staticHandler.handle(req, res);
          if (handled) return;
        }

        // Handle application routes
        return this.app.handler()(req, res);
      } catch (e) {
        console.error("Request handler error:", e);
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    };
  }

  async start() {
    try {
      await this.initialize();
      const server = http.createServer(this.createRequestHandler());

      server.listen(this.port, () => {
        console.log(`\n🚀 Server running at http://localhost:${this.port}`);
        console.log("\n📦 Asset Pipeline Status:");
        console.log(`- Mode: ${this.isDev ? "development" : "production"}`);
        console.log(`- Webpack: ${this.isDev ? "active" : "disabled"}`);
      });
    } catch (err) {
      console.error("Failed to start server:", err);
      process.exit(1);
    }
  }
}

module.exports = WildayServer;
