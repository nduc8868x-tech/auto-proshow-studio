import { mkdir, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { deflateSync } from "node:zlib";
export async function createFixtures(root: string) {
  await mkdir(root, { recursive: true });
  await copyFile(
    path.resolve("fixtures/white_1x1.avif"),
    path.join(root, "white_1x1.avif"),
  );
  const entries = [
    ["1.png", "640x360", "4666bb"],
    ["2.png", "360x640", "c16949"],
    ["10.png", "480x480", "449978"],
  ];
  const crc = (bytes: Buffer) => {
    let c = 0xffffffff;
    for (const byte of bytes) {
      c ^= byte;
      for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (name: string, data: Buffer) => {
    const type = Buffer.from(name),
      length = Buffer.alloc(4),
      checksum = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    checksum.writeUInt32BE(crc(Buffer.concat([type, data])));
    return Buffer.concat([length, type, data, checksum]);
  };
  for (const [name, size, color] of entries) {
    const [w, h] = size.split("x").map(Number),
      raw = Buffer.alloc((w * 3 + 1) * h),
      rgb = [0, 2, 4].map((i) => parseInt(color.slice(i, i + 2), 16));
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        for (let c = 0; c < 3; c++) {
          const border = x < 8 || y < 8 || x >= w - 8 || y >= h - 8;
          raw[y * (w * 3 + 1) + 1 + x * 3 + c] = border
            ? 245
            : Math.min(
                255,
                Math.round(rgb[c] * (0.65 + (0.35 * x) / w) + (30 * y) / h),
              );
        }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0);
    ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8;
    ihdr[9] = 2;
    await writeFile(
      path.join(root, name),
      Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        chunk("IHDR", ihdr),
        chunk("IDAT", deflateSync(raw)),
        chunk("IEND", Buffer.alloc(0)),
      ]),
    );
  }
  const sampleRate = 44100,
    seconds = 8,
    samples = sampleRate * seconds,
    buffer = Buffer.alloc(44 + samples * 2);
  buffer.write("RIFF");
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++)
    buffer.writeInt16LE(
      Math.round(Math.sin((i / sampleRate) * Math.PI * 2 * 440) * 7000),
      44 + i * 2,
    );
  await writeFile(path.join(root, "voice.wav"), buffer);
  return entries;
}
