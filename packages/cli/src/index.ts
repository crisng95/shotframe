import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { detectConfig } from './detect.js';
import { runRender } from './render.js';
import { runStudio } from './studio.js';

// Read the real version from package.json (one level up from dist/). Works in dev and
// when published (npm always ships package.json), so `--version` never drifts.
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  version: string;
};

const program = new Command();

program
  .name('shotframe')
  .description('Frame real screenshots into store-ready assets for App Store, Play & Chrome Web Store')
  .version(pkg.version);

program
  .command('render')
  .description('Headless batch export of all targets from a config (Playwright)')
  .option('-c, --config <path>', 'config file (default: shotframe.config.{ts,js,json})')
  .option('-o, --out <dir>', 'output directory (overrides config output.dir)')
  .option('-s, --store <store>', 'only render one store: appstore | play | chrome')
  .action(async (opts: { config?: string; out?: string; store?: string }) => {
    const config = opts.config ?? detectConfig(process.cwd());
    if (!config) {
      console.error('✖ No config found. Pass --config or add shotframe.config.ts');
      process.exit(1);
    }
    try {
      const { written } = await runRender({ config, out: opts.out, store: opts.store });
      console.log(`\n✓ Rendered ${written.length} asset(s):`);
      for (const w of written) console.log(`  ${w.w}×${w.h}  ${w.file}`);
    } catch (err) {
      console.error(`✖ render failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

program
  .command('studio')
  .description('Boot the browser studio UI for live preview/editing')
  .option('-c, --config <path>', 'config file (default: shotframe.config.{ts,js,json})')
  .option('-p, --port <port>', 'port to serve on (default: 5179)', (v) => parseInt(v, 10))
  .option('--no-open', 'do not auto-open the browser')
  .action(async (opts: { config?: string; port?: number; open?: boolean }) => {
    const config = opts.config ?? detectConfig(process.cwd());
    if (!config) {
      console.error('✖ No config found. Pass --config or add shotframe.config.ts');
      process.exit(1);
    }
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
