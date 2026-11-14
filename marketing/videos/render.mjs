#!/usr/bin/env node
// Farm Direct video renderer.
//
//   node marketing/videos/render.mjs 01-paddock-not-petri            both cta variants
//   node marketing/videos/render.mjs 01-paddock-not-petri --cta=soon
//   node marketing/videos/render.mjs shared/template.html --keep-frames
//   node marketing/videos/render.mjs 02-meat-postcode-map --fps=30 --workers=4 --from=3 --to=6
//
// For each target (a NN-slug folder holding video.html, or an .html path) it
// opens file://.../video.html?cta=<variant>, waits for window.__ready, reads
// window.__duration, calls window.__setTime(i / fps) for every frame,
// screenshots 1080x1920 JPEGs, and encodes
//   marketing/videos/out/<name>-live.mp4 and <name>-soon.mp4
// (H.264 high, yuv420p, CRF 18, BT.709, +faststart, silent stereo AAC 48 kHz
// 128 kbps, duration exactly the video duration).
// The second variant reuses the first variant's frames before the end-card
// CTA appears (window.__meta.ctaFrom) and re-renders only the rest.
// Prints path, duration, size and resolution (ffprobe) and lint WARN lines
// (text, taps or the lockup in Instagram's unsafe zones; engine warnings).
// Safe to run concurrently on different folders: each run uses its own
// browser and a unique temp folder, and writes outputs via atomic rename.
//
// Options: --cta=live|soon|both (default both)  --fps=30  --keep-frames
//          --workers=N (parallel pages, default 4)  --quality=95 (JPEG)
//          --from=S --to=S  render only part (writes <name>-<cta>-part.mp4)

import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = await import('playwright')); }

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'out');

// ---- arguments ----------------------------------------------------------
const args = process.argv.slice(2);
const opt = { cta: 'both', fps: 30, keep: false, workers: 4, quality: 95, from: null, to: null };
const targets = [];
for (const a of args) {
  if (a === '-h' || a === '--help') {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 27).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
    process.exit(0);
  }
  const m = a.match(/^--([a-z-]+)(?:=(.*))?$/);
  if (!m) { targets.push(a); continue; }
  const [, k, v] = m;
  if (k === 'cta') opt.cta = v;
  else if (k === 'fps') opt.fps = Number(v);
  else if (k === 'keep-frames') opt.keep = true;
  else if (k === 'workers') opt.workers = Math.max(1, Number(v));
  else if (k === 'quality') opt.quality = Number(v);
  else if (k === 'from') opt.from = Number(v);
  else if (k === 'to') opt.to = Number(v);
  else { console.error('unknown option ' + a); process.exit(2); }
}
if (!['live', 'soon', 'both'].includes(opt.cta)) { console.error('--cta must be live, soon or both'); process.exit(2); }
if (!targets.length) { console.error('usage: node render.mjs <NN-slug folder | file.html> [--cta=live|soon|both] [--fps=30] [--keep-frames]'); process.exit(2); }
const variants = opt.cta === 'both' ? ['live', 'soon'] : [opt.cta];

function resolveTarget(t) {
  for (const c of [path.resolve(t), path.resolve(ROOT, t)]) {
    if (!fs.existsSync(c)) continue;
    if (fs.statSync(c).isDirectory()) {
      const f = path.join(c, 'video.html');
      if (!fs.existsSync(f)) throw new Error(c + ' has no video.html');
      return { file: f, name: path.basename(c) };
    }
    return { file: c, name: path.basename(c, '.html') };
  }
  throw new Error('not found: ' + t);
}

function run(cmd, argv) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, argv, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(cmd + ' exited ' + code + '\n' + err))));
  });
}

// ---- page pool -------------------------------------------------------------
async function openPage(browser, url, logs) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') logs.add(m.text()); });
  page.on('pageerror', (e) => logs.add('page error: ' + e.message));
  page.on('requestfailed', (r) => logs.add('failed to load: ' + r.url()));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true || window.__bootError, null, { timeout: 60000 });
  const err = await page.evaluate(() => window.__bootError);
  if (err) throw new Error('video boot failed: ' + err);
  return page;
}

async function renderFrames(browser, url, frames, dir, fps, logs) {
  const n = Math.min(opt.workers, frames.length || 1);
  const pages = await Promise.all(Array.from({ length: n }, () => openPage(browser, url, logs)));
  let next = 0;
  await Promise.all(pages.map(async (page) => {
    while (next < frames.length) {
      const i = frames[next++];
      await page.evaluate((t) => window.__setTime(t), i / fps);
      await page.screenshot({ path: path.join(dir, String(i).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: opt.quality, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
    }
  }));
  const meta = await pages[0].evaluate(() => window.__meta);
  await Promise.all(pages.map((p) => p.close()));
  return meta;
}

// Lint: sample every 0.25 s for important elements outside the safe zones.
async function lint(browser, url, duration, logs) {
  const page = await openPage(browser, url, logs);
  const issues = await page.evaluate((dur) => {
    const out = new Set();
    const sel = '.fd-line .fd-word, .fd-end-icon, .fd-end-name, .fd-end-cta, .fd-tap-dot, [data-safe]:not([data-safe="off"]):not(.fd-tap)';
    const visible = (el) => {
      for (let n = el; n && n !== document.body; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.05) return false;
      }
      return true;
    };
    // elements inside something that is motion-blurred are mid-transition (whip, rise, drop)
    const moving = (el) => { for (let n = el; n && n !== document.body; n = n.parentElement) if ((n.style.filter || '').includes('fdblur')) return true; return false; };
    for (let t = 0; t <= dur + 1e-6; t += 0.25) {
      window.__setTime(Math.min(t, dur - 1 / 60));
      document.querySelectorAll(sel).forEach((el) => {
        if (!visible(el)) return;
        if (moving(el)) return;
        const r = el.getBoundingClientRect();
        if (r.width < 1) return;
        const end = el.dataset.safe === 'end' || el.closest('.fd-end');
        const bottom = end ? 1620 : 1540;
        const label = (el.textContent || el.className || el.tagName).trim().slice(0, 40);
        const probs = [];
        if (r.top < 219.5) probs.push('top ' + Math.round(r.top) + ' < 220');
        if (r.bottom > bottom + 0.5) probs.push('bottom ' + Math.round(r.bottom) + ' > ' + bottom);
        if (r.right > 950.5) probs.push('right ' + Math.round(r.right) + ' > 950');
        if (r.left < 59.5 && !el.closest('.fd-phone')) probs.push('left ' + Math.round(r.left) + ' < 60');
        if (probs.length) out.add('"' + label + '" ' + probs.join(', ') + ' (first at ' + t.toFixed(2) + 's)');
      });
      // the end-card icon must not show before the end card
      const ic = document.querySelector('.fd-end-icon');
      if (ic && visible(ic) && window.__meta.endStart != null && t < window.__meta.endStart - 1e-6) out.add('app icon visible before the end card at ' + t.toFixed(2) + 's');
    }
    // dedupe by label+problem, keeping the first time
    const seen = new Map();
    [...out].forEach((s) => { const k = s.replace(/ \(first at .*\)$/, ''); if (!seen.has(k)) seen.set(k, s); });
    return [...seen.values()];
  }, duration);
  const meta = await page.evaluate(() => window.__meta);
  await page.close();
  if (meta.endStart != null && duration - meta.endStart > 2.1 + 1e-6) logs.add('end card starts ' + (duration - meta.endStart).toFixed(2) + 's before the end (family rule: last 2.1 s)');
  if (meta.stillFrom != null && duration - meta.stillFrom < 1.5 - 1e-6) logs.add('end card holds still for only ' + (duration - meta.stillFrom).toFixed(2) + 's (needs 1.5 s)');
  return issues;
}

async function encode(dir, firstFrame, count, fps, duration, outFile) {
  const tmp = outFile.replace(/\.mp4$/, '.' + process.pid + '.tmp.mp4');
  await run('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-framerate', String(fps), '-start_number', String(firstFrame), '-i', path.join(dir, '%05d.jpg'),
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
    '-map', '0:v', '-map', '1:a',
    '-frames:v', String(count),
    '-vf', 'scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p',
    '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-r', String(fps), '-g', String(fps * 2),
    '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-ac', '2',
    '-t', duration.toFixed(4),
    '-movflags', '+faststart',
    tmp,
  ]);
  fs.renameSync(tmp, outFile);
}

async function probe(file) {
  const j = JSON.parse(await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate,profile,pix_fmt,sample_rate,channels', '-of', 'json', file]));
  const v = j.streams.find((s) => s.codec_type === 'video'), a = j.streams.find((s) => s.codec_type === 'audio');
  return `${file}  ${Number(j.format.duration).toFixed(3)}s  ${(Number(j.format.size) / 1048576).toFixed(2)} MB  ${v.width}x${v.height} ${v.codec_name} ${v.profile} ${v.pix_fmt} ${v.r_frame_rate}fps` + (a ? `  audio ${a.codec_name} ${a.sample_rate}Hz ${a.channels}ch` : '  NO AUDIO');
}

// ---- main ------------------------------------------------------------------
fs.mkdirSync(OUT, { recursive: true });
let failed = false;
const browser = await chromium.launch();
try {
  for (const t of targets) {
    const { file, name } = resolveTarget(t);
    const base = pathToFileURL(file).href;
    const logs = new Set();
    const work = fs.mkdtempSync(path.join(os.tmpdir(), 'fdvideo-' + name + '-'));
    const t0 = Date.now();
    try {
      const probePage = await openPage(browser, base + '?cta=' + variants[0], logs);
      const meta0 = await probePage.evaluate(() => window.__meta);
      await probePage.close();
      const duration = meta0.duration;
      if (!(duration > 0)) throw new Error(name + ': window.__duration is not set');
      if (duration < 13 || duration > 16) if (!/template/.test(name)) logs.add('duration ' + duration + 's is outside 13-16 s');
      const total = Math.round(duration * opt.fps);
      const fA = opt.from != null ? Math.max(0, Math.round(opt.from * opt.fps)) : 0;
      const fB = opt.to != null ? Math.min(total, Math.round(opt.to * opt.fps)) : total;
      const all = Array.from({ length: fB - fA }, (_, i) => fA + i);
      const part = opt.from != null || opt.to != null;
      let prevDir = null, prevMeta = null;
      for (const v of variants) {
        const dir = path.join(work, v); fs.mkdirSync(dir);
        let todo = all;
        if (prevDir && prevMeta && prevMeta.ctaFrom != null) {
          const cut = Math.floor(prevMeta.ctaFrom * opt.fps - 1e-6);   // frames < cut never show the CTA
          todo = all.filter((i) => i >= cut);
          all.filter((i) => i < cut).forEach((i) => {
            const n = String(i).padStart(5, '0') + '.jpg';
            fs.linkSync(path.join(prevDir, n), path.join(dir, n));
          });
        }
        const meta = await renderFrames(browser, base + '?cta=' + v, todo, dir, opt.fps, logs);
        const outFile = path.join(OUT, `${name}-${v}${part ? '-part' : ''}.mp4`);
        await encode(dir, fA, all.length, opt.fps, all.length / opt.fps, outFile);
        console.log('wrote ' + await probe(outFile) + `  (${todo.length} frames rendered${todo.length < all.length ? ', ' + (all.length - todo.length) + ' reused' : ''})`);
        if (opt.keep) console.log('frames kept in ' + dir);
        prevDir = dir; prevMeta = meta;
        (meta.warnings || []).forEach((w) => logs.add(w.replace(/^FD WARN /, '')));
      }
      const issues = await lint(browser, base + '?cta=' + variants[0], duration, logs);
      issues.forEach((s) => logs.add('unsafe zone: ' + s));
      console.log(`${name}: ${duration}s, ${total} frames, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    } catch (e) {
      failed = true;
      console.error('FAILED ' + name + ': ' + (e.stack || e));
    } finally {
      [...logs].forEach((l) => console.log('WARN ' + name + ': ' + l.replace(/^FD WARN /, '')));
      if (!opt.keep) fs.rmSync(work, { recursive: true, force: true });
    }
  }
} finally {
  await browser.close();
}
process.exit(failed ? 1 : 0);
