import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const buildId = path.join(root, ".next", "BUILD_ID");
const port = process.env.PORT || "3000";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!existsSync(buildId)) {
  console.log("[athvexa] No .next build found — running next build…");
  run("npx", ["prisma", "generate"]);
  run("npx", ["next", "build"]);
}

run("npx", ["next", "start", "--hostname", "0.0.0.0", "--port", String(port)]);
