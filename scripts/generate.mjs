// Build-time generator. Run with `node scripts/generate.mjs` (also runs before dev/build).
// Renders every page from the code defaults (site.config.mjs + content.mjs) and writes
// HTML, sitemap, robots, search index and manifest, plus the PNG icons.
//
// Edits made in /admin/ are stored in Cloudflare KV and applied at the edge by the Worker;
// they never touch these files.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { renderAll } from "./render.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function write(rel, content) {
  const file = join(root, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function crc32(buf) {
  let c,
    crc = ~0;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return ~crc >>> 0;
}

function png(size) {
  const px = Buffer.alloc((size * 4 + 1) * size);
  const navy = [19, 35, 57], copper = [184, 115, 50], paper = [245, 247, 249];
  for (let y = 0; y < size; y++) {
    px[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size, v = (y + 0.5) / size;
      let c = navy;
      if (v >= 0.22 && v <= 0.48 && Math.abs(u - 0.5) <= ((v - 0.22) / 0.26) * 0.34) c = copper;
      if (v > 0.48 && v <= 0.78 && u >= 0.26 && u <= 0.74) c = paper;
      if (v >= 0.6 && v <= 0.78 && u >= 0.44 && u <= 0.56) c = navy;
      const o = y * (size * 4 + 1) + 1 + x * 4;
      px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255;
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(px)), chunk("IEND", Buffer.alloc(0))]);
}

const { files, pages } = renderAll();
for (const [rel, content] of files) write(rel, content);
for (const [name, size] of [["apple-touch-icon", 180], ["icon-192", 192], ["icon-512", 512]]) write(`public/${name}.png`, png(size));
console.log(`Generated ${pages.length} pages.`);
