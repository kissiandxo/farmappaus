# Farm Direct video engine

Three silent 9:16 Reels (1080x1920, 30 fps, 13-16 s), one campaign with the five image ads in `marketing/ads/out/`. This engine renders an HTML page frame by frame: every visual value is a pure function of time `t`, so any frame can be rendered in any order and the output is identical every run.

## Files

| File | What it is |
|---|---|
| `shared/engine.css` | Fonts (Inter, Inter Display), family tokens, stage, phone, tap, pills, odometer, end card, guides |
| `shared/engine.js` | The `FD` API (below). Defines `window.__duration`, `window.__setTime(t)`, `window.__ready`, `window.__meta` |
| `shared/preview.js` | Optional browser preview: `video.html?t=2.4` freezes a frame, `&play=1` plays; arrow keys step frames |
| `shared/template.html` | A 7 s working example of every main component. Copy it to start |
| `render.mjs` | Renders a video folder to `out/<name>-live.mp4` and `out/<name>-soon.mp4`, then lints safe zones |
| `shared/sheet.mjs` | Contact sheet PNG of an MP4 (timestamps and frame numbers under each tile) |

## Commands (run from anywhere; paths resolve against `marketing/videos/`)

```bash
# 1. start your video (your folder only)
mkdir -p marketing/videos/01-paddock-not-petri
cp marketing/videos/shared/template.html marketing/videos/01-paddock-not-petri/video.html

# 2. render both variants (about 20-40 s for a 15 s video)
node marketing/videos/render.mjs 01-paddock-not-petri
#    one variant while iterating, or a time range (writes <name>-<cta>-part.mp4)
node marketing/videos/render.mjs 01-paddock-not-petri --cta=soon
node marketing/videos/render.mjs 01-paddock-not-petri --cta=live --from=3 --to=6
#    keep the JPEG frames (path is printed) to Read single frames at full size
node marketing/videos/render.mjs 01-paddock-not-petri --cta=soon --keep-frames

# 3. look at it
node marketing/videos/shared/sheet.mjs marketing/videos/out/01-paddock-not-petri-soon.mp4               # every 0.5 s
node marketing/videos/shared/sheet.mjs marketing/videos/out/01-paddock-not-petri-soon.mp4 --every=0.25
node marketing/videos/shared/sheet.mjs marketing/videos/out/01-paddock-not-petri-soon.mp4 --at=3.2,3.233,3.267 --out=/tmp/x.png   # exact frames, big tiles
```

Then Read the sheet PNG. Check motion by reading frames 1-3 frames apart (`--at=`), not only the 0.5 s sheet.

`render.mjs` prints for each MP4: path, duration, size, resolution, codec, audio; then `WARN` lines. Fix every WARN:
- `unsafe zone: "word" bottom 1562 > 1540 (first at 6.25s)`: a caption word, pill, tap dot or end-card element outside the safe area (elements that are motion-blurred mid-transition are skipped);
- `app icon visible before the end card`, `end card holds still for only ...`, `end card starts ... before the end`;
- `map screen ... shows source columns < 360` (the Apple Maps mark could enter the frame);
- `caption "..." is N px wide`, `font not available`, `image failed to load`, page errors;
- `duration ... outside 13-16 s`.

Output: H.264 High, yuv420p, CRF 18, BT.709 tagged, `+faststart`, silent stereo AAC 48 kHz 128 kbps, duration exactly `frames / 30`. The `-soon` render reuses the `-live` frames before the CTA line appears and re-renders only the rest, so the two files differ only in the availability line. Concurrent runs on different folders are safe (own browser, unique temp folder, atomic rename into `out/`). Do not run on someone else's folder.

## Minimal video.html

```html
<!doctype html>
<html lang="en-AU"><head><meta charset="utf-8"><title>Farm Direct video 0N</title>
<link rel="stylesheet" href="../shared/engine.css"></head>
<body><div class="fd-stage"></div>
<script src="../shared/engine.js"></script>
<script src="../shared/preview.js"></script>
<script>
FD.video({
  duration: 13.2,
  ground: FD.C.forest,
  setup(FD) {
    const { C, UI } = FD;
    const hook = FD.layer();                                     // group for the whip
    FD.typeLine('From a', 0, { y: 760, size: 104, parent: hook });
    FD.whip(1.50, hook, null, { ground: C.grey });               // 6-frame whip, ground slides to grey
    const phone = FD.phone()
      .screen('all', '01-explore.png')                           // list view: scale 0.518, top-anchored
      .screen('meat', '02-explore-meat.png')
      .enter(1.50, { tilt: [4, 1.5] });                          // rise 0.4 s, back-out, then 1.5 px drift
    FD.caption('*106* places', 1.90, 2.50);                      // band y 240-400, 96 px, accent in *...*
    phone.tap(3.20, { at: UI.filtersTap, dim: UI.filtersBox });
    FD.caption('Tap *Filters.*', 3.20, 3.80);                    // same frame as the tap
    phone.cut(3.80, 'meat', { flash: 2 }).bump(3.80);
    phone.exit(8.60);  FD.wipe(8.60, C.forest);
    const a = FD.typeLine('Ask the *farmer*', 9.10, { y: 800 });
    const b = FD.typeLine([{ text: 'the rest.', accent: true }], 9.60, { y: 930 });
    FD.endCard(11.10, { lines: [a, b] });                        // last 2.1 s; reads ?cta=
  },
});
</script></body></html>
```

## API (all times in seconds; `FD.f(n)` = n frames)

**Easing** `FD.ease.*`: `linear, inCubic, outCubic, inOutCubic, inOutSine, inExpo, outExpo, inOutExpo, outBack, backOut(s), spring, bezier(x1,y1,x2,y2)`, and the family curves `enter` (.34,1.56,.64,1), `move` (.65,0,.35,1), `exit` (.55,0,1,.45). Anywhere an ease is accepted you may pass a name (`'move'`) or a function.

**Timeline**
- `FD.at(t0, t1, (p, t) => {...}, ease)`: called every frame with clamped, eased progress (0 before, 1 after).
- `FD.onFrame(t => {...})`: raw per-frame hook.
- Moving elements: never write `style.transform` yourself on an element the engine also animates. Add to its accumulator: `const a = FD.T(el); a.x += 10; a.y; a.scale *= 1.1; a.rot; a.opacity *= 0.5; a.blurX; a.blurY; a.hidden = true`. The engine resets and flushes it every frame, so effects compose.
- Element helpers (composable): `FD.show(el, t0, t1)`, `FD.popIn(el, t0, {from, peak, frames, fade})`, `FD.slam(el, t0)` (1.18 to 0.97 to 1, 9 frames), `FD.riseIn(el, t0, {dy:40, frames:8})`, `FD.fadeOut(el, t1)` (4-frame fade + 12 px rise ending at t1), `FD.dim(el, t0, 0.45)`, `FD.punch(el, t0, {peak:1.06, frames:4})`, `FD.shake(el, t0, {px:8, frames:2})`, `FD.move(el, t0, t1, from, to, ease)`, `FD.draw(svgShape, t0, t1, ease)` (stroke-dashoffset draw-on; for left-to-right, draw each shape in turn).

**Grounds and transitions** (only the family set exists)
- `FD.ground(color)`; `FD.groundTo(t, color, {mode: 'cut'|'up'|'left'|'fade', dur})`; `FD.wipe(t, color)` = bottom-to-top linear wipe, 0.35 s.
- `FD.layer(markup?, {z})`: a full-frame group to put hook art and type in (`parent: layer`). Your markup string goes in as-is, so write it yourself.
- `FD.whip(t, outLayer, inLayer?, {ground})`: 6-frame horizontal whip with motion blur.
- `FD.cut(t, outEl, inEl)`; `FD.flash(t, 2)` (stage) or `phone.flash(t, 2)` (screen only); `FD.crossfade(t, a, b, frames<=6)`.

**Text** (Inter Display Black, tracking -1%, line-height 1.0, centred on x 505, one line, fitted to 890 px)
- `FD.caption(spec, t0, t1, opts)`: band caption at y 320 (centre), 96 px default, 84 px minimum. It pops in (0.90 to 1.06 to 1.00 over 8 frames, 3-frame fade) and exits over the 4 frames before `t1` (fade + 12 px rise), so the next caption can start at exactly `t1`. Omit `t1` (or pass `Infinity`) to hold.
- `FD.typeLine(spec, t0, {y, size: 112, tone: 'dark', t1})`: full-bleed type beat line, y = vertical centre of the line box.
- `FD.text(spec, t0, t1, opts)`: the general form. Options: `y, size, minSize, maxWidth, tone: 'light'|'dark'` (ink + green, or off-white + sprout), `stagger` (s between words, default 0.08 for captions, 0 for type lines), `color, accent, parent, z, pop: {from, peak, frames}`.
- spec: `'Search a *town*'` (accent words in asterisks), or an array of parts: `'word'`, `{ text, accent, at, accentAt, color, size }` (`at`: this word's own pop time; `accentAt`: turns accent at that time, 3-frame blend), `{ pill: 'Meat', size: 72, light }` (green pill, white Inter Bold, radius 44), `{ odometer: { from: '106', to: '41', at, dur: 0.6 }, accent: true }`, `{ node: element }`.
  Words with the same pop time pop as one group; staggered words pop one by one.
- The returned line has `.dim(t, 0.45)` (checklists, two-line beats) and `.moveTo(t, dur, {y, size})`.
- Odometer example: `FD.caption([{ odometer: { from: '106', to: '41', at: 4.20, dur: 0.6 }, accent: true }, { text: 'places', size: 96 }], 4.20, 5.10, { size: 120, stagger: 0 })`.

**Phone** (the same in all three videos): `const phone = FD.phone({ dark, origin: [fx, fy] })`
- Plain CSS outline: graphite bezel 18 px, radius 76/60, outline x 70-790 from y 420, window x 88-772 from y 438, running off the frame bottom. Default transform origin is the phone's top centre (430, 420); pass `origin: [70, 420]` for video 2's shrink about the top-left.
- `.screen(key, file, view)`: `file` is a name in `marketing/app-store-screenshots/`; `view` `'list'` (scale 0.518, top-anchored) or `'map'` (scale 0.85, source column 360 pinned to the window's left edge, source row 180 at the top). 03/04 place pages throw an error.
- `.enter(t, { from: 'bottom'|'right', tilt: [4, 1.5], dur: 0.4 })`, then a 1.5 px 0.7 Hz drift until `.exit(t, { to: 'bottom' })` (0.35 s ease-in drop with vertical motion blur). `.rest(1.5)` for a phone already in place.
- `.zoom(t0, t1, s0, s1)` push-in; `.bump(t, 0.0194, 6)` (1.03 to 1.05 to 1.03); `.kick(t, 1)`.
- `.cut(t, key, { flash: 2 })`; `.slide(t, key, { dir: 'left', dur: 0.35 })` (inside the window, ease-in-out, motion blur).
- `.pan(key, t0, t1, { y: [from, to] })` in SOURCE pixels at the window top (list: 380 source rows = 197 px on screen; map: keep y within 180-520 and x at 360).
- `.tap(t, { at: [fx, fy], dim: [x, y, w, h, r] })`: dot appears 4 frames early, presses at `t` (1.0 to 0.85), ring grows 64 to 120 px and fades over 0.35 s, the dim box sits 10% black for 120 ms. Coordinates are frame pixels for the phone at rest and unscrolled; the tap follows the phone's tilt, scale and the screen's scroll.
- `.outline(key, t, { box: [x, y, w, h, r], mode: 'pulse'|'draw'|'show', hold, t1, dur })`: green 4 px rounded outline that traces a real element and scrolls with the screen.
- `.pulse(key, t, { at: [fx, fy], r: 30 })`: pin pulse 1.0 to 1.15 to 1.0 over 8 frames, made from the real screenshot pixels around the pin (find pin positions by reading the screenshot; frame x = 88 + (srcX - 360) * 0.85, y = 438 + (srcY - 180) * 0.85 at the default map view).
- Measured boxes (frame coords, list view unscrolled): `FD.UI.filtersTap` (658, 832), `filtersBox`, `searchBox` (119-740, 702-768), `placesLine` (the "41 places · nearest first" line, y about 886), `noteBox` (the grey not-yet-confirmed note, y 920-1013). On 02 card 1 is y 1031-1254, card 2 y 1272-1495; on 05 the three cards are y 755-1460.

**End card** `FD.endCard(t0, { lines: [a, b] })`: forest ground (pass `ground: FD.C.forest` if the ground is not forest yet). Lines ease to y 560 and 680 (centres) at 88 px over 0.4 s; icon (200 px, radius 44, top y 1060) pops at t0; "Farm Direct" (Inter Display Bold 84, off-white, baseline 1360) rises in at t0+0.2; the CTA (Inter Medium 52, sprout, baseline 1450) at t0+0.4: "Free for iPhone" for `?cta=live`, "Coming soon to iPhone" for `?cta=soon`. Everything is still from t0+0.6. Put t0 at `duration - 2.1`.

**Guides** `video.html?guides=1` (with `&t=3.2` to freeze): pink = unsafe (top 220, bottom 380, right 130), blue = end-card allowance to y 1620, dashed box = caption band, blue line = x 505, plus time and frame number. Guides never appear in renders.

## Rules of thumb

- A pop that starts at 0.00 shows at 1/3 opacity on frame 0 (it reaches full opacity on frame 2). If you want frame 0 (the cover frame when the Reel autoplays) fully legible, start the hook at `-FD.f(3)`: negative times are fine.
- Put event times on frame boundaries (multiples of 1/30 s: 3.20, 3.2333, 3.2667). Times from the beat sheets in tenths are fine.
- Times are absolute; build the video top to bottom in beat order so the source reads like the beat sheet.
- Nothing runs in real time: no `setTimeout`, `requestAnimationFrame`, CSS transitions or `@keyframes` in a video page.
- Draw your own SVG for hook art (6 px round-cap strokes); use `FD.draw` for the draw-on.
- Use paths `../shared/...`; screenshots and the icon are found by the engine (`FD.SCREENS`, `FD.ICON`).

## Family rules (creative lead)

Numbers (checked 13 Nov 2026 against `src/data/realListings.json`, re-run the check in `marketing/ads/README.md` before posting): 106 places; 41 list beef, lamb, pork or chicken (25 farmers' markets, 12 farm shops, 3 farms, 1 farm-gate stall; NSW 13, VIC 7, WA 7, SA 6, QLD 5, ACT 2, TAS 1, none in the NT); beef 28, lamb 23, pork 18, chicken 16; 29 of the 41 have Saturday or Sunday hours. If meat places fall below about 38, redo "41 places" and "About 40"; if weekend falls below 28, change "Nearly 30".

Format: 1080x1920, 30 fps, H.264 yuv420p high CRF 18, silent stereo AAC, +faststart; `-soon` and `-live` variants differ only in the availability line. No music, no voiceover.

Safe area: nothing important above y 220, below y 1540 or right of x 950. Live column x 60-950, centre everything on x 505. Only the end-card lockup may come down to y 1620. The phone may run off the bottom, but no tap, caption or key UI below y 1540.

Colour: forest #0F3D1D (type beats, end card), app grey #F2F2F7 (behind light screenshots), off-white #F7F5EF (hook grounds in videos 2 and 3); deep green #1B7335 (active word on light, pills, outlines); sprout #CDE8C4 (active word on forest); ink #111111 on light, off-white on forest; wattle gold #E9B44C once per video as a small drawn mark, never type. #30D158 only inside the dark screenshot. No other colours, gradients, textures or photos.

Type: Inter Display Black for captions and headlines; Inter Bold/SemiBold for pills; Inter Display Bold + Inter Medium for the lockup. Band captions 96 px (84 min), max 890 px, one line. Full-bleed beats 112-150 px; counters 120-160 px. 1-4 words per caption; a new caption replaces the last (exceptions: the hook checklist and two-line beats, where earlier words dim to 45%). The key word takes the accent. Captions never sit on a screenshot: band y 240-400 or plain grounds.

Caption motion: pop 0.90 to 1.06 to 1.00 over 8 frames with a 3-frame fade; exit 4-frame fade with 12 px rise; a tap and its caption share the same frame.

Phone: as above; list screens 0.518 top-anchored; map screens 0.85 with source column 360 at the window's left edge (columns 0-359, with Apple's "Maps / Legal" mark at source x 20-285, rows about 2137-2173, are never shown); vertical map pans between source rows 180 and 520. Rise 0.40 s back-out with 3-4 deg tilt settling to 1.5-2 deg, 1.5 px sine drift at 0.7 Hz; leave by dropping out the bottom in 0.35 s with motion blur.

Tap: 64 px white circle at 35% fill, 3 px white ring, soft shadow; press 1.0 to 0.85, ring to 120 px fading over 0.35 s; the control dims 10% black for 120 ms.

Highlights: green 4 px rounded outlines may trace a real element (search field, Filters badge, the "41 places" line, the not-yet-confirmed note). Never enlarge a card, never show a single place page or pin card, never centre or zoom one named business; lists always show at least two whole cards at equal size.

Transitions (only these): hard cut; 6-frame whip with motion blur; 2-frame white flash for a skipped step; slide inside the screen window 0.35 s; bottom-to-top wipe into forest before each closing type beat; phone rise or drop. No spins, 3D flips, crossfades over 6 frames, or shake except video 2's single 2-frame tag slam.

End card: last 2.1 s only; no logo or icon before it; nothing below y 1620; no App Store badge, Apple logo, URL or handle; still for the final 1.5 s.

## Checklist before you hand in

- [ ] Hook readable within 1.5 s (first words land by 0.1 s); no logo or icon before the end card.
- [ ] Every caption is 1-4 words, at least 84 px (band) or 112 px (beats), high contrast, and lands on the frame of the action it names (tap and caption share a frame; counter rolls while the screen shows the drop).
- [ ] `render.mjs` printed no `WARN` lines; `?guides=1` checked at each beat: nothing important above 220, below 1540 (lockup 1620) or right of 950.
- [ ] Only allowed screens: 01, 02, 05, 06, 07 (never 03/04), list views show two or more whole cards at equal size, no card enlarged.
- [ ] Apple's "Maps / Legal" mark never in frame (map view only, source column 360 pinned; read the map frames at full size).
- [ ] No Apple logo, device picture, App Store badge; the phone is the engine's plain outline.
- [ ] No stock, found or AI imagery, no lab, factory, machine or 3D-printer imagery; hook art is your own SVG.
- [ ] Honesty: no grass-fed, free-range, organic, hormone-free, healthier, cheaper, safer; no retailer, brand or institution named; the lab contrast only as "From a paddock, not a petri dish"; no count over the unfiltered map; never "one tap" (Filters, then Meat); no route lines on maps; offline claim only "List works with no signal".
- [ ] Silent with captions that work with sound off; both `-live` and `-soon` rendered, 13-16 s, 1080x1920, 30 fps.
- [ ] Contact sheet read, plus single frames around every tap, cut and whip (`--at=`) to check motion is smooth.
