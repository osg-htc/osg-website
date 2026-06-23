// Copies the Pelican download service worker out of the installed
// @pelicanplatform/web-client package into public/ so it is served at
// /downloadServiceWorker.js (registered by the OSDF data file browser).
import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(
  root,
  'node_modules/@pelicanplatform/web-client/dist/serviceWorker/downloadServiceWorker.js'
);
const dest = path.join(root, 'public/downloadServiceWorker.js');

await mkdir(path.dirname(dest), { recursive: true });
await copyFile(src, dest);
console.log(`[pelican] Copied service worker → ${dest}`);
