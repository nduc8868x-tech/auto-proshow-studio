import path from "node:path";
import fs from "node:fs";
import process from "node:process";
import console from "node:console";
import { setTimeout, clearTimeout } from "node:timers";
import { api } from "@electron-forge/core";
const root = path.resolve("fixtures/generated"),
  result = path.join(root, "electron-result.json"),
  started = Date.now();
delete process.env.ELECTRON_RUN_AS_NODE;
api
  .start({ dir: process.cwd(), args: ["--app-smoke", root] })
  .then((child) => {
    const timeout = setTimeout(() => {
      child.kill();
      process.exitCode = 1;
    }, 240000);
    child.on("close", (code) => {
      clearTimeout(timeout);
      const success =
        code === 0 &&
        fs.existsSync(result) &&
        fs.statSync(result).mtimeMs >= started;
      console.log("Electron smoke", success ? "PASS" : "FAIL", "exit", code);
      process.exitCode = success ? 0 : 1;
    });
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
