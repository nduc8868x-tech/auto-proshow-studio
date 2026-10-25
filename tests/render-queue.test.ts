import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { RenderQueue } from "../src/main/render-queue";
import { newProject, projectSchema } from "../src/shared/project";
import { chooseParallelFrames } from "../src/main/render-policy";
import { imageMime, isImageFilename } from "../src/shared/media-formats";
test("queue serializes jobs, isolates snapshots and continues after failure", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "proshow-queue-"));
  try {
    let running = 0,
      max = 0;
    const seen: string[] = [];
    const queue = new RenderQueue(
      path.join(root, "queue.json"),
      async (entry) => {
        running++;
        max = Math.max(max, running);
        seen.push(entry.project.name);
        await new Promise((r) => setTimeout(r, 5));
        running--;
        if (entry.project.name === "bad") throw Error("test failure");
      },
      () => {},
    );
    await queue.pause(true);
    const p = newProject(randomUUID());
    p.name = "first";
    await queue.enqueue(p, path.join(root, "1.mp4"));
    p.name = "bad";
    await queue.enqueue(p, path.join(root, "2.mp4"));
    p.name = "last";
    await queue.enqueue(p, path.join(root, "3.mp4"));
    p.name = "changed after enqueue";
    await assert.rejects(queue.enqueue(p, path.join(root, "3.mp4")));
    await queue.pause(false);
    await queue.idle();
    assert.equal(max, 1);
    assert.deepEqual(seen, ["first", "bad", "last"]);
    assert.deepEqual(
      queue.state().jobs.map((j) => j.status),
      ["completed", "failed", "completed"],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("queued cancellation and restore keep pending jobs paused", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "proshow-queue-"));
  try {
    const file = path.join(root, "queue.json"),
      queue = new RenderQueue(
        file,
        async () => {},
        () => {},
      );
    await queue.pause(true);
    const p = newProject(randomUUID()),
      one = await queue.enqueue(p, path.join(root, "1.mp4"));
    await queue.enqueue(p, path.join(root, "2.mp4"));
    await queue.cancel(one.id);
    const restored = new RenderQueue(
      file,
      async () => {},
      () => {},
    );
    await restored.restore();
    assert.ok(restored.state().paused);
    assert.deepEqual(
      restored.state().jobs.map((j) => j.status),
      ["cancelled", "queued"],
    );
    await restored.pause(false);
    await restored.idle();
    assert.equal(restored.state().jobs[1].status, "completed");
    const disk = JSON.parse(await readFile(file, "utf8"));
    assert.equal(disk.entries[1].project.id, p.id);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("cancelling active job allows next job to run", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "proshow-queue-"));
  let started: () => void = () => {};
  const ready = new Promise<void>((resolve) => (started = resolve));
  try {
    let count = 0;
    const queue = new RenderQueue(
      path.join(root, "q.json"),
      async (_e, signal) => {
        if (++count === 1) {
          started();
          await new Promise<void>((r) =>
            signal.addEventListener("abort", () => r(), { once: true }),
          );
        }
      },
      () => {},
    );
    await queue.pause(true);
    const p = newProject(randomUUID()),
      one = await queue.enqueue(p, path.join(root, "1.mp4"));
    await queue.enqueue(p, path.join(root, "2.mp4"));
    await queue.pause(false);
    await ready;
    await queue.cancel(one.id);
    await queue.idle();
    assert.deepEqual(
      queue.state().jobs.map((j) => j.status),
      ["cancelled", "completed"],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("old projects gain disabled overlay and portable auto export defaults", () => {
  const p = newProject(randomUUID()),
    raw: Record<string, unknown> = JSON.parse(JSON.stringify(p));
  delete raw.overlay;
  delete raw.exportSettings;
  const parsed = projectSchema.parse(raw);
  assert.equal(parsed.overlay.enabled, false);
  assert.equal(parsed.overlay.title, "");
  assert.equal(parsed.overlay.logo, null);
  assert.equal(parsed.overlay.layout.y, 78.5);
  assert.equal(parsed.visual.motionSpeed, 7);
  assert.equal(parsed.exportSettings.mode, "auto");
});
test("AVIF is included and actual signatures are used", () => {
  assert.ok(isImageFilename("ẢNH 16.AVIF"));
  assert.ok(isImageFilename("1.jfif"));
  assert.equal(imageMime(Buffer.from("garbage")), null);
  assert.equal(
    imageMime(
      Buffer.concat([
        Buffer.from([0, 0, 0, 24]),
        Buffer.from("ftypavif0000avif"),
      ]),
    ),
    "image/avif",
  );
});
test("parallel frame policy stays within CPU and RAM limits", () => {
  assert.equal(chooseParallelFrames(12, 8 * 1024 ** 3), 4);
  assert.equal(chooseParallelFrames(4, 2 * 1024 ** 3, 8), 1);
  assert.equal(chooseParallelFrames(1, 1024), 1);
  assert.equal(chooseParallelFrames(12, 8 * 1024 ** 3, 0, true), 8);
  assert.equal(chooseParallelFrames(12, 2 * 1024 ** 3, 8, true), 2);
  assert.equal(
    chooseParallelFrames(12, 8 * 1024 ** 3, 8, true, 3840 * 2160),
    2,
  );
});
