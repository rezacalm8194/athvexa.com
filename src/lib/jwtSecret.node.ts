import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { jwtSecretFromEnv, MIN_JWT_SECRET_LENGTH } from "./jwt";

let cached: string | undefined;

function secretFilePath() {
  return path.resolve(process.cwd(), "prisma", ".jwt-secret");
}

function readFileSecret(filePath: string) {
  try {
    const value = fs.readFileSync(filePath, "utf8").trim();
    if (value.length >= MIN_JWT_SECRET_LENGTH) return value;
  } catch {
    return null;
  }
  return null;
}

function persistSecret(filePath: string, value: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, { encoding: "utf8", mode: 0o600 });
}

function persistCandidates() {
  return [secretFilePath(), path.resolve(process.cwd(), ".jwt-secret")];
}

/**
 * Node-only secret: Pachim env first, then a file next to SQLite so login
 * still works when JWT_SECRET was never set in the panel.
 */
export function loadNodeJwtSecret() {
  if (cached) return cached;

  const fromEnv = jwtSecretFromEnv();
  if (fromEnv) {
    cached = fromEnv;
    return fromEnv;
  }

  for (const filePath of persistCandidates()) {
    const existing = readFileSecret(filePath);
    if (existing) {
      cached = existing;
      return existing;
    }
  }

  const generated = randomBytes(48).toString("base64");
  let lastError: unknown;
  for (const filePath of persistCandidates()) {
    try {
      persistSecret(filePath, generated);
      cached = generated;
      return generated;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Could not create a JWT secret file. Set JWT_SECRET in Pachim (32+ characters).");
}
