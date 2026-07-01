/**
 * @shotframe/core — brand-free Full-DOM HTML engine.
 *
 * Public surface:
 *   - `renderAsset` — the single pure, isomorphic compose function (HTML string).
 *   - the HTML component kit (`ui`) — for preset authors.
 *   - CSS string helpers + all config / engine types.
 */
export { renderAsset } from './renderAsset.js';

export { ui } from './ui.js';
export { esc, style, px, withAlpha, div } from './css.js';

export { backgroundLayer } from './background.js';
export { captionMetrics, captionLayer } from './caption.js';
export type { CaptionMetrics } from './caption.js';
export { frameLayer } from './frame.js';
export type { FrameGeom, RenderScreen } from './frame.js';
export { screenBody } from './screen.js';

export type {
  Corners,
  Radius,
  SourceUrlMap,
  BrandConfig,
  BackgroundConfig,
  FrameConfig,
  Store,
  CaptionConfig,
  OutputConfig,
  Target,
  ResolvedTarget,
  PresetDef,
  StudioConfig,
  RenderAssetOptions,
  HtmlUiKit,
  HtmlPresetArgs,
  HtmlPresetFn,
  IconName,
} from './types.js';
