import { createServer, type Server } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
export class MediaServer {
  private token = randomBytes(32).toString("hex");
  private assets = new Map<string, string>();
  private server: Server;
  private port = 0;
  constructor() {
    this.server = createServer(async (req, res) => {
      try {
        const parts = new URL(
          req.url ?? "/",
          "http://127.0.0.1",
        ).pathname.split("/");
        const file =
          parts.length === 3 && parts[1] === this.token
            ? this.assets.get(parts[2])
            : undefined;
        if (!file || !["GET", "HEAD"].includes(req.method ?? "")) {
          res.writeHead(404).end();
          return;
        }
        const size = (await stat(file)).size,
          mime: Record<string, string> = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
            ".wav": "audio/wav",
            ".mp3": "audio/mpeg",
          };
        res.setHeader(
          "Content-Type",
          mime[path.extname(file)] ?? "application/octet-stream",
        );
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Accept-Ranges", "bytes");
        res.setHeader(
          "Cache-Control",
          [".png", ".jpg", ".jpeg", ".webp"].includes(path.extname(file))
            ? "private, max-age=31536000, immutable"
            : "no-store",
        );
        let start = 0,
          end = size - 1;
        if (req.headers.range) {
          const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
          if (!m || (!m[1] && !m[2])) {
            res.writeHead(416, { "Content-Range": "bytes */" + size }).end();
            return;
          }
          if (!m[1]) start = Math.max(0, size - Number(m[2]));
          else {
            start = Number(m[1]);
            if (m[2]) end = Math.min(Number(m[2]), end);
          }
          if (start > end || start >= size) {
            res.writeHead(416, { "Content-Range": "bytes */" + size }).end();
            return;
          }
          res.statusCode = 206;
          res.setHeader(
            "Content-Range",
            "bytes " + start + "-" + end + "/" + size,
          );
        }
        res.setHeader("Content-Length", end - start + 1);
        if (req.method === "HEAD") {
          res.end();
          return;
        }
        const stream = createReadStream(file, { start, end });
        stream.on("error", () => res.destroy());
        res.on("close", () => stream.destroy());
        stream.pipe(res);
      } catch {
        res.writeHead(404).end();
      }
    });
  }
  async start() {
    await new Promise<void>((resolve) =>
      this.server.listen(0, "127.0.0.1", resolve),
    );
    this.port = (this.server.address() as { port: number }).port;
  }
  register(id: string, file: string) {
    this.assets.set(id, file);
    return "http://127.0.0.1:" + this.port + "/" + this.token + "/" + id;
  }
  unregister(id: string) {
    this.assets.delete(id);
    this.assets.delete(id + "-thumb");
    for (const key of this.assets.keys())
      if (key.startsWith(id + "-background-") || key.startsWith(id + "-frame-"))
        this.assets.delete(key);
  }
  close() {
    this.server.closeAllConnections();
    this.server.close();
  }
}
