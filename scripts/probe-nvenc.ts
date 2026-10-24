import { spawnSync } from "node:child_process";
import { probePng } from "../src/main/probe-image";
const result = spawnSync(
  "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe",
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
  { input: probePng(), windowsHide: true, timeout: 10000 },
);
console.log(
  JSON.stringify(
    {
      status: result.status,
      stderr: result.stderr?.toString(),
      error: result.error?.message,
      bytes: result.stdout?.length,
    },
    null,
    2,
  ),
);
