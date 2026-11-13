#!/usr/bin/env node
// Farm Direct ad renderer.
//
//   node marketing/ads/render.mjs                 render every NN-slug/ad.html
//   node marketing/ads/render.mjs 02-real-meat-tap 05-pin-drive-buy
//   node marketing/ads/render.mjs shared/template.html
//   node marketing/ads/render.mjs 03-meat-with-postcode --size story
//
// Writes marketing/ads/out/<name>-feed.png (1080x1350) and
// <name>-story.png (1080x1920) at deviceScaleFactor 1, where <name> is the
// folder name for NN-slug/ad.html, or the file name without .html otherwise.
// Prints each file written with its pixel size, plus WARN lines from a lint
// pass (text outside the margins or story safe area, text under 34 px,
// fallback fonts, broken images, placeholder screenshots).
//
// Safe to run in parallel on different ads: every process launches its own
// browser and writes each PNG to a unique temporary file, then renames it
// into place (atomic on the same filesystem).

import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = await import('playwright')); }

const ADS = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ADS, 'out');
const SCREENS = path.join(ADS, 'shared', 'screens');
const SIZES = { feed: { width: 1080, height: 1350 }, story: { width: 1080, height: 1920 } };

// ---- arguments --------------------------------------------------------
const argv = process.argv.slice(2);
let only = null;
const targets = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--size') { only = argv[++i]; continue; }
  if (a.startsWith('--size=')) { only = a.slice(7); continue; }
  if (a === '-h' || a === '--help') {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 20).join('\n'));
    process.exit(0);
  }
  targets.push(a);
}
if (only && !SIZES[only]) { console.error(`--size must be feed or story, got "${only}"`); process.exit(2); }
const sizes = only ? [only] : ['feed', 'story'];

function resolveTarget(t) {
  const cands = [path.resolve(t), path.resolve(ADS, t)];
  for (const c of cands) {
    if (fs.existsSync(c) && fs.statSync(c).isDirectory()) {
      const f = path.join(c, 'ad.html');
      if (fs.existsSync(f)) return { file: f, name: path.basename(c) };
      throw new Error(`${c} has no ad.html`);
    }
    if (fs.existsSync(c) && c.endsWith('.html')) {
      const base = path.basename(c, '.html');
      return { file: c, name: base === 'ad' ? path.basename(path.dirname(c)) : base };
    }
  }
  throw new Error(`Not found: ${t} (give an NN-slug folder, a folder path or an .html file)`);
}

let jobs;
if (targets.length) jobs = targets.map(resolveTarget);
else jobs = fs.readdirSync(ADS)
  .filter((d) => /^\d\d-/.test(d) && fs.existsSync(path.join(ADS, d, 'ad.html')))
  .sort()
  .map((d) => ({ file: path.join(ADS, d, 'ad.html'), name: d }));
if (!jobs.length) { console.error('Nothing to render: no marketing/ads/NN-slug/ad.html found.'); process.exit(1); }

// ---- placeholder detection: screens that are byte-identical to another ---
const screenHash = {};
if (fs.existsSync(SCREENS)) for (const f of fs.readdirSync(SCREENS).filter((f) => f.endsWith('.png'))) {
  screenHash[f] = crypto.createHash('md5').update(fs.readFileSync(path.join(SCREENS, f))).digest('hex');
}
function duplicateOf(f) {
  const h = screenHash[f];
  return Object.keys(screenHash).filter((g) => g !== f && screenHash[g] === h);
}

function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

// ---- lint pass, runs inside the page ---------------------------------
function lintInPage({ size }) {
  const W = 1080, H = size === 'story' ? 1920 : 1350;
  const top = size === 'story' ? 250 : 0, bottom = size === 'story' ? 1580 : H;
  const out = [];
  const board = document.querySelector('.artboard');
  if (!board) return ['no .artboard element found'];
  const br = board.getBoundingClientRect();
  if (Math.round(br.width) !== W || Math.round(br.height) !== H) out.push(`.artboard is ${Math.round(br.width)}x${Math.round(br.height)}, expected ${W}x${H} (is the "${size}" class applied? include shared/kit.js)`);
  const walker = document.createTreeWalker(board, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  let n;
  while ((n = walker.nextNode())) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    if (!el || el.closest('[data-lint-ignore]')) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) continue;
    const r = document.createRange(); r.selectNodeContents(n);
    const rects = [...r.getClientRects()].filter((q) => q.width > 0);
    if (!rects.length) continue;
    const L = Math.min(...rects.map((q) => q.left)) - br.left, R = Math.max(...rects.map((q) => q.right)) - br.left;
    const T = Math.min(...rects.map((q) => q.top)) - br.top, B = Math.max(...rects.map((q) => q.bottom)) - br.top;
    const txt = n.textContent.trim().replace(/\s+/g, ' ').slice(0, 40);
    const fs = parseFloat(cs.fontSize);
    const key = txt + '|';
    if (seen.has(key)) continue; seen.add(key);
    if (fs < 34) out.push(`"${txt}" is ${fs}px; nothing under 34 px`);
    // Ink box is a little inside the line box; allow 4 px for side bearings.
    if (L < 80 - 4 || R > W - 80 + 4) out.push(`"${txt}" spans x ${Math.round(L)}..${Math.round(R)}, outside the 80 px margins`);
    // Line boxes include leading; allow a quarter of the font size.
    const slack = fs * 0.25;
    if (T < top - slack || B > bottom + slack) out.push(`"${txt}" spans y ${Math.round(T)}..${Math.round(B)}, outside the safe area y ${top}..${bottom}`);
    if (rects.length > 1 && el.closest('.hl .line')) out.push(`"${txt}" wraps inside a .line; shorten it or reduce the size`);
    const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    if (!/^Inter( Display)?$/.test(fam)) out.push(`"${txt}" uses font "${fam}"; use Inter or Inter Display`);
  }
  for (const img of document.images) {
    if (!img.complete || img.naturalWidth === 0) out.push(`image failed to load: ${img.getAttribute('src')}`);
  }
  const bad = [...document.fonts].filter((f) => f.status === 'error').map((f) => `${f.family} ${f.weight}`);
  if (bad.length) out.push(`fonts failed to load: ${bad.join(', ')}`);
  return out;
}

// ---- render -------------------------------------------------------------
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
let failures = 0;
try {
  for (const job of jobs) {
    for (const size of sizes) {
      const vp = SIZES[size];
      const context = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
      const page = await context.newPage();
      const errors = [];
      const screensUsed = new Set();
      page.on('pageerror', (e) => errors.push(`page error: ${e.message}`));
      page.on('requestfailed', (r) => errors.push(`failed to load ${r.url()}`));
      page.on('request', (r) => {
        const u = r.url();
        if (u.startsWith('file:') && u.includes('/shared/screens/')) screensUsed.add(decodeURIComponent(u.split('/').pop().split('?')[0]));
      });
      try {
        const url = pathToFileURL(job.file).href + `?size=${size}`;
        await page.goto(url, { waitUntil: 'load' });
        // Pages without kit.js still get the size class.
        await page.evaluate((s) => document.querySelectorAll('.artboard').forEach((a) => { a.classList.remove('feed', 'story'); a.classList.add(s); }), size);
        await page.waitForFunction(() => document.documentElement.dataset.ready === '1' || !document.querySelector('script[src*="kit.js"]'), null, { timeout: 15000 })
          .catch(() => errors.push('timed out waiting for kit.js ready flag'));
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all([...document.images].map((i) => (i.decode ? i.decode().catch(() => {}) : null)));
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        });
        const warns = [...errors, ...(await page.evaluate(lintInPage, { size }))];
        for (const s of screensUsed) {
          const d = duplicateOf(s);
          if (d.length) warns.push(`screens/${s} is a placeholder (identical to ${d.join(', ')}); final screens will replace it, do not judge the ad by it`);
        }
        const final = path.join(OUT, `${job.name}-${size}.png`);
        const tmp = path.join(OUT, `.${job.name}-${size}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.png`);
        await page.screenshot({ path: tmp, clip: { x: 0, y: 0, ...vp }, animations: 'disabled' });
        fs.renameSync(tmp, final);
        const { w, h } = pngSize(final);
        const ok = w === vp.width && h === vp.height;
        if (!ok) failures++;
        console.log(`${ok ? 'wrote' : 'WRONG SIZE'} ${final} ${w}x${h}`);
        for (const w of warns) console.log(`  WARN ${job.name} ${size}: ${w}`);
      } catch (e) {
        failures++;
        console.error(`FAILED ${job.name} ${size}: ${e.message}`);
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
process.exit(failures ? 1 : 0);
