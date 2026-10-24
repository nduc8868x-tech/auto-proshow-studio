import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { LogoLibrary } from "../src/main/logo-library";
test("saved logo library persists pixels and thumbnails, deduplicates content and rejects paths", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "proshow-logos-"));
  try {
    const library = new LogoLibrary(root);
    const png = Buffer.from("normalized logo pixels"),
      thumbnail = Buffer.from("thumbnail pixels");
    const concurrent = await Promise.all(
      Array.from({ length: 6 }, () =>
        library.add("logo.png", 320, 180, png, thumbnail),
      ),
    );
    const first = concurrent[0];
    for (const result of concurrent) assert.deepEqual(result, first);
    const duplicate = await library.add(
      "renamed.png",
      320,
      180,
      png,
      thumbnail,
    );
    assert.deepEqual(duplicate, first);
    const reopened = new LogoLibrary(root);
    assert.deepEqual(await reopened.list(), [first]);
    assert.deepEqual(await readFile(reopened.file(first.id)), png);
    assert.deepEqual(await readFile(reopened.file(first.id, true)), thumbnail);
    await assert.rejects(reopened.get("../outside"));
    assert.throws(() => reopened.file("../outside"));
    await writeFile(path.join(root, "a".repeat(64) + ".json"), "broken");
    assert.deepEqual(await reopened.list(), [first]);
    const second = await reopened.add(
      "other.png",
      100,
      100,
      Buffer.from("different pixels"),
      thumbnail,
    );
    assert.notEqual(second.id, first.id);
    assert.equal((await reopened.list()).length, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
