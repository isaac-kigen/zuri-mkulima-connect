// Build wrapper script
const { execSync } = require("child_process");
const path = require("path");

const projectDir = "/home/ubuntu/projects/deepseek_agent/work/mkulima_connect";
const nextBin = path.join(projectDir, "node_modules", "next", "dist", "bin", "next");

try {
  console.log("Running Next.js build...");
  execSync(`node ${nextBin} build`, {
    cwd: projectDir,
    stdio: "inherit",
    timeout: 180000,
  });
  console.log("Build completed successfully!");
} catch (err) {
  console.error("Build failed:", err.message);
  process.exit(1);
}
