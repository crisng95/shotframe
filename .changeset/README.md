# Changesets

This folder is managed by [changesets](https://github.com/changesets/changesets).
It records intended version bumps and changelog entries for the publishable
packages (`@shotframe/core`, `@shotframe/config`, `@shotframe/cli`).

## Workflow

1. After making a change, run `pnpm changeset` and pick the affected packages +
   bump type (patch / minor / major). This writes a markdown file here.
2. Commit that file with your PR.
3. On merge to `main`, the release workflow runs `changeset version` (applies the
   bumps + updates changelogs) and `changeset publish` (publishes to npm).

`@shotframe/studio` and `@shotframe/example-basic` are private and ignored —
the studio UI ships bundled inside `@shotframe/cli`.

> pnpm rewrites `workspace:*` dependency ranges to the real published versions at
> publish time, so source keeps using `workspace:*`.
