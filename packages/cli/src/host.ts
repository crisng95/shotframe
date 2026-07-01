/**
 * The headless render surface. A minimal SAME-ORIGIN page served by the render
 * host so brand fonts and source images (fetched from the same server) are not
 * blocked by CORS. Playwright navigates here, loads the brand FontFace(s), sets
 * `#root` to the asset HTML built by `@shotframe/core.renderAsset`, and screenshots
 * the `#asset` element — dimension-exact (the asset is authored at device px).
 */
export const HOST_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>html,body{margin:0;padding:0;background:#000}</style>
</head>
<body>
<div id="root"></div>
<script>window.__sfReady = true;</script>
</body>
</html>`;
