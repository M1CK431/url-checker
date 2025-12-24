#!/usr/bin/env node
import { spawnSync } from "child_process";
import { resolve } from "path";
import { glob, readFile, writeFile, unlink } from "fs/promises";

const cwd = resolve(import.meta.dirname);
const [cmd, ...args] = process.argv.slice(2);
let { DB_PROVIDER = "sqlite", DB_URL = "file:./db.sqlite" } = process.env;

DB_PROVIDER === "sqlite" &&
  (DB_URL = `file:${resolve(cwd, DB_URL?.split(":")[1] ?? "")}`);

const changeDbProvider = async () => {
  for await (const file of glob("src/**/*.prisma", { cwd })) {
    const content = await readFile(file, "utf-8");
    const lines = content.split("\n");

    const transformed = lines.map(line => {
      const match = line.match(/\/\/\s*DB:(\[.*\])/);
      if (!match) return line;

      const dbTags = JSON.parse(match[1]);
      const isCommented = /^\s*\/\//.test(line);

      return dbTags.includes(DB_PROVIDER)
        ? isCommented ? line.replace(/^(\s*)\/\//, "$1") : line
        : isCommented ? line : line.replace(/^(\s*)/, "$1//");
    });

    await writeFile(file, transformed.join("\n"));
  }
};

const prismaCLI = (cmd, args) => spawnSync(
  "pnpm",
  ["exec", "prisma", cmd, ...args],
  {
    stdio: "inherit",
    cwd,
    env: { ...process.env, CHECKPOINT_DISABLE: 1, DB_URL }
  }
);

switch (cmd) {
case "generate":
  await changeDbProvider();
  prismaCLI(cmd, ["--schema", "src/", ...args]);
  break;

case "reset":
  await changeDbProvider();

  // prevent a prisma error on reset while SQLITE WAL mode is enabled
  DB_PROVIDER === "sqlite" &&
    await Promise.all(
      [DB_URL, `${DB_URL}-shm`, `${DB_URL}-wal`]
        .map(f => unlink(f.split(":")[1]))
    ).catch(() => {});

  prismaCLI("db", ["push", "--force-reset", "--schema", "src/", ...args]);
  break;

default:
  prismaCLI(cmd, args);
  break;
}
