/**
 * Studio entry point. Fetches the boot payload the CLI serves at `/config.json`
 * (the resolved config + a ref→URL source map), then hands it to the Studio.
 */
import { Studio, type StudioBootData } from './studio.js';

function fatal(message: string): void {
  const hint = document.getElementById('hint');
  if (hint) hint.textContent = message;
  // eslint-disable-next-line no-console
  console.error(`[shotframe studio] ${message}`);
}

async function boot(): Promise<void> {
  let data: StudioBootData;
  try {
    const resp = await fetch('./config.json', { cache: 'no-store' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    data = (await resp.json()) as StudioBootData;
  } catch (err) {
    fatal(
      `Could not load /config.json (${err instanceof Error ? err.message : String(err)}). ` +
        'Run the studio via `shotframe studio --config <path>`.',
    );
    return;
  }
  if (!data?.config?.targets) {
    fatal('Malformed /config.json — missing config.targets.');
    return;
  }
  try {
    await new Studio(data).start();
  } catch (err) {
    fatal(`Studio failed to start: ${err instanceof Error ? err.message : String(err)}`);
  }
}

void boot();
