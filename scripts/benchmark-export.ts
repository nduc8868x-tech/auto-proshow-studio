import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createFixtures } from "./create-fixtures";
import {
  newProject,
  generateTimeline,
  type SceneProps,
} from "../src/shared/project";
import { MediaServer } from "../src/main/media-server";
import { renderVideo, type RenderDetails } from "../src/render-video";

async function main() {
  const label = process.argv[2] || "current";
  if (!/^[a-z0-9-]+$/.test(label)) throw Error("Invalid benchmark label");
  const concurrency = Number(process.argv[3] || 4);
  const cachedAssets: {
    cachePreparationMs: number;
    assets: { originalName: string; backgroundPath: string; padding: number }[];
  } | null =
    process.argv[4] === "cached"
      ? JSON.parse(
          await readFile(
            path.resolve("fixtures/generated/cached-assets.json"),
            "utf8",
          ),
        )
      : null;
  const root = path.resolve("fixtures/performance-20261024");
  const entries = await createFixtures(root);
  const wav = await readFile(path.join(root, "voice.wav"));
  const longWav = Buffer.concat([wav, wav.subarray(44), wav.subarray(44)]);
  longWav.writeUInt32LE(longWav.length - 8, 4);
  longWav.writeUInt32LE(longWav.length - 44, 40);
  await writeFile(path.join(root, "voice-24.wav"), longWav);
  const server = new MediaServer();
  await server.start();
  try {
    const project = newProject(randomUUID());
    project.visual.fitMode = "contain-blur";
    project.visual.motionSpeed = 3;
    project.exportSettings.parallelFrames = concurrency;
    project.voice = {
      id: randomUUID(),
      originalName: "voice-24.wav",
      relativePath: "media/audio/" + randomUUID() + ".wav",
      durationSeconds: 24,
    };
    const urls: Record<string, string> = {};
    const backgrounds: NonNullable<SceneProps["backgrounds"]> = {};
    urls[project.voice.id] = server.register(
      project.voice.id,
      path.join(root, "voice-24.wav"),
    );
    project.images = Array.from({ length: 9 }, (_, index) => {
      const [name, size] = entries[index % entries.length];
      const [width, height] = size.split("x").map(Number);
      const id = randomUUID();
      urls[id] = server.register(id, path.join(root, name));
      const cached = cachedAssets?.assets.find(
        (asset) => asset.originalName === name,
      );
      if (cached)
        backgrounds[id] = {
          url: server.register(id + "-background", cached.backgroundPath),
          padding: cached.padding,
        };
      return {
        id,
        originalName: name,
        relativePath: "media/images/" + id + ".png",
        thumbnailPath: "thumbnails/" + id + ".png",
        width,
        height,
      };
    });
    const runs: RenderDetails[] = [];
    for (let index = -1; index < 2; index++) {
      const p = generateTimeline(
        index < 0
          ? {
              ...project,
              images: project.images.slice(0, 1),
              voice: { ...project.voice, durationSeconds: 1 },
            }
          : project,
        true,
      );
      const outputPath = path.join(
        root,
        label + "-" + (index < 0 ? "warmup" : index + 1) + ".mp4",
      );
      let details: RenderDetails | undefined;
      console.log(label, index < 0 ? "warmup" : "run " + (index + 1));
      await renderVideo({
        isPackaged: false,
        projectRoot: process.cwd(),
        outputPath,
        inputProps: { project: p, urls, backgrounds },
        onDetails: (d) => {
          details = d;
        },
      });
      if (index >= 0) {
        const metadata = JSON.parse(
          execFileSync(
            path.resolve(
              "node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe",
            ),
            [
              "-v",
              "error",
              "-show_streams",
              "-show_format",
              "-of",
              "json",
              outputPath,
            ],
            { encoding: "utf8", windowsHide: true },
          ),
        );
        const video = metadata.streams.find(
          (s: { codec_type: string }) => s.codec_type === "video",
        );
        if (
          Number(video.nb_frames) !== 720 ||
          Math.abs(Number(metadata.format.duration) - 24) > 1 / 30
        )
          throw Error("Benchmark output validation failed");
        runs.push(details!);
        console.log(JSON.stringify(details));
      }
    }
    const result = {
      label,
      width: 1920,
      height: 1080,
      fps: 30,
      durationSeconds: 24,
      imageCount: 9,
      blurPx: 32,
      motionSpeed: 3,
      logicalCpus: os.availableParallelism(),
      totalMemoryGiB: os.totalmem() / 1024 ** 3,
      runs,
      cachedBackgrounds: Object.keys(backgrounds).length,
      cachePreparationMsForThreeUniqueImages:
        cachedAssets?.cachePreparationMs ?? 0,
      meanElapsedMs:
        runs.reduce((sum, r) => sum + r.elapsedMs!, 0) / runs.length,
    };
    await writeFile(
      path.join(root, label + ".json"),
      JSON.stringify(result, null, 2),
    );
    console.log(JSON.stringify(result));
  } finally {
    server.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
