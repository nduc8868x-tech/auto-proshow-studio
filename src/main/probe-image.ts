import { deflateSync } from "node:zlib";
export function probePng() {
  const crc = (data: Buffer) => {
    let value = 0xffffffff;
    for (const byte of data) {
      value ^= byte;
      for (let i = 0; i < 8; i++)
        value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
    }
    return (value ^ 0xffffffff) >>> 0;
  };
  const chunk = (name: string, body: Buffer) => {
    const type = Buffer.from(name),
      length = Buffer.alloc(4),
      sum = Buffer.alloc(4);
    length.writeUInt32BE(body.length);
    sum.writeUInt32BE(crc(Buffer.concat([type, body])));
    return Buffer.concat([length, type, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(256, 0);
  header.writeUInt32BE(256, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.alloc((256 * 3 + 1) * 256))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
