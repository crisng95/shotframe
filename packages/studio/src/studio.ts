/**
 * The browser studio. A config CONSUMER: it boots from a resolved config served
 * at `/config.json`, renders the selected target as REAL DOM with the SAME
 * `@shotframe/core.renderAsset` the CLI uses, and lets the user tweak caption
 * text/position/size and swap in a real screenshot — all in-memory (v1 never
 * writes back to the config file).
 *
 * WYSIWYG: the preview IS the asset DOM. Export rasterizes that exact DOM with
 * html-to-image — i.e. download = a reflow of what is on screen. (Byte-identical
 * parity with `shotframe render`, which uses Playwright, is a documented
 * follow-up via a CLI `/render` endpoint.)
 */
import { renderAsset } from '@shotframe/core';
import type {
  BackgroundConfig,
  BrandConfig,
  CaptionConfig,
  PresetDef,
  HtmlPresetFn,
  ResolvedTarget,
  SourceUrlMap,
  StudioConfig,
} from '@shotframe/core';
import { toBlob } from 'html-to-image';
import { groupTargetsByStore, targetKey } from './group.js';
import {
  CUSTOM_VALUE,
  facesForFamily,
  isCustomFamily,
  manifestFaces,
  normalizeCurrentFont,
  type FaceSpec,
  type ManifestFont,
} from './fonts.js';

export interface StudioBootData {
  config: {
    brand: BrandConfig;
    background: BackgroundConfig;
    targets: ResolvedTarget[];
    presets?: PresetDef[];
    output?: { dir: string; format?: 'png' | 'jpeg'; quality?: number };
  };
  sources: Record<string, string>;
  /** Serialized Path B `HtmlPresetFn` sources, keyed by preset id (CLI-provided). */
  presetFns?: Record<string, string>;
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
  /** A user-supplied screenshot (object URL) that overrides the config `source`. */
  userImageUrl?: string;
}

interface Els {
  brandName: HTMLElement;
  targets: HTMLElement;
  stage: HTMLElement;
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
  /** Path B presets reconstructed from their serialized sources (shell-injected). */
  private readonly presets: Record<string, HtmlPresetFn> = {};
  private manifest: ManifestFont[] = [];
  private readonly loadedFaces = new Set<string>();
  private selected = 0;

  constructor(boot: StudioBootData) {
    this.boot = boot;
    this.targets = boot.config.targets;
    for (const [id, src] of Object.entries(boot.presetFns ?? {})) {
      this.presets[id] = new Function(`return (${src});`)() as HtmlPresetFn;
    }
    this.els = {
      brandName: el('brandName'),
      targets: el('targets'),
      stage: el('c'),
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

  /** Build the engine config (brand + global background) once. */
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

  /** ref→URL sources for a target, plus the in-memory user-image override. */
  private sourcesFor(t: ResolvedTarget, st: TargetState): SourceUrlMap {
    const sources: SourceUrlMap = { ...this.boot.sources };
    if (st.userImageUrl) sources[t.source ?? t.id] = st.userImageUrl;
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

  /** Build the asset HTML for a target (with its edits applied). */
  private assetHtml(t: ResolvedTarget): string {
    const st = this.state.get(targetKey(t))!;
    return renderAsset(this.cfg(), this.editedTarget(t, st), {
      presets: this.presets,
      sources: this.sourcesFor(t, st),
      family: this.boot.config.brand.font,
    });
  }

  /** Mount + scale the current target into the stage. */
  private draw(): void {
    const t = this.current();
    this.els.stage.innerHTML = this.assetHtml(t);
    const asset = this.els.stage.querySelector('#asset') as HTMLElement | null;
    if (asset) {
      const maxW = window.innerWidth * 0.52;
      const maxH = window.innerHeight * 0.78;
      const scale = Math.min(maxW / t.size.w, maxH / t.size.h, 1);
      asset.style.transformOrigin = 'top left';
      asset.style.transform = `scale(${scale})`;
      this.els.stage.style.width = `${t.size.w * scale}px`;
      this.els.stage.style.height = `${t.size.h * scale}px`;
    }
    this.els.hint.textContent = `${t.store} · ${t.id} · ${t.size.w}×${t.size.h} px`;
  }

  private selectTarget(i: number): void {
    this.selected = i;
    this.syncSettings();
    this.renderRail();
    this.draw();
  }

  private syncSettings(): void {
    const st = this.currentState();
    this.els.capText.value = st.captionText;
    this.els.capBottom.checked = st.captionBottom;
    this.els.headSize.value = String(st.headMul);
    this.els.clearImg.style.display = st.userImageUrl ? '' : 'none';
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

  /** Rasterize a target's asset DOM to a Blob at exact device px (html-to-image). */
  private async rasterize(t: ResolvedTarget, format: 'png' | 'jpeg', quality: number): Promise<Blob> {
    const holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;left:-99999px;top:0;pointer-events:none';
    holder.innerHTML = this.assetHtml(t);
    document.body.appendChild(holder);
    const asset = holder.querySelector('#asset') as HTMLElement;
    try {
      await (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready;
      const imgs = Array.from(holder.querySelectorAll('img')) as HTMLImageElement[];
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
      const opts = { pixelRatio: 1, width: t.size.w, height: t.size.h, cacheBust: true, quality };
      const blob = await toBlob(asset, format === 'jpeg' ? { ...opts, type: 'image/jpeg' } : opts);
      if (!blob) throw new Error('rasterize produced no blob');
      return blob;
    } finally {
      holder.remove();
    }
  }

  private downloadBlob(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private async exportOne(t: ResolvedTarget, forceFormat?: 'png' | 'jpeg'): Promise<void> {
    const format = forceFormat ?? t.output?.format ?? this.boot.config.output?.format ?? 'png';
    const quality = t.output?.quality ?? this.boot.config.output?.quality ?? 0.94;
    const blob = await this.rasterize(t, format, quality);
    this.downloadBlob(blob, `${t.store}_${t.id}.${format === 'png' ? 'png' : 'jpg'}`);
  }

  private wireEvents(): void {
    const e = this.els;

    e.capText.oninput = () => {
      this.currentState().captionText = e.capText.value;
      this.draw();
    };
    e.capBottom.onchange = () => {
      this.currentState().captionBottom = e.capBottom.checked;
      this.draw();
    };
    e.headSize.oninput = () => {
      this.currentState().headMul = parseFloat(e.headSize.value);
      this.draw();
    };

    const loadFile = (file: File | undefined | null): void => {
      if (!file || !file.type.startsWith('image/')) return;
      const st = this.currentState();
      if (st.userImageUrl) URL.revokeObjectURL(st.userImageUrl);
      st.userImageUrl = URL.createObjectURL(file);
      e.clearImg.style.display = '';
      this.draw();
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
      if (st.userImageUrl) URL.revokeObjectURL(st.userImageUrl);
      st.userImageUrl = undefined;
      e.clearImg.style.display = 'none';
      e.file.value = '';
      this.draw();
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
          await new Promise((r) => setTimeout(r, 250));
        }
      } finally {
        e.expAll.disabled = false;
      }
    };

    window.addEventListener('resize', () => this.draw());
  }

  async start(): Promise<void> {
    this.els.brandName.textContent = this.boot.config.brand.name;
    this.wireEvents();
    this.renderRail();
    this.syncSettings();
    if (this.targets.length === 0) {
      this.els.hint.textContent = 'No targets in this config.';
      return;
    }
    await this.loadFonts();
    await this.initFontPicker();
    await (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready;
    this.draw();
  }

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
          this.loadedFaces.delete(key);
        }
      }),
    );
  }

  private async warmWeights(family: string): Promise<void> {
    await Promise.all(
      [400, 600, 700, 800].map((w) => document.fonts.load(`${w} 16px "${family}"`).catch(() => [])),
    );
  }

  private async loadFonts(): Promise<void> {
    const fonts = this.boot.fonts;
    if (!fonts || fonts.faces.length === 0) return;
    await this.loadFaces(fonts.faces);
    await this.warmWeights(fonts.family || fonts.faces[0]?.family || 'Inter');
  }

  private async initFontPicker(): Promise<void> {
    try {
      const resp = await fetch('/fonts/manifest.json', { cache: 'no-store' });
      if (resp.ok) this.manifest = (await resp.json()) as ManifestFont[];
    } catch {
      this.manifest = [];
    }
    const current = normalizeCurrentFont(this.manifest, this.boot.config.brand.font);
    this.boot.config.brand.font = current;
    this.buildFontSelect(current);
    await this.loadFaces(manifestFaces(this.manifest));
  }

  private buildFontSelect(current: string): void {
    const sel = this.els.fontSelect;
    sel.innerHTML = '';
    if (current && isCustomFamily(this.manifest, current)) this.addFontOption(current);
    for (const f of this.manifest) this.addFontOption(f.family);
    const custom = document.createElement('option');
    custom.value = CUSTOM_VALUE;
    custom.textContent = 'Custom…';
    sel.appendChild(custom);
    sel.value = current;
  }

  private addFontOption(family: string): void {
    const sel = this.els.fontSelect;
    for (const o of Array.from(sel.options)) {
      if (o.value === family) return;
    }
    const opt = document.createElement('option');
    opt.value = family;
    opt.textContent = family;
    opt.style.fontFamily = `"${family}"`;
    const customOpt = Array.from(sel.options).find((o) => o.value === CUSTOM_VALUE);
    sel.insertBefore(opt, customOpt ?? null);
  }

  private async applyFont(family: string): Promise<void> {
    this.boot.config.brand.font = family;
    await this.loadFaces(facesForFamily(this.manifest, family));
    await this.warmWeights(family);
    this.draw();
  }

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
