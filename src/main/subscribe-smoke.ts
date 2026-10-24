import assert from "node:assert/strict";
import { app, nativeImage, type BrowserWindow } from "electron";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import type { ProjectService } from "./project-service";
import {
  subscribeFrameIndex,
  subscribeFramePath,
  subscribeGeometry,
} from "../shared/subscribe";
import type { Project } from "../shared/project";
const pause = () => new Promise((resolve) => setTimeout(resolve, 75));
export async function testSubscribeUI(
  win: BrowserWindow,
  service: ProjectService,
  id: string,
  root: string,
) {
  async function idle() {
    for (let i = 0; i < 150; i++) {
      if (
        await win.webContents.executeJavaScript(
          "Array.from(document.querySelectorAll('header button')).every(b=>!b.disabled)",
        )
      )
        return;
      await pause();
    }
    throw Error("Subscribe editor busy");
  }
  async function clickAdd() {
    await idle();
    await win.webContents.executeJavaScript(
      "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='＋ Mẫu Subscribe').click()",
    );
    for (let i = 0; i < 300; i++) {
      if (
        service.get(id).subscribeClips.length &&
        (await win.webContents.executeJavaScript(
          "!!document.querySelector('.subscribe-clip')",
        ))
      )
        break;
      await pause();
    }
    await idle();
    assert.equal(service.get(id).subscribeClips.length, 1);
  }
  await clickAdd();
  const asset = service.get(id).subscribeAssets[0];
  assert.equal(asset.frameDurationsMs.length, 61);
  assert.equal(
    asset.frameDurationsMs.reduce((a, b) => a + b, 0),
    2030,
  );
  assert.ok(asset.width < 1280 && asset.height < 720);
  const hashes = new Set<string>();
  for (const index of [0, 15, 30, 45, 60]) {
    const bytes = await readFile(
      await service.assetPath(
        service.get(id),
        subscribeFramePath(asset.id, index),
      ),
    );
    hashes.add(createHash("sha256").update(bytes).digest("hex"));
    const bitmap = nativeImage.createFromBuffer(bytes).toBitmap();
    assert.equal(bitmap[3], 0);
    let opaque = 0;
    for (let i = 0; i < bitmap.length; i += 4)
      if (bitmap[i + 3] > 240) {
        opaque++;
        assert.ok(
          bitmap[i + 1] - Math.max(bitmap[i], bitmap[i + 2]) <= 25,
          "Green screen remains opaque",
        );
      }
    assert.ok(opaque > 100);
    if (index === 0)
      await writeFile(path.join(root, "subscribe-transparent.png"), bytes);
  }
  assert.ok(hashes.size > 1, "GIF must retain animation");
  await win.webContents.executeJavaScript(
    "document.querySelector('.subscribe-track').scrollIntoView({block:'center'})",
  );
  await pause();
  win.webContents.debugger.attach("1.3");
  try {
    async function drag(selector: string, dx: number) {
      const r = await win.webContents.executeJavaScript(
        "(()=>{const r=document.querySelector(" +
          JSON.stringify(selector) +
          ").getBoundingClientRect();const t=document.querySelector('.subscribe-track').getBoundingClientRect();return{x:r.x+r.width*.4,y:r.y+r.height*.5,w:t.width}})()",
      );
      for (const [type, offset, buttons] of [
        ["mouseMoved", 0, 0],
        ["mousePressed", 0, 1],
        ["mouseMoved", dx * r.w, 1],
        ["mouseReleased", dx * r.w, 0],
      ] as const)
        await win.webContents.debugger.sendCommand("Input.dispatchMouseEvent", {
          type,
          x: r.x + offset,
          y: r.y,
          button: "left",
          buttons,
          clickCount: 1,
        });
      await pause();
      await idle();
    }
    const before = service.get(id).subscribeClips[0].startFrame;
    await drag(".subscribe-clip", 0.125);
    assert.ok(
      service.get(id).subscribeClips[0].startFrame > before,
      "Pointer drag must move Subscribe in time",
    );
    const duration = service.get(id).subscribeClips[0].durationFrames;
    await drag(".subscribe-resize", 0.125);
    assert.ok(
      service.get(id).subscribeClips[0].durationFrames > duration,
      "Pointer resize must extend Subscribe duration",
    );
  } finally {
    win.webContents.debugger.detach();
  }
  await win.webContents.executeJavaScript(
    "document.querySelector('.subscribe-inspector .danger').click()",
  );
  for (let i = 0; i < 100 && service.get(id).subscribeClips.length; i++)
    await pause();
  assert.equal(service.get(id).subscribeClips.length, 0);
  await idle();
  await clickAdd();
  assert.equal(
    service.get(id).subscribeAssets.length,
    1,
    "Repeated template insertion must reuse decoded frames",
  );
  await win.webContents.executeJavaScript(
    "document.querySelector('.subscribe-clip').click()",
  );
  // Pointer selection is the normal UI action; click() alone does not trigger pointerdown.
  const r = await win.webContents.executeJavaScript(
    "(()=>{const r=document.querySelector('.subscribe-clip').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()",
  );
  win.webContents.sendInputEvent({
    type: "mouseDown",
    x: Math.round(r.x),
    y: Math.round(r.y),
    button: "left",
    clickCount: 1,
  });
  win.webContents.sendInputEvent({
    type: "mouseUp",
    x: Math.round(r.x),
    y: Math.round(r.y),
    button: "left",
    clickCount: 1,
  });
  await pause();
  for (const [label, value] of [
    ["Thời điểm Subscribe", 2],
    ["Thời lượng Subscribe", 3],
    ["Subscribe Ngang (%)", 30],
    ["Subscribe Dọc (%)", 55],
    ["Subscribe Kích thước (%)", 40],
  ] as const) {
    await win.webContents.executeJavaScript(
      "(()=>{const e=document.querySelector('[aria-label=\"" +
        label +
        "\"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e," +
        value +
        ");e.dispatchEvent(new Event('input',{bubbles:true}));})()",
    );
    await pause();
  }
  await win.webContents.executeJavaScript(
    "Array.from(document.querySelectorAll('.subscribe-inspector button')).find(b=>b.textContent==='Lưu chỉnh sửa').click()",
  );
  await pause();
  await idle();
  const clip = service.get(id).subscribeClips[0];
  assert.equal(clip.startFrame, 60);
  assert.equal(clip.durationFrames, 90);
  assert.equal(clip.width, 40);
  assert.equal(clip.x, 30);
  assert.equal(clip.y, 55);
  await win.webContents.executeJavaScript(
    "document.querySelector('.subscribe-loop input').click()",
  );
  await pause();
  await idle();
  assert.equal(service.get(id).subscribeClips[0].loop, true);
  await win.webContents.executeJavaScript(
    "Array.from(document.querySelectorAll('.preview button')).find(b=>b.textContent.trim()==='Chỉnh vị trí sub').click();document.querySelector('.player-stage').scrollIntoView({block:'center'})",
  );
  await pause();
  win.webContents.debugger.attach("1.3");
  try {
    async function previewDrag(selector: string, dx: number, dy: number) {
      const point = await win.webContents.executeJavaScript(
        "(()=>{const r=document.querySelector(" +
          JSON.stringify(selector) +
          ").getBoundingClientRect();const s=document.querySelector('.player-stage').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,w:s.width,h:s.height}})()",
      );
      for (const [type, offset, buttons] of [
        ["mouseMoved", 0, 0],
        ["mousePressed", 0, 1],
        ["mouseMoved", 1, 1],
        ["mouseReleased", 1, 0],
      ] as const) {
        await win.webContents.debugger.sendCommand("Input.dispatchMouseEvent", {
          type,
          x: point.x + offset * dx * point.w,
          y: point.y + offset * dy * point.h,
          button: "left",
          buttons,
          clickCount: 1,
        });
      }
      await pause();
      await idle();
    }
    const before = { ...service.get(id).subscribeClips[0] };
    await previewDrag(".subscribe-selection", 0.06, -0.08);
    const moved = service.get(id).subscribeClips[0];
    assert.ok(
      moved.x > before.x + 5 && moved.y < before.y - 7,
      "Preview drag must autosave position using stage coordinates",
    );
    await previewDrag(".subscribe-selection .resize-handle", 0.05, 0.02);
    const resized = service.get(id).subscribeClips[0];
    assert.ok(
      resized.width > before.width + 4,
      "Preview corner must resize Subscribe",
    );
    assert.equal(resized.startFrame, before.startFrame);
    assert.equal(resized.durationFrames, before.durationFrames);
    assert.equal(
      await win.webContents.executeJavaScript(
        "Number(document.querySelector('[aria-label=\"Subscribe Ngang (%)\"]').value)",
      ),
      Number(resized.x.toFixed(2)),
      "Timeline inspector must reflect preview drag",
    );
    await win.webContents.executeJavaScript(
      "new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))",
    );
    await writeFile(
      path.join(
        root,
        app.isPackaged
          ? "packaged-subscribe-preview.png"
          : "dev-subscribe-preview.png",
      ),
      (
        await win.webContents.capturePage(undefined, {
          stayHidden: true,
          stayAwake: true,
        })
      ).toPNG(),
    );
  } finally {
    win.webContents.debugger.detach();
  }
  await win.webContents.executeJavaScript(
    "Array.from(document.querySelectorAll('.preview button')).find(b=>b.textContent.trim()==='Xong chỉnh sub').click()",
  );
  const original = { ...service.get(id).subscribeClips[0] };
  async function waitCount(count: number) {
    for (let i = 0; i < 150; i++) {
      if (
        service.get(id).subscribeClips.length === count &&
        (await win.webContents.executeJavaScript(
          "document.querySelectorAll('.subscribe-clip').length===" + count,
        ))
      ) {
        await idle();
        await pause();
        return;
      }
      await pause();
    }
    throw Error("Subscribe copy/paste count did not reach " + count);
  }
  async function seekSixSeconds() {
    await win.webContents.executeJavaScript(
      "document.querySelector('.subscribe-track').scrollIntoView({block:'center'})",
    );
    await pause();
    const position = await win.webContents.executeJavaScript(
      "(()=>{const r=document.querySelector('.subscribe-track').getBoundingClientRect();return{x:r.x+r.width*.75,y:r.y+r.height/2}})()",
    );
    for (const type of ["mousePressed", "mouseReleased"])
      await win.webContents.debugger.sendCommand("Input.dispatchMouseEvent", {
        type,
        x: position.x,
        y: position.y,
        button: "left",
        buttons: type === "mousePressed" ? 1 : 0,
        clickCount: 1,
      });
    await pause();
  }
  async function shortcut(key: string) {
    for (const type of ["keyDown", "keyUp"])
      await win.webContents.debugger.sendCommand("Input.dispatchKeyEvent", {
        type,
        key: key.toLowerCase(),
        code: "Key" + key,
        windowsVirtualKeyCode: key.charCodeAt(0),
        modifiers: 2,
      });
    await pause();
  }
  win.webContents.debugger.attach("1.3");
  try {
    await win.webContents.executeJavaScript(
      "document.querySelector('[aria-label=\"Sao chép Subscribe\"]').click()",
    );
    await seekSixSeconds();
    await win.webContents.executeJavaScript(
      "document.querySelector('[aria-label=\"Dán Subscribe tại playhead\"]').click()",
    );
    await waitCount(2);
    const pasted = service.get(id).subscribeClips[1];
    assert.notEqual(pasted.id, original.id);
    assert.deepEqual(pasted, {
      ...original,
      id: pasted.id,
      startFrame: 180,
      durationFrames: 60,
    });
    assert.deepEqual(service.get(id).subscribeClips[0], original);
    assert.equal(service.get(id).subscribeAssets.length, 1);
    // Select the source through the selector, including when clips overlap.
    await win.webContents.executeJavaScript(
      "(()=>{const e=document.querySelector('[aria-label=\"Chọn đoạn Subscribe\"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e," +
        JSON.stringify(original.id) +
        ");e.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('.subscribe-track').focus()})()",
    );
    await pause();
    await shortcut("C");
    await seekSixSeconds();
    await shortcut("V");
    await waitCount(3);
    const keyboardPaste = service.get(id).subscribeClips[2];
    assert.deepEqual(keyboardPaste, {
      ...original,
      id: keyboardPaste.id,
      startFrame: 180,
      durationFrames: 60,
    });
    assert.notEqual(keyboardPaste.id, pasted.id);
    const layout = await win.webContents.executeJavaScript(
      "(()=>{const clips=[...document.querySelectorAll('.subscribe-clip')];return{tops:clips.map(e=>e.getBoundingClientRect().top),height:document.querySelector('.subscribe-track').getBoundingClientRect().height,options:document.querySelector('[aria-label=\"Chọn đoạn Subscribe\"]').options.length}})()",
    );
    assert.equal(
      new Set(layout.tops).size,
      1,
      "All Subscribe clips must share one timeline row",
    );
    assert.ok(layout.height <= 50, "Track must not grow with clip count");
    assert.equal(layout.options, 4);
    // Native text editing must keep Ctrl+C/V and must not create another clip.
    const intercepted = await win.webContents.executeJavaScript(
      "(()=>{const e=document.querySelector('[aria-label=\"Thời điểm Subscribe\"]');e.focus();return ['c','v'].map(key=>{const event=new KeyboardEvent('keydown',{key,ctrlKey:true,bubbles:true,cancelable:true});e.dispatchEvent(event);return event.defaultPrevented})})()",
    );
    assert.deepEqual(intercepted, [false, false]);
    assert.equal(service.get(id).subscribeClips.length, 3);
    const saved = await service.open(id);
    assert.deepEqual(
      saved.project.subscribeClips,
      service.get(id).subscribeClips,
    );
    await win.webContents.executeJavaScript(
      "new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))",
    );
    await writeFile(
      path.join(
        root,
        app.isPackaged
          ? "packaged-subscribe-copy.png"
          : "dev-subscribe-copy.png",
      ),
      (
        await win.webContents.capturePage(undefined, {
          stayHidden: true,
          stayAwake: true,
        })
      ).toPNG(),
    );
    // Restore the isolated 2–5 second overlay used by the MP4 pixel checks.
    for (const count of [2, 1]) {
      await win.webContents.executeJavaScript(
        "document.querySelector('.subscribe-inspector .danger').click()",
      );
      await waitCount(count);
      if (count === 2) {
        await win.webContents.executeJavaScript(
          "(()=>{const e=document.querySelector('[aria-label=\"Chọn đoạn Subscribe\"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e," +
            JSON.stringify(pasted.id) +
            ");e.dispatchEvent(new Event('change',{bubbles:true}))})()",
        );
        await pause();
      }
    }
    assert.deepEqual(service.get(id).subscribeClips, [original]);
  } finally {
    win.webContents.debugger.detach();
  }
  const reopened = await service.open(id);
  assert.deepEqual(
    reopened.project.subscribeClips,
    service.get(id).subscribeClips,
  );
  await win.webContents.executeJavaScript(
    "new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))",
  );
  await writeFile(
    path.join(
      root,
      app.isPackaged
        ? "packaged-subscribe-timeline.png"
        : "dev-subscribe-timeline.png",
    ),
    (
      await win.webContents.capturePage(undefined, {
        stayHidden: true,
        stayAwake: true,
      })
    ).toPNG(),
  );
  await win.webContents.executeJavaScript("window.scrollTo(0,0)");
}
export async function verifySubscribeOutput(
  ffmpeg: string,
  output: string,
  project: Project,
  service: ProjectService,
  root: string,
) {
  const clip = project.subscribeClips[0],
    asset = project.subscribeAssets[0];
  const g = subscribeGeometry(
    clip,
    asset,
    project.video.width,
    project.video.height,
  );
  for (const seconds of [1, 3, 4.2, 6]) {
    const bytes = execFileSync(
      ffmpeg,
      [
        "-v",
        "error",
        "-ss",
        String(seconds),
        "-i",
        output,
        "-an",
        "-frames:v",
        "1",
        "-c:v",
        "png",
        "-f",
        "image2pipe",
        "pipe:1",
      ],
      { windowsHide: true, maxBuffer: 20 * 1024 ** 2, timeout: 15000 },
    );
    const frame = nativeImage.createFromBuffer(bytes),
      bitmap = frame.toBitmap();
    const local = Math.max(
      0,
      Math.round(seconds * project.video.fps) - clip.startFrame,
    );
    const index = subscribeFrameIndex(
      asset.frameDurationsMs,
      local,
      project.video.fps,
      clip.loop,
    );
    const template = nativeImage.createFromBuffer(
      await readFile(
        await service.assetPath(project, subscribeFramePath(asset.id, index)),
      ),
    );
    const pixels = template.toBitmap(),
      s = template.getSize();
    let count = 0,
      matched = 0;
    for (let y = 2; y < s.height - 2; y += 2)
      for (let x = 2; x < s.width - 2; x += 2) {
        const at = (y * s.width + x) * 4;
        if (
          pixels[at + 3] < 250 ||
          pixels[at + 7] < 250 ||
          pixels[at - 1] < 250
        )
          continue;
        if (
          Math.max(pixels[at], pixels[at + 1], pixels[at + 2]) -
            Math.min(pixels[at], pixels[at + 1], pixels[at + 2]) <
            20 &&
          pixels[at] < 220
        )
          continue;
        const tx = Math.min(
          project.video.width - 1,
          Math.floor(
            (project.video.width * (g.x + (g.width * (x + 0.5)) / s.width)) /
              100,
          ),
        );
        const ty = Math.min(
          project.video.height - 1,
          Math.floor(
            (project.video.height * (g.y + (g.height * (y + 0.5)) / s.height)) /
              100,
          ),
        );
        const target = (ty * project.video.width + tx) * 4;
        count++;
        if (
          [0, 1, 2].every(
            (c) => Math.abs(bitmap[target + c] - pixels[at + c]) < 80,
          )
        )
          matched++;
      }
    assert.ok(count > 50);
    if (seconds >= 2 && seconds < 5)
      assert.ok(
        matched / count > 0.7,
        "Subscribe frame mismatch at " + seconds + ": " + matched / count,
      );
    else
      assert.ok(
        matched / count < 0.4,
        "Subscribe visible outside its scheduled interval: " + seconds,
      );
    await writeFile(path.join(root, "subscribe-at-" + seconds + ".png"), bytes);
  }
}
