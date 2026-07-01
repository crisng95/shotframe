/**
 * @shotframe/core — brand-free canvas engine.
 *
 * Public surface:
 *   - `renderTarget` — the single sync, pure compose function.
 *   - the primitive toolkit (`toolkit` + each primitive) — stable, for preset authors.
 *   - all config / engine types.
 */
export { renderTarget } from './renderTarget.js';

export {
  DEFAULT_FONT_STACK,
  PHONE_ASPECT,
  toolkit,
  rr,
  rb,
  rs,
  F,
  tx,
  wrap,
  wrapLines,
  pill,
  sbar,
  scrBg,
  fig,
  withAlpha,
} from './primitives.js';

export { ui } from './ui.js';

export { drawBackground } from './background.js';
export { drawCover } from './cover.js';
export { wrapCap, drawCaption } from './caption.js';
export { drawDeviceBezel, drawNotch, browserFrame } from './frame.js';
export type { BrowserChrome } from './frame.js';

export type {
  Ctx,
  Corners,
  Radius,
  SourceImage,
  SourceImageMap,
  FigKind,
  ScrBgOpts,
  PillStyle,
  CoreToolkit,
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
  PresetDrawApi,
  PresetDrawFn,
  UiKit,
  IconName,
  StatusBarStyle,
  NavBarStyle,
  TabItem,
  TabBarStyle,
  CardStyle,
  ListRowLeading,
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
