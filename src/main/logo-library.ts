import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
const logoSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{64}$/),
  name: z.string().min(1).max(255),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  createdAt: z.string(),
});
export type StoredLogo = z.infer<typeof logoSchema>;
export class LogoLibrary {
  private pending = new Map<string, Promise<StoredLogo>>();
  constructor(private root: string) {}
  file(id: string, thumbnail = false) {
    const checked = logoSchema.shape.id.parse(id);
    return path.join(this.root, checked + (thumbnail ? "-thumb.png" : ".png"));
  }
  async get(id: string) {
    const checked = logoSchema.shape.id.parse(id);
    const logo = logoSchema.parse(
      JSON.parse(
        await readFile(path.join(this.root, checked + ".json"), "utf8"),
      ),
    );
    if (logo.id !== checked) throw Error("Logo đã lưu không hợp lệ");
    return logo;
  }
  async list() {
    await mkdir(this.root, { recursive: true });
    const result: StoredLogo[] = [];
    for (const file of await readdir(this.root)) {
      if (!/^[a-f0-9]{64}\.json$/.test(file)) continue;
      try {
        const logo = await this.get(file.slice(0, -5));
        await stat(this.file(logo.id));
        await stat(this.file(logo.id, true));
        result.push(logo);
      } catch {
        /* Ignore incomplete entries without hiding other saved logos. */
      }
    }
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async add(
    name: string,
    width: number,
    height: number,
    png: Buffer,
    thumbnail: Buffer,
  ) {
    const id = createHash("sha256").update(png).digest("hex");
    const pending = this.pending.get(id);
    if (pending) return pending;
    const logo = logoSchema.parse({
      id,
      name,
      width,
      height,
      createdAt: new Date().toISOString(),
    });
    const writing = this.store(logo, png, thumbnail);
    this.pending.set(id, writing);
    try {
      return await writing;
    } finally {
      this.pending.delete(id);
    }
  }
  private async store(logo: StoredLogo, png: Buffer, thumbnail: Buffer) {
    const { id } = logo;
    await mkdir(this.root, { recursive: true });
    try {
      const existing = await this.get(id);
      await stat(this.file(id));
      await stat(this.file(id, true));
      return existing;
    } catch {
      /* Recreate an interrupted entry. */
    }
    for (const [file, bytes] of [
      [this.file(id), png],
      [this.file(id, true), thumbnail],
      [path.join(this.root, id + ".json"), Buffer.from(JSON.stringify(logo))],
    ] as const) {
      const temporary = file + "." + randomUUID() + ".tmp";
      try {
        await writeFile(temporary, bytes);
        try {
          await rename(temporary, file);
        } catch (error) {
          const existing = await readFile(file).catch(() => null);
          if (!existing?.equals(bytes)) throw error;
        }
      } finally {
        await rm(temporary, { force: true });
      }
    }
    return logo;
  }
}
