import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { Command } from 'commander';
import { detectConfig } from './detect.js';
import { runRender, listTargets } from './render.js';
import { runStudio } from './studio.js';
import { runInit } from './init.js';

// Read the real version from package.json (one level up from dist/). Works in dev and
// when published (npm always ships package.json), so `--version` never drifts.
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  version: string;
};

function requireConfig(opt?: string): string {
  const config = opt ?? detectConfig(process.cwd());
  if (!config) {
    console.error('✖ No shotframe config in this folder.');
    console.error('  → Run `shotframe init` to scaffold one (config + a sample screenshot),');
    console.error('    or pass --config <path> to point at an existing config.');
    process.exit(1);
  }
  return config;
}

const program = new Command();

program
  .name('shotframe')
  .description('Frame real screenshots into store-ready assets for App Store, Play, Chrome & email')
  .version(pkg.version);

// `render` is the DEFAULT command: bare `shotframe` (after `cd` into a project with a
// shotframe.config.ts) generates every target. Filter with --store / --target to
// regenerate just the variants you want.
program
  .command('render', { isDefault: true })
  .description('Generate all store assets from the config (default). Filter with --store / --target.')
  .option('-c, --config <path>', 'config file (default: auto-detect shotframe.config.{ts,js,mjs,json})')
  .option('-o, --out <dir>', 'output directory (CWD-relative; overrides config output.dir)')
  .option('-s, --store <store>', 'only this store: appstore | play | chrome | email')
  .option('-t, --target <ids...>', 'only these target ids (regenerate specific variants)')
  .action(async (opts: { config?: string; out?: string; store?: string; target?: string[] }) => {
    const config = requireConfig(opts.config);
    try {
      const { written } = await runRender({
        config,
        out: opts.out,
        store: opts.store,
        targets: opts.target,
      });
      console.log(`\n✓ Rendered ${written.length} asset(s):`);
      for (const w of written) console.log(`  ${w.w}×${w.h}  ${w.file}`);
    } catch (err) {
      console.error(`✖ render failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

// `init` — scaffold a starter config + a sample screenshot, so `shotframe` runs
// immediately after install (the "cd in, one command" onboarding path).
program
  .command('init')
  .description('Scaffold shotframe.config + a sample screenshot in this folder')
  .option('--json', 'write shotframe.config.json instead of .ts')
  .option('-f, --force', 'overwrite existing files')
  .action(async (opts: { json?: boolean; force?: boolean }) => {
    try {
      const { config, sample } = await runInit({ json: opts.json, force: opts.force });
      const rel = (p: string) => relative(process.cwd(), p) || p;
      console.log(`✓ Created ${rel(config)}`);
      console.log(`✓ Created ${rel(sample)} (a placeholder — replace with your real screenshots)`);
      console.log('\nNext:');
      console.log('  1. shotframe            # render now (uses the sample)');
      console.log('  2. drop real screenshots into ./shots/ and edit the config');
      console.log('  3. shotframe studio     # tweak captions/fonts visually');
    } catch (err) {
      console.error(`✖ init failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

// `list` — discover what target ids exist (so you know what to pass to --target).
program
  .command('list')
  .description('List the target ids defined in the config, grouped by store')
  .option('-c, --config <path>', 'config file (default: auto-detect)')
  .action(async (opts: { config?: string }) => {
    const config = requireConfig(opts.config);
    try {
      const targets = await listTargets(config);
      let store = '';
      for (const t of targets) {
        if (t.store !== store) {
          store = t.store;
          console.log(`\n${store}`);
        }
        console.log(`  ${t.id.padEnd(20)} ${t.w}×${t.h}`);
      }
      console.log(`\n${targets.length} target(s). Render one with: shotframe -t <id>`);
    } catch (err) {
      console.error(`✖ list failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

// `studio` — live browser editor. Long-lived server; for humans, not headless agents.
program
  .command('studio')
  .description('Boot the live browser editor for visual preview/tweaking')
  .option('-c, --config <path>', 'config file (default: auto-detect)')
  .option('-p, --port <port>', 'port to serve on (default: 5179)', (v) => parseInt(v, 10))
  .option('--no-open', 'do not auto-open the browser')
  .action(async (opts: { config?: string; port?: number; open?: boolean }) => {
    const config = requireConfig(opts.config);
    try {
      const { url } = await runStudio({ config, port: opts.port, open: opts.open });
      console.log(`\n✓ shotframe studio running at ${url}`);
      console.log('  Live preview + manual export. Edits are in-memory (not written to disk).');
      console.log('  Press Ctrl+C to stop.');
    } catch (err) {
      console.error(`✖ studio failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

program.parseAsync(process.argv);
