const querystring = require("querystring");

class BodyParser {
  async parse(req) {
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      return this.parseRequestBody(req);
    }
    req.body = {};
  }

  parseRequestBody(req) {
    return new Promise((resolve, reject) => {
      let rawBody = "";

      req.on("data", (chunk) => {
        rawBody += chunk.toString();
      });

      req.on("end", () => {
        console.log("Raw body received:", rawBody);
        console.log("Content-Type:", req.headers["content-type"]);

        try {
          this.parseAndAssignBody(req, rawBody);
          this.handleMethodOverride(req);
          resolve();
        } catch (error) {
          console.error("Body parse error:", error);
          req.body = {};
          resolve();
        }
      });

      req.on("error", (error) => {
        console.error("Request error:", error);
        req.body = {};
        resolve();
      });
    });
  }

  parseAndAssignBody(req, rawBody) {
    if (req.headers["content-type"]?.includes("application/json")) {
      const parsedBody = JSON.parse(rawBody);
      req.body = Object.assign({}, parsedBody);
      console.log("Parsed JSON body:", req.body);
    } else {
      const parsedBody = querystring.parse(rawBody);
      req.body = Object.assign({}, parsedBody);
      console.log("Parsed form body:", req.body);
    }
  }

  handleMethodOverride(req) {
    if (req.body._method) {
      req.originalMethod = req.method;
      req.method = req.body._method.toUpperCase();
    } else if (req.url.includes("_method=")) {
      const match = req.url.match(/_method=([^&]+)/i);
      if (match) {
        req.originalMethod = req.method;
        req.method = match[1].toUpperCase();
        req.url = req.url.replace(/_method=[^&]+&?/, "").replace(/\?$/, "");
      }
    }
  }
}

module.exports = BodyParser;
