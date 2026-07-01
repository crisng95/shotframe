import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import { deflateSync } from 'node:zlib';

export interface InitOptions {
  dir?: string;
  json?: boolean;
  force?: boolean;
}

// --- tiny zero-dep PNG encoder (gradient placeholder screenshot) ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function gradientPng(w: number, h: number, top: [number, number, number], bot: [number, number, number]): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2; // truecolor RGB
  const raw = Buffer.alloc((w * 3 + 1) * h);
  let p = 0;
  for (let y = 0; y < h; y++) {
    raw[p++] = 0;
    const f = y / (h - 1);
    const r = Math.round(top[0] + (bot[0] - top[0]) * f);
    const g = Math.round(top[1] + (bot[1] - top[1]) * f);
    const b = Math.round(top[2] + (bot[2] - top[2]) * f);
    for (let x = 0; x < w; x++) {
      raw[p++] = r;
      raw[p++] = g;
      raw[p++] = b;
    }
  }
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function configTs(name: string): string {
  return `import { defineConfig } from '@shotframe/config';

// Edit this, drop your real screenshots into ./shots/, then run:  shotframe
export default defineConfig({
  brand: {
    name: ${JSON.stringify(name)},
    font: 'Inter', // bundled family; also: Montserrat, Poppins, 'Plus Jakarta Sans', Sora…
    colors: { primary: '#2563eb', accent: '#7c5cff', bg: '#0a1124', bezel: '#05070d', caption: '#ffffff' },
  },
  background: { type: 'gradient', glowStyle: 'center-radial', stops: ['#0a1124', '#0a0f1c'], glow: '#5b3df0' },
  output: { dir: './store-assets' },
  targets: [
    // App Store — iPhone 6.9"
    { store: 'appstore', id: 'iphone69-1', size: { w: 1290, h: 2796 },
      frame: { type: 'canvas', radius: 0.092, island: 'island' },
      caption: { text: 'Your headline\\ngoes here', position: 'top' },
      source: './shots/sample.png' },
    // Google Play — Android phone
    { store: 'play', id: 'androidp-1', size: { w: 1080, h: 1920 },
      frame: { type: 'canvas', radius: 0.085, island: 'hole' },
      caption: { text: 'One config,\\nevery store', position: 'bottom' },
      output: { format: 'jpeg', quality: 0.94 },
      source: './shots/sample.png' },
    // Chrome Web Store — browser frame
    { store: 'chrome', id: 'screenshot-1', size: { w: 1280, h: 800 },
      frame: { type: 'browser', url: 'yourapp.example.com' },
      output: { format: 'png' },
      source: './shots/sample.png' },
  ],
});
`;
}

function configJson(name: string): string {
  return (
    JSON.stringify(
      {
        brand: {
          name,
          font: 'Inter',
          colors: { primary: '#2563eb', accent: '#7c5cff', bg: '#0a1124', bezel: '#05070d', caption: '#ffffff' },
        },
        background: { type: 'gradient', glowStyle: 'center-radial', stops: ['#0a1124', '#0a0f1c'], glow: '#5b3df0' },
        output: { dir: './store-assets' },
        targets: [
          { store: 'appstore', id: 'iphone69-1', size: { w: 1290, h: 2796 }, frame: { type: 'canvas', radius: 0.092, island: 'island' }, caption: { text: 'Your headline\ngoes here', position: 'top' }, source: './shots/sample.png' },
          { store: 'play', id: 'androidp-1', size: { w: 1080, h: 1920 }, frame: { type: 'canvas', radius: 0.085, island: 'hole' }, caption: { text: 'One config,\nevery store', position: 'bottom' }, output: { format: 'jpeg', quality: 0.94 }, source: './shots/sample.png' },
          { store: 'chrome', id: 'screenshot-1', size: { w: 1280, h: 800 }, frame: { type: 'browser', url: 'yourapp.example.com' }, output: { format: 'png' }, source: './shots/sample.png' },
        ],
      },
      null,
      2,
    ) + '\n'
  );
}

/** Scaffold a starter config + a sample screenshot so `shotframe` runs immediately. */
export async function runInit(opts: InitOptions): Promise<{ config: string; sample: string }> {
  const dir = resolve(process.cwd(), opts.dir ?? '.');
  const name = basename(dir) || 'My App';
  const configPath = join(dir, opts.json ? 'shotframe.config.json' : 'shotframe.config.ts');

  if (existsSync(configPath) && !opts.force) {
    throw new Error(`${basename(configPath)} already exists (use --force to overwrite)`);
  }
  await writeFile(configPath, opts.json ? configJson(name) : configTs(name));

  const shotsDir = join(dir, 'shots');
  await mkdir(shotsDir, { recursive: true });
  const samplePath = join(shotsDir, 'sample.png');
  if (!existsSync(samplePath) || opts.force) {
    await writeFile(samplePath, gradientPng(600, 1300, [37, 99, 235], [124, 92, 255]));
  }

  return { config: configPath, sample: samplePath };
}
