import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const buildId = path.join(root, ".next", "BUILD_ID");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");

function argPort() {
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--port" || argv[i] === "-p") return argv[i + 1];
    if (argv[i]?.startsWith("--port=")) return argv[i].slice("--port=".length);
  }
  return null;
}

// Pachim sets Port=3002 in the Node panel (nginx proxies there). Prefer that.
const port = String(process.env.PORT || argPort() || "3002");
const hostname = "0.0.0.0";

function run(command, args) {
  console.log(`[athvexa] $ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: { ...process.env, PORT: port },
    shell: process.platform === "win32",
    cwd: root,
  });
  if (result.error) {
    console.error("[athvexa] failed to spawn:", result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`[athvexa] cwd=${root}`);
console.log(`[athvexa] PORT=${port} hostname=${hostname}`);
console.log(`[athvexa] build=${existsSync(buildId) ? "found" : "MISSING"}`);

if (!existsSync(nextBin)) {
  console.error("[athvexa] next binary missing — run npm install");
  process.exit(1);
}

if (!existsSync(buildId)) {
  console.log("[athvexa] No .next/BUILD_ID — running production build…");
  run("npx", ["prisma", "generate"]);
  run(process.execPath, [nextBin, "build"]);
  if (!existsSync(buildId)) {
    console.error("[athvexa] build finished but .next/BUILD_ID is still missing");
    process.exit(1);
  }
}

run(process.execPath, [nextBin, "start", "--hostname", hostname, "--port", port]);
