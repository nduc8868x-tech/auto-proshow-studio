import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { projectSchema, type Project } from "../shared/project";
import type { Job, QueueState } from "../app-api";
export type QueueEntry = { job: Job; project: Project };
type Runner = (
  entry: QueueEntry,
  signal: AbortSignal,
  update: (patch: Partial<Job>) => void,
) => Promise<void>;
const finished = (s: Job["status"]) =>
  ["completed", "failed", "cancelled"].includes(s);
export class RenderQueue {
  private entries: QueueEntry[] = [];
  private paused = false;
  private worker: Promise<void> | null = null;
  private controller: AbortController | null = null;
  private writeTail: Promise<void> = Promise.resolve();
  constructor(
    private file: string,
    private runner: Runner,
    private changed: (state: QueueState) => void,
    private report: (error: unknown) => void = () => {},
  ) {}
  state(): QueueState {
    return {
      jobs: this.entries.map((e) => ({ ...e.job })),
      paused: this.paused,
    };
  }
  get hasPending() {
    return this.entries.some((e) => !finished(e.job.status));
  }
  private emit() {
    this.changed(this.state());
  }
  private persist() {
    const content = JSON.stringify(
      { entries: this.entries, paused: this.paused },
      null,
      2,
    );
    this.writeTail = this.writeTail.catch(this.report).then(async () => {
      await mkdir(path.dirname(this.file), { recursive: true });
      await writeFile(this.file + ".tmp", content, "utf8");
      await rename(this.file + ".tmp", this.file);
    });
    return this.writeTail;
  }
  async restore() {
    try {
      const saved = JSON.parse(await readFile(this.file, "utf8"));
      if (!Array.isArray(saved.entries)) throw Error("Hàng đợi không hợp lệ");
      this.entries = saved.entries.map((raw: QueueEntry) => {
        const project = projectSchema.parse(raw.project);
        const job = z
          .object({
            id: z.string().uuid(),
            projectId: z.string().uuid(),
            projectName: z.string(),
            status: z.enum([
              "queued",
              "preparing",
              "rendering",
              "finalizing",
              "completed",
              "cancelled",
              "failed",
            ]),
            progress: z.number().min(0).max(1),
            outputPath: z.string(),
            error: z.string().optional(),
            encoder: z.string().optional(),
            concurrency: z.number().optional(),
            createdAt: z.string(),
            elapsedMs: z.number().optional(),
          })
          .parse(raw.job);
        if (!path.isAbsolute(job.outputPath) || job.projectId !== project.id)
          throw Error("Đường dẫn hàng đợi không hợp lệ");
        if (!finished(job.status) && job.status !== "queued") {
          job.status = "failed";
          job.error =
            "Lần xuất trước bị gián đoạn. Thêm dự án vào hàng đợi để thử lại.";
        }
        return { job, project };
      });
      this.paused = this.entries.some((e) => e.job.status === "queued");
      await this.persist();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT")
        this.report(error);
    }
    this.emit();
  }
  async enqueue(project: Project, outputPath: string) {
    if (!path.isAbsolute(outputPath))
      throw Error("Đường dẫn xuất không hợp lệ");
    if (
      this.entries.some(
        (e) =>
          !finished(e.job.status) &&
          e.job.outputPath.toLowerCase() === outputPath.toLowerCase(),
      )
    )
      throw Error("Tên file này đang nằm trong hàng đợi. Hãy chọn tên khác.");
    const job: Job = {
      id: randomUUID(),
      projectId: project.id,
      projectName: project.name,
      status: "queued",
      progress: 0,
      outputPath,
      createdAt: new Date().toISOString(),
    };
    this.entries.push({ job, project: structuredClone(project) });
    await this.persist();
    this.emit();
    this.kick();
    return { ...job };
  }
  async pause(value: boolean) {
    this.paused = value;
    await this.persist();
    this.emit();
    if (!value) this.kick();
  }
  async cancel(id?: string) {
    const entry = id
      ? this.entries.find((e) => e.job.id === id)
      : this.entries.find(
          (e) => !finished(e.job.status) && e.job.status !== "queued",
        );
    if (!entry || finished(entry.job.status)) return;
    if (entry.job.status === "queued") {
      entry.job.status = "cancelled";
      await this.persist();
      this.emit();
    } else this.controller?.abort();
  }
  private kick() {
    if (this.worker || this.paused) return;
    this.worker = this.drain()
      .catch(this.report)
      .finally(() => {
        this.worker = null;
        if (!this.paused && this.entries.some((e) => e.job.status === "queued"))
          this.kick();
      });
  }
  private async drain() {
    while (!this.paused) {
      const entry = this.entries.find((e) => e.job.status === "queued");
      if (!entry) return;
      this.controller = new AbortController();
      const controller = this.controller;
      const update = (patch: Partial<Job>) => {
        entry.job = { ...entry.job, ...patch };
        this.emit();
        void this.persist().catch(this.report);
      };
      update({ status: "preparing" });
      try {
        await this.runner(structuredClone(entry), controller.signal, update);
        update({
          status: controller.signal.aborted ? "cancelled" : "completed",
          progress: controller.signal.aborted ? entry.job.progress : 1,
        });
      } catch (error) {
        this.report(error);
        update({
          status: controller.signal.aborted ? "cancelled" : "failed",
          error: controller.signal.aborted
            ? undefined
            : "Xuất thất bại. Kiểm tra file nguồn, dung lượng đĩa hoặc logs/app.log.",
        });
      } finally {
        this.controller = null;
        await this.writeTail.catch(this.report);
      }
    }
  }
  async shutdown() {
    this.paused = true;
    this.controller?.abort();
    await this.worker;
    await this.persist();
  }
  async idle() {
    await this.worker;
    await this.writeTail;
  }
}
