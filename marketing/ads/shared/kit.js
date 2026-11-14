/* Farm Direct ad kit runtime. Include at the end of <body>:
     <script src="../shared/kit.js"></script>
   - Reads ?size=feed|story (default feed) and puts that class on every
     .artboard; also sets <html data-size="feed|story"> for CSS hooks.
   - ?guides=1 shows margins, story safe areas and the feed footer band.
   - Sets <html data-ready="1"> once fonts and images are loaded; the
     renderer waits for it. */
(function () {
  var q = new URLSearchParams(location.search);
  var size = q.get('size') === 'story' ? 'story' : 'feed';
  var root = document.documentElement;
  root.dataset.size = size;
  document.querySelectorAll('.artboard').forEach(function (a) {
    a.classList.remove('feed', 'story');
    a.classList.add(size);
  });
  if (q.get('guides') === '1') document.body.classList.add('guides');

  var fonts = [
    '400 40px "Inter"', '500 40px "Inter"', '600 40px "Inter"', '700 40px "Inter"',
    '700 40px "Inter Display"', '800 40px "Inter Display"', '900 40px "Inter Display"'
  ];
  var imgs = Array.prototype.slice.call(document.images).map(function (img) {
    return img.decode ? img.decode().catch(function () {}) : Promise.resolve();
  });
  Promise.all(fonts.map(function (f) { return document.fonts.load(f).catch(function () {}); }).concat(imgs))
    .then(function () { return document.fonts.ready; })
    .then(function () { root.dataset.ready = '1'; });
})();
