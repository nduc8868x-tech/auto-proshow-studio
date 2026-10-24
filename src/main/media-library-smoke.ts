import assert from "node:assert/strict";
import { app, type BrowserWindow } from "electron";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ProjectService } from "./project-service";
const pause = () => new Promise((resolve) => setTimeout(resolve, 75));
export async function testMediaLibraryUI(
  win: BrowserWindow,
  service: ProjectService,
  root: string,
) {
  async function idle() {
    for (let i = 0; i < 150; i++) {
      if (
        await win.webContents.executeJavaScript(
          "(()=>{const save=[...document.querySelectorAll('header button')].find(b=>b.textContent.trim()==='Lưu');return !!save&&!save.disabled})()",
        )
      )
        return;
      await pause();
    }
    throw Error("Media library UI busy");
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
  const created = await service.create(),
    id = created.project.id;
  await service.import(
    id,
    "images",
    ["1.png", "2.png", "10.png"].map((name) => path.join(root, name)),
  );
  const logos = await service.listLogos();
  assert.ok(
    logos.length >= 2,
    "Previously imported logos must be saved for other projects",
  );
  const before = logos.length;
  await service.import(id, "logo", [path.join(root, "1.png")]);
  assert.equal(
    (await service.listLogos()).length,
    before,
    "Identical logo must not duplicate the library",
  );
  await reload();
  assert.equal(
    await win.webContents.executeJavaScript(
      "document.querySelectorAll('.image-grid .thumbnail').length",
    ),
    3,
  );
  await win.webContents.executeJavaScript(
    "document.querySelector('.saved-logo-grid button').click()",
  );
  await pause();
  await idle();
  const logo = service.get(id).overlay.logo!;
  assert.ok(logo);
  assert.ok(
    (
      await readFile(
        await service.assetPath(service.get(id), logo.relativePath),
      )
    ).length > 0,
  );
  assert.equal(
    service.get(id).images.length,
    3,
    "Using a saved logo must not add it to slideshow images",
  );
  assert.deepEqual((await service.open(id)).project.overlay.logo, logo);
  const files = service.get(id).images.map((image) => ({ ...image }));
  async function removeFirst(count: number) {
    await idle();
    await win.webContents.executeJavaScript(
      "document.querySelector('.image-grid .delete-image').click()",
    );
    for (let i = 0; i < 150 && service.get(id).images.length !== count; i++)
      await pause();
    await idle();
    assert.equal(service.get(id).images.length, count);
    assert.equal(
      await win.webContents.executeJavaScript(
        "document.querySelectorAll('.image-grid .thumbnail').length",
      ),
      count,
    );
  }
  await removeFirst(2);
  assert.equal(
    service.get(id).voice,
    null,
    "Deletion must work before importing voice",
  );
  await service.import(id, "voice", [path.join(root, "voice.wav")]);
  const withVoice = service.get(id);
  await service.save({
    ...withVoice,
    clips: withVoice.clips.map((c) => ({ ...c, motionSpeed: 4 })),
  });
  await reload();
  const snapshot = structuredClone(service.get(id));
  await removeFirst(1);
  assert.equal(service.get(id).video.totalFrames, 240);
  assert.equal(service.get(id).clips[0].motionSpeed, 4);
  assert.equal(service.get(id).clips.at(-1)?.endFrame, 240);
  assert.equal(
    snapshot.images.length,
    2,
    "Existing queue snapshots must remain independent",
  );
  await removeFirst(0);
  assert.equal(service.get(id).clips.length, 0);
  assert.equal(service.get(id).video.totalFrames, 0);
  assert.equal(
    service.get(id).voice?.durationSeconds,
    snapshot.voice?.durationSeconds,
  );
  assert.equal((await service.open(id)).project.images.length, 0);
  for (const image of files)
    assert.ok(
      (await stat(await service.assetPath(service.get(id), image.relativePath)))
        .size > 0,
      "Project-owned media remains available to queued snapshots",
    );
  assert.ok((await stat(path.join(root, "1.png"))).size > 0);
  await win.webContents.executeJavaScript(
    "document.querySelector('.saved-logos').scrollIntoView({block:'center'})",
  );
  await win.webContents.executeJavaScript(
    "new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))",
  );
  await writeFile(
    path.join(
      root,
      app.isPackaged ? "packaged-media-library.png" : "dev-media-library.png",
    ),
    (
      await win.webContents.capturePage(undefined, {
        stayHidden: true,
        stayAwake: true,
      })
    ).toPNG(),
  );
}
