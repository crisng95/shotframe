/**
 * The browser studio. A config CONSUMER: it boots from a resolved config served
 * at `/config.json`, renders the selected target into a `<canvas>` with the SAME
 * `@shotframe/core` `renderTarget` the CLI/headless renderer uses, and lets the
 * user tweak caption text/position/size and swap in a real screenshot — all
 * in-memory (v1 never writes back to the config file).
 */
import { renderTarget } from '@shotframe/core';
import type {
  BackgroundConfig,
  BrandConfig,
  CaptionConfig,
  PresetDef,
  PresetDrawFn,
  ResolvedTarget,
  SourceImageMap,
  StudioConfig,
} from '@shotframe/core';
import { groupTargetsByStore, sourceRefs, targetKey } from './group.js';
import {
  CUSTOM_VALUE,
  facesForFamily,
  isCustomFamily,
  manifestFaces,
  normalizeCurrentFont,
  type FaceSpec,
  type ManifestFont,
} from './fonts.js';

/**
 * The boot payload the CLI `studio` command serves at `/config.json`.
 * `config` is the resolved studio config; `sources` maps each image ref used by
 * a target to a URL the studio can `fetch` (the CLI serves these under /sources/*).
 */
export interface StudioBootData {
  config: {
    brand: BrandConfig;
    background: BackgroundConfig;
    targets: ResolvedTarget[];
    presets?: PresetDef[];
    output?: { dir: string; format?: 'png' | 'jpeg'; quality?: number };
  };
  sources: Record<string, string>;
  /** Serialized Path B `PresetDrawFn` sources, keyed by preset id (CLI-provided). */
  presetFns?: Record<string, string>;
  /**
   * The resolved brand font: faces to LOAD before the first render so the
   * studio's measure/wrap matches the headless renderer (deterministic font).
   */
  fonts?: {
    family: string;
    faces: { family: string; url: string; weight: string; style: string }[];
  };
}

/** Per-target, in-memory edit state. Never persisted to disk. */
interface TargetState {
  captionText: string;
  captionBottom: boolean;
  headMul: number;
  /** A user-supplied screenshot that overrides the config `source`. */
  userImage?: ImageBitmap;
}

interface Els {
  brandName: HTMLElement;
  targets: HTMLElement;
  canvas: HTMLCanvasElement;
  hint: HTMLElement;
  capText: HTMLTextAreaElement;
  capBottom: HTMLInputElement;
  headSize: HTMLInputElement;
  drop: HTMLElement;
  file: HTMLInputElement;
  clearImg: HTMLButtonElement;
  expPng: HTMLButtonElement;
  expJpg: HTMLButtonElement;
  expAll: HTMLButtonElement;
  fontSelect: HTMLSelectElement;
  customFont: HTMLElement;
  customFamily: HTMLInputElement;
  customUrl: HTMLInputElement;
  customApply: HTMLButtonElement;
}

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`missing #${id}`);
  return node as T;
}

export class Studio {
  private readonly boot: StudioBootData;
  private readonly els: Els;
  private readonly targets: ResolvedTarget[];
  private readonly state = new Map<string, TargetState>();
  private readonly bitmapCache = new Map<string, Promise<ImageBitmap>>();
  /** Path B presets reconstructed from their serialized sources (shell-injected). */
  private readonly presets: Record<string, PresetDrawFn> = {};
  /** Bundled fonts from `/fonts/manifest.json` (empty until the picker loads). */
  private manifest: ManifestFont[] = [];
  /** Already-registered FontFaces, keyed family|weight|style|url, to avoid dupes. */
  private readonly loadedFaces = new Set<string>();
  private selected = 0;
  private renderToken = 0;

  constructor(boot: StudioBootData) {
    this.boot = boot;
    this.targets = boot.config.targets;
    for (const [id, src] of Object.entries(boot.presetFns ?? {})) {
      this.presets[id] = new Function(`return (${src});`)() as PresetDrawFn;
    }
    this.els = {
      brandName: el('brandName'),
      targets: el('targets'),
      canvas: el<HTMLCanvasElement>('c'),
      hint: el('hint'),
      capText: el<HTMLTextAreaElement>('capText'),
      capBottom: el<HTMLInputElement>('capBottom'),
      headSize: el<HTMLInputElement>('headSize'),
      drop: el('drop'),
      file: el<HTMLInputElement>('file'),
      clearImg: el<HTMLButtonElement>('clearImg'),
      expPng: el<HTMLButtonElement>('expPng'),
      expJpg: el<HTMLButtonElement>('expJpg'),
      expAll: el<HTMLButtonElement>('expAll'),
      fontSelect: el<HTMLSelectElement>('fontSelect'),
      customFont: el('customFont'),
      customFamily: el<HTMLInputElement>('customFamily'),
      customUrl: el<HTMLInputElement>('customUrl'),
      customApply: el<HTMLButtonElement>('customApply'),
    };
    for (const t of this.targets) {
      this.state.set(targetKey(t), {
        captionText: t.caption?.text ?? '',
        captionBottom: t.caption?.position === 'bottom',
        headMul: t.caption?.sizeMul ?? 1,
      });
    }
  }

  /** Build the canvas-engine config (brand + global background) once. */
  private cfg(): StudioConfig {
    return {
      brand: this.boot.config.brand,
      background: this.boot.config.background,
      targets: this.targets,
      presets: this.boot.config.presets,
    };
  }

  private current(): ResolvedTarget {
    return this.targets[this.selected];
  }

  private currentState(): TargetState {
    return this.state.get(targetKey(this.current()))!;
  }

  /** Resolve & cache an image ref → ImageBitmap via the CLI-served URL. */
  private loadRef(ref: string): Promise<ImageBitmap> | undefined {
    const url = this.boot.sources[ref];
    if (!url) return undefined;
    let p = this.bitmapCache.get(url);
    if (!p) {
      p = fetch(url)
        .then((r) => r.blob())
        .then((b) => createImageBitmap(b));
      this.bitmapCache.set(url, p);
    }
    return p;
  }

  /** Decode every source a target needs (+ the in-memory user override). */
  private async buildSources(t: ResolvedTarget, st: TargetState): Promise<SourceImageMap> {
    const sources: SourceImageMap = {};
    await Promise.all(
      sourceRefs(t, this.boot.config.background.image).map(async (ref) => {
        const p = this.loadRef(ref);
        if (p) sources[ref] = await p;
      }),
    );
    if (st.userImage) {
      // renderTarget resolves `target.source` first, then falls back to `target.id`.
      sources[t.source ?? t.id] = st.userImage;
    }
    return sources;
  }

  /** A copy of the target with the live in-memory caption edits applied. */
  private editedTarget(t: ResolvedTarget, st: TargetState): ResolvedTarget {
    let caption: CaptionConfig | undefined;
    if (st.captionText.trim()) {
      caption = {
        text: st.captionText,
        position: st.captionBottom ? 'bottom' : 'top',
        sizeMul: st.headMul,
      };
      if (t.caption?.color) caption.color = t.caption.color;
    }
    const out: ResolvedTarget = { ...t };
    if (caption) out.caption = caption;
    else delete out.caption;
    return out;
  }

  /** Render the given target into a fresh, dimension-exact offscreen canvas. */
  private async renderTo(canvas: HTMLCanvasElement, t: ResolvedTarget): Promise<void> {
    const st = this.state.get(targetKey(t))!;
    const sources = await this.buildSources(t, st);
    canvas.width = t.size.w;
    canvas.height = t.size.h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    renderTarget(ctx, this.cfg(), this.editedTarget(t, st), sources, this.presets);
  }

  /** Re-render the visible canvas for the current selection. */
  private async draw(): Promise<void> {
    const token = ++this.renderToken;
    const t = this.current();
    await this.renderTo(this.els.canvas, t);
    if (token !== this.renderToken) return; // a newer render superseded us
    this.els.hint.textContent = `${t.store} · ${t.id} · ${t.size.w}×${t.size.h} px`;
  }

  private selectTarget(i: number): void {
    this.selected = i;
    this.syncSettings();
    this.renderRail();
    void this.draw();
  }

  /** Push the current target's state into the settings inputs. */
  private syncSettings(): void {
    const st = this.currentState();
    this.els.capText.value = st.captionText;
    this.els.capBottom.checked = st.captionBottom;
    this.els.headSize.value = String(st.headMul);
    this.els.clearImg.style.display = st.userImage ? '' : 'none';
  }

  private renderRail(): void {
    const groups = groupTargetsByStore(this.targets);
    this.els.targets.innerHTML = '';
    for (const g of groups) {
      const wrap = document.createElement('div');
      wrap.className = 'tgroup';
      const label = document.createElement('div');
      label.className = 'glabel';
      label.textContent = g.label;
      wrap.appendChild(label);
      for (const t of g.targets) {
        const idx = this.targets.indexOf(t);
        const btn = document.createElement('button');
        btn.className = 'titem' + (idx === this.selected ? ' active' : '');
        btn.innerHTML = `<span>${t.id}</span><small>${t.size.w}×${t.size.h}</small>`;
        btn.onclick = () => this.selectTarget(idx);
        wrap.appendChild(btn);
      }
      this.els.targets.appendChild(wrap);
    }
  }

  private downloadDataUrl(dataUrl: string, name: string): void {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = name;
    a.click();
  }

  private toDataUrl(canvas: HTMLCanvasElement, t: ResolvedTarget): { url: string; ext: string } {
    const format = t.output?.format ?? this.boot.config.output?.format ?? 'png';
    const quality = t.output?.quality ?? this.boot.config.output?.quality ?? 0.94;
    const url = canvas.toDataURL(format === 'png' ? 'image/png' : 'image/jpeg', quality);
    return { url, ext: format === 'png' ? 'png' : 'jpg' };
  }

  private async exportOne(t: ResolvedTarget, forceFormat?: 'png' | 'jpeg'): Promise<void> {
    const tmp = document.createElement('canvas');
    await this.renderTo(tmp, t);
    if (forceFormat) {
      const quality = t.output?.quality ?? this.boot.config.output?.quality ?? 0.94;
      const url = tmp.toDataURL(forceFormat === 'png' ? 'image/png' : 'image/jpeg', quality);
      this.downloadDataUrl(url, `${t.store}_${t.id}.${forceFormat === 'png' ? 'png' : 'jpg'}`);
      return;
    }
    const { url, ext } = this.toDataUrl(tmp, t);
    this.downloadDataUrl(url, `${t.store}_${t.id}.${ext}`);
  }

  private wireEvents(): void {
    const e = this.els;

    e.capText.oninput = () => {
      this.currentState().captionText = e.capText.value;
      void this.draw();
    };
    e.capBottom.onchange = () => {
      this.currentState().captionBottom = e.capBottom.checked;
      void this.draw();
    };
    e.headSize.oninput = () => {
      this.currentState().headMul = parseFloat(e.headSize.value);
      void this.draw();
    };

    const loadFile = (file: File | undefined | null): void => {
      if (!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          createImageBitmap(img).then((bmp) => {
            this.currentState().userImage = bmp;
            e.clearImg.style.display = '';
            void this.draw();
          });
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    };

    e.drop.ondragover = (ev) => {
      ev.preventDefault();
      e.drop.classList.add('hover');
    };
    e.drop.ondragleave = () => e.drop.classList.remove('hover');
    e.drop.ondrop = (ev) => {
      ev.preventDefault();
      e.drop.classList.remove('hover');
      loadFile(ev.dataTransfer?.files[0]);
    };
    e.drop.onclick = () => e.file.click();
    e.file.onchange = () => loadFile(e.file.files?.[0]);

    e.clearImg.onclick = () => {
      const st = this.currentState();
      st.userImage = undefined;
      e.clearImg.style.display = 'none';
      e.file.value = '';
      void this.draw();
    };

    e.fontSelect.onchange = () => {
      if (e.fontSelect.value === CUSTOM_VALUE) {
        e.customFont.style.display = '';
        e.customFamily.focus();
        return;
      }
      e.customFont.style.display = 'none';
      void this.applyFont(e.fontSelect.value);
    };
    e.customApply.onclick = () => void this.applyCustomFont();

    e.expPng.onclick = () => void this.exportOne(this.current(), 'png');
    e.expJpg.onclick = () => void this.exportOne(this.current(), 'jpeg');
    e.expAll.onclick = async () => {
      e.expAll.disabled = true;
      try {
        for (const t of this.targets) {
          await this.exportOne(t);
          // small gap so the browser doesn't drop rapid sequential downloads
          await new Promise((r) => setTimeout(r, 250));
        }
      } finally {
        e.expAll.disabled = false;
      }
    };
  }

  /** Boot the studio: wire UI, wait for fonts, render the first target. */
  async start(): Promise<void> {
    this.els.brandName.textContent = this.boot.config.brand.name;
    this.wireEvents();
    this.renderRail();
    this.syncSettings();
    if (this.targets.length === 0) {
      this.els.hint.textContent = 'No targets in this config.';
      return;
    }
    // Load the configured brand font BEFORE the first measure/render so caption
    // metrics use the bundled face (deterministic), not a system fallback.
    await this.loadFonts();
    // Fetch the bundled-font manifest and build the picker (loads all faces so
    // the dropdown previews each option in its own font).
    await this.initFontPicker();
    // Fonts must be ready before the first measure/render (caption metrics).
    await document.fonts.ready;
    await this.draw();
  }

  /** Register + load FontFaces (deduped); a blocked face never wedges the studio. */
  private async loadFaces(faces: FaceSpec[]): Promise<void> {
    await Promise.all(
      faces.map(async (f) => {
        const key = `${f.family}|${f.weight}|${f.style}|${f.url}`;
        if (this.loadedFaces.has(key)) return;
        this.loadedFaces.add(key);
        try {
          const ff = new FontFace(f.family, `url(${f.url})`, { weight: f.weight, style: f.style });
          document.fonts.add(ff);
          await ff.load();
        } catch {
          this.loadedFaces.delete(key); // allow a later retry
        }
      }),
    );
  }

  /** Pre-warm the caption weights for a family (no-op if already cached). */
  private async warmWeights(family: string): Promise<void> {
    await Promise.all(
      [400, 600, 700, 800].map((w) => document.fonts.load(`${w} 16px "${family}"`).catch(() => [])),
    );
  }

  /** Inject + load the CLI-provided brand font face(s), then pre-warm each weight. */
  private async loadFonts(): Promise<void> {
    const fonts = this.boot.fonts;
    if (!fonts || fonts.faces.length === 0) return;
    await this.loadFaces(fonts.faces);
    await this.warmWeights(fonts.family || fonts.faces[0]?.family || 'Inter');
  }

  /** Fetch `/fonts/manifest.json`, build the dropdown, load all faces for previews. */
  private async initFontPicker(): Promise<void> {
    try {
      const resp = await fetch('/fonts/manifest.json', { cache: 'no-store' });
      if (resp.ok) this.manifest = (await resp.json()) as ManifestFont[];
    } catch {
      this.manifest = []; // manifest unavailable → picker still offers current + Custom
    }
    const current = normalizeCurrentFont(this.manifest, this.boot.config.brand.font);
    this.boot.config.brand.font = current; // keep the in-memory brand font canonical
    this.buildFontSelect(current);
    // Load every manifest face so each <option> previews in its own family.
    await this.loadFaces(manifestFaces(this.manifest));
  }

  /** Build the font <option> list: (custom brand font) → manifest fonts → Custom…. */
  private buildFontSelect(current: string): void {
    const sel = this.els.fontSelect;
    sel.innerHTML = '';
    // A non-manifest brand font (e.g. a config fontFace) gets its own leading entry.
    if (current && isCustomFamily(this.manifest, current)) this.addFontOption(current);
    for (const f of this.manifest) this.addFontOption(f.family);
    const custom = document.createElement('option');
    custom.value = CUSTOM_VALUE;
    custom.textContent = 'Custom…';
    sel.appendChild(custom);
    sel.value = current;
  }

  /** Append one font <option>, previewed in its own family, unless already present. */
  private addFontOption(family: string): void {
    const sel = this.els.fontSelect;
    for (const o of Array.from(sel.options)) {
      if (o.value === family) return;
    }
    const opt = document.createElement('option');
    opt.value = family;
    opt.textContent = family;
    opt.style.fontFamily = `"${family}"`;
    // Keep "Custom…" last when re-inserting a freshly applied custom family.
    const customOpt = Array.from(sel.options).find((o) => o.value === CUSTOM_VALUE);
    sel.insertBefore(opt, customOpt ?? null);
  }

  /** Set the in-memory brand font to `family`, ensure it's loaded, then re-render. */
  private async applyFont(family: string): Promise<void> {
    this.boot.config.brand.font = family;
    await this.loadFaces(facesForFamily(this.manifest, family));
    await this.warmWeights(family);
    await this.draw();
  }

  /** Register a user-supplied woff2 URL as a FontFace, then apply it as the brand font. */
  private async applyCustomFont(): Promise<void> {
    const family = this.els.customFamily.value.trim();
    const url = this.els.customUrl.value.trim();
    if (!family || !url) return;
    const btn = this.els.customApply;
    btn.disabled = true;
    try {
      await this.loadFaces([{ family, url, weight: '400', style: 'normal' }]);
      this.addFontOption(family);
      this.els.fontSelect.value = family;
      this.els.customFont.style.display = 'none';
      await this.applyFont(family);
    } finally {
      btn.disabled = false;
    }
  }
}
