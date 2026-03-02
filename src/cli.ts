#!/usr/bin/env node

import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

interface PackageJson {
  scripts?: Record<string, string>;
}

function findWorkspaceRoot(): string {
  return process.cwd();
}

function readPackageJson(root: string): PackageJson | null {
  try {
    const raw = fs.readFileSync(path.join(root, "package.json"), "utf8");
    return JSON.parse(raw) as PackageJson;
  } catch {
    return null;
  }
}

function pickScriptName(pkg: PackageJson | null): string | null {
  if (!pkg?.scripts) return null;
  if (pkg.scripts.dev) return "dev";
  if (pkg.scripts.start) return "start";
  return null;
}

export function runGuardCli() {
  const root = findWorkspaceRoot();
  const pkg = readPackageJson(root);
  const script = pickScriptName(pkg);

  if (!script) {
    console.error(
      "[prompt-guard] Could not find a 'dev' or 'start' script in package.json.\n" +
        "Please add one of these scripts, for example:\n" +
        '  \"scripts\": { \"dev\": \"node index.js\" }\n' +
        "then run: npx guard"
    );
    process.exit(1);
  }

  const env = {
    ...process.env,
    NODE_OPTIONS: `${
      process.env.NODE_OPTIONS ? process.env.NODE_OPTIONS + " " : ""
    }-r prompt-guard/dist/register.js`,
  };

  console.log(
    `[prompt-guard] Guarding script "${script}" via npm run ${script} (NODE_OPTIONS=${env.NODE_OPTIONS}).`
  );

  const child = spawn(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", script],
    {
      stdio: "inherit",
      env,
    }
  );

  child.on("exit", (code) => {
    process.exit(code === null ? 1 : code);
  });
}

if (require.main === module) {
  runGuardCli();
}

