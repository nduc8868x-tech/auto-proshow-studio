import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  shell,
  type IpcMainInvokeEvent,
} from "electron";
import path from "node:path";
import { mkdir, appendFile, rename, rm } from "node:fs/promises";

import { makeCancelSignal } from "@remotion/renderer";
import { MediaServer } from "./main/media-server";
import { ProjectService } from "./main/project-service";
import { renderVideo } from "./render-video";
import { RenderQueue } from "./main/render-queue";
import { imageExtensions } from "./shared/media-formats";
import { runAppSmoke } from "./main/smoke-mode";
let win: BrowserWindow | null = null;
const server = new MediaServer();
let service: ProjectService;
let queue: RenderQueue;
function trusted(e: IpcMainInvokeEvent) {
  if (
    !win ||
    e.sender !== win.webContents ||
    e.senderFrame !== win.webContents.mainFrame
  )
    throw Error("IPC không hợp lệ");
}
function handle<Args extends unknown[]>(
  channel: string,
  fn: (...args: Args) => unknown,
) {
  ipcMain.handle("app:" + channel, (e, ...args) => {
    trusted(e);
    return fn(...(args as Args));
  });
}
async function log(error: unknown) {
  const dir = path.join(app.getPath("userData"), "logs");
  await mkdir(dir, { recursive: true });
  await appendFile(
    path.join(dir, "app.log"),
    new Date().toISOString() +
      " " +
      String(error instanceof Error ? error.stack : error) +
      "\n",
  );
}
const smokeIndex = process.argv.indexOf("--app-smoke");
if (smokeIndex >= 0)
  app.setPath(
    "userData",
    path.join(process.argv[smokeIndex + 1], "app-test-data"),
  );
app.setName("AutoProShowStudio");
app
  .whenReady()
  .then(async () => {
    await server.start();
    const binaries = app.isPackaged
      ? path.join(
          process.resourcesPath,
          "app.asar.unpacked/node_modules/@remotion/compositor-win32-x64-msvc",
        )
      : path.join(
          app.getAppPath(),
          "node_modules/@remotion/compositor-win32-x64-msvc",
        );
    service = new ProjectService(
      path.join(app.getPath("userData"), "projects"),
      server,
      path.join(binaries, "ffprobe.exe"),
      {
        trashDirectory: (folder) => shell.trashItem(folder),
        isBusy: (id) =>
          queue
            ?.state()
            .jobs.some(
              (job) =>
                job.projectId === id &&
                !["completed", "cancelled", "failed"].includes(job.status),
            ) ?? false,
      },
    );
    queue = new RenderQueue(
      path.join(app.getPath("userData"), "export-queue.json"),
      async (entry, abort, update) => {
        const props = await service.renderView(entry.project, abort);
        const temporary = path.join(
          path.dirname(entry.job.outputPath),
          ".auto-proshow-" + entry.job.id + ".mp4",
        );
        const signal = makeCancelSignal();
        const cancel = () => signal.cancel();
        abort.addEventListener("abort", cancel, { once: true });
        if (abort.aborted) cancel();
        let last = 0;
        try {
          const result = await renderVideo({
            isPackaged: app.isPackaged,
            projectRoot: app.getAppPath(),
            outputPath: temporary,
            inputProps: props,
            cancelSignal: signal.cancelSignal,
            onDetails: (d) => update(d),
            onUpdate: (u) => {
              if (u.type === "progress" && Date.now() - last > 200) {
                last = Date.now();
                update({
                  status: u.stage === "rendering" ? "rendering" : "preparing",
                  progress: u.progress / 100,
                });
              }
            },
          });
          if (result.cancelled || abort.aborted) return;
          update({ status: "finalizing", progress: 1 });
          await service.verifyOutput(temporary, entry.project);
          if (!abort.aborted) await rename(temporary, entry.job.outputPath);
        } finally {
          abort.removeEventListener("abort", cancel);
          await rm(temporary, { force: true });
        }
      },
      (state) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send("app:queue", state);
          const active = state.jobs.find((j) =>
            ["preparing", "rendering", "finalizing"].includes(j.status),
          );
          win.setProgressBar(active?.progress ?? -1);
        }
      },
      (error) => {
        void log(error);
      },
    );
    await queue.restore();
    handle("create", () => service.create());
    handle("list", () => service.list());
    handle("rename-project", (id: string, name: string) =>
      service.renameProject(id, name),
    );
    handle("delete-project", async (id: string) => {
      const checked = await service.assertDeletable(id);
      const result = await dialog.showMessageBox(win!, {
        type: "warning",
        title: "Xóa dự án",
        message: "Chuyển “" + checked.project.name + "” vào Thùng rác?",
        detail:
          "Toàn bộ thư mục dự án và bản sao ảnh/voice sẽ được chuyển vào Thùng rác. File nguồn và video lưu bên ngoài thư mục dự án được giữ nguyên.",
        buttons: ["Giữ dự án", "Chuyển vào Thùng rác"],
        defaultId: 0,
        cancelId: 0,
      });
      if (result.response !== 1) return { deleted: false };
      await service.trashProject(id);
      return { deleted: true };
    });
    handle("open", (id: string) => service.open(id));
    handle("save", (p) => service.save(p));
    handle(
      "add-subscribe",
      async (
        id: string,
        source: "builtin" | "file",
        startFrame: number,
        removeGreen: boolean,
      ) => {
        service.get(id);
        if (source !== "builtin" && source !== "file")
          throw Error("Loại template không hợp lệ");
        let file = path.join(app.getAppPath(), "templates/subscribe.gif");
        if (source === "file") {
          const result = await dialog.showOpenDialog(win!, {
            properties: ["openFile"],
            filters: [{ name: "Template GIF động", extensions: ["gif"] }],
          });
          if (result.canceled) return service.view(service.get(id));
          file = result.filePaths[0];
        }
        return service.addSubscribe(id, file, startFrame, removeGreen);
      },
    );
    handle("import", async (id: string, kind: "images" | "voice" | "logo") => {
      service.get(id);
      if (kind !== "images" && kind !== "voice" && kind !== "logo")
        throw Error("Loại media không hợp lệ");
      const result = await dialog.showOpenDialog(win!, {
        properties:
          kind === "images" ? ["openFile", "multiSelections"] : ["openFile"],
        filters: [
          {
            name:
              kind !== "voice" ? "Hình ảnh (AVIF, JPG, PNG, WebP…)" : "Voice",
            extensions: kind !== "voice" ? imageExtensions : ["mp3", "wav"],
          },
          {
            name: "Tất cả file (báo lỗi nếu không đọc được)",
            extensions: ["*"],
          },
        ],
      });
      return result.canceled
        ? service.view(service.get(id))
        : service.import(id, kind, result.filePaths);
    });
    handle("drop", async (id: string, files: string[]) => {
      service.get(id);
      if (
        !Array.isArray(files) ||
        files.length > 1000 ||
        files.some((f) => typeof f !== "string" || !path.isAbsolute(f))
      )
        throw Error("File kéo thả không hợp lệ");
      const voices = files.filter((f) =>
        [".mp3", ".wav"].includes(path.extname(f).toLowerCase()),
      );
      if (voices.length > 1) throw Error("Chỉ chọn một file voice");
      const imageFiles = files.filter((f) => !voices.includes(f));
      const reports: NonNullable<
        import("./shared/project").SceneProps["importReport"]
      >[] = [];
      if (imageFiles.length) {
        const result = await service.import(id, "images", imageFiles);
        if (result.importReport) reports.push(result.importReport);
      }
      if (voices.length) {
        const result = await service.import(id, "voice", voices);
        if (result.importReport) reports.push(result.importReport);
      }
      return {
        ...(await service.view(service.get(id))),
        importReport: {
          requested: files.length,
          imported: reports.reduce((n, r) => n + r.imported, 0),
          errors: reports.flatMap((r) => r.errors),
        },
      };
    });
    handle("queue", () => queue.state());
    handle("pause", async (paused: boolean) => {
      if (typeof paused !== "boolean") throw Error("Tham số không hợp lệ");
      await queue.pause(paused);
    });
    handle("cancel", (id?: string) => queue.cancel(id));
    handle("export", async (id: string) => {
      const project = structuredClone(service.get(id));
      if (!project.clips.length) throw Error("Hãy nhập ảnh và voice trước");
      const result = await dialog.showSaveDialog(win!, {
        defaultPath: project.name.replace(/[<>:"/\\|?*]/g, "_") + ".mp4",
        filters: [{ name: "MP4", extensions: ["mp4"] }],
      });
      if (result.canceled || !result.filePath) return null;
      return queue.enqueue(project, result.filePath);
    });
    win = new BrowserWindow({
      show: smokeIndex < 0,
      title: "Auto ProShow Studio",
      width: 1440,
      height: 920,
      minWidth: 1100,
      minHeight: 700,
      backgroundColor: "#0b101b",
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        backgroundThrottling: smokeIndex < 0,
      },
    });
    let closing = false;
    win.on("close", (event) => {
      if (closing || !queue.hasPending) return;
      event.preventDefault();
      void dialog
        .showMessageBox(win!, {
          type: "question",
          message: "Đang có video trong hàng đợi",
          detail:
            "Đóng ứng dụng sẽ hủy video đang xuất; các mục chờ được giữ để tiếp tục lần sau.",
          buttons: ["Ở lại", "Dừng và đóng"],
          defaultId: 0,
          cancelId: 0,
        })
        .then(async (result) => {
          if (result.response === 1) {
            closing = true;
            await queue.shutdown();
            win?.close();
          }
        });
    });
    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    win.webContents.on("will-navigate", (event) => event.preventDefault());
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL)
      await win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    else
      await win.loadFile(
        path.join(
          __dirname,
          "../renderer/" + MAIN_WINDOW_VITE_NAME + "/index.html",
        ),
      );
    if (smokeIndex >= 0)
      await runAppSmoke(win, service, process.argv[smokeIndex + 1], queue);
  })
  .catch((error) => {
    void log(error);
    dialog.showErrorBox("Không thể khởi động", String(error));
    app.quit();
  });
app.on("window-all-closed", () => {
  void (queue?.shutdown() ?? Promise.resolve()).finally(() => {
    server.close();
    app.quit();
  });
});
