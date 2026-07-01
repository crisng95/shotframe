/**
 * High-level UI component kit — a compact, brand-free vocabulary for REDRAWING
 * app screens. Built ON TOP of the primitive toolkit (`primitives.ts`), it lets
 * an AI agent compose believable phone-app chrome (status bar, nav bar, cards,
 * list rows, tab bar, buttons, …) without dropping to raw canvas calls.
 *
 * INJECTED, NOT IMPORTED: presets are serialized with `.toString()` and rebuilt
 * with `new Function` in the browser realm, so a preset can't `import` this. The
 * engine passes the `ui` object into the preset call (see `renderTarget.ts`).
 *
 * BRAND-FREE: no color literals live here. Every color arrives via params/tokens.
 * Structural neutrals (`transparent`, `white`) carry no brand meaning; palette
 * colors are always derived from a caller-supplied color via `withAlpha`.
 *
 * Everything is pure + sync and takes an optional `family` for text so the drawn
 * screen honors the resolved brand font.
 */
import type {
  Ctx,
  UiKit,
  IconName,
  StatusBarStyle,
  NavBarStyle,
  TabBarStyle,
  CardStyle,
  ListRowStyle,
  ButtonStyle,
  ChipStyle,
  HeadingStyle,
  ParagraphStyle,
  ImageBoxStyle,
  AvatarStyle,
  ProgressBarStyle,
  BadgeStyle,
} from './types.js';
import { rr, rb, rs, tx, wrap, pill, withAlpha, DEFAULT_FONT_STACK } from './primitives.js';

/** Structural neutral (translucent white) for icon-on-media fallbacks — carries no brand meaning. */
const NEUTRAL_LIGHT = 'rgba(255,255,255,0.85)';

/**
 * Draw a simple line icon centered at (cx,cy) inside radius `r`. Paths only, so
 * icons scale crisply. Unknown names fall back to a neutral dot.
 */
function iconGlyph(g: Ctx, cx: number, cy: number, r: number, name: IconName, color: string): void {
  g.save();
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = Math.max(1, r * 0.16);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const p = (): void => g.beginPath();
  switch (name) {
    case 'chevron': {
      // right-pointing chevron
      p();
      g.moveTo(cx - r * 0.28, cy - r * 0.55);
      g.lineTo(cx + r * 0.32, cy);
      g.lineTo(cx - r * 0.28, cy + r * 0.55);
      g.stroke();
      break;
    }
    case 'plus': {
      p();
      g.moveTo(cx - r * 0.6, cy);
      g.lineTo(cx + r * 0.6, cy);
      g.moveTo(cx, cy - r * 0.6);
      g.lineTo(cx, cy + r * 0.6);
      g.stroke();
      break;
    }
    case 'check': {
      p();
      g.moveTo(cx - r * 0.55, cy + r * 0.05);
      g.lineTo(cx - r * 0.12, cy + r * 0.5);
      g.lineTo(cx + r * 0.6, cy - r * 0.5);
      g.stroke();
      break;
    }
    case 'search': {
      const rr2 = r * 0.5;
      p();
      g.arc(cx - r * 0.12, cy - r * 0.12, rr2, 0, Math.PI * 2);
      g.stroke();
      p();
      g.moveTo(cx - r * 0.12 + rr2 * 0.72, cy - r * 0.12 + rr2 * 0.72);
      g.lineTo(cx + r * 0.62, cy + r * 0.62);
      g.stroke();
      break;
    }
    case 'heart': {
      const s = r * 0.62;
      p();
      g.moveTo(cx, cy + s * 0.78);
      g.bezierCurveTo(cx - s * 1.6, cy - s * 0.3, cx - s * 0.55, cy - s * 1.1, cx, cy - s * 0.25);
      g.bezierCurveTo(cx + s * 0.55, cy - s * 1.1, cx + s * 1.6, cy - s * 0.3, cx, cy + s * 0.78);
      g.closePath();
      g.fill();
      break;
    }
    case 'star': {
      p();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        const ai = a + Math.PI / 5;
        const ox = cx + Math.cos(a) * r * 0.7;
        const oy = cy + Math.sin(a) * r * 0.7;
        const ix = cx + Math.cos(ai) * r * 0.3;
        const iy = cy + Math.sin(ai) * r * 0.3;
        if (i === 0) g.moveTo(ox, oy);
        else g.lineTo(ox, oy);
        g.lineTo(ix, iy);
      }
      g.closePath();
      g.fill();
      break;
    }
    case 'bell': {
      p();
      g.moveTo(cx - r * 0.45, cy + r * 0.32);
      g.lineTo(cx + r * 0.45, cy + r * 0.32);
      g.arc(cx, cy - r * 0.05, r * 0.45, 0, Math.PI, true);
      g.closePath();
      g.stroke();
      p();
      g.arc(cx, cy + r * 0.55, r * 0.14, 0, Math.PI);
      g.stroke();
      break;
    }
    case 'home': {
      p();
      g.moveTo(cx - r * 0.6, cy + r * 0.05);
      g.lineTo(cx, cy - r * 0.6);
      g.lineTo(cx + r * 0.6, cy + r * 0.05);
      g.stroke();
      p();
      g.moveTo(cx - r * 0.42, cy - r * 0.08);
      g.lineTo(cx - r * 0.42, cy + r * 0.6);
      g.lineTo(cx + r * 0.42, cy + r * 0.6);
      g.lineTo(cx + r * 0.42, cy - r * 0.08);
      g.stroke();
      break;
    }
    default: {
      p();
      g.arc(cx, cy, r * 0.4, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.restore();
}

/** iOS-style status bar: time on the left, signal/wifi/battery glyphs on the right. */
function statusBar(g: Ctx, x: number, y: number, w: number, style: StatusBarStyle): void {
  const { color, time = '9:41' } = style;
  const h = w * 0.11; // notional status-bar band height
  const cy = y + h * 0.42;
  tx(g, time, x + w * 0.08, cy + h * 0.14, w * 0.042, 700, color, 'left', style_family(style));

  // right cluster: signal bars, wifi, battery
  const rightX = x + w - w * 0.08;
  // battery
  const bw = w * 0.062;
  const bh = h * 0.34;
  const bx = rightX - bw;
  const by = cy - bh / 2;
  rs(g, bx, by, bw, bh, bh * 0.28, withAlpha(color, 0.55), Math.max(1, w * 0.004));
  rb(g, bx + bw * 0.14, by + bh * 0.22, bw * 0.62, bh * 0.56, bh * 0.12, color);
  rb(g, bx + bw + w * 0.004, by + bh * 0.3, w * 0.006, bh * 0.4, w * 0.003, withAlpha(color, 0.55));

  // wifi (three arcs) sits left of the battery
  const wcx = bx - w * 0.05;
  const wcy = cy + h * 0.06;
  g.save();
  g.strokeStyle = color;
  g.lineWidth = Math.max(1, w * 0.006);
  g.lineCap = 'round';
  for (let i = 1; i <= 3; i++) {
    g.beginPath();
    g.arc(wcx, wcy, w * 0.01 * i, Math.PI * 1.25, Math.PI * 1.75);
    g.stroke();
  }
  g.beginPath();
  g.arc(wcx, wcy, w * 0.004, 0, Math.PI * 2);
  g.fillStyle = color;
  g.fill();
  g.restore();

  // signal (four rising bars) left of wifi
  const sx = wcx - w * 0.09;
  const barW = w * 0.011;
  for (let i = 0; i < 4; i++) {
    const bhh = h * (0.12 + i * 0.07);
    rb(g, sx + i * barW * 1.6, cy + h * 0.14 - bhh, barW, bhh, barW * 0.35, color);
  }
}

/** Pull the `family` out of any style bag (falls back to the default stack). */
function style_family(style: { family?: string }): string {
  return style.family ?? DEFAULT_FONT_STACK;
}

/** Top navigation bar with a centered/left title and optional leading/trailing glyphs. */
function navBar(g: Ctx, x: number, y: number, w: number, style: NavBarStyle): number {
  const { title, color, bg, leading, trailing, align = 'center', family } = style;
  const h = w * 0.14;
  if (bg) rb(g, x, y, w, h, 0, bg);
  const cy = y + h * 0.5;
  const gr = h * 0.2;
  if (leading) iconGlyph(g, x + w * 0.07, cy, gr, leading, color);
  if (trailing) iconGlyph(g, x + w - w * 0.07, cy, gr, trailing, color);
  const px = align === 'center' ? w * 0.048 : w * 0.062;
  if (align === 'center') {
    tx(g, title, x + w / 2, cy + px * 0.36, px, 700, color, 'center', family ?? DEFAULT_FONT_STACK);
  } else {
    tx(g, title, x + w * 0.07, cy + px * 0.36, px, 800, color, 'left', family ?? DEFAULT_FONT_STACK);
  }
  return h;
}

/** Bottom tab bar: evenly-spaced items (icon above label). */
function tabBar(g: Ctx, x: number, y: number, w: number, h: number, style: TabBarStyle): void {
  const { items, color, activeColor, bg, family } = style;
  rb(g, x, y, w, h, 0, bg);
  rb(g, x, y, w, Math.max(1, h * 0.012), 0, withAlpha(color, 0.16)); // hairline top divider
  const n = Math.max(1, items.length);
  const cellW = w / n;
  const iconR = h * 0.19;
  const labelPx = h * 0.16;
  items.forEach((it, i) => {
    const cx = x + cellW * (i + 0.5);
    const c = it.active ? activeColor : withAlpha(color, 0.6);
    if (it.icon) iconGlyph(g, cx, y + h * 0.36, iconR, it.icon, c);
    tx(g, it.label, cx, y + h * 0.78, labelPx, it.active ? 700 : 500, c, 'center', family ?? DEFAULT_FONT_STACK);
  });
}

/** Rounded surface with optional stroke + shadow. */
function card(g: Ctx, x: number, y: number, w: number, h: number, style: CardStyle): void {
  const { fill, radius, stroke, shadow } = style;
  const r = radius ?? Math.min(w, h) * 0.08;
  g.save();
  if (shadow) {
    g.shadowColor = shadow;
    g.shadowBlur = Math.max(8, Math.min(w, h) * 0.08);
    g.shadowOffsetY = Math.max(2, h * 0.02);
  }
  rb(g, x, y, w, h, r, fill);
  g.restore();
  if (stroke) rs(g, x, y, w, h, r, stroke, Math.max(1, Math.min(w, h) * 0.004));
}

/** Circular avatar with optional initials. */
function avatar(g: Ctx, cx: number, cy: number, r: number, style: AvatarStyle): void {
  const { fill, initials, color, family } = style;
  g.save();
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.fill();
  g.restore();
  if (initials) {
    tx(g, initials, cx, cy + r * 0.34, r * 0.9, 700, color ?? 'white', 'center', family ?? DEFAULT_FONT_STACK);
  }
}

/** A row with optional leading avatar/icon, title/subtitle and trailing glyph/text. */
function listRow(g: Ctx, x: number, y: number, w: number, h: number, style: ListRowStyle): void {
  const { title, subtitle, leading, trailing, colors, divider, family } = style;
  const fam = family ?? DEFAULT_FONT_STACK;
  const cy = y + h / 2;
  let textX = x + w * 0.04;

  if (leading) {
    const lr = h * 0.32;
    const lcx = x + w * 0.04 + lr;
    if (leading.icon) {
      rb(g, lcx - lr, cy - lr, lr * 2, lr * 2, lr * 0.44, leading.fill);
      iconGlyph(g, lcx, cy, lr * 0.62, leading.icon, leading.color ?? 'white');
    } else {
      avatar(g, lcx, cy, lr, { fill: leading.fill, initials: leading.initials, color: leading.color, family: fam });
    }
    textX = lcx + lr + w * 0.035;
  }

  const titlePx = h * 0.26;
  const subPx = h * 0.2;
  if (subtitle) {
    tx(g, title, textX, cy - h * 0.03, titlePx, 700, colors.title, 'left', fam);
    tx(g, subtitle, textX, cy + h * 0.26, subPx, 400, colors.subtitle ?? withAlpha(colors.title, 0.6), 'left', fam);
  } else {
    tx(g, title, textX, cy + titlePx * 0.34, titlePx, 600, colors.title, 'left', fam);
  }

  if (trailing) {
    const tc = colors.trailing ?? withAlpha(colors.title, 0.5);
    const known: IconName[] = ['chevron', 'plus', 'check', 'search', 'heart', 'star', 'bell', 'home'];
    if (known.includes(trailing as IconName)) {
      iconGlyph(g, x + w - w * 0.05, cy, h * 0.2, trailing as IconName, tc);
    } else {
      tx(g, trailing, x + w - w * 0.04, cy + subPx * 0.34, subPx, 600, tc, 'right', fam);
    }
  }

  if (divider) rb(g, textX, y + h - 1, x + w - textX - w * 0.04, Math.max(1, h * 0.01), 0, divider);
}

/** Filled (capsule by default) button. */
function button(g: Ctx, x: number, y: number, w: number, h: number, style: ButtonStyle): void {
  const { label, fill, color, radius, family } = style;
  const r = radius ?? h / 2;
  rb(g, x, y, w, h, r, fill);
  tx(g, label, x + w / 2, y + h / 2 + h * 0.16, h * 0.4, 700, color, 'center', family ?? DEFAULT_FONT_STACK);
}

/** Small auto-width pill / chip (wraps the `pill` primitive). Returns width used. */
function chip(g: Ctx, x: number, y: number, style: ChipStyle): number {
  const { label, fill, color, fontWt = 700, padX, h, family } = style;
  const ch = h ?? 0;
  const height = ch > 0 ? ch : 28;
  const fontPx = style.fontPx ?? height * 0.5;
  const pad = padX ?? height * 0.55;
  return pill(g, x, y, null, height, {
    fill,
    text: label,
    color,
    fontPx,
    fontWt,
    padX: pad,
    align: 'left',
    family,
  });
}

/** Heading text block. Returns the y just below the block. */
function heading(g: Ctx, x: number, y: number, style: HeadingStyle): number {
  const { text, size, weight = 800, color, maxW, family, align = 'left' } = style;
  const lineH = size * 1.14;
  if (maxW == null) {
    tx(g, text, x, y + size, size, weight, color, align, family);
    return y + lineH;
  }
  const lines = wrap(g, text, maxW, size, weight, family);
  let ly = y + size;
  for (const line of lines) {
    tx(g, line, x, ly, size, weight, color, align, family);
    ly += lineH;
  }
  return y + lines.length * lineH;
}

/** Wrapped body paragraph. Returns the y just below the last line. */
function paragraph(g: Ctx, x: number, y: number, style: ParagraphStyle): number {
  const { text, size, color, maxW, family, weight = 400, lineH, align = 'left' } = style;
  const lh = lineH ?? size * 1.4;
  const lines = wrap(g, text, maxW, size, weight, family);
  let ly = y + size;
  for (const line of lines) {
    tx(g, line, x, ly, size, weight, color, align, family);
    ly += lh;
  }
  return y + lines.length * lh;
}

/** Placeholder media rect (subtle vertical gradient derived from `fill` + optional centered icon). */
function imageBox(g: Ctx, x: number, y: number, w: number, h: number, style: ImageBoxStyle): void {
  const { fill, radius, icon, iconColor } = style;
  const r = radius ?? Math.min(w, h) * 0.06;
  g.save();
  rr(g, x, y, w, h, r);
  g.clip();
  const lg = g.createLinearGradient(x, y, x, y + h);
  lg.addColorStop(0, withAlpha(fill, 0.9));
  lg.addColorStop(1, withAlpha(fill, 0.55));
  g.fillStyle = lg;
  g.fillRect(x, y, w, h);
  g.restore();
  if (icon) {
    iconGlyph(g, x + w / 2, y + h / 2, Math.min(w, h) * 0.16, icon, iconColor ?? NEUTRAL_LIGHT);
  }
}

/** Slim rounded progress bar. */
function progressBar(g: Ctx, x: number, y: number, w: number, style: ProgressBarStyle): void {
  const { value, track, fill, h } = style;
  const bh = h ?? w * 0.02;
  const v = Math.max(0, Math.min(1, value));
  rb(g, x, y, w, bh, bh / 2, track);
  if (v > 0) rb(g, x, y, Math.max(bh, w * v), bh, bh / 2, fill);
}

/** Small count/label badge (auto-width capsule). */
function badge(g: Ctx, x: number, y: number, style: BadgeStyle): void {
  const { count, label, fill, color, family } = style;
  const text = label ?? (count != null ? String(count) : '');
  const h = 22;
  const fontPx = h * 0.6;
  pill(g, x, y, null, h, {
    fill,
    text,
    color,
    fontPx,
    fontWt: 700,
    padX: h * 0.42,
    align: 'left',
    family,
  });
}

/** The high-level UI component kit, injected into the preset api as `ui`. */
export const ui: UiKit = {
  statusBar,
  navBar,
  tabBar,
  card,
  listRow,
  button,
  chip,
  heading,
  paragraph,
  imageBox,
  avatar,
  progressBar,
  badge,
  iconGlyph,
};
