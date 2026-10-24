import { randomUUID, createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  writeFile,
  rename,
  readdir,
  copyFile,
  rm,
  realpath,
  stat,
} from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify, isDeepStrictEqual } from "node:util";
import { isImageFilename, imageMime } from "../shared/media-formats";
import { ImageDecoder } from "./image-decoder";
import { z } from "zod";
import { verifiedProjectFolder } from "./project-storage";
import type { ProjectSummary } from "../app-api";
import {
  generateTimeline,
  chooseFitMode,
  naturalCompare,
  newProject,
  projectSchema,
  validateTimeline,
  type Project,
  type SceneProps,
} from "../shared/project";
import type { MediaServer } from "./media-server";
import {
  subscribeAssetSchema,
  subscribeFramePath,
  subscribeGeometry,
} from "../shared/subscribe";
const exec = promisify(execFile);
export class ProjectService {
  private opened = new Map<string, Project>();
  constructor(
    private root: string,
    private server: MediaServer,
    private probe: string,
    private lifecycle: {
      trashDirectory: (folder: string) => Promise<void>;
      isBusy: (id: string) => boolean;
    },
  ) {}
  folder(id: string) {
    z.string().uuid().parse(id);
    return path.join(this.root, id);
  }
  get(id: string) {
    const p = this.opened.get(z.string().uuid().parse(id));
    if (!p) throw Error("Dự án chưa được mở");
    return p;
  }
  async assetPath(p: Project, relative: string) {
    const root = await realpath(this.folder(p.id)),
      target = await realpath(path.join(root, relative));
    if (!target.startsWith(root + path.sep))
      throw Error("Đường dẫn media không hợp lệ");
    return target;
  }
  async view(p: Project): Promise<SceneProps> {
    const urls: Record<string, string> = {};
    for (const a of [
      ...p.images,
      ...(p.voice ? [p.voice] : []),
      ...(p.overlay.logo ? [p.overlay.logo] : []),
    ])
      urls[a.id] = this.server.register(
        a.id,
        await this.assetPath(p, a.relativePath),
      );
    for (const image of p.images)
      urls[image.id + "-thumb"] = this.server.register(
        image.id + "-thumb",
        await this.assetPath(p, image.thumbnailPath),
      );
    for (const asset of p.subscribeAssets)
      for (let index = 0; index < asset.frameDurationsMs.length; index++)
        urls[asset.id + "-frame-" + index] = this.server.register(
          asset.id + "-frame-" + index,
          await this.assetPath(p, subscribeFramePath(asset.id, index)),
        );
    return { project: p, urls };
  }
  async addSubscribe(
    id: string,
    file: string,
    startFrame: number,
    removeGreen: boolean,
  ) {
    const p = structuredClone(this.get(id));
    if (!p.clips.length)
      throw Error("Hãy thêm ảnh và voice trước khi chèn template");
    z.number().int().nonnegative().parse(startFrame);
    z.boolean().parse(removeGreen);
    if (p.subscribeClips.length >= 100)
      throw Error("Tối đa 100 đoạn Subscribe trong một dự án");
    if ((await stat(file)).size > 50 * 1024 ** 2)
      throw Error("GIF vượt 50 MB, hãy dùng template nhỏ hơn");
    const bytes = await readFile(file);
    if (!/^GIF8[79]a$/.test(bytes.toString("ascii", 0, 6)))
      throw Error("Template phải là file GIF hợp lệ");
    const sourceHash = createHash("sha256").update(bytes).digest("hex");
    let asset = p.subscribeAssets.find(
      (a) => a.sourceHash === sourceHash && a.removeGreen === removeGreen,
    );
    const created: string[] = [];
    const decoder = new ImageDecoder();
    try {
      if (!asset) {
        if (p.subscribeAssets.length >= 50)
          throw Error("Tối đa 50 template khác nhau trong một dự án");
        const decoded = await decoder.animation(bytes, removeGreen);
        asset = subscribeAssetSchema.parse({
          id: randomUUID(),
          originalName: path.basename(file),
          sourceHash,
          removeGreen,
          width: decoded.width,
          height: decoded.height,
          frameDurationsMs: decoded.frames.map((f) => f.durationMs),
        });
        await mkdir(path.join(this.folder(id), "media/templates", asset.id), {
          recursive: true,
        });
        for (let index = 0; index < decoded.frames.length; index++) {
          const target = path.join(
            this.folder(id),
            subscribeFramePath(asset.id, index),
          );
          created.push(target);
          await writeFile(
            target,
            Buffer.from(decoded.frames[index].png, "base64"),
          );
        }
        p.subscribeAssets.push(asset);
      }
      const start = Math.min(startFrame, p.video.totalFrames - 1);
      const geometry = subscribeGeometry(
        { x: 35, y: 65, width: 30 },
        asset,
        p.video.width,
        p.video.height,
      );
      p.subscribeClips.push({
        id: randomUUID(),
        assetId: asset.id,
        startFrame: start,
        durationFrames: Math.min(
          p.video.totalFrames - start,
          Math.ceil(
            (asset.frameDurationsMs.reduce((a, b) => a + b, 0) * p.video.fps) /
              1000,
          ),
        ),
        x: geometry.x,
        y: geometry.y,
        width: Math.max(5, geometry.width),
        loop: false,
      });
      p.updatedAt = new Date().toISOString();
      validateTimeline(p);
      await this.persist(p);
      this.opened.set(id, p);
    } catch (error) {
      await Promise.all(created.map((file) => rm(file, { force: true })));
      throw error;
    } finally {
      decoder.close();
    }
    return this.view(p);
  }
  async renderView(p: Project, signal?: AbortSignal): Promise<SceneProps> {
    const view = await this.view(p);
    const backgrounds: NonNullable<SceneProps["backgrounds"]> = {};
    const decoder = new ImageDecoder();
    const { width, height } = p.video;
    const blur = (p.visual.blurPx * height) / 1080;
    try {
      for (const image of p.images) {
        if (signal?.aborted) break;
        const fit =
          p.clips.find((c) => c.imageId === image.id)?.fitOverride ??
          p.visual.fitMode;
        const mode =
          fit === "auto"
            ? chooseFitMode(image.width, image.height, width, height)
            : fit;
        if (mode !== "contain-blur" || blur === 0) continue;
        const original = await this.assetPath(p, image.relativePath);
        const info = await stat(original);
        const key = createHash("sha256")
          .update(
            JSON.stringify([
              "background-v1",
              image.id,
              info.size,
              info.mtimeMs,
              width,
              height,
              blur,
            ]),
          )
          .digest("hex");
        const cacheRoot = path.join(this.folder(p.id), "render-cache");
        const target = path.join(cacheRoot, key + ".png");
        try {
          try {
            await stat(target);
          } catch {
            const png = await decoder.background(
              await readFile(original),
              width,
              height,
              blur,
            );
            if (signal?.aborted) break;
            await mkdir(cacheRoot, { recursive: true });
            const temp = path.join(
              cacheRoot,
              key + "." + randomUUID() + ".tmp",
            );
            await writeFile(temp, png);
            await rename(temp, target);
          }
          backgrounds[image.id] = {
            url: this.server.register(image.id + "-background-" + key, target),
            padding: Math.ceil(blur * 3),
          };
        } catch {
          // Cache creation is optional: retain the original CSS blur on unsupported machines/full disks.
        }
      }
    } finally {
      decoder.close();
    }
    return { ...view, backgrounds };
  }
  async create() {
    const p = newProject(randomUUID());
    await this.persist(p);
    this.opened.set(p.id, p);
    return this.view(p);
  }
  async list() {
    await mkdir(this.root, { recursive: true });
    const list = [];
    for (const entry of await readdir(this.root, { withFileTypes: true }))
      if (entry.isDirectory())
        try {
          const p = projectSchema.parse(
            JSON.parse(
              await readFile(
                path.join(this.folder(entry.name), "project.json"),
                "utf8",
              ),
            ),
          );
          if (p.id !== entry.name) continue;
          list.push(await this.summary(p));
        } catch {
          /* skip unrelated/corrupt folders */
        }
    return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async summary(p: Project): Promise<ProjectSummary> {
    let thumbnailUrl: string | undefined;
    if (p.images[0])
      try {
        const image = p.images[0];
        thumbnailUrl = this.server.register(
          image.id + "-thumb",
          await this.assetPath(p, image.thumbnailPath),
        );
      } catch {
        /* keep projects with missing media accessible */
      }
    return {
      id: p.id,
      name: p.name,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      imageCount: p.images.length,
      durationSeconds: p.voice?.durationSeconds ?? 0,
      width: p.video.width,
      height: p.video.height,
      thumbnailUrl,
    };
  }
  async renameProject(id: string, name: string) {
    const checked = await verifiedProjectFolder(this.root, id),
      p = this.opened.get(id) ?? checked.project;
    const next = {
      ...p,
      name: z
        .string()
        .trim()
        .min(1, "Tên dự án không được trống")
        .max(120)
        .parse(name),
      updatedAt: new Date().toISOString(),
    };
    await this.persist(next);
    if (this.opened.has(id)) this.opened.set(id, next);
    return this.summary(next);
  }
  async assertDeletable(id: string) {
    if (this.lifecycle.isBusy(id))
      throw Error(
        "Dự án đang có video chờ hoặc đang xuất. Hãy hủy các mục đó trước khi xóa.",
      );
    return verifiedProjectFolder(this.root, id);
  }
  async trashProject(id: string) {
    const checked = await this.assertDeletable(id);
    await this.lifecycle.trashDirectory(checked.folder);
    this.opened.delete(id);
    for (const asset of [
      ...checked.project.images,
      ...(checked.project.voice ? [checked.project.voice] : []),
      ...(checked.project.overlay.logo ? [checked.project.overlay.logo] : []),
      ...checked.project.subscribeAssets,
    ])
      this.server.unregister(asset.id);
  }
  async open(id: string) {
    const p = projectSchema.parse(
      JSON.parse(
        await readFile(path.join(this.folder(id), "project.json"), "utf8"),
      ),
    );
    if (p.id !== id) throw Error("ID dự án không khớp");
    validateTimeline(p);
    this.opened.set(p.id, p);
    return this.view(p);
  }
  private async persist(p: Project) {
    const dir = this.folder(p.id);
    await mkdir(dir, { recursive: true });
    const temporary = path.join(dir, "project-" + randomUUID() + ".tmp");
    await writeFile(temporary, JSON.stringify(p, null, 2), "utf8");
    await rename(temporary, path.join(dir, "project.json"));
  }
  async save(raw: unknown) {
    const candidate = projectSchema.parse(raw),
      current = this.get(candidate.id),
      existing = new Map(
        [
          ...current.images,
          ...(current.voice ? [current.voice] : []),
          ...(current.overlay.logo ? [current.overlay.logo] : []),
        ].map((a) => [a.id, a]),
      );
    for (const a of [
      ...candidate.images,
      ...(candidate.voice ? [candidate.voice] : []),
      ...(candidate.overlay.logo ? [candidate.overlay.logo] : []),
    ]) {
      const stored = existing.get(a.id);
      if (!stored || !isDeepStrictEqual(a, stored))
        throw Error("Không được thay đổi metadata/đường dẫn media");
    }
    const storedTemplates = new Map(
      current.subscribeAssets.map((a) => [a.id, a]),
    );
    for (const asset of candidate.subscribeAssets)
      if (!isDeepStrictEqual(storedTemplates.get(asset.id), asset))
        throw Error("Không được thay đổi dữ liệu template đã nhập");
    const p = generateTimeline({
      ...candidate,
      updatedAt: new Date().toISOString(),
    });
    validateTimeline(p);
    await this.persist(p);
    this.opened.set(p.id, p);
    return this.view(p);
  }
  async verifyOutput(file: string, p: Project) {
    const { stdout } = await exec(
      this.probe,
      ["-v", "error", "-show_streams", "-show_format", "-of", "json", file],
      { windowsHide: true, maxBuffer: 1048576 },
    );
    const data = JSON.parse(stdout),
      video = data.streams?.find(
        (s: { codec_type: string }) => s.codec_type === "video",
      ),
      audio = data.streams?.find(
        (s: { codec_type: string }) => s.codec_type === "audio",
      );
    if (
      video?.codec_name !== "h264" ||
      audio?.codec_name !== "aac" ||
      video.width !== p.video.width ||
      video.height !== p.video.height ||
      Number(video.nb_frames) !== p.video.totalFrames ||
      Math.abs(
        Number(data.format?.duration) - p.video.totalFrames / p.video.fps,
      ) >
        1 / p.video.fps
    )
      throw Error("MP4 không vượt qua kiểm tra codec/frame/thời lượng");
  }
  async duration(file: string) {
    const { stdout } = await exec(
      this.probe,
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration:stream=codec_type",
        "-of",
        "json",
        file,
      ],
      { windowsHide: true, maxBuffer: 1048576 },
    );
    const data = JSON.parse(stdout),
      duration = Number(data.format?.duration);
    if (
      !Number.isFinite(duration) ||
      duration <= 0 ||
      !data.streams?.some(
        (s: { codec_type: string }) => s.codec_type === "audio",
      )
    )
      throw Error("Voice không đọc được");
    return duration;
  }
  async import(id: string, kind: "images" | "voice" | "logo", files: string[]) {
    let p = structuredClone(this.get(id));
    const dir = this.folder(id),
      created: string[] = [];
    const decoder = new ImageDecoder();
    const errors: string[] = [];
    let importedCount = 0;
    try {
      for (const file of [...files].sort((a, b) =>
        naturalCompare(path.basename(a), path.basename(b)),
      )) {
        const mark = created.length;
        try {
          const ext = path.extname(file).toLowerCase(),
            aid = randomUUID(),
            name = path.basename(file);
          if (kind === "voice" && ![".mp3", ".wav"].includes(ext))
            throw Error("Voice chỉ hỗ trợ MP3/WAV: " + name);
          if (kind !== "voice" && !isImageFilename(name))
            throw Error(
              "Ảnh chưa hỗ trợ: " +
                name +
                ". Hãy chuyển sang AVIF/JPG/PNG/WebP.",
            );
          const bytes = await readFile(file);
          if (kind !== "voice") {
            const mime = imageMime(bytes);
            if (!mime)
              throw Error("Không nhận dạng được nội dung ảnh: " + name);
            const image = await decoder.decode(bytes, mime);
            if (image.isEmpty()) throw Error("Ảnh bị hỏng: " + name);
            const size = image.getSize(),
              relativePath = "media/images/" + aid + ".png",
              thumbnailPath = "thumbnails/" + aid + ".png";
            for (const rel of [relativePath, thumbnailPath])
              await mkdir(path.dirname(path.join(dir, rel)), {
                recursive: true,
              });
            await writeFile(path.join(dir, relativePath), image.toPNG());
            created.push(path.join(dir, relativePath));
            await writeFile(
              path.join(dir, thumbnailPath),
              image.resize({ width: 240 }).toPNG(),
            );
            created.push(path.join(dir, thumbnailPath));
            const imported = {
              id: aid,
              originalName: name,
              relativePath,
              thumbnailPath,
              ...size,
            };
            if (kind === "logo")
              p.overlay = { ...p.overlay, enabled: true, logo: imported };
            else p.images.push(imported);
          } else {
            const valid =
              ext === ".wav"
                ? bytes.toString("ascii", 0, 4) === "RIFF" &&
                  bytes.toString("ascii", 8, 12) === "WAVE"
                : bytes.toString("ascii", 0, 3) === "ID3" ||
                  (bytes[0] === 255 && (bytes[1] & 224) === 224);
            if (!valid) throw Error("Voice sai định dạng: " + name);
            const durationSeconds = await this.duration(file),
              relativePath = "media/audio/" + aid + ext;
            await mkdir(path.dirname(path.join(dir, relativePath)), {
              recursive: true,
            });
            await copyFile(file, path.join(dir, relativePath));
            created.push(path.join(dir, relativePath));
            p.voice = {
              id: aid,
              originalName: name,
              relativePath,
              durationSeconds,
            };
          }
          importedCount++;
        } catch (error) {
          await Promise.all(
            created.splice(mark).map((file) => rm(file, { force: true })),
          );
          errors.push(
            path.basename(file) +
              ": " +
              (error instanceof Error ? error.message : String(error)),
          );
        }
      }
      p = generateTimeline({ ...p, updatedAt: new Date().toISOString() });
      await this.persist(p);
      this.opened.set(id, p);
      return {
        ...(await this.view(p)),
        importReport: {
          requested: files.length,
          imported: importedCount,
          errors,
        },
      };
    } catch (error) {
      await Promise.all(created.map((file) => rm(file, { force: true })));
      throw error;
    } finally {
      decoder.close();
    }
  }
}
