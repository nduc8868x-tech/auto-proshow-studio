import assert from "node:assert/strict";
import { app, type BrowserWindow } from "electron";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ProjectService } from "./project-service";
import { subscribeFramePath } from "../shared/subscribe";
import {
  subscribePresets,
  type SubscribePresetId,
} from "../shared/subscribe-presets";
const pause = () => new Promise((resolve) => setTimeout(resolve, 100));
export async function testProjectCopyAndPresets(
  win: BrowserWindow,
  service: ProjectService,
  sourceId: string,
  root: string,
) {
  async function idle() {
    for (let i = 0; i < 200; i++) {
      if (
        await win.webContents.executeJavaScript(
          "(()=>{const b=[...document.querySelectorAll('header button')].find(b=>b.textContent.trim()==='Lưu');return !!b&&!b.disabled})()",
        )
      ) {
        await pause();
        return;
      }
      await pause();
    }
    throw Error("Project copy/preset UI busy");
  }
  async function reload() {
    const loaded = new Promise<void>((resolve) =>
      win.webContents.once("did-finish-load", () => resolve()),
    );
    win.webContents.reload();
    await loaded;
    await new Promise((resolve) => setTimeout(resolve, 800));
    await idle();
  }
  async function currentId() {
    return (await win.webContents.executeJavaScript(
      "document.querySelector('[aria-label=\"Mở dự án\"]').value",
    )) as string;
  }
  async function waitCopy(previous: string) {
    for (let i = 0; i < 200; i++) {
      const id = await currentId();
      if (id !== previous) {
        await idle();
        return id;
      }
      await pause();
    }
    throw Error("Copy button did not open an independent project");
  }
  await idle();
  const source = structuredClone(service.get(sourceId));
  await win.webContents.executeJavaScript(
    "[...document.querySelectorAll('header button')].find(b=>b.textContent.includes('Sao chép dự án')).click()",
  );
  const copyId = await waitCopy(sourceId),
    copy = service.get(copyId);
  assert.notEqual(copyId, sourceId);
  assert.ok(copy.name.endsWith("Bản sao"));
  assert.equal(copy.images.length, source.images.length);
  assert.equal(copy.overlay.layout.fontSize, source.overlay.layout.fontSize);
  assert.equal(copy.visual.motionSpeed, source.visual.motionSpeed);
  for (const [original, cloned] of source.images.map((image, i) => [
    image,
    copy.images[i],
  ])) {
    assert.notEqual(original.id, cloned.id);
    assert.deepEqual(
      await readFile(await service.assetPath(source, original.relativePath)),
      await readFile(await service.assetPath(copy, cloned.relativePath)),
    );
  }
  for (const [original, cloned] of [
    [source.voice!, copy.voice!],
    [source.overlay.logo!, copy.overlay.logo!],
  ]) {
    assert.notEqual(original.id, cloned.id);
    assert.deepEqual(
      await readFile(await service.assetPath(source, original.relativePath)),
      await readFile(await service.assetPath(copy, cloned.relativePath)),
    );
  }
  assert.notEqual(source.subscribeAssets[0].id, copy.subscribeAssets[0].id);
  assert.deepEqual(
    await readFile(
      await service.assetPath(
        source,
        subscribeFramePath(source.subscribeAssets[0].id, 0),
      ),
    ),
    await readFile(
      await service.assetPath(
        copy,
        subscribeFramePath(copy.subscribeAssets[0].id, 0),
      ),
    ),
  );
  assert.equal(
    await win.webContents.executeJavaScript(
      "document.querySelector('[aria-label=\"Áp dụng Mẫu 1 Subscribe\"]').disabled",
    ),
    true,
    "8-second video must not silently shorten a 10-second preset",
  );
  await win.webContents.executeJavaScript(
    "document.querySelector('[aria-label=\"Thay sub hiện có khi áp dụng mẫu\"]').click()",
  );
  async function apply(preset: SubscribePresetId, expectedCount: number) {
    const config = subscribePresets[preset];
    await idle();
    await win.webContents.executeJavaScript(
      "document.querySelector('[aria-label=\"Áp dụng " +
        config.label +
        " Subscribe\"]').click()",
    );
    for (
      let i = 0;
      i < 200 && service.get(copyId).subscribeClips.length !== expectedCount;
      i++
    )
      await pause();
    await idle();
    const p = service.get(copyId),
      clips = p.subscribeClips.slice(-config.count);
    assert.equal(p.subscribeClips.length, expectedCount);
    assert.equal(clips[0].startFrame, 0);
    assert.equal(
      clips.at(-1)!.startFrame + clips.at(-1)!.durationFrames,
      p.video.totalFrames,
    );
    for (const c of clips) {
      assert.deepEqual(
        [c.durationFrames, c.x, c.y, c.width, c.loop],
        [config.seconds * p.video.fps, config.x, config.y, config.width, true],
      );
      assert.equal(
        p.subscribeAssets.find((a) => a.id === c.assetId)?.removeGreen,
        true,
      );
    }
    assert.equal(p.subscribeAssets.length, 1, "Presets reuse decoded GIF");
    assert.deepEqual(
      (await service.open(copyId)).project.subscribeClips,
      p.subscribeClips,
    );
  }
  await apply("five", 5);
  await win.webContents.executeJavaScript(
    "document.querySelector('[aria-label=\"Thay sub hiện có khi áp dụng mẫu\"]').click()",
  );
  await apply("five", 10);
  const wav = await readFile(path.join(root, "voice.wav")),
    seconds = 180,
    dataBytes = wav.readUInt32LE(28) * seconds,
    voice = Buffer.alloc(44 + dataBytes);
  wav.copy(voice, 0, 0, 44);
  voice.writeUInt32LE(voice.length - 8, 4);
  voice.writeUInt32LE(dataBytes, 40);
  const voiceFile = path.join(root, "preset-voice-180.wav");
  await writeFile(voiceFile, voice);
  await service.import(copyId, "voice", [voiceFile]);
  await reload();
  await win.webContents.executeJavaScript(
    "document.querySelector('[aria-label=\"Thay sub hiện có khi áp dụng mẫu\"]').click()",
  );
  await apply("fifteen", 15);
  assert.equal(service.get(copyId).video.totalFrames, 5400);
  await win.webContents.executeJavaScript(
    "document.querySelector('.subscribe-presets').scrollIntoView({block:'center'});new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))",
  );
  await writeFile(
    path.join(
      root,
      app.isPackaged
        ? "packaged-subscribe-presets.png"
        : "dev-subscribe-presets.png",
    ),
    (
      await win.webContents.capturePage(undefined, {
        stayHidden: true,
        stayAwake: true,
      })
    ).toPNG(),
  );
  await win.webContents.executeJavaScript(
    "[...document.querySelectorAll('nav button')].find(b=>b.textContent.includes('Quản lý dự án')).click()",
  );
  for (
    let i = 0;
    i < 100 &&
    !(await win.webContents.executeJavaScript(
      "!!document.querySelector('.project-row.current')",
    ));
    i++
  )
    await pause();
  await win.webContents.executeJavaScript(
    "[...document.querySelectorAll('.project-row.current .project-actions button')].find(b=>b.textContent==='Sao chép').click()",
  );
  const secondId = await waitCopy(copyId),
    second = service.get(secondId);
  assert.equal(second.subscribeClips.length, 15);
  assert.notEqual(
    second.subscribeAssets[0].id,
    service.get(copyId).subscribeAssets[0].id,
  );
  assert.deepEqual(service.get(sourceId).subscribeClips, source.subscribeClips);
  await service.renameProject(sourceId, service.get(sourceId).name);
  await reload();
  assert.equal(await currentId(), sourceId);
}
