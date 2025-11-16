#!/usr/bin/env node
import { spawnSync } from "child_process";
import { resolve } from "path";

const cwd = resolve(import.meta.dirname);
const [cmd, ...args] = process.argv.slice(2);
let { SQLITE_URL = "file:./db.sqlite" } = process.env;

SQLITE_URL = `file:${resolve(cwd, SQLITE_URL?.split(":")[1] ?? "")}`;

const prismaCLI = (cmd, args) => spawnSync(
  "pnpm",
  ["exec", "prisma", cmd, ...args],
  {
    stdio: "inherit",
    cwd,
    env: { ...process.env, CHECKPOINT_DISABLE: 1, SQLITE_URL }
  }
);

switch (cmd) {
case "generate":
  prismaCLI(cmd, ["--schema", "src/", ...args]);
  break;

case "reset":
  prismaCLI("db", ["push", "--force-reset", "--schema", "src/", ...args]);
  break;

default:
  prismaCLI(cmd, args);
  break;
}
