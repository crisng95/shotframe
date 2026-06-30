import { createServer, type Server } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '@shotframe/config';
import type { ResolvedStudioConfig } from '@shotframe/config';
import type { ResolvedTarget } from '@shotframe/core';
import { FONTS } from '@shotframe/fonts';
import { HOST_HTML } from './host.js';
import { loadPresetSources, type PresetSourceMap } from './presets.js';
import { resolveFont, fontsDir } from './fonts.js';

export interface RenderOptions {
  config: string;
  out?: string;
  store?: string;
  /** Only render these target ids (regenerate specific variants). */
  targets?: string[];
}

/** Load a config and return its resolved targets (for `shotframe list`). */
export async function listTargets(
  configPath: string,
): Promise<{ store: string; id: string; w: number; h: number }[]> {
  const abs = resolve(process.cwd(), configPath);
  const cfg: ResolvedStudioConfig = await loadConfig(abs);
  return cfg.targets.map((t) => ({ store: t.store, id: t.id, w: t.size.w, h: t.size.h }));
}

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.js': 'text/javascript',
  '.html': 'text/html',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

/** A face spec the page injects as a `FontFace` (url filled in once the host port is known). */
interface FaceSpec {
  family: string;
  /** server-relative path (e.g. `/fonts/inter.woff2`) or an absolute http(s) URL. */
  path: string;
  weight: string;
  style: string;
}

/** Every external image a target may reference (real screenshot, image-frame PNG, bg image). */
function sourceRefs(t: ResolvedTarget, bgImage?: string): string[] {
  const refs: string[] = [];
  if (t.source) refs.push(t.source);
  if (t.frame?.type === 'image' && t.frame.src) refs.push(t.frame.src);
  const bg = t.background?.image ?? bgImage;
  if (bg) refs.push(bg);
  return refs;
}

/** Resolve the browser-target core artifact (`@shotframe/core` → dist/index.js). */
function resolveCoreArtifact(): string {
  // core is ESM-only (exports defines only the `import` condition), so use the ESM
  // resolver which honours it. The artifact is a self-contained browser ESM bundle.
  const url = import.meta.resolve('@shotframe/core');
  return fileURLToPath(url);
}

export async function runRender(opts: RenderOptions): Promise<{ written: { file: string; w: number; h: number }[] }> {
  const configPath = resolve(process.cwd(), opts.config);
  if (!existsSync(configPath)) {
    throw new Error(`Config not found: ${configPath}`);
  }
  const configDir = dirname(configPath);
  const cfg: ResolvedStudioConfig = await loadConfig(configPath);

  let targets = cfg.targets;
  if (opts.store) {
    targets = targets.filter((t) => t.store === opts.store);
    if (targets.length === 0) throw new Error(`No targets for store "${opts.store}"`);
  }
  if (opts.targets && opts.targets.length > 0) {
    const want = new Set(opts.targets);
    targets = targets.filter((t) => want.has(t.id));
    const missing = opts.targets.filter((id) => !cfg.targets.some((t) => t.id === id));
    if (missing.length) throw new Error(`Unknown target id(s): ${missing.join(', ')}`);
    if (targets.length === 0) throw new Error('No matching targets');
  }

  // An explicit --out is CWD-relative (what the user typed); config output.dir is
  // resolved relative to the config file (per the plan's path-portability rule).
  const outDir = opts.out
    ? resolve(process.cwd(), opts.out)
    : resolve(configDir, cfg.output?.dir ?? 'shotframe-out');

  // Map every referenced source path -> a stable served URL.
  const sourceFiles = new Map<string, string>(); // ref string -> absolute file path
  for (const t of targets) {
    for (const ref of sourceRefs(t, cfg.background.image)) {
      if (!sourceFiles.has(ref)) {
        const abs = resolve(configDir, ref);
        if (!existsSync(abs)) throw new Error(`Source image not found: ${ref} (resolved ${abs})`);
        sourceFiles.set(ref, abs);
      }
    }
  }
  // ref -> /sources/<index> URL (avoid path-encoding issues)
  const refToUrlPath = new Map<string, string>();
  const urlPathToFile = new Map<string, string>();
  let i = 0;
  for (const [ref, abs] of sourceFiles) {
    const p = `/sources/${i++}${extname(abs).toLowerCase()}`;
    refToUrlPath.set(ref, p);
    urlPathToFile.set(p, abs);
  }

  const coreArtifact = resolveCoreArtifact();

  // ---- font plan: serve + LOAD the brand font before render (determinism) ----
  // Map each resolved face -> a served URL, then load all faces in the page BEFORE
  // the render loop so measureText/wrap use the bundled woff2, not a system font.
  const fontsRoot = fontsDir();
  const fontManifestJson = JSON.stringify(FONTS);
  const customFonts = new Map<string, string>(); // /fonts/custom-<i>.<ext> -> absolute file
  const faceSpecs: FaceSpec[] = [];
  let fci = 0;
  for (const face of resolveFont(cfg.brand).faces) {
    if (/^https?:\/\//i.test(face.file)) {
      // custom remote face — use the URL as-is.
      faceSpecs.push({ family: face.family, path: face.file, weight: face.weight, style: face.style });
      continue;
    }
    const bundled = join(fontsRoot, face.file);
    if (!face.file.includes('/') && !face.file.includes('\\') && existsSync(bundled)) {
      // bundled woff2 (bare filename in the fonts dir).
      faceSpecs.push({ family: face.family, path: `/fonts/${face.file}`, weight: face.weight, style: face.style });
      continue;
    }
    // custom local face (brand.fontFace.src) — resolve relative to the config & serve it.
    const abs = resolve(configDir, face.file);
    if (!existsSync(abs)) throw new Error(`Font file not found: ${face.file} (resolved ${abs})`);
    const p = `/fonts/custom-${fci++}${extname(abs).toLowerCase()}`;
    customFonts.set(p, abs);
    faceSpecs.push({ family: face.family, path: p, weight: face.weight, style: face.style });
  }

  // Path B presets: resolve each module to its default PresetDrawFn (serialized
  // for the browser realm; reconstructed inside page.evaluate below).
  const presetSources: PresetSourceMap = await loadPresetSources(cfg.presets, configDir);

  // ---- static host on 127.0.0.1 (ephemeral port) ----
  const server: Server = createServer(async (req, res) => {
    try {
      const url = (req.url ?? '/').split('?')[0];
      if (url === '/' || url === '/host.html') {
        res.setHeader('content-type', 'text/html');
        res.end(HOST_HTML);
        return;
      }
      if (url === '/core.js') {
        const js = await readFile(coreArtifact);
        res.setHeader('content-type', 'text/javascript');
        res.end(js);
        return;
      }
      if (url === '/fonts/manifest.json') {
        res.setHeader('content-type', 'application/json');
        res.end(fontManifestJson);
        return;
      }
      if (url.startsWith('/fonts/')) {
        const custom = customFonts.get(url);
        if (custom) {
          const buf = await readFile(custom);
          res.setHeader('content-type', MIME[extname(custom).toLowerCase()] ?? 'font/woff2');
          res.end(buf);
          return;
        }
        const name = url.slice('/fonts/'.length);
        if (/^[a-z0-9._-]+\.woff2$/i.test(name)) {
          const fp = join(fontsRoot, name);
          if (existsSync(fp)) {
            const buf = await readFile(fp);
            res.setHeader('content-type', 'font/woff2');
            res.end(buf);
            return;
          }
        }
      }
      const file = urlPathToFile.get(url);
      if (file) {
        const buf = await readFile(file);
        res.setHeader('content-type', MIME[extname(file).toLowerCase()] ?? 'application/octet-stream');
        res.end(buf);
        return;
      }
      res.statusCode = 404;
      res.end('not found');
    } catch (err) {
      res.statusCode = 500;
      res.end(String(err));
    }
  });

  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('failed to bind host server');
  const base = `http://127.0.0.1:${addr.port}`;

  // ---- Playwright ----
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    server.close();
    throw new Error('playwright is not installed. Run: pnpm add -D playwright');
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    server.close();
    throw new Error(
      `Could not launch Chromium. Run "npx playwright install chromium" first.\n${String(err)}`,
    );
  }

  const written: { file: string; w: number; h: number }[] = [];
  try {
    const page = await browser.newPage();
    await page.goto(`${base}/host.html`, { waitUntil: 'load' });
    await page.waitForFunction(() => (window as unknown as { __sfReady?: boolean }).__sfReady === true, {
      timeout: 15000,
    });

    // Determinism: inject + LOAD the brand font face(s) BEFORE any render, so
    // measureText/wrap use the bundled woff2 (identical pixels across OS).
    const faces = faceSpecs.map((f) => ({
      family: f.family,
      url: f.path.startsWith('http') ? f.path : `${base}${f.path}`,
      weight: f.weight,
      style: f.style,
    }));
    await page.evaluate(async (faceList) => {
      for (const f of faceList) {
        const ff = new FontFace(f.family, `url(${f.url})`, { weight: f.weight, style: f.style });
        document.fonts.add(ff);
        await ff.load();
      }
      const fam = faceList[0]?.family ?? 'Inter';
      await Promise.all(
        [400, 600, 700, 800].map((w) => document.fonts.load(`${w} 16px "${fam}"`)),
      );
    }, faces);
    await page.evaluate(() => document.fonts.ready);

    for (const t of targets) {
      const sourceUrls: Record<string, string> = {};
      for (const ref of sourceRefs(t, cfg.background.image)) {
        const p = refToUrlPath.get(ref);
        if (p) sourceUrls[ref] = `${base}${p}`;
      }
      const format = t.output?.format ?? cfg.output?.format ?? 'png';
      const quality = t.output?.quality ?? cfg.output?.quality ?? 0.94;

      const dataUrl: string = await page.evaluate(
        async (args) => {
          const { cfg, target, sourceUrls, format, quality, presetSources } = args as {
            cfg: unknown;
            target: { size: { w: number; h: number }; preset?: string };
            sourceUrls: Record<string, string>;
            format: 'png' | 'jpeg';
            quality: number;
            presetSources: Record<string, string>;
          };
          const sf = (window as unknown as { __sf: { renderTarget: (...a: unknown[]) => void } }).__sf;
          const cache = ((window as unknown as { __imgs?: Record<string, ImageBitmap> }).__imgs ??= {});
          const sources: Record<string, ImageBitmap> = {};
          for (const [id, u] of Object.entries(sourceUrls)) {
            if (!cache[id]) {
              const resp = await fetch(u);
              const blob = await resp.blob();
              cache[id] = await createImageBitmap(blob);
            }
            sources[id] = cache[id];
          }
          // Reconstruct each serialized PresetDrawFn in this (browser) realm.
          const presetCache = ((window as unknown as { __presets?: Record<string, unknown> }).__presets ??= {});
          const presets: Record<string, unknown> = {};
          for (const [id, src] of Object.entries(presetSources)) {
            if (!presetCache[id]) presetCache[id] = new Function(`return (${src});`)();
            presets[id] = presetCache[id];
          }
          const canvas = document.getElementById('c') as HTMLCanvasElement;
          canvas.width = target.size.w;
          canvas.height = target.size.h;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('no 2d context');
          sf.renderTarget(ctx, cfg, target, sources, presets);
          return canvas.toDataURL(format === 'png' ? 'image/png' : 'image/jpeg', quality);
        },
        { cfg: cfg as unknown, target: t, sourceUrls, format, quality, presetSources },
      );

      const ext = format === 'png' ? 'png' : 'jpg';
      const dir = join(outDir, t.store);
      await mkdir(dir, { recursive: true });
      const file = join(dir, `${t.id}.${ext}`);
      const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
      await writeFile(file, Buffer.from(b64, 'base64'));
      written.push({ file, w: t.size.w, h: t.size.h });
    }
  } finally {
    await browser.close();
    server.close();
  }

  return { written };
}
