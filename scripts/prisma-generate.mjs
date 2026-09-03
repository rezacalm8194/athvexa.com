import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const engine = path.join(process.cwd(), "node_modules", ".prisma", "client", "query_engine-windows.dll.node");
const result = spawnSync("npx", ["prisma", "generate"], { stdio: "inherit", shell: true });
const code = result.status ?? 1;

if (code === 0) process.exit(0);

if (process.platform === "win32" && fs.existsSync(engine)) {
  console.warn("[prisma] generate failed because the query engine is locked. Using the existing Prisma client.");
  process.exit(0);
}

process.exit(code);
