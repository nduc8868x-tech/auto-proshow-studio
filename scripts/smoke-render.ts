import path from "node:path";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { createFixtures } from "./create-fixtures";
import {
  newProject,
  generateTimeline,
  type SceneProps,
} from "../src/shared/project";
import { MediaServer } from "../src/main/media-server";
import { renderVideo } from "../src/render-video";
async function main() {
  const root = path.resolve("fixtures/generated"),
    entries = await createFixtures(root),
    server = new MediaServer();
  await server.start();
  try {
    const project = newProject(randomUUID());
    project.video.width = 1280;
    project.video.height = 720;
    project.voice = {
      id: randomUUID(),
      originalName: "voice.wav",
      relativePath: "media/audio/" + randomUUID() + ".wav",
      durationSeconds: 8,
    };
    const urls: Record<string, string> = {};
    urls[project.voice.id] = server.register(
      project.voice.id,
      path.join(root, "voice.wav"),
    );
    project.images = entries.map(([name, size]) => {
      const id = randomUUID(),
        [width, height] = size.split("x").map(Number);
      urls[id] = server.register(id, path.join(root, name));
      return {
        id,
        originalName: name,
        relativePath: "media/images/" + id + ".png",
        thumbnailPath: "thumbnails/" + id + ".png",
        width,
        height,
      };
    });
    const props: SceneProps = {
        project: generateTimeline(project, true),
        urls,
      },
      outputPath = path.join(root, "smoke-720p.mp4");
    await writeFile(
      path.join(root, "fixture-project.json"),
      JSON.stringify(props.project, null, 2),
    );
    await renderVideo({
      isPackaged: false,
      projectRoot: process.cwd(),
      outputPath,
      inputProps: props,
      onUpdate: (u) => {
        if (u.type === "status") console.log(u.message);
      },
    });
    const probe = path.resolve(
      "node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe",
    );
    const metadata = JSON.parse(
      execFileSync(
        probe,
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
      ),
      audio = metadata.streams.find(
        (s: { codec_type: string }) => s.codec_type === "audio",
      );
    assert.equal(video.codec_name, "h264");
    assert.equal(audio.codec_name, "aac");
    assert.equal(video.width, 1280);
    assert.equal(video.height, 720);
    assert.equal(Number(video.nb_frames), 240);
    assert.ok(Math.abs(Number(metadata.format.duration) - 8) <= 1 / 30);
    await writeFile(
      path.join(root, "verification.json"),
      JSON.stringify(metadata, null, 2),
    );
    console.log(
      "PASS smoke: H.264/AAC, 1280x720, 240 frames, 8 seconds",
      outputPath,
    );
  } finally {
    server.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
