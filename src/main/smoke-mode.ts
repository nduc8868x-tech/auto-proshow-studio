import { execFileSync } from "node:child_process";
import { app, type BrowserWindow, session, nativeImage } from "electron";
import { stat, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { makeCancelSignal } from "@remotion/renderer";
import { type RenderDetails } from "../render-video";
import type { RenderQueue } from "./render-queue";
import { generateTimeline } from "../shared/project";
import { overlayGeometry } from "../shared/overlay-layout";
import { renderVideo } from "../render-video";
import { ProjectService } from "./project-service";
import { testSubscribeUI, verifySubscribeOutput } from "./subscribe-smoke";
import { testMediaLibraryUI } from "./media-library-smoke";
export async function runAppSmoke(
  win: BrowserWindow,
  service: ProjectService,
  root: string,
  queue: RenderQueue,
) {
  try {
    async function waitForIdle(selector = "header button") {
      for (let i = 0; i < 100; i++) {
        if (
          await win.webContents.executeJavaScript(
            "(()=>{const buttons=Array.from(document.querySelectorAll(" +
              JSON.stringify(selector) +
              "));return buttons.length>0 && buttons.every(b=>!b.disabled)})()",
          )
        )
          return;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      throw Error("Editor did not finish its pending operation: " + selector);
    }
    async function capture(filename: string) {
      await win.webContents.executeJavaScript(
        "new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(null))))",
      );
      await writeFile(
        path.join(root, filename),
        (
          await win.webContents.capturePage(undefined, {
            stayHidden: true,
            stayAwake: true,
          })
        ).toPNG(),
      );
    }
    // Deny outgoing Internet from the Electron session; headless composition uses only loopback URLs.
    session.defaultSession.webRequest.onBeforeRequest(
      { urls: ["http://*/*", "https://*/*"] },
      (details, callback) =>
        callback({
          cancel:
            !details.url.startsWith("http://127.0.0.1:") &&
            !details.url.startsWith("http://localhost:"),
        }),
    );
    for (const format of ["jpeg", "webp"]) {
      const encoded: string = await win.webContents.executeJavaScript(
        '(()=>{const c=document.createElement("canvas");c.width=640;c.height=360;const ctx=c.getContext("2d");ctx.fillStyle="#b26541";ctx.fillRect(0,0,640,360);return c.toDataURL("image/' +
          format +
          '");})()',
      );
      assert.ok(encoded.startsWith("data:image/" + format));
      const filename = path.join(root, "format-test." + format);
      await writeFile(filename, Buffer.from(encoded.split(",")[1], "base64"));
      const testProject = await service.create();
      const imported = await service.import(testProject.project.id, "images", [
        filename,
      ]);
      assert.equal(imported.project.images[0].width, 640);
      assert.equal(imported.project.images[0].height, 360);
    }
    // EXIF orientation 6: a 640x360 JPEG must import as 360x640.
    const jpeg = await import("node:fs/promises").then((fs) =>
      fs.readFile(path.join(root, "format-test.jpeg")),
    );
    const exif = Buffer.alloc(32);
    exif.write("Exif\0\0", 0, "binary");
    exif.write("II", 6);
    exif.writeUInt16LE(42, 8);
    exif.writeUInt32LE(8, 10);
    exif.writeUInt16LE(1, 14);
    exif.writeUInt16LE(0x112, 16);
    exif.writeUInt16LE(3, 18);
    exif.writeUInt32LE(1, 20);
    exif.writeUInt16LE(6, 24);
    const rotated = path.join(root, "xoay-ảnh.jpeg");
    await writeFile(
      rotated,
      Buffer.concat([
        jpeg.subarray(0, 2),
        Buffer.from([255, 225, 0, 34]),
        exif,
        jpeg.subarray(2),
      ]),
    );
    const rotationProject = await service.create(),
      rotation = await service.import(rotationProject.project.id, "images", [
        rotated,
      ]);
    assert.equal(rotation.project.images[0].width, 360);
    assert.equal(rotation.project.images[0].height, 640);
    const mixedProject = await service.create();
    const mixed = await service.import(
      mixedProject.project.id,
      "images",
      Array.from({ length: 16 }, (_, i) =>
        path.join(
          root,
          i < 5
            ? "white_1x1.avif"
            : i < 11
              ? "format-test.jpeg"
              : "format-test.webp",
        ),
      ),
    );
    assert.equal(mixed.project.images.length, 16);
    assert.equal(mixed.importReport?.imported, 16);
    assert.deepEqual(mixed.importReport?.errors, []);
    const broken = path.join(root, "broken.jpg");
    await writeFile(broken, "not an image");
    const partial = await service.import(mixedProject.project.id, "images", [
      path.join(root, "1.png"),
      broken,
    ]);
    assert.equal(partial.importReport?.imported, 1);
    assert.equal(partial.importReport?.errors.length, 1);
    const initial = await service.create(),
      id = initial.project.id;
    assert.equal(initial.project.visual.motionSpeed, 3);
    assert.equal(initial.project.visual.fitMode, "contain-blur");
    await service.import(
      id,
      "images",
      ["10.png", "2.png", "1.png"].map((file) => path.join(root, file)),
    );
    const withVoice = await service.import(id, "voice", [
      path.join(root, "voice.wav"),
    ]);
    assert.deepEqual(
      withVoice.project.images.map((i) => i.originalName),
      ["1.png", "2.png", "10.png"],
    );
    const withLogo = await service.import(id, "logo", [
      path.join(root, "format-test.webp"),
    ]);
    const replacement = await service.import(id, "logo", [
      path.join(root, "1.png"),
    ]);
    assert.notEqual(
      withLogo.project.overlay.logo?.id,
      replacement.project.overlay.logo?.id,
    );
    const reversed = await service.save({
      ...replacement.project,
      overlay: {
        ...replacement.project.overlay,
        enabled: true,
        title: "TIÊU ĐỀ TUỲ CHỈNH",
        layout: {
          ...replacement.project.overlay.layout,
          x: 12,
          y: 15,
          width: 76,
          height: 12,
          fontSize: 50,
          autoFit: false,
        },
      },
      name: "Kiểm thử tiếng Việt",
      visual: { ...replacement.project.visual, motionSpeed: 1.5 },
      clips: replacement.project.clips.map((clip, index) =>
        index === 0 ? { ...clip, motionSpeed: 2 } : clip,
      ),
      images: [...withVoice.project.images].reverse(),
    });
    const reopened = await service.open(id);
    assert.deepEqual(reopened.project.images, reversed.project.images);
    assert.equal(reopened.project.overlay.layout.y, 15);
    assert.equal(reopened.project.overlay.layout.fontSize, 50);
    assert.equal(reopened.project.visual.motionSpeed, 1.5);
    const sacrificial = await service.create(),
      sacrificialId = sacrificial.project.id;
    await service.import(sacrificialId, "images", [path.join(root, "1.png")]);
    const renamed = await service.renameProject(
      sacrificialId,
      "Temporary rename test",
    );
    assert.equal(renamed.name, "Temporary rename test");
    assert.equal(renamed.imageCount, 1);
    const sentinel = path.join(root, "trash-keeps-export.txt");
    await writeFile(sentinel, "Keep exported files");
    const sourceBefore = (await stat(path.join(root, "1.png"))).size;
    await service.trashProject(sacrificialId);
    assert.ok(
      !(await service.list()).some((project) => project.id === sacrificialId),
    );
    await assert.rejects(stat(service.folder(sacrificialId)));
    assert.equal((await stat(path.join(root, "1.png"))).size, sourceBefore);
    assert.ok((await stat(sentinel)).size > 0);
    await assert.rejects(service.trashProject("../outside"));
    await testMediaLibraryUI(win, service, root);
    await service.renameProject(id, "Kiểm thử tiếng Việt");
    await queue.pause(true);
    const protectedJob = await queue.enqueue(
      reopened.project,
      path.join(root, "delete-protection.mp4"),
    );
    await assert.rejects(service.trashProject(id));
    assert.ok((await service.open(id)).project.id === id);
    await queue.cancel(protectedJob.id);
    // Reload UI to exercise preload + renderer initialization against persisted data.
    const loaded = new Promise<void>((resolve) =>
      win.webContents.once("did-finish-load", () => resolve()),
    );
    win.webContents.reload();
    await loaded;
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const text = await win.webContents.executeJavaScript(
      "document.body.innerText",
    );
    assert.ok(text.includes("Auto ProShow"));
    assert.ok(text.includes("voice.wav"));
    assert.ok(text.includes("240 frames"));
    await capture(app.isPackaged ? "packaged-editor.png" : "dev-editor.png");
    const speedInput = await win.webContents.executeJavaScript(
      "(()=>{const e=document.querySelector('[aria-label=\"Tốc độ chuyển động toàn dự án\"]');return {min:e.min,max:e.max};})()",
    );
    assert.deepEqual(speedInput, { min: "0", max: "10" });
    for (const value of [0, 10, 3]) {
      await waitForIdle();
      await win.webContents.executeJavaScript(
        "(()=>{const e=document.querySelector('[aria-label=\"Tốc độ chuyển động toàn dự án\"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e," +
          value +
          ");e.dispatchEvent(new Event('input',{bubbles:true}));})()",
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
      await win.webContents.executeJavaScript(
        "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Lưu').click()",
      );
      for (
        let i = 0;
        i < 30 && service.get(id).visual.motionSpeed !== value;
        i++
      )
        await new Promise((resolve) => setTimeout(resolve, 100));
      assert.equal(service.get(id).visual.motionSpeed, value);
      await waitForIdle();
    }
    // Exercise a native HTML drag from the first timeline image to after the last image.
    const originalOrder = service.get(id).images.map((image) => image.id);
    const originalClipSpeeds = service.get(id).clips.map((clip) => ({
      imageId: clip.imageId,
      speed: clip.motionSpeed,
    }));
    await win.webContents.executeJavaScript(
      "document.querySelector('.timeline-track').scrollIntoView({block:'center'})",
    );
    await new Promise((resolve) => setTimeout(resolve, 150));
    const points = await win.webContents.executeJavaScript(
      "(()=>{const nodes=document.querySelectorAll('.timeline-clip');const a=nodes[0].getBoundingClientRect(),b=nodes[nodes.length-1].getBoundingClientRect();return {x:a.x+a.width*.3,y:a.y+a.height*.5,toX:b.right-12,toY:b.y+b.height*.5};})()",
    );
    win.webContents.debugger.attach("1.3");
    try {
      const intercepted = new Promise<{
        items: unknown[];
        dragOperationsMask: number;
      }>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(Error("Native timeline drag was not intercepted")),
          5000,
        );
        const listener = (
          _event: unknown,
          method: string,
          params: { data: { items: unknown[]; dragOperationsMask: number } },
        ) => {
          if (method === "Input.dragIntercepted") {
            clearTimeout(timeout);
            win.webContents.debugger.removeListener("message", listener);
            resolve(params.data);
          }
        };
        win.webContents.debugger.on("message", listener);
      });
      await win.webContents.debugger.sendCommand("Input.setInterceptDrags", {
        enabled: true,
      });
      for (const [type, x, buttons] of [
        ["mouseMoved", points.x, 0],
        ["mousePressed", points.x, 1],
        ["mouseMoved", points.x + 25, 1],
      ] as const)
        await win.webContents.debugger.sendCommand("Input.dispatchMouseEvent", {
          type,
          x,
          y: points.y,
          button: "left",
          buttons,
          clickCount: 1,
        });
      const data = await intercepted;
      for (const type of ["dragEnter", "dragOver", "drop"])
        await win.webContents.debugger.sendCommand("Input.dispatchDragEvent", {
          type,
          x: points.toX,
          y: points.toY,
          data,
        });
      await win.webContents.debugger.sendCommand("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: points.toX,
        y: points.toY,
        button: "left",
        buttons: 0,
        clickCount: 1,
      });
    } finally {
      win.webContents.debugger.detach();
    }
    const expectedOrder = [...originalOrder.slice(1), originalOrder[0]];
    for (
      let i = 0;
      i < 30 && service.get(id).images[0].id === originalOrder[0];
      i++
    )
      await new Promise((resolve) => setTimeout(resolve, 100));
    assert.deepEqual(
      service.get(id).images.map((image) => image.id),
      expectedOrder,
    );
    assert.equal(service.get(id).video.totalFrames, 240);
    await waitForIdle();
    for (const original of originalClipSpeeds)
      assert.equal(
        service.get(id).clips.find((clip) => clip.imageId === original.imageId)!
          .motionSpeed,
        original.speed,
      );
    await capture(
      app.isPackaged ? "packaged-timeline-drag.png" : "dev-timeline-drag.png",
    );
    await win.webContents.executeJavaScript("window.scrollTo(0,0)");
    await win.webContents.executeJavaScript(
      "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Quản lý dự án')).click()",
    );
    await new Promise((resolve) => setTimeout(resolve, 700));
    assert.ok(
      await win.webContents.executeJavaScript(
        "!!document.querySelector('.project-manager')",
      ),
    );
    assert.ok(
      await win.webContents.executeJavaScript(
        "document.querySelectorAll('.project-card').length>0",
      ),
    );
    assert.ok(
      await win.webContents.executeJavaScript(
        "Array.from(document.querySelectorAll('.project-row')).every(row=>row.getBoundingClientRect().height<130 && row.querySelectorAll('time').length===2 && row.querySelector('.danger'))",
      ),
    );
    await capture(
      app.isPackaged ? "packaged-project-rows.png" : "dev-project-rows.png",
    );
    const uiName = "Đổi tên giao diện " + id.slice(0, 8);
    await win.webContents.executeJavaScript(
      "Array.from(document.querySelector('.project-card.current').querySelectorAll('button')).find(b=>b.textContent.trim()==='Đổi tên').click()",
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    await win.webContents.executeJavaScript(
      "(()=>{const input=document.querySelector('.project-card.current form input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input," +
        JSON.stringify(uiName) +
        ");input.dispatchEvent(new Event('input',{bubbles:true}));})()",
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    await win.webContents.executeJavaScript(
      "document.querySelector('.project-card.current form').requestSubmit()",
    );
    for (let i = 0; i < 30 && service.get(id).name !== uiName; i++)
      await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(
      service.get(id).name,
      uiName,
      "Project manager rename persists",
    );
    await waitForIdle("[aria-label='Đóng quản lý dự án']");
    await win.webContents.executeJavaScript(
      "(()=>{const input=document.querySelector('[aria-label=\"Tìm dự án\"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input," +
        JSON.stringify("doi ten giao dien " + id.slice(0, 8)) +
        ");input.dispatchEvent(new Event('input',{bubbles:true}));})()",
    );
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.equal(
      await win.webContents.executeJavaScript(
        "document.querySelectorAll('.project-card').length",
      ),
      1,
    );
    await capture(
      app.isPackaged
        ? "packaged-project-manager.png"
        : "dev-project-manager.png",
    );
    await win.webContents.executeJavaScript(
      "document.querySelector('[aria-label=\"Đóng quản lý dự án\"]').click()",
    );
    await win.webContents.executeJavaScript(
      "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Chỉnh vị trí').click()",
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    const rect = await win.webContents.executeJavaScript(
      "(()=>{const r=document.querySelector('.overlay-selection').getBoundingClientRect();return {x:r.x+r.width*.4,y:r.y+r.height*.4};})()",
    );
    win.webContents.debugger.attach("1.3");
    try {
      await win.webContents.debugger.sendCommand("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: rect.x,
        y: rect.y,
      });
      await win.webContents.debugger.sendCommand("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: rect.x,
        y: rect.y,
        button: "left",
        buttons: 1,
        clickCount: 1,
      });
      await win.webContents.debugger.sendCommand("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: rect.x + 12,
        y: rect.y + 20,
        button: "left",
        buttons: 1,
      });
      await win.webContents.debugger.sendCommand("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: rect.x + 12,
        y: rect.y + 20,
        button: "left",
        buttons: 0,
        clickCount: 1,
      });
      await new Promise((resolve) => setTimeout(resolve, 150));
      const handle = await win.webContents.executeJavaScript(
        "(()=>{const r=document.querySelector('.resize-handle').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()",
      );
      for (const [type, dx, dy, buttons] of [
        ["mouseMoved", 0, 0, 0],
        ["mousePressed", 0, 0, 1],
        ["mouseMoved", -25, 12, 1],
        ["mouseReleased", -25, 12, 0],
      ] as const)
        await win.webContents.debugger.sendCommand("Input.dispatchMouseEvent", {
          type,
          x: handle.x + dx,
          y: handle.y + dy,
          button: "left",
          buttons,
          clickCount: 1,
        });
    } finally {
      win.webContents.debugger.detach();
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
    await win.webContents.executeJavaScript(
      "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Lưu').click()",
    );
    for (let i = 0; i < 30; i++) {
      if (service.get(id).overlay.layout.y > 15) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(
      service.get(id).overlay.layout.y > 15,
      "Preview dragging must update stored title position",
    );
    const currentOverlay = service.get(id).overlay.layout;
    assert.ok(currentOverlay.x > 12);
    assert.ok(currentOverlay.width < 76, "Resize handle updates banner width");
    assert.ok(
      currentOverlay.height > 12,
      "Resize handle updates banner height",
    );
    await capture("title-drag-editor.png");
    await waitForIdle();
    await testSubscribeUI(win, service, id, root);
    const cacheStarted = Date.now();
    const renderSnapshot = await service.renderView(service.get(id));
    const cachePreparationMs = Date.now() - cacheStarted;
    assert.equal(Object.keys(renderSnapshot.backgrounds ?? {}).length, 3);
    const cachedBefore = (await import("node:fs/promises")).readdir(
      path.join(service.folder(id), "render-cache"),
    );
    const cachedAgain = await service.renderView(service.get(id));
    assert.deepEqual(cachedAgain.backgrounds, renderSnapshot.backgrounds);
    assert.equal((await cachedBefore).length, 3);
    await writeFile(
      path.join(root, "cached-assets.json"),
      JSON.stringify(
        {
          cachePreparationMs,
          assets: service.get(id).images.map((image) => {
            const background = renderSnapshot.backgrounds![image.id];
            const hash = background.url.split("-background-")[1];
            return {
              originalName: image.originalName,
              backgroundPath: path.join(
                service.folder(id),
                "render-cache",
                hash + ".png",
              ),
              padding: background.padding,
            };
          }),
        },
        null,
        2,
      ),
    );
    const outputPath = path.join(
      root,
      app.isPackaged ? "packaged-smoke.mp4" : "electron-smoke.mp4",
    );
    let renderDetails: RenderDetails | undefined;
    const result = await renderVideo({
      isPackaged: app.isPackaged,
      projectRoot: app.getAppPath(),
      outputPath,
      onDetails: (d) => {
        renderDetails = d;
      },
      inputProps: renderSnapshot,
    });
    assert.equal(result.cancelled, false);
    await service.verifyOutput(outputPath, renderSnapshot.project);
    const ffmpeg = app.isPackaged
      ? path.join(
          process.resourcesPath,
          "app.asar.unpacked/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe",
        )
      : path.join(
          app.getAppPath(),
          "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe",
        );
    await verifySubscribeOutput(
      ffmpeg,
      outputPath,
      renderSnapshot.project,
      service,
      root,
    );
    for (const [label, seconds] of [
      ["first", 0],
      ["middle", 4],
      ["last", 7.9],
    ] as const) {
      const png = execFileSync(
        ffmpeg,
        [
          "-v",
          "error",
          "-ss",
          String(seconds),
          "-i",
          outputPath,
          "-an",
          "-frames:v",
          "1",
          "-c:v",
          "png",
          "-f",
          "image2pipe",
          "pipe:1",
        ],
        { windowsHide: true, maxBuffer: 20 * 1024 * 1024, timeout: 15000 },
      );
      const frame = nativeImage.createFromBuffer(png),
        size = frame.getSize(),
        pixels = frame.toBitmap();
      const g = overlayGeometry(
        size.width,
        size.height,
        renderSnapshot.project.overlay.layout,
        !!renderSnapshot.project.overlay.logo,
        renderSnapshot.project.overlay.title,
      );
      const index =
        (Math.floor(g.y + (g.height - g.bandHeight) / 2 + 3) * size.width +
          Math.floor(g.x + g.padding * 0.25)) *
        4;
      assert.ok(
        pixels[index] > 220 &&
          pixels[index + 1] > 220 &&
          pixels[index + 2] > 220,
        "White title banner absent: " + label,
      );
      await writeFile(path.join(root, "banner-" + label + ".png"), png);
    }
    const signal = makeCancelSignal(),
      cancelPath = path.join(root, "cancel-test.mp4");
    let signalled = false;
    const cancelled = await renderVideo({
      isPackaged: app.isPackaged,
      projectRoot: app.getAppPath(),
      outputPath: cancelPath,
      inputProps: {
        ...reopened,
        project: {
          ...reopened.project,
          exportSettings: { mode: "cpu", parallelFrames: 1 },
        },
      },
      cancelSignal: signal.cancelSignal,
      onUpdate: (u) => {
        if (
          u.type === "progress" &&
          u.stage === "rendering" &&
          u.progress >= 20 &&
          !signalled
        ) {
          signalled = true;
          signal.cancel();
        }
      },
    });
    assert.ok(signalled);
    assert.ok(cancelled.cancelled);
    await assert.rejects(stat(cancelPath));
    await queue.pause(true);
    const shortProject = generateTimeline({
      ...reopened.project,
      voice: { ...reopened.project.voice!, durationSeconds: 2 },
    });
    const firstQueued = await queue.enqueue(
      shortProject,
      path.join(root, "queued-one.mp4"),
    );
    await queue.enqueue(
      {
        ...shortProject,
        name: "CPU portability test",
        exportSettings: { mode: "cpu", parallelFrames: 2 },
      },
      path.join(root, "queued-two.mp4"),
    );
    const removed = await queue.enqueue(
      shortProject,
      path.join(root, "queued-cancelled.mp4"),
    );
    await queue.cancel(removed.id);
    shortProject.overlay.title = "Đã chỉnh sau khi thêm";
    await queue.pause(false);
    await queue.idle();
    const jobs = queue.state().jobs;
    assert.equal(
      jobs.find((j) => j.id === firstQueued.id)?.status,
      "completed",
    );
    assert.equal(jobs.at(-2)?.status, "completed");
    assert.equal(jobs.at(-2)?.encoder, "CPU H.264");
    assert.equal(jobs.at(-1)?.status, "cancelled");
    await service.verifyOutput(path.join(root, "queued-one.mp4"), shortProject);
    await service.verifyOutput(path.join(root, "queued-two.mp4"), shortProject);
    await writeFile(
      path.join(
        root,
        app.isPackaged ? "packaged-result.json" : "electron-result.json",
      ),
      JSON.stringify(
        {
          pass: true,
          packaged: app.isPackaged,
          renderDetails,
          queue: queue.state(),
          projectId: id,
          outputPath,
          checks: [
            "Saved logo library: deduplication, cross-project UI reuse, project-owned copy and save/reopen",
            "Thumbnail image deletion before voice, timeline redistribution, last-image empty state, unchanged voice and retained source/snapshot media",
            "Subscribe native preview drag/resize autosave, shared timeline selection and geometry in exported frames",
            "Subscribe single row, button and native Ctrl+C/V paste at playhead, independent IDs, preserved geometry/loop, end trim, overlapping selector, text-input shortcuts and save/reopen",
            "Subscribe builtin GIF: all 61 frames, 2.03s, transparent green key and union crop",
            "Subscribe native pointer timeline move/resize, property edit, delete/reinsert and frame reuse",
            "Subscribe save/reopen, loop timing and exported pixels before/during/after interval",
            "new project defaults: 3x and blurred background",
            "motion range 0-10x including UI save at both boundaries",
            "native timeline mouse drag reorders images and preserves clip speed/voice duration",
            "compact project rows with creation/update times and deletion button",
            "title layout and font size save/reopen plus real pointer drag/resize",
            "project manager UI rename/search and safe trash of fixture project",
            "pending exports block project deletion",
            "global/per-clip motion speed persists without timeline changes",
            "16/16 mixed images including 5 AVIF",
            "title banner at first/middle/last frames",
            "partial import errors reported",
            "editable persistent title and replacement logo",
            "two queued videos and queued cancellation",
            "import PNG/JPEG/WebP",
            "EXIF orientation",
            "cancel after 20 percent and cleanup",
            "natural sort",
            "voice probe",
            "save",
            "reorder",
            "reopen",
            "preload",
            "renderer",
            "720/1080 composition",
            "H.264 AAC duration frames",
          ],
        },
        null,
        2,
      ),
    );
    app.exit(0);
  } catch (error) {
    await writeFile(
      path.join(root, "app-smoke-error.txt"),
      String(error instanceof Error ? error.stack : error),
    );
    app.exit(1);
  }
}
