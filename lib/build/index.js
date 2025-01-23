const path = require("path");
const fs = require("fs").promises;
const { build } = require("vite");

async function buildAssets() {
  console.log("\n🏗️  Building assets...");

  try {
    // Ensure public/assets directory exists
    const publicDir = path.join(process.cwd(), "public/assets");
    await fs.mkdir(publicDir, { recursive: true });

    // Run Vite build
    await build({
      configFile: path.join(process.cwd(), "vite.config.js"),
      mode: "production",
    });

    // Verify manifest
    const manifestPath = path.join(publicDir, ".vite/manifest.json");
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));

    console.log("\n✅ Build completed successfully!");
    console.log("📦 Generated assets:");
    Object.entries(manifest).forEach(([key, value]) => {
      console.log(`- ${key} → ${value.file}`);
    });
  } catch (err) {
    console.error("\n❌ Build failed:", err);
    process.exit(1);
  }
}

module.exports = { buildAssets };
