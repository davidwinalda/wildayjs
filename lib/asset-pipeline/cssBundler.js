const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");
const { log, cli } = require("../utils/chalkUtils");

class CssBundler {
  constructor(appPath) {
    this.appPath = appPath;
    this.sourceDir = path.join(appPath, "app", "assets", "stylesheets");
    this.outputDir = path.join(appPath, "public", "css");
    this.isProduction = process.env.NODE_ENV === "production";
  }

  minifyCSS(css) {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\s+/g, " ")
      .replace(/\s*([\{\}\:\;\,])\s*/g, "$1")
      .replace(/;\}/g, "}")
      .replace(/\n/g, "")
      .trim();
  }

  async findAllCssFiles(dirPath) {
    const results = [];
    const files = await fsPromises.readdir(dirPath);

    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const stat = await fsPromises.stat(fullPath);

      if (stat.isDirectory()) {
        // Recursively search directories
        const subFiles = await this.findAllCssFiles(fullPath);
        results.push(...subFiles);
      } else if (file.endsWith(".css") && file !== "application.css") {
        results.push(fullPath);
      }
    }

    return results;
  }

  async findCssFilesInDirectory(dirPath) {
    try {
      const files = await fsPromises.readdir(dirPath);
      const cssFiles = [];

      for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stat = await fsPromises.stat(fullPath);

        if (
          stat.isFile() &&
          file.endsWith(".css") &&
          file !== "application.css"
        ) {
          cssFiles.push(fullPath);
        }
      }

      return cssFiles;
    } catch (err) {
      log.warn(`Could not read directory ${dirPath}`);
      return [];
    }
  }

  async bundle() {
    try {
      // Ensure output directory exists
      await fsPromises.mkdir(this.outputDir, { recursive: true });

      // Read application.css first
      const mainFile = path.join(this.sourceDir, "application.css");
      let mainContent = "";

      try {
        mainContent = await fsPromises.readFile(mainFile, "utf8");
      } catch (err) {
        log.warn("No application.css found, creating empty one");
        mainContent = "/*\n *= require_self\n *= require_tree .\n */\n";
        await fsPromises.writeFile(mainFile, mainContent);
      }

      // Bundle content
      let bundledContent = "";

      // Add content before requires
      const [beforeRequires] = mainContent.split("/*");
      if (beforeRequires) {
        bundledContent += beforeRequires;
      }

      // Extract directives section
      const directivesMatch = mainContent.match(/\/\*([\s\S]*?)\*\//);
      if (!directivesMatch) {
        log.warn("No directives found in application.css");
        return;
      }

      const directivesSection = directivesMatch[1];
      const directives = directivesSection
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("*="))
        .map((line) => {
          const parts = line.substring(2).trim().split(/\s+/);
          return {
            type: parts[0],
            target: parts.slice(1).join(" "),
          };
        });

      for (const directive of directives) {
        if (directive.type === "require_self") {
          const [_, ...parts] = mainContent.split("*/");
          const content = parts.join("*/").trim();
          if (content) {
            bundledContent += `\n${content}\n`;
          }
          continue;
        }

        if (directive.type === "require_tree") {
          const searchDir =
            directive.target === "."
              ? this.sourceDir
              : path.join(this.sourceDir, directive.target);
          const files = await this.findAllCssFiles(searchDir);

          for (const file of files) {
            const content = await fsPromises.readFile(file, "utf8");
            const relativePath = path.relative(this.sourceDir, file);
            bundledContent += `\n/* ${relativePath} */\n${content}`;
          }
          continue;
        }

        if (directive.type === "require_directory") {
          const dirPath = directive.target.startsWith("./")
            ? path.join(this.sourceDir, directive.target.slice(2))
            : path.join(this.sourceDir, directive.target);

          const files = await this.findCssFilesInDirectory(dirPath);

          for (const file of files) {
            const content = await fsPromises.readFile(file, "utf8");
            const relativePath = path.relative(this.sourceDir, file);
            bundledContent += `\n/* ${relativePath} */\n${content}`;
          }
          continue;
        }

        if (directive.type === "require") {
          const filePath = path.join(this.sourceDir, `${directive.target}.css`);
          try {
            const content = await fsPromises.readFile(filePath, "utf8");
            bundledContent += `\n/* ${directive.target}.css */\n${content}`;
          } catch (err) {
            log.warn(`Could not find ${directive.target}.css`);
          }
        }
      }

      // Write bundled file
      const outputPath = path.join(this.outputDir, "application.css");
      await fsPromises.writeFile(outputPath, bundledContent);

      if (!this.isWatching) {
        log.success(
          `CSS bundled successfully! (${
            this.isProduction ? "minified" : "development"
          } mode)`
        );
      }
    } catch (err) {
      log.error("CSS bundling failed");
      throw err;
    }
  }

  async watch() {
    this.isWatching = true;
    log.info("Starting CSS watcher...");

    try {
      // Verify directory exists
      await fsPromises.access(this.sourceDir);

      // Set up file watcher
      let debounceTimer;

      fs.watch(
        this.sourceDir,
        { recursive: true },
        async (eventType, filename) => {
          if (filename && filename.endsWith(".css")) {
            // Debounce the rebuild
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
              try {
                await this.bundle();
                log.success("CSS rebuilt successfully!");
              } catch (err) {
                log.error("Failed to rebuild CSS");
              }
            }, 100);
          }
        }
      );

      // Initial build
      await this.bundle();
      log.success("CSS watcher ready!");
    } catch (err) {
      log.error("Watch setup failed");
      throw err;
    }
  }
}

module.exports = CssBundler;
