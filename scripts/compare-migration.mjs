#!/usr/bin/env node
/**
 * Migration coverage report: compares the legacy Jekyll build output against
 * this site's static export and reports what hasn't been converted yet.
 *
 * Usage:
 *   pnpm compare:migration [legacySiteDir] [newOutDir] [options]
 *   npx tsx scripts/compare-migration.mjs [legacySiteDir] [newOutDir] [options]
 *   (pass options directly after the script name — no `--` separator)
 *
 * Options:
 *   --ignore <glob>   Ignore paths matching the glob (repeatable). Matched
 *                     against the full path; a single star stays within a path
 *                     segment, a double star crosses slashes.
 *                     e.g. --ignore '/assets/**'  --ignore '/news/**'
 *   --out <file>      Write the full sorted missing list here
 *                     (default: migration-missing.txt).
 *
 * Defaults:
 *   legacySiteDir = ../osg-htc.github.io/_site   (Jekyll build output)
 *   newOutDir     = ./out                        (next build static export)
 *
 * A legacy page counts as "covered" when the new export has either a real page
 * or a redirect stub at the same canonical URL. URLs are canonicalized so the
 * legacy `.html` / pretty-permalink styles line up with the new trailing-slash
 * routes (e.g. `/news.html`, `/news/`, and `/news/index.html` all match).
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// --- argument parsing (positionals + repeatable --ignore + --out) -----------
const ignoreGlobs = [];
const positional = [];
let outArg = null;
{
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--ignore' || arg === '-i') ignoreGlobs.push(args[++i]);
    else if (arg.startsWith('--ignore=')) ignoreGlobs.push(arg.slice(9));
    else if (arg === '--out' || arg === '-o') outArg = args[++i];
    else if (arg.startsWith('--out=')) outArg = arg.slice(6);
    else positional.push(arg);
  }
}

const LEGACY_DIR = positional[0]
  ? path.resolve(positional[0])
  : path.resolve(process.cwd(), '../osg-htc.github.io/_site');
const NEW_DIR = positional[1]
  ? path.resolve(positional[1])
  : path.resolve(process.cwd(), 'out');
const REDIRECTS_FILE = path.resolve(process.cwd(), 'static-redirects.json');
const OUT_FILE = path.resolve(process.cwd(), outArg || 'migration-missing.txt');

/** Convert a glob (`*`, `**`, `?`) into an anchored RegExp over a path. */
function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    if (ch === '*') {
      if (glob[i + 1] === '*') {
        re += '.*';
        i++;
      } else {
        re += '[^/]*';
      }
    } else if (ch === '?') {
      re += '[^/]';
    } else {
      re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${re}$`);
}

const userIgnoreRes = ignoreGlobs.filter(Boolean).map(globToRegExp);
/** True when a path matches any user-supplied --ignore glob. */
const userIgnored = (p) => userIgnoreRes.some((re) => re.test(p));

// Non-content pages to ignore on both sides.
const IGNORE = [
  /^\/404(\.html)?$/,
  /^\/500(\.html)?$/,
  /^\/google[0-9a-z]+$/i, // search-console verification files
  /^\/sitemap/,
  /^\/robots/,
  /\/feed$/,
  /^\/assets\//,
  /^\/_/, // _next, etc.
];

/** Recursively collect every file under `dir` (absolute paths). */
async function walkFiles(dir) {
  const out = [];
  async function recurse(current) {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await recurse(full);
      } else if (entry.isFile()) {
        out.push(full);
      }
    }
  }
  await recurse(dir);
  return out;
}

const ASSET_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'avif',
  'css', 'js', 'mjs', 'map', 'woff', 'woff2', 'ttf', 'eot', 'otf',
]);

/** Lowercased file extension of a URL path, or "(no-ext)". */
function extensionOf(urlPath) {
  const match = urlPath.match(/\.([A-Za-z0-9]+)$/);
  return match ? match[1].toLowerCase() : '(no-ext)';
}

/** Build-pipeline asset (image/font/css/js) vs. a content/config file. */
function isAsset(urlPath) {
  return (
    urlPath.startsWith('/assets/') ||
    urlPath.startsWith('/_next/') ||
    ASSET_EXTENSIONS.has(extensionOf(urlPath))
  );
}

/** File path → URL path, e.g. `<root>/about/index.html` → `/about/index.html`. */
function toUrl(root, file) {
  return '/' + path.relative(root, file).split(path.sep).join('/');
}

/**
 * Canonicalize a URL so the legacy and new URL styles line up:
 * strip `index.html`, strip `.html`, drop the trailing slash, lowercase.
 */
function canonical(url) {
  let u = url.toLowerCase();
  u = u.replace(/\/index\.html$/, '/');
  u = u.replace(/\.html$/, '');
  if (u.length > 1) u = u.replace(/\/+$/, '');
  return u || '/';
}

const ignored = (url) => IGNORE.some((re) => re.test(url)) || userIgnored(url);

/** Reverse the HTML escaping the redirect generator applies to URLs. */
function decodeEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** A redirect stub is a meta-refresh page emitted by generate-redirects.mjs. */
function isRedirectStub(html) {
  return /http-equiv=["']?refresh/i.test(html);
}

/** Group canonical URLs by their first path segment. */
function bySection(urls) {
  const sections = new Map();
  for (const url of urls) {
    const seg = url.split('/')[1] || '';
    const key = seg ? `/${seg}` : '(top-level)';
    sections.set(key, (sections.get(key) ?? 0) + 1);
  }
  return [...sections.entries()].sort((a, b) => b[1] - a[1]);
}

async function main() {
  const legacyAllFiles = await walkFiles(LEGACY_DIR);
  const newAllFiles = await walkFiles(NEW_DIR);
  const legacyFiles = legacyAllFiles.filter((f) => f.endsWith('.html'));
  const newFiles = newAllFiles.filter((f) => f.endsWith('.html'));

  if (legacyFiles.length === 0) {
    console.error(
      `No legacy HTML found in ${LEGACY_DIR}. Build the Jekyll site (\`bundle exec jekyll build\`) or pass the correct path as the first argument.`
    );
    process.exitCode = 1;
    return;
  }

  // Legacy canonical URL -> a representative original path (for display).
  const legacy = new Map();
  for (const file of legacyFiles) {
    const url = toUrl(LEGACY_DIR, file);
    if (ignored(canonical(url))) continue;
    const key = canonical(url);
    if (!legacy.has(key)) legacy.set(key, url);
  }

  // New canonical URLs, split into real pages vs redirect stubs.
  // redirectMap: canonical source URL -> raw destination. Populated from both
  // the generated stubs in out/ (which include the dynamic article/event
  // redirects after a full build) and static-redirects.json.
  const newPages = new Set();
  const newRedirects = new Set();
  const redirectMap = new Map();
  for (const file of newFiles) {
    const url = toUrl(NEW_DIR, file);
    const key = canonical(url);
    if (ignored(key)) continue;
    const html = await readFile(file, 'utf8');
    if (isRedirectStub(html)) {
      newRedirects.add(key);
      const match = html.match(/url=([^"'\s>]+)/i);
      if (match) redirectMap.set(key, decodeEntities(match[1]));
    } else {
      newPages.add(key);
    }
  }
  // Also fold in static-redirects.json so the report is accurate even when out/
  // was built with `next build` (which skips the postbuild redirect step).
  try {
    const rules = JSON.parse(await readFile(REDIRECTS_FILE, 'utf8'));
    for (const rule of rules) {
      if (rule?.source) {
        newRedirects.add(canonical(rule.source));
        if (!redirectMap.has(canonical(rule.source))) {
          redirectMap.set(canonical(rule.source), rule.destination ?? '');
        }
      }
    }
  } catch {
    // No static-redirects.json — fall back to the stubs found in out/.
  }

  // Classify every legacy page.
  const coveredAsPage = [];
  const coveredAsRedirect = [];
  const missing = [];
  for (const [key, original] of legacy) {
    if (newPages.has(key)) coveredAsPage.push(original);
    else if (newRedirects.has(key)) coveredAsRedirect.push(original);
    else missing.push(original);
  }

  // New pages with no legacy counterpart (added during the rebuild).
  const added = [...newPages].filter((key) => !legacy.has(key));

  const total = legacy.size;
  const pct = (n) => `${((n / total) * 100).toFixed(1)}%`;

  console.log('\n=== OSG migration coverage report ===');
  console.log(`legacy:  ${LEGACY_DIR}`);
  console.log(`new:     ${NEW_DIR}\n`);

  console.log('Counts');
  console.log(`  legacy pages (unique URLs):   ${total}`);
  console.log(`  new real pages:               ${newPages.size}`);
  console.log(`  new redirect stubs:           ${newRedirects.size}\n`);

  console.log('Legacy coverage');
  console.log(`  ✓ covered by a page:          ${coveredAsPage.length} (${pct(coveredAsPage.length)})`);
  console.log(`  ↪ covered by a redirect:      ${coveredAsRedirect.length} (${pct(coveredAsRedirect.length)})`);
  console.log(`  ✗ missing / not converted:    ${missing.length} (${pct(missing.length)})\n`);

  console.log('Missing pages by section (top 15)');
  for (const [section, count] of bySection(missing).slice(0, 15)) {
    console.log(`  ${count.toString().padStart(4)}  ${section}`);
  }

  // The actionable count: missing pages that are NOT live content collections.
  const COLLECTIONS = new Set(['spotlights', 'news', 'events', 'presentations']);
  const actionable = missing
    .filter((url) => !COLLECTIONS.has(url.split('/')[1]))
    .sort();
  console.log(
    `\nMissing excluding content collections (the real to-convert list): ${actionable.length}`
  );
  for (const url of actionable) console.log(`  ${url}`);

  // The sample skips sections that have their own dedicated redirect check
  // below (spotlights via the article check, events via the event check).
  const HANDLED_IN_CHECK = new Set(['spotlights', 'events']);
  const sampleSource = missing.filter(
    (url) => !HANDLED_IN_CHECK.has(url.split('/')[1])
  );
  const sample = sampleSource.slice().sort().slice(0, 30);
  console.log(
    `\nSample missing pages — excluding spotlights/events handled by the checks below (${Math.min(30, sampleSource.length)} of ${sampleSource.length})`
  );
  for (const url of sample) console.log(`  ${url}`);

  // Non-HTML files (config, data, assets) in legacy that aren't at the same
  // path in the new export. Exact-path comparison (no canonicalization).
  const newNonHtml = new Set(
    newAllFiles.filter((f) => !f.endsWith('.html')).map((f) => toUrl(NEW_DIR, f))
  );
  const missingNonHtml = legacyAllFiles
    .filter((f) => !f.endsWith('.html'))
    .map((f) => toUrl(LEGACY_DIR, f))
    .filter((p) => !newNonHtml.has(p) && !userIgnored(p));

  const extCounts = new Map();
  for (const p of missingNonHtml) {
    extCounts.set(extensionOf(p), (extCounts.get(extensionOf(p)) ?? 0) + 1);
  }
  const configFiles = missingNonHtml.filter((p) => !isAsset(p)).sort();

  console.log(`\n=== Non-HTML files in legacy not in the new export: ${missingNonHtml.length} ===`);
  console.log('By extension:');
  for (const [ext, count] of [...extCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count.toString().padStart(4)}  ${ext}`);
  }
  console.log(`\nLikely config / data files to migrate (non-asset, ${configFiles.length}):`);
  for (const p of configFiles.slice(0, 80)) console.log(`  ${p}`);
  if (configFiles.length > 80) console.log(`  … and ${configFiles.length - 80} more`);

  // Write the full missing list (pages + non-HTML files), sorted alphabetically.
  const allMissing = [...missing, ...missingNonHtml].sort((a, b) =>
    a.localeCompare(b)
  );
  const fileHeader =
    `# OSG migration — missing files (legacy URLs / files not covered in the new export)\n` +
    `# legacy: ${LEGACY_DIR}\n` +
    `# new:    ${NEW_DIR}\n` +
    `# missing pages: ${missing.length}  ·  missing non-HTML files: ${missingNonHtml.length}  ·  total: ${allMissing.length}\n` +
    `# ignore globs: ${ignoreGlobs.length ? ignoreGlobs.join('  ') : '(none)'}\n\n`;
  await writeFile(OUT_FILE, fileHeader + allMissing.join('\n') + '\n');
  console.log(
    `\nWrote ${allMissing.length} missing entries (sorted) to ${path.relative(process.cwd(), OUT_FILE)}`
  );

  console.log(`\nNew pages added in the rebuild (no legacy URL): ${added.length}`);
  for (const [section, count] of bySection(added).slice(0, 8)) {
    console.log(`  ${count.toString().padStart(4)}  ${section}`);
  }

  console.log('\nNotes for interpreting "missing":');
  console.log('  • Content collections (spotlights / news / events / presentations)');
  console.log('    are sourced live from the CHTC GitHub repos and filtered to OSG-');
  console.log('    published items, with new date-based permalinks. Legacy URLs in');
  console.log('    those sections mostly reflect a different/larger source + URL');
  console.log('    scheme, not unconverted templates.');
  console.log('  • One-off legacy landing pages (events promos, award pages, zoom');
  console.log('    links) may be intentionally retired.');
  console.log('  • Focus conversion effort on non-collection clusters that have no');
  console.log('    page and no redirect.\n');

  await checkContentRedirects(redirectMap);
}

/**
 * Verifies every OSG article and event has a redirect from its legacy date-less
 * URL (`/spotlights/<name>`, `/events/<name>`) to its new path. Uses the shared
 * content-redirects helper (real getArticles/getEvents), so it only runs under
 * a TypeScript loader — invoke via `pnpm compare:migration` (tsx). Under plain
 * `node` it degrades to a note. The redirects themselves are emitted at build
 * time by generate-redirects.mjs, so this passes after a full `pnpm build`.
 */
async function checkContentRedirects(redirectMap) {
  let helper;
  try {
    helper = await import('./content-redirects.mjs');
  } catch {
    console.log(
      '=== Content redirect check (articles + events) ===\n  Skipped — run `pnpm compare:migration` (tsx) to enable (needs network).\n'
    );
    return;
  }

  const checks = [
    ['Article', '/spotlights/<page-name>', helper.articleRedirects],
    ['Event', '/events/<page-name>', helper.eventRedirects],
  ];

  for (const [label, legacyForm, getRedirects] of checks) {
    let pairs;
    try {
      pairs = await getRedirects();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`=== ${label} redirect check ===\n  Skipped — could not fetch (${message}).\n`);
      continue;
    }

    // Dedup by source, mirroring the generator (first occurrence wins).
    const bySource = new Map();
    for (const pair of pairs) if (!bySource.has(pair.source)) bySource.set(pair.source, pair);

    const missing = [];
    const wrongDestination = [];
    let okCount = 0;

    for (const { source, destination } of bySource.values()) {
      const key = canonical(source);
      if (!redirectMap.has(key)) {
        missing.push({ source, destination });
      } else if (canonical(redirectMap.get(key)) !== canonical(destination)) {
        wrongDestination.push({ source, got: redirectMap.get(key), destination });
      } else {
        okCount += 1;
      }
    }

    console.log(`=== ${label} redirect check (legacy ${legacyForm} → new path) ===`);
    console.log(`  OSG ${label.toLowerCase()}s:                  ${bySource.size}`);
    console.log(`  ✓ correct redirect present:    ${okCount}`);
    console.log(`  ⚠ redirect points elsewhere:   ${wrongDestination.length}`);
    console.log(`  ✗ missing redirect:            ${missing.length}\n`);

    if (wrongDestination.length) {
      console.log(`  Redirects pointing to the wrong destination (${wrongDestination.length}):`);
      for (const item of wrongDestination.slice(0, 30)) {
        console.log(`    ${item.source}  →  got ${item.got}  (expected ${item.destination})`);
      }
      console.log('');
    }

    if (missing.length) {
      console.log(`  Missing redirects (showing ${Math.min(30, missing.length)} of ${missing.length}):`);
      for (const item of missing.slice(0, 30)) {
        console.log(`    ${item.source}  →  ${item.destination}`);
      }
      if (missing.length > 30) console.log(`    … and ${missing.length - 30} more`);
      console.log('  These generate dynamically — run a full `pnpm build` to emit them into out/.\n');
    } else {
      console.log(`  All OSG ${label.toLowerCase()}s have a correct legacy → new redirect. ✓\n`);
    }
  }
}

await main();
