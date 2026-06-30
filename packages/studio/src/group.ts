/**
 * Pure, browser-free helpers for the studio. Kept dependency-light (types only)
 * so they can be unit-tested under plain vitest with no DOM / jsdom.
 */
import type { ResolvedTarget, Store } from '@shotframe/core';

export interface StoreGroup {
  store: Store;
  /** Human label for the rail header. */
  label: string;
  targets: ResolvedTarget[];
}

/** Canonical store order + display labels for the left rail. */
const STORE_ORDER: Store[] = ['appstore', 'play', 'chrome', 'email'];
const STORE_LABEL: Record<Store, string> = {
  appstore: 'App Store',
  play: 'Google Play',
  chrome: 'Chrome Web Store',
  email: 'Email',
};

function labelFor(store: Store): string {
  return STORE_LABEL[store] ?? store;
}

/**
 * Group resolved targets by their store, in canonical store order
 * (appstore → play → chrome), preserving target order within each group.
 * Any unknown store is appended after the canonical ones, in first-seen order.
 */
export function groupTargetsByStore(targets: ResolvedTarget[]): StoreGroup[] {
  const byStore = new Map<Store, ResolvedTarget[]>();
  for (const t of targets) {
    const list = byStore.get(t.store);
    if (list) list.push(t);
    else byStore.set(t.store, [t]);
  }

  const groups: StoreGroup[] = [];
  for (const store of STORE_ORDER) {
    const list = byStore.get(store);
    if (list) {
      groups.push({ store, label: labelFor(store), targets: list });
      byStore.delete(store);
    }
  }
  // Any non-canonical stores keep first-seen insertion order.
  for (const [store, list] of byStore) {
    groups.push({ store, label: labelFor(store), targets: list });
  }
  return groups;
}

/** A stable per-target key (store + id is unique within a resolved config). */
export function targetKey(t: ResolvedTarget): string {
  return `${t.store}/${t.id}`;
}

/** Every external image ref a target may need (real screenshot, image-frame PNG, bg image). */
export function sourceRefs(t: ResolvedTarget, bgImage?: string): string[] {
  const refs: string[] = [];
  if (t.source) refs.push(t.source);
  if (t.frame?.type === 'image' && t.frame.src) refs.push(t.frame.src);
  const bg = t.background?.image ?? bgImage;
  if (bg) refs.push(bg);
  return refs;
}
