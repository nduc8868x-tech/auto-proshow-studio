import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { MediaServer } from "../src/main/media-server";
test("token isolation, ranges, invalid paths and HEAD", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "proshow-test-")),
    file = path.join(dir, "voice.wav"),
    server = new MediaServer();
  try {
    await writeFile(file, "0123456789");
    await server.start();
    const url = server.register("voice", file);
    assert.equal(await (await fetch(url)).text(), "0123456789");
    const partial = await fetch(url, { headers: { Range: "bytes=2-5" } });
    assert.equal(partial.status, 206);
    assert.equal(await partial.text(), "2345");
    assert.equal(
      (await fetch(url, { headers: { Range: "bytes=20-" } })).status,
      416,
    );
    assert.equal((await fetch(url.replace("/voice", "/unknown"))).status, 404);
    assert.equal((await fetch(new URL("/bad/voice", url))).status, 404);
    const head = await fetch(url, { method: "HEAD" });
    assert.equal(head.headers.get("content-length"), "10");
    assert.equal(await head.text(), "");
  } finally {
    server.close();
    await rm(dir, { recursive: true, force: true });
  }
});
