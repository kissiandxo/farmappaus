/* Browser preview helper (never used by render.mjs, which passes no t/play).
   ?t=2.4      freeze on one frame
   ?play=1     play in real time, looping (preview only: the render is frame-exact)
   Keys while previewing: space play/pause, left/right step one frame. */
(function () {
  const q = new URLSearchParams(location.search);
  if (!q.has('t') && !q.has('play')) return;
  let t = parseFloat(q.get('t') || '0') || 0, playing = q.get('play') === '1', last = null;
  function wait() {
    if (!window.__ready) return setTimeout(wait, 50);
    document.body.style.background = '#333';
    window.__setTime(t);
    if (playing) requestAnimationFrame(tick);
  }
  function tick(now) {
    if (!playing) { last = null; return; }
    if (last != null) t = (t + (now - last) / 1000) % window.__duration;
    last = now; window.__setTime(t); requestAnimationFrame(tick);
  }
  addEventListener('keydown', (e) => {
    if (e.key === ' ') { playing = !playing; if (playing) requestAnimationFrame(tick); }
    if (e.key === 'ArrowRight') { t = Math.min(window.__duration, t + 1 / 30); window.__setTime(t); }
    if (e.key === 'ArrowLeft') { t = Math.max(0, t - 1 / 30); window.__setTime(t); }
  });
  wait();
})();
