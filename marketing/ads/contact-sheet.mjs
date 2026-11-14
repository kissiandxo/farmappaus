#!/usr/bin/env node
// Builds out/contact-sheet.png: all ten ad PNGs in a labelled grid.
//   node marketing/ads/contact-sheet.mjs
// Run render.mjs first so the PNGs are current.
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ADS = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ADS, 'out');
const ads = JSON.parse(fs.readFileSync(path.join(ADS, 'ads.json'), 'utf8')).ads;

const W = 270; // feed thumb width; story thumb same width
const cells = ads.map((a) => `
  <div class="ad">
    <div class="name">${a.id}</div>
    <div class="sub">${a.name} &middot; CTA: ${a.cta}</div>
    <div class="pair">
      <figure><img src="${pathToFileURL(path.join(OUT, a.id + '-feed.png'))}" style="width:${W}px;height:${W * 1350 / 1080}px"><figcaption>feed 1080x1350</figcaption></figure>
      <figure><img src="${pathToFileURL(path.join(OUT, a.id + '-story.png'))}" style="width:${W}px;height:${W * 1920 / 1080}px"><figcaption>story 1080x1920</figcaption></figure>
    </div>
  </div>`).join('');

const html = `<!doctype html><meta charset="utf-8"><style>
  body{margin:0;background:#F2F2F7;font-family:Inter,system-ui,sans-serif;color:#1C1C1E}
  .wrap{padding:40px}
  h1{font:700 32px 'Inter Display',Inter,sans-serif;margin:0 0 6px}
  .meta{font-size:16px;color:#555;margin-bottom:28px}
  .grid{display:grid;grid-template-columns:repeat(3,${W * 2 + 64}px);gap:28px}
  .ad{background:#fff;border-radius:16px;padding:20px}
  .name{font-weight:700;font-size:18px}
  .sub{font-size:14px;color:#555;margin:4px 0 14px}
  .pair{display:flex;gap:16px;align-items:flex-start}
  figure{margin:0} img{display:block;border-radius:6px;box-shadow:0 0 0 1px rgba(0,0,0,.12)}
  figcaption{font-size:12px;color:#777;margin-top:6px}
</style><div class="wrap"><h1>Farm Direct: real meat campaign</h1>
<div class="meta">Five ads, two sizes each. Rendered by render.mjs. Not to run until the app is live on the App Store.</div>
<div class="grid">${cells}</div></div>`;

const tmp = path.join(OUT, '.contact-sheet.html');
fs.writeFileSync(tmp, html);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1980, height: 1000 } });
await page.goto(pathToFileURL(tmp).href);
await page.waitForLoadState('networkidle');
await page.evaluate(() => document.fonts.ready);
const file = path.join(OUT, 'contact-sheet.png');
await page.screenshot({ path: file, fullPage: true });
await browser.close();
fs.unlinkSync(tmp);
console.log('wrote', file);
