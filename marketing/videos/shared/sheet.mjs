#!/usr/bin/env node
// Contact sheet for a rendered video.
//
//   node marketing/videos/shared/sheet.mjs marketing/videos/out/01-paddock-not-petri-live.mp4
//   node marketing/videos/shared/sheet.mjs out/x.mp4 --every=0.25 --cols=8 --width=240 --out=/tmp/x.png
//   node marketing/videos/shared/sheet.mjs out/x.mp4 --at=3.20,3.23,3.27   (exact frames, bigger tiles)
//
// Extracts a frame every N seconds (default 0.5) with ffmpeg (exact seek),
// tiles them with the timestamp and frame number under each, and writes one
// PNG (default marketing/videos/out/<name>-sheet.png). Read it with the Read tool.

import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = await import('playwright')); }
const VIDEOS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const o = { every: 0.5, cols: 8, width: 240, out: null, at: null };
let input = null;
for (const a of process.argv.slice(2)) {
  const m = a.match(/^--([a-z]+)=(.*)$/);
  if (m) o[m[1]] = m[1] === 'out' || m[1] === 'at' ? m[2] : Number(m[2]);
  else input = a;
}
if (!input) { console.error('usage: node sheet.mjs <video.mp4> [--every=0.5] [--out=file.png] [--cols=8] [--width=240] [--at=t1,t2]'); process.exit(2); }
input = path.resolve(input);
if (!fs.existsSync(input)) { console.error('not found: ' + input); process.exit(2); }
const name = path.basename(input, '.mp4');
const outFile = path.resolve(o.out || path.join(VIDEOS, 'out', name + '-sheet.png'));

function run(cmd, argv) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, argv, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (err += d));
    p.on('error', rej);
    p.on('close', (c) => (c === 0 ? res(out) : rej(new Error(cmd + ' exited ' + c + '\n' + err))));
  });
}

const info = JSON.parse(await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate:format=duration', '-of', 'json', input]));
const dur = Number(info.format.duration);
const [fn, fd] = info.streams[0].r_frame_rate.split('/').map(Number); const fps = fn / (fd || 1);
let times = [];
if (o.at) { times = String(o.at).split(',').map(Number); if (o.width === 240) o.width = 360; if (o.cols === 8) o.cols = Math.min(times.length, 5); }
else for (let t = 0; t < dur - 1e-6; t += o.every) times.push(Math.round(t * 1000) / 1000);
// the last frame too, so the end card hold is visible
const lastT = (Math.round(dur * fps) - 1) / fps;
if (!o.at && times[times.length - 1] < lastT - 1e-3) times.push(lastT);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fdsheet-'));
try {
  const h = Math.round(o.width * info.streams[0].height / info.streams[0].width);
  // one decoding pass that keeps exactly the wanted frame numbers
  const frameNos = times.map((t) => Math.min(Math.round(t * fps), Math.round(dur * fps) - 1));
  const uniq = [...new Set(frameNos)].sort((a, b) => a - b);
  await run('ffmpeg', ['-v', 'error', '-y', '-i', input,
    '-vf', `select='${uniq.map((n) => `eq(n\\,${n})`).join('+')}',scale=${o.width}:${h}:flags=lanczos`,
    '-fps_mode', 'passthrough', path.join(tmp, 'u%04d.png')]);
  const files = frameNos.map((n) => path.join(tmp, 'u' + String(uniq.indexOf(n) + 1).padStart(4, '0') + '.png'));
  const tiles = times.map((t, i) => ({ src: pathToFileURL(files[i]).href, t, f: frameNos[i] }))
    .filter((x, i) => fs.existsSync(files[i]));
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;background:#202020;font:600 15px/1.2 Inter,system-ui,sans-serif;color:#eee}
    h1{font-size:18px;margin:12px 16px 4px;font-weight:700}
    .g{display:grid;grid-template-columns:repeat(${o.cols},${o.width}px);gap:10px 8px;padding:8px 16px 16px}
    .t img{display:block;width:${o.width}px;height:${h}px;outline:1px solid #444}
    .t div{padding-top:4px;text-align:center;color:#ddd}
  </style><h1>${name} &middot; ${dur.toFixed(2)} s &middot; every ${o.at ? 'listed' : o.every + ' s'}</h1><div class="g">${tiles.map((x) =>
    `<div class="t"><img src="${x.src}"><div>${x.t.toFixed(2)} s &middot; f${x.f}</div></div>`).join('')}</div>`;
  const htmlFile = path.join(tmp, 'sheet.html');
  fs.writeFileSync(htmlFile, html);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 32 + o.cols * o.width + (o.cols - 1) * 8, height: 400 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'load' });
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  await page.screenshot({ path: outFile, fullPage: true });
  await browser.close();
  console.log('wrote ' + outFile + '  (' + tiles.length + ' frames)');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
