// Generate sample source screenshots (solid vertical gradient PNGs) with zero deps —
// just so the render pipeline has real, decodable images to frame. Pure Node PNG encoder.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'shots');
mkdirSync(outDir, { recursive: true });

// Inline CRC-32 (PNG/zlib polynomial) — avoids node:zlib.crc32 which only exists on
// Node ≥ 22.2; this keeps the example runnable on Node 18/20 (CI + documented floor).
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function pngGradient(w, h, top, bottom) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB
  // 10,11,12 = compression, filter, interlace = 0
  const raw = Buffer.alloc((w * 3 + 1) * h);
  let p = 0;
  for (let y = 0; y < h; y++) {
    raw[p++] = 0; // filter: none
    const t = y / (h - 1);
    const r = Math.round(top[0] + (bottom[0] - top[0]) * t);
    const g = Math.round(top[1] + (bottom[1] - top[1]) * t);
    const b = Math.round(top[2] + (bottom[2] - top[2]) * t);
    for (let x = 0; x < w; x++) {
      raw[p++] = r;
      raw[p++] = g;
      raw[p++] = b;
    }
  }
  const idat = deflateSync(raw);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const shots = [
  { name: 'phone-1.png', w: 600, h: 1300, top: [37, 99, 235], bottom: [124, 92, 255] },
  { name: 'phone-2.png', w: 600, h: 1300, top: [14, 165, 233], bottom: [16, 24, 48] },
  { name: 'phone-3.png', w: 600, h: 1300, top: [16, 185, 129], bottom: [5, 46, 22] },
  { name: 'phone-4.png', w: 600, h: 1300, top: [244, 63, 94], bottom: [76, 5, 25] },
  { name: 'phone-5.png', w: 600, h: 1300, top: [251, 191, 36], bottom: [120, 53, 15] },
  { name: 'browser-1.png', w: 1280, h: 760, top: [241, 245, 249], bottom: [203, 213, 225] },
  { name: 'browser-2.png', w: 1280, h: 760, top: [224, 242, 254], bottom: [186, 230, 253] },
  { name: 'browser-3.png', w: 1280, h: 760, top: [245, 243, 255], bottom: [221, 214, 254] },
  { name: 'email-1.png', w: 600, h: 800, top: [255, 255, 255], bottom: [226, 232, 240] },
  // tablet-aspect shots (iPad ~0.75, Android tablet ~0.625)
  { name: 'ipad-1.png', w: 900, h: 1200, top: [99, 102, 241], bottom: [30, 27, 75] },
  { name: 'tablet-1.png', w: 800, h: 1280, top: [20, 184, 166], bottom: [4, 47, 46] },
  // wide banner for the Google Play feature graphic (1024×500)
  { name: 'feature-1.png', w: 1024, h: 500, top: [37, 99, 235], bottom: [124, 92, 255] },
];
for (const s of shots) {
  writeFileSync(join(outDir, s.name), pngGradient(s.w, s.h, s.top, s.bottom));
  console.log('wrote', s.name);
}
