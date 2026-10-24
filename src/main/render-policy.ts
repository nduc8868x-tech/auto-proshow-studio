import { probePng } from "./probe-image";
import os from "node:os";
import { spawn } from "node:child_process";
import path from "node:path";
const probes = new Map<string, Promise<boolean>>();
export function chooseParallelFrames(
  cpus: number,
  memoryBytes: number,
  requested = 0,
  gpu = false,
  pixels = 1920 * 1080,
) {
  const frameBudgetGiB = (gpu ? 1 : 1.5) * Math.max(1, pixels / (1920 * 1080));
  const safe = Math.max(
    1,
    Math.min(
      gpu ? 8 : 4,
      Math.floor(cpus * (gpu ? 0.75 : 0.5)),
      Math.floor(memoryBytes / (frameBudgetGiB * 1024 ** 3)),
    ),
  );
  return requested > 0 ? Math.max(1, Math.min(8, requested, safe)) : safe;
}
export function probeNvenc(binaryDir: string) {
  const file = path.join(binaryDir, "ffmpeg.exe");
  let probe = probes.get(file);
  if (!probe) {
    probe = new Promise<boolean>((resolve) => {
      const child = spawn(
        file,
        [
          "-v",
          "error",
          "-f",
          "image2pipe",
          "-c:v",
          "png",
          "-i",
          "pipe:0",
          "-frames:v",
          "1",
          "-pix_fmt",
          "yuv420p",
          "-c:v",
          "h264_nvenc",
          "-f",
          "h264",
          "pipe:1",
        ],
        { windowsHide: true, stdio: ["pipe", "ignore", "pipe"] },
      );
      const timeout = setTimeout(() => {
        child.kill();
        resolve(false);
      }, 10000);
      child.on("error", () => {
        clearTimeout(timeout);
        resolve(false);
      });
      child.on("close", (code) => {
        clearTimeout(timeout);
        resolve(code === 0);
      });
      child.stdin.on("error", () => {});
      child.stderr.resume();
      child.stdin.end(probePng());
    });
    probes.set(file, probe);
  }
  return probe;
}
export async function renderPolicy(
  binaryDir: string,
  mode: "auto" | "cpu",
  requested: number,
  pixels = 1920 * 1080,
) {
  const gpu = mode === "auto" && (await probeNvenc(binaryDir));
  return {
    gpu,
    encoder: gpu ? "NVIDIA NVENC" : "CPU H.264",
    cpuConcurrency: chooseParallelFrames(
      os.availableParallelism(),
      os.freemem(),
      requested,
      false,
      pixels,
    ),
    concurrency: chooseParallelFrames(
      os.availableParallelism(),
      os.freemem(),
      requested,
      gpu,
      pixels,
    ),
  };
}
