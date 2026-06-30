/**
 * Expand an authoring config into concrete, fully-resolved targets.
 *
 * A target may reference a built-in store pack (via its `store`, optionally
 * narrowed by `id`); `resolveTargets` fills size/frame/background/output from the
 * pack defaults unless the user overrides them. A target with neither `id` nor an
 * explicit `size` expands to every device in that store's pack.
 */
import type {
  BackgroundConfig,
  FrameConfig,
  OutputConfig,
  ResolvedTarget,
} from '@shotframe/core';
import { ConfigError } from './errors.js';
import { getStorePack, type PackDevice, type StorePack } from './packs.js';
import type { ConfigInput, TargetInput } from './schema.js';

/** Drop the `dir` field — only `format`/`quality` participate in target output. */
function outputDefaults(o: ConfigInput['output']): OutputConfig {
  if (!o) return {};
  const out: OutputConfig = {};
  if (o.format !== undefined) out.format = o.format;
  if (o.quality !== undefined) out.quality = o.quality;
  return out;
}

function resolveOne(
  cfg: ConfigInput,
  t: TargetInput,
  pack: StorePack,
  device: PackDevice | undefined,
  index: number,
): ResolvedTarget {
  const size = t.size ?? device?.size;
  if (!size) {
    throw new ConfigError('Cannot resolve target size', [
      {
        path: `targets[${index}]`,
        message: `target for store "${t.store}" has no "size" and matches no pack device`,
      },
    ]);
  }
  const id = t.id ?? device?.id;
  if (!id) {
    throw new ConfigError('Cannot resolve target id', [
      { path: `targets[${index}]`, message: `target for store "${t.store}" has no "id"` },
    ]);
  }

  const frame: FrameConfig = { ...pack.defaults.frame, ...device?.frame, ...t.frame };
  const background: BackgroundConfig = {
    ...pack.defaults.background,
    ...cfg.background,
    ...t.background,
  };
  const output: OutputConfig = {
    ...pack.defaults.output,
    ...outputDefaults(cfg.output),
    ...t.output,
  };

  const resolved: ResolvedTarget = {
    store: t.store,
    id,
    size,
    frame,
    background,
    output,
  };
  if (t.caption) resolved.caption = t.caption;
  if (t.source !== undefined) resolved.source = t.source;
  if (t.preset !== undefined) resolved.preset = t.preset;
  return resolved;
}

/** Expand `cfg.targets` (which may reference store packs) into concrete targets. */
export function resolveTargets(cfg: ConfigInput): ResolvedTarget[] {
  const out: ResolvedTarget[] = [];

  cfg.targets.forEach((t, index) => {
    const pack = getStorePack(t.store);
    if (!pack) {
      throw new ConfigError('Unknown store', [
        { path: `targets[${index}].store`, message: `unknown store "${t.store}"` },
      ]);
    }

    if (t.id) {
      const device = pack.devices.find((d) => d.id === t.id);
      if (!device && !t.size) {
        const ids = pack.devices.map((d) => d.id).join(', ');
        throw new ConfigError('Unknown target id', [
          {
            path: `targets[${index}].id`,
            message: `"${t.id}" is not a device in the "${t.store}" pack (known: ${ids}) and no explicit "size" was given`,
          },
        ]);
      }
      out.push(resolveOne(cfg, t, pack, device, index));
    } else if (t.size) {
      out.push(resolveOne(cfg, t, pack, undefined, index));
    } else {
      // No id and no size → expand to every device in the pack.
      for (const device of pack.devices) {
        out.push(resolveOne(cfg, t, pack, device, index));
      }
    }
  });

  return out;
}
