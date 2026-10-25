import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  buildSubscribePreset,
  subscribePresets,
  type SubscribePresetId,
} from "../src/shared/subscribe-presets";
test("both Subscribe presets retain exact durations, geometry, looping and evenly spaced starts at every frame rate", () => {
  for (const id of Object.keys(subscribePresets) as SubscribePresetId[])
    for (const fps of [24, 30, 60])
      for (const seconds of [17, 1200]) {
        const config = subscribePresets[id],
          assetId = randomUUID(),
          total = fps * seconds;
        const clips = buildSubscribePreset(id, assetId, fps, total, randomUUID);
        assert.equal(clips.length, config.count);
        assert.equal(new Set(clips.map((c) => c.id)).size, config.count);
        assert.equal(clips[0].startFrame, 0);
        assert.equal(
          clips.at(-1)!.startFrame + clips.at(-1)!.durationFrames,
          total,
        );
        const gaps = clips
          .slice(1)
          .map((c, i) => c.startFrame - clips[i].startFrame);
        assert.ok(Math.max(...gaps) - Math.min(...gaps) <= 1);
        for (const c of clips) {
          assert.equal(c.durationFrames, config.seconds * fps);
          assert.equal(c.assetId, assetId);
          assert.equal(c.loop, true);
          assert.deepEqual(
            [c.x, c.y, c.width],
            [config.x, config.y, config.width],
          );
          assert.ok(c.startFrame + c.durationFrames <= total);
        }
      }
});
test("short videos never silently trim fixed preset duration", () => {
  assert.throws(
    () => buildSubscribePreset("fifteen", randomUUID(), 30, 299, randomUUID),
    /10 giây/,
  );
  assert.throws(
    () => buildSubscribePreset("five", randomUUID(), 30, 59, randomUUID),
    /2 giây/,
  );
  const clips = buildSubscribePreset(
    "fifteen",
    randomUUID(),
    30,
    300,
    randomUUID,
  );
  assert.equal(clips.length, 15);
  assert.ok(clips.every((c) => c.startFrame === 0 && c.durationFrames === 300));
});
