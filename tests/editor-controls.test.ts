import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import {
  newProject,
  projectSchema,
  generateTimeline,
  motions,
} from "../src/shared/project";
import {
  normalizeOverlayLayout,
  defaultOverlayLayout,
  overlayGeometry,
} from "../src/shared/overlay-layout";
import { motionTransform } from "../src/shared/motion-transform";
import { verifiedProjectFolder } from "../src/main/project-storage";
import { reorderImages } from "../src/shared/reorder-images";
test("old stored overlay and visual migrate without changing timing", () => {
  const raw = JSON.parse(JSON.stringify(newProject(randomUUID())));
  delete raw.overlay.layout;
  delete raw.visual.motionSpeed;
  const p = projectSchema.parse(raw);
  assert.deepEqual(p.overlay.layout, defaultOverlayLayout);
  assert.equal(p.visual.motionSpeed, 3);
  assert.throws(() =>
    projectSchema.parse({
      ...p,
      overlay: { ...p.overlay, layout: { ...p.overlay.layout, fontSize: 500 } },
    }),
  );
});
test("title layout stays inside landscape/portrait frames and font is user controlled", () => {
  const layout = normalizeOverlayLayout({
    x: 98,
    y: 95,
    width: 70,
    height: 25,
    fontSize: 88,
    autoFit: false,
  });
  assert.equal(layout.x, 30);
  assert.equal(layout.y, 75);
  for (const [w, h] of [
    [1920, 1080],
    [1080, 1920],
    [1280, 720],
  ]) {
    const g = overlayGeometry(w, h, layout, true, "Title");
    assert.ok(g.x + g.width <= w + 0.001);
    assert.ok(g.y + g.height <= h + 0.001);
    assert.equal(g.fontSize, (88 * h) / 1080);
    assert.ok(g.logoSize <= g.width * 0.25);
    assert.ok(g.textWidth > 0);
  }
  assert.ok(
    overlayGeometry(
      1920,
      1080,
      { ...layout, autoFit: true },
      true,
      "W".repeat(180),
    ).fontSize < 88,
  );
});
test("motion speed scales travel and safe fit keeps every pixel within frame", () => {
  const slow = motionTransform(
      "zoom-in",
      60,
      120,
      0.25,
      false,
      1920,
      1080,
      640,
      360,
    ),
    fast = motionTransform("zoom-in", 60, 120, 3, false, 1920, 1080, 640, 360);
  assert.ok(fast.scale > slow.scale);
  const pan = (speed: number) =>
    motionTransform("pan-right", 119, 120, speed, true, 1920, 1080, 1080, 1920)
      .x;
  assert.ok(pan(0.25) < pan(1));
  assert.ok(pan(1) < pan(2));
  assert.ok(pan(2) < pan(3));
  for (const motion of motions)
    for (const speed of [0, 0.25, 1, 3, 10])
      for (const [iw, ih] of [
        [1080, 1920],
        [1920, 1080],
        [1080, 1080],
      ])
        for (let frame = 0; frame < 120; frame += 7) {
          const m = motionTransform(
            motion,
            frame,
            120,
            speed,
            true,
            1920,
            1080,
            iw,
            ih,
          );
          assert.ok(m.scale <= 1);
          assert.ok(Math.abs(m.x) + (m.fw * m.scale) / 2 <= 960 + 0.0001);
          assert.ok(Math.abs(m.y) + (m.fh * m.scale) / 2 <= 540 + 0.0001);
        }
});
test("new defaults use blurred background and 3x while saved settings are preserved", () => {
  const initial = newProject(randomUUID());
  assert.equal(initial.visual.fitMode, "contain-blur");
  assert.equal(initial.visual.motionSpeed, 3);
  const previous = projectSchema.parse({
    ...initial,
    visual: { ...initial.visual, fitMode: "auto", motionSpeed: 1.5 },
  });
  assert.equal(previous.visual.fitMode, "auto");
  assert.equal(previous.visual.motionSpeed, 1.5);
  for (const speed of [0, 10])
    assert.equal(
      projectSchema.parse({
        ...initial,
        visual: { ...initial.visual, motionSpeed: speed },
      }).visual.motionSpeed,
      speed,
    );
  for (const speed of [-0.1, 10.1])
    assert.throws(() =>
      projectSchema.parse({
        ...initial,
        visual: { ...initial.visual, motionSpeed: speed },
      }),
    );
});
test("zero speed stops all foreground motion on every frame", () => {
  for (const motion of motions)
    for (const safe of [true, false])
      for (const frame of [0, 50, 119]) {
        const result = motionTransform(
          motion,
          frame,
          120,
          0,
          safe,
          1920,
          1080,
          800,
          600,
        );
        assert.equal(result.scale, 1);
        assert.equal(result.x, 0);
        assert.equal(result.y, 0);
        assert.equal(result.rate, 0);
      }
});
test("timeline insertion works in both directions without losing images or clip settings", () => {
  const images = ["a", "b", "c", "d"].map((id) => ({ id }));
  const ids = (list: { id: string }[]) => list.map((i) => i.id).join("");
  assert.equal(ids(reorderImages(images, "a", "c", "after")), "bcad");
  assert.equal(ids(reorderImages(images, "d", "b", "before")), "adbc");
  assert.equal(ids(reorderImages(images, "b", "c", "before")), "abcd");
  assert.equal(reorderImages(images, "missing", "b", "before"), images);
  assert.equal(reorderImages(images, "a", "missing", "before"), images);
  assert.equal(reorderImages(images, "a", "a", "after"), images);
});
test("speed overrides survive preset regeneration and do not change voice duration", () => {
  const p = newProject(randomUUID());
  const id = randomUUID();
  p.images = [
    {
      id,
      originalName: "1.png",
      relativePath: "media/images/" + id + ".png",
      thumbnailPath: "thumbnails/" + id + ".png",
      width: 100,
      height: 200,
    },
  ];
  p.voice = {
    id: randomUUID(),
    originalName: "voice.wav",
    relativePath: "media/audio/" + randomUUID() + ".wav",
    durationSeconds: 8,
  };
  const initial = generateTimeline(p);
  initial.clips[0].motionSpeed = 2.5;
  initial.visual.motionSpeed = 0.25;
  const next = generateTimeline(initial, true);
  assert.equal(next.clips[0].motionSpeed, 2.5);
  assert.equal(next.video.totalFrames, 240);
});
test("trash target requires canonical project folder and matching UUID", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "proshow-storage-"));
  try {
    const id = randomUUID(),
      folder = path.join(root, id);
    await mkdir(folder);
    await writeFile(
      path.join(folder, "project.json"),
      JSON.stringify(newProject(id)),
    );
    assert.equal(
      (await verifiedProjectFolder(root, id)).folder.toLowerCase(),
      folder.toLowerCase(),
    );
    await assert.rejects(verifiedProjectFolder(root, "../outside"));
    await writeFile(
      path.join(folder, "project.json"),
      JSON.stringify(newProject(randomUUID())),
    );
    await assert.rejects(verifiedProjectFolder(root, id));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("trash target rejects directory junction escaping project root", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "proshow-junction-")),
    outside = await mkdtemp(path.join(os.tmpdir(), "proshow-outside-"));
  const id = randomUUID(),
    link = path.join(root, id);
  try {
    await writeFile(
      path.join(outside, "project.json"),
      JSON.stringify(newProject(id)),
    );
    try {
      await symlink(outside, link, "junction");
    } catch (error) {
      if (
        ["EPERM", "EACCES"].includes(
          (error as NodeJS.ErrnoException).code ?? "",
        )
      ) {
        t.skip("Junction creation unavailable");
        return;
      }
      throw error;
    }
    await assert.rejects(verifiedProjectFolder(root, id));
  } finally {
    await rm(link, { force: true, recursive: true });
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});
