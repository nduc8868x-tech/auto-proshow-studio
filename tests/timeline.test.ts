import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  allocateClips,
  chooseFitMode,
  newProject,
  generateTimeline,
  projectSchema,
  naturalCompare,
  validateTimeline,
} from "../src/shared/project";
for (const [n, seconds] of [
  [1, 10],
  [2, 10],
  [100, 600],
  [10, 0.4],
  [200, 1200],
  [3, 12],
]) {
  test("frame allocation " + n + "/" + seconds, () => {
    const a = allocateClips(
      Array.from({ length: n }, (_, i) => String(i)),
      seconds,
      30,
      1,
    );
    assert.equal(a.totalFrames, Math.ceil(seconds * 30));
    assert.equal(a.clips[0].startFrame, 0);
    assert.equal(a.clips.at(-1)!.endFrame, a.totalFrames);
    assert.equal(
      a.clips.reduce((s, c) => s + c.durationFrames, 0) -
        (n - 1) * a.transitionFrames,
      a.totalFrames,
    );
    a.clips.forEach((c, i) => {
      assert.ok(c.durationFrames >= 2 * a.transitionFrames + 1);
      if (i)
        assert.equal(
          a.clips[i - 1].endFrame - c.startFrame,
          a.transitionFrames,
        );
    });
  });
}
test("reject too many images and invalid numbers", () => {
  assert.throws(() => allocateClips(Array(60).fill("a"), 1, 30, 1));
  assert.throws(() => allocateClips(["a"], NaN, 30, 1));
  assert.throws(() => allocateClips(["a"], 1, 30, Infinity));
});
test("auto fit handles portrait, square, landscape, invalid dimensions", () => {
  assert.equal(chooseFitMode(1080, 1920, 1920, 1080), "contain-blur");
  assert.equal(chooseFitMode(1080, 1080, 1920, 1080), "contain-blur");
  assert.equal(chooseFitMode(1920, 1080, 1920, 1080), "cover");
  assert.throws(() => chooseFitMode(0, 100, 100, 100));
});
test("natural filename order", () =>
  assert.deepEqual(["10.jpg", "2.jpg", "1.jpg"].sort(naturalCompare), [
    "1.jpg",
    "2.jpg",
    "10.jpg",
  ]));
test("seed and schema persist deterministic effects; reorder preserves identities", () => {
  const p = newProject(randomUUID());
  p.voice = {
    id: randomUUID(),
    originalName: "voice.wav",
    relativePath: "media/audio/" + randomUUID() + ".wav",
    durationSeconds: 12,
  };
  p.images = Array.from({ length: 5 }, (_, i) => {
    const id = randomUUID();
    return {
      id,
      originalName: i + ".png",
      relativePath: "media/images/" + id + ".png",
      thumbnailPath: "thumbnails/" + id + ".png",
      width: 100,
      height: 200,
    };
  });
  const a = generateTimeline(p, true),
    b = generateTimeline(p, true);
  assert.deepEqual(a, b);
  assert.deepEqual(projectSchema.parse(JSON.parse(JSON.stringify(a))), a);
  const c = generateTimeline({ ...a, images: [...a.images].reverse() });
  validateTimeline(c);
  assert.equal(c.clips[0].imageId, a.images.at(-1)!.id);
  const broken = structuredClone(a);
  broken.clips[1].startFrame++;
  assert.throws(() => validateTimeline(broken));
  assert.throws(() => projectSchema.parse({ ...a, schemaVersion: 2 }));
  assert.throws(() =>
    projectSchema.parse({
      ...a,
      images: [{ ...a.images[0], relativePath: "../../secret" }],
    }),
  );
});
test("allocation invariant sweep", () => {
  for (let n = 1; n < 80; n++)
    for (let D = n; D < n + 250; D += 13) {
      const a = allocateClips(Array(n).fill("x"), D / 30, 30, 0.9);
      assert.equal(a.clips.at(-1)!.endFrame, a.totalFrames);
      assert.ok(
        a.clips.every((c) => c.durationFrames >= 2 * a.transitionFrames + 1),
      );
    }
});
