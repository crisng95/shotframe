import { createServer, type Server } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname, extname, join } from 'node:path';
import { loadConfig } from '@shotframe/config';
import type { ResolvedStudioConfig } from '@shotframe/config';
import type { ResolvedTarget, SourceUrlMap, HtmlPresetFn } from '@shotframe/core';
import { renderAsset } from '@shotframe/core';
import { FONTS } from '@shotframe/fonts';
import { HOST_HTML } from './host.js';
import { loadPresetFns } from './presets.js';
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
  '.html': 'text/html',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

/** A face the page injects as a `FontFace` (url filled in once the host port is known). */
interface FaceSpec {
  family: string;
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

export async function runRender(
  opts: RenderOptions,
): Promise<{ written: { file: string; w: number; h: number }[] }> {
  const configPath = resolve(process.cwd(), opts.config);
  if (!existsSync(configPath)) throw new Error(`Config not found: ${configPath}`);
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

  const outDir = opts.out
    ? resolve(process.cwd(), opts.out)
    : resolve(configDir, cfg.output?.dir ?? 'shotframe-out');

  // Map every referenced source path -> a stable served URL path.
  const sourceFiles = new Map<string, string>(); // ref -> absolute file path
  for (const t of targets) {
    for (const ref of sourceRefs(t, cfg.background.image)) {
      if (!sourceFiles.has(ref)) {
        const abs = resolve(configDir, ref);
        if (!existsSync(abs)) throw new Error(`Source image not found: ${ref} (resolved ${abs})`);
        sourceFiles.set(ref, abs);
      }
    }
  }
  const refToUrlPath = new Map<string, string>();
  const urlPathToFile = new Map<string, string>();
  let si = 0;
  for (const [ref, abs] of sourceFiles) {
    const p = `/sources/${si++}${extname(abs).toLowerCase()}`;
    refToUrlPath.set(ref, p);
    urlPathToFile.set(p, abs);
  }

  // ---- font plan: serve the bundled woff2 + LOAD the brand face(s) before render ----
  const fontsRoot = fontsDir();
  const fontManifestJson = JSON.stringify(FONTS);
  const customFonts = new Map<string, string>();
  const faceSpecs: FaceSpec[] = [];
  let fci = 0;
  const fontPlan = resolveFont(cfg.brand);
  for (const face of fontPlan.faces) {
    if (/^https?:\/\//i.test(face.file)) {
      faceSpecs.push({ family: face.family, path: face.file, weight: face.weight, style: face.style });
      continue;
    }
    const bundled = join(fontsRoot, face.file);
    if (!face.file.includes('/') && !face.file.includes('\\') && existsSync(bundled)) {
      faceSpecs.push({ family: face.family, path: `/fonts/${face.file}`, weight: face.weight, style: face.style });
      continue;
    }
    const abs = resolve(configDir, face.file);
    if (!existsSync(abs)) throw new Error(`Font file not found: ${face.file} (resolved ${abs})`);
    const p = `/fonts/custom-${fci++}${extname(abs).toLowerCase()}`;
    customFonts.set(p, abs);
    faceSpecs.push({ family: face.family, path: p, weight: face.weight, style: face.style });
  }

  // Path B presets: live functions, called by renderAsset in THIS (Node) realm.
  const presets: Record<string, HtmlPresetFn> = await loadPresetFns(cfg.presets, configDir);

  // ---- static host on 127.0.0.1 (ephemeral port) — same origin as fonts+images ----
  const server: Server = createServer(async (req, res) => {
    try {
      const url = (req.url ?? '/').split('?')[0];
      if (url === '/' || url === '/host.html') {
        res.setHeader('content-type', 'text/html');
        res.end(HOST_HTML);
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
            res.setHeader('content-type', 'font/woff2');
            res.end(await readFile(fp));
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
    const page = await browser.newPage({ deviceScaleFactor: 1 });
    await page.goto(`${base}/host.html`, { waitUntil: 'load' });
    await page.waitForFunction(
      () => (window as unknown as { __sfReady?: boolean }).__sfReady === true,
      { timeout: 15000 },
    );

    // Load the brand font face(s) BEFORE any render (same origin → no CORS).
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
      await Promise.all([400, 600, 700, 800].map((w) => document.fonts.load(`${w} 16px "${fam}"`)));
    }, faces);

    for (const t of targets) {
      const sources: SourceUrlMap = {};
      for (const ref of sourceRefs(t, cfg.background.image)) {
        const p = refToUrlPath.get(ref);
        if (p) sources[ref] = `${base}${p}`;
      }
      const format = t.output?.format ?? cfg.output?.format ?? 'png';
      const quality = t.output?.quality ?? cfg.output?.quality ?? 0.94;

      // Build the asset HTML in Node (calls live presets), inject it, screenshot #asset.
      const assetHtml = renderAsset(cfg, t, { presets, sources, family: fontPlan.family });
      await page.setViewportSize({ width: t.size.w, height: t.size.h });
      await page.evaluate((html) => {
        (document.getElementById('root') as HTMLElement).innerHTML = html;
      }, assetHtml);
      // Wait for fonts AND every <img> (Path A screenshots / preset photos) to
      // finish decoding — the DOM loads them async, unlike the old pre-decoded
      // canvas path, so a screenshot taken too early would show blank placeholders.
      await page.evaluate(async () => {
        const d = document as unknown as { fonts: { ready: Promise<unknown> } };
        await d.fonts.ready;
        const imgs = Array.from(document.querySelectorAll('#asset img')) as HTMLImageElement[];
        await Promise.all(
          imgs.map((img) =>
            img.complete && img.naturalWidth > 0
              ? img.decode().catch(() => undefined)
              : new Promise<void>((res) => {
                  img.addEventListener('load', () => res(), { once: true });
                  img.addEventListener('error', () => res(), { once: true });
                }),
          ),
        );
      });
      // CSS background-image (image backgrounds) isn't an <img>; let the network settle.
      await page.waitForLoadState('networkidle').catch(() => undefined);

      const buf = await page.locator('#asset').screenshot(
        format === 'jpeg'
          ? { type: 'jpeg', quality: Math.round(quality * 100) }
          : { type: 'png' },
      );

      const ext = format === 'png' ? 'png' : 'jpg';
      const dir = join(outDir, t.store);
      await mkdir(dir, { recursive: true });
      const file = join(dir, `${t.id}.${ext}`);
      await writeFile(file, buf);
      written.push({ file, w: t.size.w, h: t.size.h });
    }
  } finally {
    await browser.close();
    server.close();
  }

  return { written };
}
