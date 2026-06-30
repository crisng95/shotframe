/**
 * `shotframe studio` — boot the browser studio UI for live preview/editing.
 *
 * Serves the PREBUILT `@shotframe/studio` static `dist/` over a tiny node:http
 * host on 127.0.0.1, injecting the resolved config at `/config.json` and the
 * user's source images under `/sources/*` (same static-host pattern as render.ts).
 * No vite-dev dependency at runtime; the studio is read-only on the config file.
 */
import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { loadConfig } from '@shotframe/config';
import type { ResolvedStudioConfig } from '@shotframe/config';
import type { ResolvedTarget } from '@shotframe/core';
import { FONTS } from '@shotframe/fonts';
import { loadPresetSources } from './presets.js';
import { resolveFont, fontsDir } from './fonts.js';

export interface StudioOptions {
  config: string;
  port?: number;
  open?: boolean;
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

/** Every external image a target may reference (real screenshot, image-frame PNG, bg image). */
function sourceRefs(t: ResolvedTarget, bgImage?: string): string[] {
  const refs: string[] = [];
  if (t.source) refs.push(t.source);
  if (t.frame?.type === 'image' && t.frame.src) refs.push(t.frame.src);
  const bg = t.background?.image ?? bgImage;
  if (bg) refs.push(bg);
  return refs;
}

/**
 * Locate the prebuilt studio `dist/`.
 *  1. Published / built: the CLI bundles it next to this file at `dist/studio`
 *     (see scripts/copy-studio.mjs) — studio is private, not a runtime dep.
 *  2. Monorepo dev fallback: the sibling workspace `../../studio/dist`.
 */
function resolveStudioDist(): string {
  const selfDir = dirname(fileURLToPath(import.meta.url)); // packages/cli/dist
  const bundled = join(selfDir, 'studio');
  if (existsSync(join(bundled, 'index.html'))) return bundled;
  return join(selfDir, '..', '..', 'studio', 'dist');
}

/** Safe-join a request path under the dist root (block path traversal). */
function safeJoin(root: string, urlPath: string): string | null {
  const decoded = decodeURIComponent(urlPath);
  const p = normalize(join(root, decoded));
  if (p !== root && !p.startsWith(root + sep)) return null;
  return p;
}

/** Best-effort: open the URL in the user's default browser. Never throws. */
function openBrowser(url: string): void {
  const cmd =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  try {
    const child = spawn(cmd, [url], { stdio: 'ignore', detached: true, shell: process.platform === 'win32' });
    child.on('error', () => {});
    child.unref();
  } catch {
    /* ignore — the URL is logged anyway */
  }
}

export async function runStudio(opts: StudioOptions): Promise<{ url: string; server: Server }> {
  const configPath = resolve(process.cwd(), opts.config);
  if (!existsSync(configPath)) throw new Error(`Config not found: ${configPath}`);
  const configDir = dirname(configPath);
  const cfg: ResolvedStudioConfig = await loadConfig(configPath);

  const distDir = resolveStudioDist();
  if (!existsSync(join(distDir, 'index.html'))) {
    throw new Error(
      `Studio is not built (${distDir}/index.html missing). Run: pnpm --filter @shotframe/studio build`,
    );
  }

  // Map every referenced source path -> a stable /sources/<i>.<ext> URL.
  const sourceFiles = new Map<string, string>(); // ref -> absolute file path
  for (const t of cfg.targets) {
    for (const ref of sourceRefs(t, cfg.background.image)) {
      if (!sourceFiles.has(ref)) {
        const abs = resolve(configDir, ref);
        if (!existsSync(abs)) throw new Error(`Source image not found: ${ref} (resolved ${abs})`);
        sourceFiles.set(ref, abs);
      }
    }
  }
  const refToUrl = new Map<string, string>(); // ref -> /sources/<i>.<ext>
  const urlToFile = new Map<string, string>(); // /sources/<i>.<ext> -> absolute file
  let i = 0;
  for (const [ref, abs] of sourceFiles) {
    const p = `/sources/${i++}${extname(abs).toLowerCase()}`;
    refToUrl.set(ref, p);
    urlToFile.set(p, abs);
  }

  // Path B presets: serialize each default PresetDrawFn for the studio's browser
  // realm (the studio reconstructs them with `new Function`).
  const presetFns = await loadPresetSources(cfg.presets, configDir);

  // ---- font plan: serve the bundled woff2 + tell the studio which face(s) to
  // LOAD before its first render (so its measure/wrap matches the headless one).
  const fontsRoot = fontsDir();
  const fontManifestJson = JSON.stringify(FONTS);
  const customFonts = new Map<string, string>(); // /fonts/custom-<i>.<ext> -> absolute file
  const fontFaces: { family: string; url: string; weight: string; style: string }[] = [];
  const fontPlan = resolveFont(cfg.brand);
  let fci = 0;
  for (const face of fontPlan.faces) {
    if (/^https?:\/\//i.test(face.file)) {
      fontFaces.push({ family: face.family, url: face.file, weight: face.weight, style: face.style });
      continue;
    }
    const bundled = join(fontsRoot, face.file);
    if (!face.file.includes('/') && !face.file.includes('\\') && existsSync(bundled)) {
      fontFaces.push({ family: face.family, url: `/fonts/${face.file}`, weight: face.weight, style: face.style });
      continue;
    }
    const abs = resolve(configDir, face.file);
    if (!existsSync(abs)) throw new Error(`Font file not found: ${face.file} (resolved ${abs})`);
    const p = `/fonts/custom-${fci++}${extname(abs).toLowerCase()}`;
    customFonts.set(p, abs);
    fontFaces.push({ family: face.family, url: p, weight: face.weight, style: face.style });
  }

  // The boot payload the studio fetches at /config.json.
  const boot = {
    config: {
      brand: cfg.brand,
      background: cfg.background,
      targets: cfg.targets,
      ...(cfg.presets ? { presets: cfg.presets } : {}),
      ...(cfg.output ? { output: cfg.output } : {}),
    },
    sources: Object.fromEntries(refToUrl),
    ...(Object.keys(presetFns).length ? { presetFns } : {}),
    fonts: { family: fontPlan.family, faces: fontFaces },
  };
  const bootJson = JSON.stringify(boot);

  const server: Server = createServer(async (req, res) => {
    try {
      let url = (req.url ?? '/').split('?')[0];

      if (url === '/config.json') {
        res.setHeader('content-type', MIME['.json']);
        res.setHeader('cache-control', 'no-store');
        res.end(bootJson);
        return;
      }

      if (url === '/fonts/manifest.json') {
        res.setHeader('content-type', MIME['.json']);
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

      const srcFile = urlToFile.get(url);
      if (srcFile) {
        const buf = await readFile(srcFile);
        res.setHeader('content-type', MIME[extname(srcFile).toLowerCase()] ?? 'application/octet-stream');
        res.end(buf);
        return;
      }

      if (url === '/') url = '/index.html';
      const file = safeJoin(distDir, url);
      if (file && existsSync(file)) {
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

  const port = opts.port ?? 5179;
  await new Promise<void>((r, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', r);
  });
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('failed to bind studio server');
  const url = `http://127.0.0.1:${addr.port}`;

  if (opts.open !== false) openBrowser(url);
  return { url, server };
}
