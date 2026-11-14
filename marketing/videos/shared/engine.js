/* =====================================================================
   Farm Direct video engine (deterministic, time-driven).
   Read ENGINE.md. Load after engine.css, then call FD.video({...}).

   Contract with render.mjs:
     window.__duration      seconds
     window.__ready         true once fonts, images and setup are done
     window.__setTime(t)    renders exactly the frame for time t (any order)
     window.__meta          { duration, ctaFrom, endStart, stillFrom, warnings }
   Nothing here uses timers, requestAnimationFrame, CSS transitions or
   CSS animations: every visual value is a pure function of t.
   ===================================================================== */
(function () {
  'use strict';
  const ENGINE_URL = document.currentScript ? document.currentScript.src : location.href;
  const FD = (window.FD = {});
  const Q = new URLSearchParams(location.search);

  // ---------- constants ----------------------------------------------
  FD.FPS = 30;
  FD.W = 1080; FD.H = 1920;
  FD.CX = 505;                                  // centre of the live column (x 60..950)
  FD.SAFE = { top: 220, bottom: 1540, right: 950, left: 60, endBottom: 1620 };
  FD.BAND = { top: 240, bottom: 400, y: 320 };  // caption band above the phone
  FD.C = {
    forest: '#0F3D1D', grey: '#F2F2F7', offwhite: '#F7F5EF', green: '#1B7335',
    sprout: '#CDE8C4', ink: '#111111', graphite: '#1C1C1E', white: '#FFFFFF', gold: '#E9B44C',
  };
  FD.SCREENS = new URL('../../app-store-screenshots/', ENGINE_URL).href;
  FD.ICON = new URL('../../ads/shared/icon.png', ENGINE_URL).href;
  FD.cta = Q.get('cta') === 'soon' ? 'soon' : 'live';
  FD.CTA_TEXT = { live: 'Free for iPhone', soon: 'Coming soon to iPhone' };
  FD.guides = Q.get('guides') === '1';
  FD.f = (n) => n / FD.FPS;                     // frames -> seconds

  const warnings = [];
  const warnOnce = new Set();
  function warn(msg) {
    if (warnOnce.has(msg)) return;
    warnOnce.add(msg); warnings.push(msg);
    console.warn('FD WARN ' + msg);
  }
  FD.warn = warn;

  // ---------- math ------------------------------------------------------
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const progress = (t, t0, t1) => (t1 <= t0 ? (t >= t0 ? 1 : 0) : clamp((t - t0) / (t1 - t0)));
  FD.clamp = clamp; FD.lerp = lerp; FD.progress = progress;

  function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  FD.mixColor = function (a, b, p) {
    if (p <= 0) return a; if (p >= 1) return b;
    const A = hex(a), B = hex(b);
    return 'rgb(' + A.map((v, i) => Math.round(lerp(v, B[i], p))).join(',') + ')';
  };

  // ---------- easing ----------------------------------------------------
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (u) => ((ax * u + bx) * u + cx) * u;
    const sy = (u) => ((ay * u + by) * u + cy) * u;
    const dx = (u) => (3 * ax * u + 2 * bx) * u + cx;
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let u = x;
      for (let i = 0; i < 8; i++) {
        const e = sx(u) - x, d = dx(u);
        if (Math.abs(e) < 1e-7 || Math.abs(d) < 1e-7) break;
        u -= e / d;
      }
      if (!(u >= 0 && u <= 1) || Math.abs(sx(u) - x) > 1e-5) {
        let lo = 0, hi = 1; u = x;
        for (let i = 0; i < 40; i++) { if (sx(u) < x) lo = u; else hi = u; u = (lo + hi) / 2; }
      }
      return sy(u);
    };
  }
  const backOut = (s = 1.70158) => (p) => (p >= 1 ? 1 : 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2));
  FD.ease = {
    linear: (p) => p,
    inCubic: (p) => p * p * p,
    outCubic: (p) => 1 - Math.pow(1 - p, 3),
    inOutCubic: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    inOutSine: (p) => -(Math.cos(Math.PI * p) - 1) / 2,
    inExpo: (p) => (p <= 0 ? 0 : Math.pow(2, 10 * p - 10)),
    outExpo: (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
    inOutExpo: (p) => (p <= 0 ? 0 : p >= 1 ? 1 : p < 0.5 ? Math.pow(2, 20 * p - 10) / 2 : (2 - Math.pow(2, -20 * p + 10)) / 2),
    backOut,                      // factory: FD.ease.backOut(1.2)
    outBack: backOut(1.70158),    // ~10% overshoot
    spring: (p) => (p >= 1 ? 1 : 1 - Math.exp(-6 * p) * Math.cos(2.5 * Math.PI * p)),  // spring-like out, ~9% overshoot
    bezier,
    // Family curves (creative lead)
    enter: bezier(0.34, 1.56, 0.64, 1),   // entrances (back-out)
    move: bezier(0.65, 0, 0.35, 1),       // moves (ease-in-out)
    exit: bezier(0.55, 0, 1, 0.45),       // exits (ease-in)
  };
  const E = FD.ease;
  const easeOf = (e) => (typeof e === 'function' ? e : E[e] || E.linear);

  // ---------- frame loop + per-element transform composer ---------------
  // Updaters run in registration order every frame. Helpers never write
  // transforms directly; they add to an accumulator (FD.T(el)) that is reset
  // before each frame and flushed after, so several helpers can move the
  // same element (e.g. a pop + an exit + an end-card move).
  const updaters = [];
  const tracked = new Set();
  FD.onFrame = (fn) => { updaters.push(fn); return fn; };
  FD.at = function (t0, t1, fn, ease) {
    const e = easeOf(ease);
    return FD.onFrame((t) => fn(e(progress(t, t0, t1)), t));
  };
  function resetAcc(a) { a.x = 0; a.y = 0; a.scale = 1; a.sx = 1; a.sy = 1; a.rot = 0; a.opacity = 1; a.blurX = 0; a.blurY = 0; a.blur = 0; a.hidden = false; }
  function acc(el) {
    if (!el.__fd) { el.__fd = {}; resetAcc(el.__fd); tracked.add(el); }
    return el.__fd;
  }
  FD.T = acc;

  // Motion blur via a per-element SVG filter (directional Gaussian).
  let defs = null, blurN = 0;
  function blurFilter(el, bx, by) {
    const ns = 'http://www.w3.org/2000/svg';
    if (!defs) {
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
      svg.style.position = 'absolute';
      defs = document.createElementNS(ns, 'defs');
      svg.appendChild(defs); document.body.appendChild(svg);
    }
    if (!el.__fdBlur) {
      const f = document.createElementNS(ns, 'filter');
      const id = 'fdblur' + ++blurN;
      f.setAttribute('id', id);
      f.setAttribute('x', '-25%'); f.setAttribute('y', '-25%');
      f.setAttribute('width', '150%'); f.setAttribute('height', '150%');
      f.setAttribute('color-interpolation-filters', 'sRGB');
      const g = document.createElementNS(ns, 'feGaussianBlur');
      f.appendChild(g); defs.appendChild(f);
      el.__fdBlur = { id, g };
    }
    el.__fdBlur.g.setAttribute('stdDeviation', bx.toFixed(2) + ' ' + by.toFixed(2));
    return 'url(#' + el.__fdBlur.id + ')';
  }
  function flush(el) {
    const a = el.__fd;
    const tf = [];
    if (a.x || a.y) tf.push('translate(' + a.x.toFixed(2) + 'px,' + a.y.toFixed(2) + 'px)');
    if (a.rot) tf.push('rotate(' + a.rot.toFixed(3) + 'deg)');
    const sx = a.scale * a.sx, sy = a.scale * a.sy;
    if (Math.abs(sx - 1) > 1e-5 || Math.abs(sy - 1) > 1e-5) tf.push('scale(' + sx.toFixed(4) + ',' + sy.toFixed(4) + ')');
    el.style.transform = tf.join(' ');
    const op = clamp(a.opacity);
    el.style.opacity = op >= 0.999 ? '' : op.toFixed(3);
    el.style.visibility = a.hidden || op <= 0.001 ? 'hidden' : '';
    const bx = Math.max(a.blurX, a.blur), by = Math.max(a.blurY, a.blur);
    el.style.filter = bx > 0.3 || by > 0.3 ? blurFilter(el, bx, by) : '';
  }
  // Pixels moved per frame by a position function -> motion blur amount.
  FD.velBlur = function (fn, t, k = 0.45, max = 45) {
    const h = 0.5 / FD.FPS;
    return Math.min(max, Math.abs(fn(t + h) - fn(t - h)) * k);
  };

  // ---------- reusable motion curves -------------------------------------
  // Pop: scale from -> peak -> 1 over `frames`, opacity 0 -> 1 over `fade` frames.
  // Defaults are the family caption pop (0.90 -> 1.06 -> 1.00, 8 frames, 3-frame fade).
  FD.popCurve = function (t, t0, o = {}) {
    const frames = o.frames || 8, from = o.from != null ? o.from : 0.9, peak = o.peak != null ? o.peak : 1.06;
    const fade = o.fade != null ? o.fade : 3, split = o.split || 0.5;
    if (t < t0 - 1e-6) return { scale: from, opacity: 0, before: true };
    const p = progress(t, t0, t0 + FD.f(frames));
    const scale = p < split ? lerp(from, peak, E.outCubic(p / split)) : lerp(peak, 1, E.inOutCubic((p - split) / (1 - split)));
    // the first frame of a pop is already partly visible (it lands on its frame)
    const opacity = fade <= 0 ? 1 : progress(t + FD.f(1), t0, t0 + FD.f(fade));
    return { scale, opacity };
  };
  // Exit: fade with a rise over `frames`, finishing at t1.
  FD.exitCurve = function (t, t1, o = {}) {
    const frames = o.frames || 4, rise = o.rise != null ? o.rise : 12;
    const p = progress(t, t1 - FD.f(frames), t1);
    return { opacity: 1 - p, dy: -rise * E.inCubic(p), done: t >= t1 - 1e-6 };
  };

  // Element helpers (all composable)
  FD.show = (el, t0 = -Infinity, t1 = Infinity) => FD.onFrame((t) => { if (t < t0 - 1e-6 || t >= t1 - 1e-6) acc(el).hidden = true; });
  FD.popIn = (el, t0, o = {}) => FD.onFrame((t) => { const c = FD.popCurve(t, t0, o); const a = acc(el); a.scale *= c.scale; a.opacity *= c.opacity; });
  FD.slam = (el, t0, o = {}) => FD.popIn(el, t0, Object.assign({ from: 1.18, peak: 0.97, frames: 9, fade: 2 }, o));
  FD.riseIn = (el, t0, o = {}) => FD.onFrame((t) => {
    const frames = o.frames || 8, dy = o.dy != null ? o.dy : 40;
    const p = progress(t + FD.f(1), t0, t0 + FD.f(frames));
    const a = acc(el); a.y += dy * (1 - E.outCubic(p)); a.opacity *= t < t0 - 1e-6 ? 0 : p;
  });
  FD.fadeOut = (el, t1, o = {}) => FD.onFrame((t) => { const c = FD.exitCurve(t, t1, o); const a = acc(el); a.opacity *= c.opacity; a.y += c.dy; if (c.done) a.hidden = true; });
  FD.dim = (el, t0, to = 0.45, frames = 4) => FD.onFrame((t) => { acc(el).opacity *= lerp(1, to, E.outCubic(progress(t, t0, t0 + FD.f(frames)))); });
  FD.punch = (el, t0, o = {}) => FD.onFrame((t) => {
    const frames = o.frames || 4, peak = o.peak || 1.06;
    const p = progress(t, t0, t0 + FD.f(frames));
    acc(el).scale *= 1 + (peak - 1) * Math.sin(Math.PI * p);
  });
  FD.shake = (el, t0, o = {}) => FD.onFrame((t) => {
    const frames = o.frames || 2, px = o.px || 8;
    if (t >= t0 - 1e-6 && t < t0 + FD.f(frames) - 1e-6) { const i = Math.round((t - t0) * FD.FPS); acc(el).x += i % 2 === 0 ? px : -px; }
  });
  FD.move = (el, t0, t1, from, to, ease = 'move') => FD.at(t0, t1, (p) => {
    const a = acc(el);
    a.x += lerp(from.x || 0, to.x || 0, p); a.y += lerp(from.y || 0, to.y || 0, p);
    a.scale *= lerp(from.scale != null ? from.scale : 1, to.scale != null ? to.scale : 1, p);
    a.rot += lerp(from.rot || 0, to.rot || 0, p);
  }, ease);
  // Stroke draw-on for an SVG path/line/rect/polyline (uses pathLength=1).
  FD.draw = function (shape, t0, t1, ease = 'inOutCubic') {
    const e = easeOf(ease);
    shape.setAttribute('pathLength', '1');
    shape.style.strokeDasharray = '1 1';
    return FD.onFrame((t) => {
      const p = e(progress(t, t0, t1));
      shape.style.strokeDashoffset = (1 - p).toFixed(4);
      shape.style.visibility = p <= 0 ? 'hidden' : '';
    });
  };

  // ---------- stage, ground, layers, transitions --------------------------
  let stage = null;
  function getStage() {
    if (stage) return stage;
    stage = document.querySelector('.fd-stage');
    if (!stage) { stage = document.createElement('div'); stage.className = 'fd-stage'; document.body.prepend(stage); }
    let g = stage.querySelector(':scope > .fd-ground');
    if (!g) { g = document.createElement('div'); g.className = 'fd-ground'; stage.prepend(g); }
    FD.groundEl = g;
    return stage;
  }
  FD.stage = () => getStage();

  // Ground colour events. mode: 'cut' | 'up' (bottom-to-top wipe) | 'left'
  // (new ground slides in from the right edge, used by whips) | 'down' | 'fade'.
  FD.ground = (color) => FD.groundTo(-Infinity, color, { mode: 'cut' });
  FD.groundTo = function (t0, color, o = {}) {
    getStage();
    const mode = o.mode || 'cut', dur = o.dur != null ? o.dur : mode === 'cut' ? 0 : mode === 'left' ? FD.f(6) : 0.35;
    const e = easeOf(o.ease || (mode === 'up' || mode === 'down' ? 'linear' : 'move'));
    const d = document.createElement('div');
    d.style.background = color;
    FD.groundEl.appendChild(d);
    FD.onFrame((t) => {
      if (t < t0 - 1e-6) { d.style.visibility = 'hidden'; return; }
      d.style.visibility = '';
      const p = e(progress(t, t0, t0 + dur));
      d.style.opacity = mode === 'fade' ? p.toFixed(3) : '';
      d.style.clipPath =
        mode === 'up' ? 'inset(' + ((1 - p) * 100).toFixed(3) + '% 0 0 0)' :
        mode === 'down' ? 'inset(0 0 ' + ((1 - p) * 100).toFixed(3) + '% 0)' :
        mode === 'left' ? 'inset(0 0 0 ' + ((1 - p) * 100).toFixed(3) + '%)' : '';
    });
    return d;
  };
  // Bottom-to-top linear wipe of the ground into `color`.
  FD.wipe = (t0, color, o = {}) => FD.groundTo(t0, color, Object.assign({ mode: 'up', dur: 0.35 }, o));

  // A scene group (absolutely positioned full-frame div) that transitions act on.
  // `markup` is your own trusted HTML string (or omit it and append nodes).
  FD.layer = function (markup, o = {}) {
    const d = document.createElement('div');
    d.className = 'fd-layer' + (o.className ? ' ' + o.className : '');
    if (o.z != null) d.style.zIndex = o.z;
    if (markup) d.appendChild(document.createRange().createContextualFragment(markup));
    (o.parent || getStage()).appendChild(d);
    return d;
  };
  // Hard cut: hide `outEl` and show `inEl` from t0.
  FD.cut = function (t0, outEl, inEl) {
    if (outEl) FD.show(outEl, -Infinity, t0);
    if (inEl) FD.show(inEl, t0, Infinity);
  };
  // 6-frame horizontal whip with motion blur. outEl leaves left, inEl (optional)
  // arrives from the right. o.ground: new ground colour that slides in with it.
  FD.whip = function (t0, outEl, inEl, o = {}) {
    const frames = o.frames || 6, dur = FD.f(frames), dir = o.dir === 'right' ? 1 : -1;
    const e = E.move;
    const xo = (t) => dir * FD.W * e(progress(t, t0, t0 + dur));
    const xi = (t) => -dir * FD.W * (1 - e(progress(t, t0, t0 + dur)));
    if (o.ground) FD.groundTo(t0, o.ground, { mode: dir < 0 ? 'left' : 'cut', dur, ease: 'move' });
    if (outEl) FD.onFrame((t) => {
      const a = acc(outEl);
      if (t >= t0 + dur - 1e-6) { a.hidden = true; return; }
      if (t < t0) return;
      a.x += xo(t); a.blurX = Math.max(a.blurX, FD.velBlur(xo, t));
    });
    if (inEl) FD.onFrame((t) => {
      const a = acc(inEl);
      if (t < t0) { a.hidden = true; return; }
      if (t >= t0 + dur) return;
      a.x += xi(t); a.blurX = Math.max(a.blurX, FD.velBlur(xi, t));
    });
  };
  // Crossfade (max 6 frames, family rule).
  FD.crossfade = function (t0, outEl, inEl, frames = 6) {
    if (frames > 6) { warn('crossfade longer than 6 frames clamped to 6'); frames = 6; }
    const t1 = t0 + FD.f(frames);
    if (outEl) FD.onFrame((t) => { const a = acc(outEl); a.opacity *= 1 - progress(t, t0, t1); if (t >= t1) a.hidden = true; });
    if (inEl) FD.onFrame((t) => { const a = acc(inEl); a.opacity *= progress(t, t0, t1); if (t < t0) a.hidden = true; });
  };
  // White flash (2 frames) at stage level, or inside `parent`.
  FD.flash = function (t0, frames = 2, parent) {
    const d = document.createElement('div'); d.className = 'fd-flash';
    (parent || getStage()).appendChild(d);
    FD.onFrame((t) => { d.style.opacity = t >= t0 - 1e-6 && t < t0 + FD.f(frames) - 1e-6 ? '1' : '0'; });
    return d;
  };

  // ---------- text: captions and type lines --------------------------------
  // Spec: a string with *accent* markup ("106 *places*"), or an array of parts:
  //   'word' | { text, accent, at, accentAt, color, size } | { pill:'Meat', size, light, at }
  //   | { odometer:{ from:'106', to:'41', at, dur }, accent:true } | { node: Element }
  // A part's text may contain several words; each word pops separately.
  function parseSpec(spec) {
    const parts = [];
    if (typeof spec === 'string') {
      for (const m of spec.matchAll(/\*([^*]+)\*|([^*]+)/g)) {
        const accent = !!m[1];
        (m[1] || m[2]).split(/\s+/).filter(Boolean).forEach((w) => parts.push({ text: w, accent }));
      }
    } else {
      spec.forEach((p) => {
        if (typeof p === 'string') { parseSpec(p).forEach((q) => parts.push(q)); return; }
        if (p.text != null && !p.pill) {
          String(p.text).split(/\s+/).filter(Boolean).forEach((w) => parts.push(Object.assign({}, p, { text: w })));
        } else parts.push(Object.assign({}, p));
      });
    }
    return parts;
  }

  const TONES = {
    light: { color: FD.C.ink, accent: FD.C.green },
    dark: { color: FD.C.offwhite, accent: FD.C.sprout },
  };

  // FD.text(spec, t0, t1, opts) -> line object. Generic: captions and type beats.
  // opts: y (vertical centre of the line, default 320), size, minSize, maxWidth (890),
  //       tone 'light'|'dark', stagger (s between words, default 0.08), weight,
  //       exitFrames (4), rise (12), pop {frames, from, peak}, parent, z, color, accent.
  FD.text = function (spec, t0, t1 = Infinity, o = {}) {
    const tone = TONES[o.tone || 'light'];
    const size0 = o.size || 96, minSize = o.minSize || Math.min(size0, 84), maxWidth = o.maxWidth || 890;
    const y = o.y != null ? o.y : FD.BAND.y;
    const stagger = o.stagger != null ? o.stagger : 0.08;
    const line = document.createElement('div');
    line.className = 'fd-line fd-type';
    line.style.top = y + 'px';
    line.style.zIndex = o.z != null ? o.z : 40;
    if (o.font) line.style.fontFamily = o.font;
    if (o.weight) line.style.fontWeight = o.weight;
    const inner = document.createElement('span');
    inner.className = 'fd-inner';
    inner.style.fontSize = size0 + 'px';
    line.appendChild(inner);
    (o.parent || getStage()).appendChild(line);

    const parts = parseSpec(spec);
    const words = [];
    parts.forEach((p, i) => {
      if (i > 0) inner.appendChild(document.createTextNode(' '));
      const el = document.createElement('span');
      el.className = 'fd-word';
      if (p.pill) {
        const pill = document.createElement('span');
        pill.className = 'fd-pill' + (p.light ? ' light' : '');
        const ps = p.size || 72;
        Object.assign(pill.style, {
          fontSize: ps + 'px', height: Math.round(ps * 1.5) + 'px', padding: '0 ' + Math.round(ps * 0.48) + 'px',
          borderRadius: (p.radius || 44) + 'px', verticalAlign: 'middle', position: 'relative', top: '-0.06em',
        });
        pill.textContent = p.pill;
        el.appendChild(pill);
      } else if (p.odometer) {
        el.appendChild(FD.odometer(p.odometer).el);
      } else if (p.node) {
        el.appendChild(p.node);
      } else {
        el.textContent = p.text;
      }
      if (p.size && !p.pill) el.style.fontSize = (p.size / size0) + 'em';
      inner.appendChild(el);
      words.push({ el, p, start: p.at != null ? p.at : t0 + i * stagger });
    });

    // Fit to maxWidth (one line), never below minSize.
    let size = size0;
    const w0 = inner.scrollWidth;
    if (w0 > maxWidth) {
      size = Math.max(minSize, Math.floor(size0 * maxWidth / w0));
      inner.style.fontSize = size + 'px';
      if (inner.scrollWidth > maxWidth + 1) warn('caption "' + inner.textContent + '" is ' + inner.scrollWidth + ' px wide at ' + size + ' px (max ' + maxWidth + ')');
    }

    // words that land on the same frame pop as one group (scaled about the line
    // centre), so neighbouring words never grow into each other
    const together = words.length > 0 && words.every((w) => Math.abs(w.start - words[0].start) < 1e-6);
    const moves = [];
    const dims = [];
    const obj = {
      el: line, inner, words, t0, t1, y, size,
      // Move the whole line (end card): to {y, size} over dur from tm.
      moveTo(tm, dur, to, ease = 'move') { moves.push({ tm, dur, to, e: easeOf(ease) }); return obj; },
      // Dim the line (checklists, two-line beats) to `level` from td.
      dim(td, level = 0.45, frames = 4) { dims.push({ td, level, frames }); return obj; },
    };

    FD.onFrame((t) => {
      const la = acc(line), ia = acc(inner);
      if (t < t0 - 1e-6 || t >= t1 - 1e-6) { la.hidden = true; return; }
      moves.forEach((m) => {
        const p = m.e(progress(t, m.tm, m.tm + m.dur));
        if (m.to.y != null) la.y += (m.to.y - y) * p;
        if (m.to.size != null) la.scale *= lerp(1, m.to.size / size, p);
      });
      dims.forEach((d) => { ia.opacity *= lerp(1, d.level, E.outCubic(progress(t, d.td, d.td + FD.f(d.frames)))); });
      if (isFinite(t1)) { const x = FD.exitCurve(t, t1, { frames: o.exitFrames || 4, rise: o.rise != null ? o.rise : 12 }); ia.opacity *= x.opacity; ia.y += x.dy; }
      if (together) { const c = FD.popCurve(t, words[0].start, o.pop || {}); ia.scale *= c.scale; ia.opacity *= c.opacity; }
      words.forEach((w) => {
        if (!together) { const c = FD.popCurve(t, w.start, o.pop || {}); const a = acc(w.el); a.scale *= c.scale; a.opacity *= c.opacity; }
        const p = w.p;
        if (!p.pill) {
          const base = p.color || o.color || tone.color;
          const acol = o.accent || tone.accent;
          let col = base;
          if (p.accent) col = p.accentAt != null ? FD.mixColor(base, acol, progress(t, p.accentAt, p.accentAt + FD.f(3))) : acol;
          w.el.style.color = col;
        }
      });
    });
    return obj;
  };
  // Caption in the band above the phone (96 px default, 84 px minimum).
  FD.caption = (spec, t0, t1, o = {}) => FD.text(spec, t0, t1, Object.assign({ size: 96, minSize: 84, y: FD.BAND.y }, o));
  // Full-bleed type beat line (112-150 px), centred on x 505 at vertical centre y.
  FD.typeLine = (spec, t0, o = {}) => FD.text(spec, t0, o.t1 != null ? o.t1 : Infinity, Object.assign({ size: 112, minSize: 72, stagger: 0, tone: 'dark' }, o));

  // Odometer: digits roll vertically from `from` to `to` (strings or numbers).
  // Uses tabular figures; a digit column that disappears collapses its width.
  FD.odometer = function (o) {
    const from = String(o.from), to = String(o.to);
    const n = Math.max(from.length, to.length);
    const F = from.padStart(n, ' '), T = to.padStart(n, ' ');
    const at = o.at || 0, dur = o.dur || 0.6, e = easeOf(o.ease || 'move'), lag = o.lag != null ? o.lag : FD.f(2);
    const el = document.createElement('span');
    el.className = 'fd-odo';
    const symbols = [' ', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const cols = [];
    for (let i = 0; i < n; i++) {
      const col = document.createElement('span'); col.className = 'fd-odo-col';
      const strip = document.createElement('span'); strip.className = 'fd-odo-strip';
      symbols.forEach((s) => { const sp = document.createElement('span'); sp.textContent = s === ' ' ? ' ' : s; strip.appendChild(sp); });
      col.appendChild(strip); el.appendChild(col);
      cols.push({ col, strip, a: symbols.indexOf(F[i]), b: symbols.indexOf(T[i]), delay: (n - 1 - i) * lag });
    }
    let digitW = null;
    FD.onFrame((t) => {
      if (digitW == null) {
        const probe = document.createElement('span'); probe.textContent = '0';
        el.appendChild(probe);
        const fs = parseFloat(getComputedStyle(probe).fontSize) || 100;
        digitW = probe.offsetWidth / fs; el.removeChild(probe);
      }
      cols.forEach((c) => {
        const q = (tt) => e(progress(tt, at + c.delay, at + c.delay + dur));
        const pos = (tt) => lerp(c.a, c.b, q(tt));
        c.strip.style.transform = 'translateY(' + (-pos(t) * 1.1).toFixed(4) + 'em)';
        const blur = FD.velBlur(pos, t, 5, 6);   // symbols per frame -> px of vertical blur
        c.strip.style.filter = blur > 0.4 ? blurFilter(c.strip, 0, blur) : '';
        const wa = c.a === 0 ? 0 : digitW, wb = c.b === 0 ? 0 : digitW;
        c.col.style.width = lerp(wa, wb, q(t)).toFixed(4) + 'em';
      });
    });
    return { el };
  };

  // Place an element so its text baseline sits at y (line-height 1).
  FD.baselineTop = function (el, y) {
    el.style.top = '0px';
    const probe = document.createElement('span');
    Object.assign(probe.style, { display: 'inline-block', width: '0', height: '0', verticalAlign: 'baseline' });
    el.appendChild(probe);
    const off = probe.offsetTop;
    el.removeChild(probe);
    el.style.top = (y - off) + 'px';
    return y - off;
  };

  // ---------- phone ----------------------------------------------------
  // Geometry (identical in all videos): outline x 70-790, top 420, 18 px bezel,
  // screen window x 88-772 from y 438. "Frame" coordinates below are artboard
  // pixels for the phone at rest (no tilt, scale 1, screen unscrolled).
  const WIN = { x: 88, y: 438, w: 684 };
  FD.WIN = WIN;
  FD.VIEW = {
    list: { scale: 0.518, srcX: 0, srcY: 0 },
    map: { scale: 0.85, srcX: 360, srcY: 180, map: true },
  };
  // Measured UI boxes on 01/02 at the list view, in frame coords [x, y, w, h, radius].
  FD.UI = {
    filtersTap: [658, 832],
    filtersBox: [570, 808, 176, 48, 24],
    searchBox: [119, 702, 621, 66, 33],
    placesLine: [108, 872, 226, 30, 10],   // '41 places · nearest first' (02) / '106 places' (01)
    noteBox: [113, 920, 633, 93, 22],      // grey 'From public sources ...' note (02)
  };

  FD.phone = function (o = {}) {
    getStage();
    const el = document.createElement('div');
    el.className = 'fd-phone' + (o.dark ? ' on-dark' : '');
    if (o.z != null) el.style.zIndex = o.z;
    const win = document.createElement('div'); win.className = 'fd-window';
    const overlay = document.createElement('div'); overlay.className = 'fd-overlay';
    win.appendChild(overlay);
    el.appendChild(win);
    (o.parent || getStage()).appendChild(el);
    const origin = o.origin || [430, 420];       // frame point; default top centre of the phone
    el.style.transformOrigin = (origin[0] - 70) + 'px ' + (origin[1] - 420) + 'px';

    const screens = {}; const order = [];
    const events = [];       // {t, key, type:'cut'|'slide', dur, dir}
    const motions = [];      // fn(t, state)
    let exitT = Infinity;
    const P = { el, win, overlay, screens };

    // Add a screen layer. file: name in app-store-screenshots/ (or a URL);
    // view: 'list' | 'map' | {scale, srcX, srcY}. The first screen added shows first.
    P.screen = function (key, file, view = 'list') {
      if (/0[34]-place/.test(file)) throw new Error('FD: single place pages (03/04) are not allowed (rule 4)');
      const v = Object.assign({}, typeof view === 'string' ? FD.VIEW[view] : view);
      const s = document.createElement('div'); s.className = 'fd-screen';
      const src = document.createElement('div'); src.className = 'fd-src';
      const img = document.createElement('img');
      img.src = /^(file|https?):|^\.|^\//.test(file) ? file : FD.SCREENS + file;
      src.appendChild(img); s.appendChild(src); win.insertBefore(s, overlay);
      const L = { key, el: s, src, img, url: img.src, view: v, pans: [] };
      screens[key] = L; order.push(key);
      if (/0[67]-map/.test(file) && !v.map) warn('screen ' + file + ' should use the map view (source column 360 pinned left)');
      return P;
    };
    function srcPos(L, t) {
      let x = L.view.srcX, y = L.view.srcY;
      L.pans.forEach((p) => {
        if (t >= p.t0) { const q = p.e(progress(t, p.t0, p.t1)); if (p.y) y = lerp(p.y[0], p.y[1], q); if (p.x) x = lerp(p.x[0], p.x[1], q); }
      });
      return { x, y };
    }
    // Scroll/pan inside the window, in SOURCE pixels at the window's top-left.
    // phone.pan('meat', 5.8, 8.2, { y: [0, 380] })  scrolls the list up 380 rows (197 px).
    P.pan = function (key, t0, t1, o2, ease = 'move') { screens[key].pans.push({ t0, t1, x: o2.x, y: o2.y, e: easeOf(ease) }); return P; };
    // Hard cut to another screen (o2.flash: 2 -> 2-frame white flash).
    P.cut = function (t, key, o2 = {}) { events.push({ t, key, type: 'cut' }); if (o2.flash) P.flash(t, o2.flash === true ? 2 : o2.flash); return P; };
    // Slide inside the window (0.35 s, ease-in-out, motion blur). dir 'left': new screen comes from the right.
    P.slide = function (t, key, o2 = {}) { events.push({ t, key, type: 'slide', dur: o2.dur || 0.35, dir: o2.dir || 'left' }); return P; };
    P.flash = function (t, frames = 2) { FD.flash(t, frames, win); return P; };

    function screenState(t) {
      let active = order[0], from = null, p = 1, ev = null;
      const evs = events.slice().sort((a, b) => a.t - b.t);
      for (const e of evs) {
        if (t + 1e-6 < e.t) break;
        if (e.type === 'slide' && t < e.t + e.dur) { from = active; ev = e; p = progress(t, e.t, e.t + e.dur); }
        else { from = null; ev = null; }
        active = e.key;
      }
      return { active, from, p, ev };
    }
    function toWin(L, t, sx, sy) {
      const s = srcPos(L, t);
      return [(sx - s.x) * L.view.scale, (sy - s.y) * L.view.scale];
    }
    function frameToSrc(L, fx, fy) {
      return [(fx - WIN.x) / L.view.scale + L.view.srcX, (fy - WIN.y) / L.view.scale + L.view.srcY];
    }
    P.frameToSrc = (key, fx, fy) => frameToSrc(screens[key], fx, fy);

    // --- motion programme -------------------------------------------------
    // Enter: rise from below (default) or slide in from the right, then drift.
    P.enter = function (t0, o2 = {}) {
      const dur = o2.dur || 0.4, from = o2.from || 'bottom';
      const tilt = o2.tilt || [4, 1.5];
      // ~4% overshoot: the full .34,1.56 curve would throw 1500 px of travel 150 px too far.
      const e = easeOf(o2.ease || E.backOut(0.9));
      const dist = from === 'right' ? 1100 : 1560;
      const off = (tt) => (1 - e(progress(tt, t0, t0 + dur))) * dist;
      motions.push((t, st) => {
        if (t < t0 - 1e-6) { st.hidden = true; return; }
        if (from === 'right') { st.x += off(t); st.blurX = Math.max(st.blurX, FD.velBlur(off, t, 0.3)); }
        else { st.y += off(t); st.blurY = Math.max(st.blurY, FD.velBlur(off, t, 0.25)); }
        st.rot += lerp(tilt[0], tilt[1], E.outCubic(progress(t, t0, t0 + dur)));
      });
      if (o2.drift !== false) motions.push((t, st) => {
        const ts = t0 + dur;
        if (t > ts && t < exitT) st.y += 1.5 * Math.sin(2 * Math.PI * 0.7 * (t - ts));
      });
      return P;
    };
    // Phone already in place (no entrance): rest tilt plus drift.
    P.rest = function (tilt = 1.5, drift = true) {
      motions.push((t, st) => { st.rot += tilt; if (drift && t < exitT) st.y += 1.5 * Math.sin(2 * Math.PI * 0.7 * t); });
      return P;
    };
    // Exit: drop out of the bottom (0.35 s, ease-in, vertical motion blur), or 'left'.
    P.exit = function (t0, o2 = {}) {
      const dur = o2.dur || 0.35, to = o2.to || 'bottom';
      exitT = t0;
      const off = (tt) => E.exit(progress(tt, t0, t0 + dur)) * (to === 'left' ? -1250 : 2100);
      motions.push((t, st) => {
        if (t >= t0 + dur - 1e-6) { st.hidden = true; return; }
        if (t < t0) return;
        if (to === 'left') { st.x += off(t); st.blurX = Math.max(st.blurX, FD.velBlur(off, t, 0.3)); }
        else { st.y += off(t); st.blurY = Math.max(st.blurY, FD.velBlur(off, t, 0.3)); }
      });
      return P;
    };
    // Scale the phone (push-in / shrink) about its origin (option `origin` of FD.phone).
    P.zoom = function (t0, t1, s0, s1, ease = 'move') {
      const e = easeOf(ease);
      motions.push((t, st) => { st.scale *= lerp(s0, s1, e(progress(t, t0, t1))); });
      return P;
    };
    // Bump: scale x(1+amount) and back over `frames`. 1.03 -> 1.05 -> 1.03 is amount 0.0194.
    P.bump = function (t0, amount = 0.0194, frames = 6) {
      motions.push((t, st) => { st.scale *= 1 + amount * Math.sin(Math.PI * progress(t, t0, t0 + FD.f(frames))); });
      return P;
    };
    // Kick: rotate +deg and back (with in-screen whips).
    P.kick = function (t0, deg = 1, frames = 8) {
      motions.push((t, st) => { st.rot += deg * Math.sin(Math.PI * progress(t, t0, t0 + FD.f(frames))); });
      return P;
    };
    P.motion = (fn) => { motions.push(fn); return P; };

    // --- overlays --------------------------------------------------------
    // Tap indicator, pressing at t0. at: [fx, fy] frame point or src: [sx, sy].
    // dim: [fx, fy, w, h, r] box (frame coords) dimmed 10% black for 120 ms.
    // screen: key of the screen whose scroll it follows (default: active screen).
    P.tap = function (t0, o2 = {}) {
      const tap = document.createElement('div'); tap.className = 'fd-tap'; tap.dataset.safe = 'tap';
      const ring = document.createElement('div'); ring.className = 'fd-tap-ring';
      const dot = document.createElement('div'); dot.className = 'fd-tap-dot';
      tap.appendChild(ring); tap.appendChild(dot);
      let dimEl = null;
      if (o2.dim) { dimEl = document.createElement('div'); dimEl.className = 'fd-dim'; overlay.appendChild(dimEl); }
      overlay.appendChild(tap);
      const lead = o2.lead != null ? o2.lead : FD.f(4);  // dot appears just before the press
      FD.onFrame((t) => {
        const L = screens[o2.screen || screenState(t).active];
        const s = o2.src || frameToSrc(L, o2.at[0], o2.at[1]);
        const [wx, wy] = toWin(L, t, s[0], s[1]);
        tap.style.left = wx.toFixed(2) + 'px'; tap.style.top = wy.toFixed(2) + 'px';
        const vis = t >= t0 - lead - 1e-6 && t < t0 + 0.45;
        tap.style.visibility = vis ? '' : 'hidden';
        tap.style.opacity = vis ? '1' : '0';
        if (vis) {
          const pin = progress(t + FD.f(1), t0 - lead, t0);
          const pout = progress(t, t0 + 0.30, t0 + 0.45);
          const press = progress(t, t0, t0 + FD.f(3)), rel = progress(t, t0 + FD.f(4), t0 + FD.f(9));
          const sc = t < t0 - 1e-6 ? lerp(1.15, 1, E.outCubic(pin)) : lerp(1, 0.85, E.outCubic(press)) + 0.15 * E.inOutCubic(rel);
          dot.style.transform = 'scale(' + sc.toFixed(4) + ')';
          dot.style.opacity = (pin * (1 - pout)).toFixed(3);
          const rp = progress(t, t0, t0 + 0.35);
          const d = lerp(64, 120, E.outCubic(rp));
          ring.style.width = ring.style.height = d.toFixed(2) + 'px';
          ring.style.margin = (-d / 2).toFixed(2) + 'px 0 0 ' + (-d / 2).toFixed(2) + 'px';
          ring.style.opacity = t < t0 - 1e-6 ? '0' : (0.9 * (1 - rp)).toFixed(3);
        }
        if (dimEl) {
          const [bx, by, bw, bh, br] = o2.dim;
          const s0 = frameToSrc(L, bx, by), s1 = frameToSrc(L, bx + bw, by + bh);
          const a = toWin(L, t, s0[0], s0[1]), b = toWin(L, t, s1[0], s1[1]);
          Object.assign(dimEl.style, { left: a[0] + 'px', top: a[1] + 'px', width: b[0] - a[0] + 'px', height: b[1] - a[1] + 'px', borderRadius: (br != null ? br : 24) + 'px' });
          dimEl.style.opacity = t >= t0 - 1e-6 && t < t0 + 0.12 ? '1' : '0';
        }
      });
      return P;
    };
    // Green 4 px rounded outline tracing a real element. Lives in the screen's
    // source layer so it scrolls with it. box: [fx, fy, w, h, r] frame coords
    // (unscrolled) or src: [sx, sy, w, h, r] source pixels.
    // mode: 'pulse' (one pulse, holds `hold` s), 'draw' (stroke draws on in `dur`), 'show'.
    // t1: when it disappears (default: pulse -> t0+hold; others -> never).
    P.outline = function (key, t0, o2 = {}) {
      const L = screens[key]; const sc = L.view.scale;
      let sx, sy, sw, sh, sr;
      if (o2.src) { [sx, sy, sw, sh, sr] = o2.src; sr = sr != null ? sr : 24; }
      else {
        const [fx, fy, fw, fh, fr] = o2.box;
        [sx, sy] = frameToSrc(L, fx, fy); sw = fw / sc; sh = fh / sc; sr = (fr != null ? fr : 14) / sc;
      }
      const pad = (o2.pad != null ? o2.pad : 6) / sc, sw2 = (o2.width || 4) / sc;
      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('class', 'fd-outline');
      const W = sw + 2 * pad, H = sh + 2 * pad;
      svg.setAttribute('width', W + sw2); svg.setAttribute('height', H + sw2);
      svg.style.left = sx - pad - sw2 / 2 + 'px'; svg.style.top = sy - pad - sw2 / 2 + 'px';
      svg.style.transformOrigin = '50% 50%';
      const r = document.createElementNS(ns, 'rect');
      r.setAttribute('x', sw2 / 2); r.setAttribute('y', sw2 / 2); r.setAttribute('width', W); r.setAttribute('height', H);
      r.setAttribute('rx', sr + pad); r.setAttribute('fill', 'none');
      r.setAttribute('stroke', o2.color || FD.C.green); r.setAttribute('stroke-width', sw2);
      r.setAttribute('pathLength', '1');
      svg.appendChild(r); L.src.appendChild(svg);
      const mode = o2.mode || 'pulse', dur = o2.dur || 0.4, hold = o2.hold != null ? o2.hold : 0.7;
      const t1 = o2.t1 != null ? o2.t1 : mode === 'pulse' ? t0 + hold : Infinity;
      FD.onFrame((t) => {
        const a = acc(svg);
        if (t < t0 - 1e-6 || t >= t1 - 1e-6) { a.hidden = true; return; }
        if (isFinite(t1)) a.opacity *= 1 - progress(t, t1 - FD.f(4), t1);
        if (mode === 'draw') {
          const p = E.inOutCubic(progress(t + FD.f(1), t0, t0 + dur));
          r.style.strokeDasharray = '1 1'; r.style.strokeDashoffset = (1 - p).toFixed(4);
        } else {
          a.opacity *= progress(t + FD.f(1), t0, t0 + FD.f(3));
          if (mode === 'pulse') a.scale *= lerp(1.06, 1, E.outCubic(progress(t, t0, t0 + FD.f(8))));
        }
      });
      return P;
    };
    // Pin pulse: a disc of the real screenshot around a pin scales 1 -> 1.15 -> 1.
    // at: [fx, fy] frame point (unscrolled) or src: [sx, sy]; r: radius in frame px.
    P.pulse = function (key, t0, o2 = {}) {
      const L = screens[key]; const sc = L.view.scale;
      const [sx, sy] = o2.src || frameToSrc(L, o2.at[0], o2.at[1]);
      const r = (o2.r || 30) / sc;
      const d = document.createElement('div'); d.className = 'fd-spot';
      Object.assign(d.style, {
        left: sx - r + 'px', top: sy - r + 'px', width: 2 * r + 'px', height: 2 * r + 'px',
        backgroundImage: 'url("' + L.url + '")', backgroundPosition: -(sx - r) + 'px ' + -(sy - r) + 'px',
      });
      L.src.appendChild(d);
      const frames = o2.frames || 8, peak = o2.peak || 1.15;
      FD.onFrame((t) => {
        const a = acc(d);
        if (t < t0 - 1e-6 || t >= t0 + FD.f(frames) - 1e-6) { a.hidden = true; return; }
        a.scale *= 1 + (peak - 1) * Math.sin(Math.PI * progress(t, t0, t0 + FD.f(frames)));
      });
      return P;
    };

    // --- per-frame render of the phone ------------------------------------
    FD.onFrame((t) => {
      const st = { x: 0, y: 0, scale: 1, rot: 0, blurX: 0, blurY: 0, hidden: false };
      motions.forEach((m) => m(t, st));
      const a = acc(el);
      a.x += st.x; a.y += st.y; a.scale *= st.scale; a.rot += st.rot;
      a.blurX = Math.max(a.blurX, st.blurX); a.blurY = Math.max(a.blurY, st.blurY);
      if (st.hidden) a.hidden = true;
      const ss = screenState(t);
      const slideX = (tt, role) => {
        const s2 = screenState(tt);
        if (!s2.ev) return role === 'out' ? -WIN.w : 0;
        const q = E.move(s2.p), dir = s2.ev.dir === 'right' ? 1 : -1;
        return role === 'out' ? dir * WIN.w * q : -dir * WIN.w * (1 - q);
      };
      order.forEach((k) => {
        const L = screens[k]; const la = acc(L.el);
        const isActive = k === ss.active, isFrom = k === ss.from;
        if (!isActive && !isFrom) { la.hidden = true; return; }
        const pos = srcPos(L, t);
        if (L.view.map && pos.x < 360) warn('map screen "' + k + '" shows source columns < 360 (Apple Maps mark) at t=' + t.toFixed(2));
        L.src.style.transform = 'translate(' + (-pos.x * L.view.scale).toFixed(2) + 'px,' + (-pos.y * L.view.scale).toFixed(2) + 'px) scale(' + L.view.scale + ')';
        if (ss.ev) {
          const role = isFrom ? 'out' : 'in';
          la.x += slideX(t, role);
          la.blurX = Math.max(la.blurX, FD.velBlur((tt) => slideX(tt, role), t, 0.35));
        }
      });
    });
    return P;
  };

  // ---------- end card -------------------------------------------------
  // FD.endCard(t0, { lines: [lineA, lineB] })  lines from FD.typeLine, eased up
  // to y 560 / 680 at 88 px over 0.4 s. Icon pops at t0, wordmark t0+0.2, CTA t0+0.4.
  const meta = { ctaFrom: null, endStart: null, stillFrom: null };
  FD.endCard = function (t0, o = {}) {
    getStage();
    const ys = o.lineYs || [560, 680], lsize = o.lineSize || 88;
    (o.lines || []).forEach((ln, i) => ln.moveTo(t0, 0.4, { y: ys[Math.min(i, ys.length - 1)] + 120 * Math.max(0, i - ys.length + 1), size: lsize }, 'move'));
    if (o.ground) FD.groundTo(t0, o.ground);
    const wrap = document.createElement('div'); wrap.className = 'fd-end';
    const icon = document.createElement('img'); icon.className = 'fd-end-icon'; icon.src = FD.ICON; icon.dataset.safe = 'end';
    const name = document.createElement('div'); name.className = 'fd-end-name'; name.textContent = 'Farm Direct'; name.dataset.safe = 'end';
    const cta = document.createElement('div'); cta.className = 'fd-end-cta'; cta.textContent = FD.CTA_TEXT[FD.cta]; cta.dataset.safe = 'end';
    wrap.append(icon, name, cta); getStage().appendChild(wrap);
    FD.baselineTop(name, o.nameBaseline || 1360);
    FD.baselineTop(cta, o.ctaBaseline || 1450);
    const tn = t0 + 0.2, tc = t0 + 0.4;
    FD.popIn(icon, t0, { from: 0.6, peak: 1.06, frames: 10, fade: 3 });
    FD.riseIn(name, tn, { dy: 24, frames: 6 });
    FD.riseIn(cta, tc, { dy: 24, frames: 6 });
    meta.ctaFrom = tc; meta.endStart = t0; meta.stillFrom = Math.max(t0 + 0.4, tc + FD.f(6));
    return { icon, name, cta, wrap };
  };

  // ---------- guides ----------------------------------------------------
  function addGuides() {
    const g = document.createElement('div'); g.className = 'fd-guides';
    let label = null;
    ['g-top', 'g-bottom', 'g-right', 'g-end', 'g-cx', 'g-band', 'g-time'].forEach((c) => {
      const d = document.createElement('div'); d.className = c; g.appendChild(d);
      if (c === 'g-time') label = d;
    });
    getStage().appendChild(g);
    FD.onFrame((t) => { label.textContent = t.toFixed(2) + ' s  f' + Math.round(t * FD.FPS) + '  cta=' + FD.cta; });
  }

  // ---------- boot ------------------------------------------------------
  function renderAt(t) {
    tracked.forEach((el) => resetAcc(el.__fd));
    for (let i = 0; i < updaters.length; i++) updaters[i](t);
    tracked.forEach(flush);
    FD.time = t;
  }

  // FD.video({ duration, ground, setup(FD) {...} })
  FD.video = function (cfg) {
    FD.duration = cfg.duration;
    window.__duration = cfg.duration;
    window.__ready = false;
    window.__meta = { duration: cfg.duration, cta: FD.cta, warnings };
    const fonts = ['500 40px "Inter"', '600 40px "Inter"', '700 40px "Inter"', '700 40px "Inter Display"', '900 40px "Inter Display"'];
    const boot = async () => {
      await Promise.all(fonts.map((f) => document.fonts.load(f).catch(() => {})));
      await document.fonts.ready;
      fonts.forEach((f) => { if (!document.fonts.check(f)) warn('font not available: ' + f); });
      getStage();
      if (cfg.ground) FD.ground(cfg.ground);
      if (cfg.setup) cfg.setup(FD);
      if (FD.guides) addGuides();
      const imgs = Array.from(document.images);
      await Promise.all(imgs.map((im) => (im.decode ? im.decode().catch(() => {}) : Promise.resolve())));
      imgs.forEach((im) => { if (!im.naturalWidth) warn('image failed to load: ' + im.src); });
      renderAt(0);
      Object.assign(window.__meta, meta);
      window.__ready = true;
      document.documentElement.dataset.ready = '1';
    };
    window.__setTime = (t) => { renderAt(t); return true; };
    boot().catch((e) => { console.error('FD boot failed', e); window.__bootError = String((e && e.stack) || e); });
  };
})();
