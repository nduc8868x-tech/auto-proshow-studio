import path from "node:path";
import process from "node:process";
import console from "node:console";
import { copyFile } from "node:fs/promises";
import { api } from "@electron-forge/core";
try {
  const projectRoot = path.resolve(process.cwd());
  const outDir = path.resolve(process.argv[2] || "release");
  const relative = path.relative(projectRoot, outDir);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative))
    throw new Error(
      "The portable output must be a subdirectory of the project.",
    );
  await api.package({
    dir: projectRoot,
    arch: "x64",
    platform: "win32",
    outDir,
  });
  await copyFile(
    path.resolve("docs/PORTABLE.txt"),
    path.join(outDir, "auto-proshow-studio-win32-x64/README-PORTABLE.txt"),
  );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
