import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  generateTimeline,
  newProject,
  projectSchema,
} from "../src/shared/project";
import { planProjectCopy } from "../src/shared/duplicate-project";
test("project copy gives every media/template an independent identity while retaining timings and edits", () => {
  const image = () => {
    const id = randomUUID();
    return {
      id,
      originalName: "photo.png",
      relativePath: `media/images/${id}.png`,
      thumbnailPath: `thumbnails/${id}.png`,
      width: 1280,
      height: 720,
    };
  };
  const p = newProject(randomUUID());
  p.images = [image()];
  p.overlay.logo = image();
  p.overlay.enabled = true;
  p.overlay.layout.fontSize = 56;
  p.visual.motionSpeed = 3;
  const voiceId = randomUUID();
  p.voice = {
    id: voiceId,
    originalName: "voice.wav",
    relativePath: `media/audio/${voiceId}.wav`,
    durationSeconds: 60,
  };
  const assetId = randomUUID();
  p.subscribeAssets = [
    {
      id: assetId,
      originalName: "sub.gif",
      sourceHash: "0".repeat(64),
      removeGreen: true,
      width: 640,
      height: 180,
      frameDurationsMs: [30, 40],
    },
  ];
  p.subscribeClips = [
    {
      id: randomUUID(),
      assetId,
      startFrame: 30,
      durationFrames: 300,
      x: 36,
      y: 8,
      width: 29,
      loop: true,
    },
  ];
  const source = generateTimeline(p),
    snapshot = structuredClone(source),
    newId = randomUUID();
  const plan = planProjectCopy(
    source,
    newId,
    randomUUID,
    "2026-10-26T01:00:00.000Z",
  );
  assert.equal(plan.project.id, newId);
  assert.ok(plan.project.name.endsWith("Bản sao"));
  assert.equal(plan.files.length, 7);
  assert.deepEqual(source, snapshot);
  assert.equal(plan.project.visual.motionSpeed, 3);
  assert.equal(plan.project.overlay.layout.fontSize, 56);
  assert.equal(plan.project.clips[0].imageId, plan.project.images[0].id);
  assert.notEqual(plan.project.images[0].id, source.images[0].id);
  assert.notEqual(plan.project.voice!.id, source.voice!.id);
  assert.notEqual(plan.project.overlay.logo!.id, source.overlay.logo!.id);
  assert.deepEqual(
    {
      ...plan.project.clips[0],
      id: source.clips[0].id,
      imageId: source.clips[0].imageId,
    },
    source.clips[0],
  );
  assert.deepEqual(
    {
      ...plan.project.subscribeClips[0],
      id: source.subscribeClips[0].id,
      assetId,
    },
    source.subscribeClips[0],
  );
  assert.equal(
    plan.project.subscribeClips[0].assetId,
    plan.project.subscribeAssets[0].id,
  );
  assert.equal(
    new Set(plan.files.map((f) => f.target)).size,
    plan.files.length,
  );
  for (const file of plan.files) {
    assert.notEqual(file.source, file.target);
    assert.ok(!file.target.includes(".."));
  }
  assert.equal(
    projectSchema.parse(plan.project).createdAt,
    "2026-10-26T01:00:00.000Z",
  );
});
