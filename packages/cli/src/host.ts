/**
 * The headless render surface. A minimal page that imports the SAME browser-target
 * `@shotframe/core` artifact the studio uses (served at `/core.js`) and exposes
 * `renderTarget` on `window.__sf`. Playwright drives an offscreen `<canvas>` here and
 * reads the pixel buffer back — dimension-exact, not a viewport screenshot.
 */
export const HOST_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>html,body{margin:0;background:#000} canvas{display:block}</style>
</head>
<body>
<canvas id="c" width="1" height="1"></canvas>
<script type="module">
  import { renderTarget } from '/core.js';
  window.__sf = { renderTarget };
  window.__sfReady = true;
</script>
</body>
</html>`;
