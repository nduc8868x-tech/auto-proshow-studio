import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newProject,
  projectSchema,
  validateTimeline,
} from "../src/shared/project";
import { keyGreenPixels } from "../src/shared/green-screen";
import {
  fitSubscribeClip,
  pasteSubscribeClip,
  transformSubscribeClip,
  subscribeFrameIndex,
  subscribeGeometry,
  type SubscribeClip,
} from "../src/shared/subscribe";
import { randomUUID } from "node:crypto";
test("preview Subscribe dragging and resizing preserve timing and stay within landscape/portrait frames", () => {
  const clip: SubscribeClip = {
    id: randomUUID(),
    assetId: randomUUID(),
    startFrame: 60,
    durationFrames: 90,
    x: 30,
    y: 40,
    width: 30,
    loop: true,
  };
  for (const [w, h] of [
    [1920, 1080],
    [1080, 1920],
  ]) {
    for (const resize of [false, true]) {
      for (const delta of [-200, 8, 200]) {
        const moved = transformSubscribeClip(
          clip,
          { width: 640, height: 180 },
          w,
          h,
          delta,
          delta,
          resize,
        );
        const box = subscribeGeometry(moved, { width: 640, height: 180 }, w, h);
        assert.ok(
          box.x >= 0 &&
            box.y >= 0 &&
            box.x + box.width <= 100.001 &&
            box.y + box.height <= 100.001,
        );
        assert.equal(moved.startFrame, 60);
        assert.equal(moved.durationFrames, 90);
        assert.equal(moved.loop, true);
        assert.equal(moved.id, clip.id);
        assert.ok(moved.width >= 5);
      }
    }
  }
  assert.equal(clip.width, 30);
});
test("Subscribe paste creates an independent clip at the playhead and trims to video end", () => {
  const source: SubscribeClip = {
    id: randomUUID(),
    assetId: randomUUID(),
    startFrame: 60,
    durationFrames: 90,
    x: 30,
    y: 55,
    width: 40,
    loop: true,
  };
  const snapshot = { ...source };
  const id = randomUUID();
  const pasted = pasteSubscribeClip(snapshot, id, 180, 240);
  assert.deepEqual(pasted, {
    ...source,
    id,
    startFrame: 180,
    durationFrames: 60,
  });
  assert.notEqual(pasted.id, source.id);
  pasted.width = 20;
  assert.equal(source.width, 40);
  assert.deepEqual(snapshot, source);
  assert.equal(
    pasteSubscribeClip(snapshot, randomUUID(), 999, 240).durationFrames,
    1,
  );
  assert.equal(
    pasteSubscribeClip(snapshot, randomUUID(), -2, 240).startFrame,
    0,
  );
  assert.equal(
    pasteSubscribeClip(snapshot, randomUUID(), 15.7, 240).startFrame,
    16,
  );
});
test("green key removes green and preserves white, red, black and existing transparency", () => {
  const pixels = new Uint8ClampedArray([
    0, 255, 0, 255, 255, 255, 255, 255, 255, 0, 0, 255, 0, 0, 0, 255, 2, 3, 4,
    0,
  ]);
  keyGreenPixels(pixels, 5, 1);
  assert.equal(pixels[3], 0);
  assert.equal(pixels[7], 255);
  assert.equal(pixels[11], 255);
  assert.equal(pixels[15], 255);
  assert.equal(pixels[19], 0);
  const original = new Uint8ClampedArray([0, 255, 0, 255]);
  keyGreenPixels(original, 1, 1, false);
  assert.equal(original[3], 255);
});
test("GIF frame selection respects variable frame durations, seek order, looping and end hold", () => {
  const durations = [50, 100, 50];
  assert.equal(subscribeFrameIndex(durations, 0, 20, false), 0);
  assert.equal(subscribeFrameIndex(durations, 1, 20, false), 1);
  assert.equal(subscribeFrameIndex(durations, 3, 20, false), 2);
  assert.equal(subscribeFrameIndex(durations, 4, 20, true), 0);
  assert.equal(subscribeFrameIndex(durations, 20, 20, false), 2);
  assert.equal(subscribeFrameIndex(durations, 1, 20, true), 1);
});
test("Subscribe schema migrates old projects and rejects references to unowned templates", () => {
  const raw = JSON.parse(JSON.stringify(newProject(randomUUID())));
  delete raw.subscribeAssets;
  delete raw.subscribeClips;
  const p = projectSchema.parse(raw);
  assert.deepEqual(p.subscribeClips, []);
  assert.deepEqual(p.subscribeAssets, []);
  p.subscribeClips = [
    {
      id: randomUUID(),
      assetId: randomUUID(),
      startFrame: 0,
      durationFrames: 60,
      x: 35,
      y: 65,
      width: 30,
      loop: false,
    },
  ];
  assert.throws(() => validateTimeline(p));
});
test("Subscribe resize and geometry remain within video and respect timeline bounds", () => {
  const clip: SubscribeClip = {
    id: randomUUID(),
    assetId: randomUUID(),
    startFrame: 200,
    durationFrames: 100,
    x: 99,
    y: 99,
    width: 100,
    loop: false,
  };
  const fitted = fitSubscribeClip(clip, 240);
  assert.equal(fitted.durationFrames, 40);
  const shorter = fitSubscribeClip(clip, 90);
  assert.equal(shorter.startFrame, 89);
  assert.equal(shorter.durationFrames, 1);
  for (const [w, h] of [
    [1920, 1080],
    [1080, 1920],
  ]) {
    const g = subscribeGeometry(clip, { width: 1280, height: 720 }, w, h);
    assert.ok(g.x + g.width <= 100.001);
    assert.ok(g.y + g.height <= 100.001);
  }
});
