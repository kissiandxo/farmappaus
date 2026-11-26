'use strict';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

function icon(name, extra = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', ('ico ' + extra).trim());
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(svg.namespaceURI, 'use');
  use.setAttribute('href', '#' + name);
  svg.append(use);
  return svg;
}

function element(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value) node.textContent = value;
  return node;
}

const menuToggle = $('#menu-toggle');
const mobileNav = $('#mobile-nav');
function menu(open) {
  mobileNav.hidden = !open;
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  menuToggle.querySelector('use').setAttribute('href', open ? '#close' : '#menu');
}
menuToggle.addEventListener('click', () => menu(mobileNav.hidden));
document.addEventListener('click', (event) => {
  if (!mobileNav.hidden && !menuToggle.contains(event.target)) menu(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !mobileNav.hidden) {
    menu(false);
    menuToggle.focus();
  }
});

const scenes = [
  { image: 'hero', label: 'At the farm gate' },
  { image: 'market', label: 'Market morning' },
  { image: 'paddock', label: 'Out in the paddock' },
];
let sceneIndex = 0;
function showScene(offset) {
  sceneIndex = (sceneIndex + offset + scenes.length) % scenes.length;
  const scene = scenes[sceneIndex];
  let next = $('.scene[data-image="' + scene.image + '"]');
  if (!next) {
    next = element('picture', 'scene');
    next.dataset.image = scene.image;
    const img = new Image();
    img.alt = '';
    img.src = 'assets/' + scene.image + '.webp';
    next.append(img);
    $('.hero-images').append(next);
  }
  const previous = $('.scene.active');
  if (previous !== next) {
    const selectedIndex = sceneIndex;
    const activate = () => {
      if (selectedIndex !== sceneIndex) return;
      $('.scene.active')?.classList.remove('active');
      next.classList.add('active');
      $('#scene-number').textContent = String(sceneIndex + 1).padStart(2, '0');
      $('#scene-label').textContent = scene.label;
    };
    const photo = next.querySelector('img');
    if (photo.complete && photo.naturalWidth) activate();
    else photo.addEventListener('load', activate, { once: true });
  }
}
$('.scene').dataset.image = 'hero';
$('#prev-scene').addEventListener('click', () => showScene(-1));
$('#next-scene').addEventListener('click', () => showScene(1));

const screenDescriptions = {
  discover: 'Farm Direct Explore screen with nearby places and produce filters',
  dates: 'Market dates screen with published dates and locations',
  weekend: 'Weekend shortlist showing saved stops and sharing controls',
};
$$('.preview-option').forEach((button) => {
  button.addEventListener('click', () => {
    const screen = button.dataset.screen;
    const img = $('#app-screen');
    img.src = 'assets/app-' + screen + '.webp';
    img.alt = screenDescriptions[screen];
    $$('.preview-option').forEach((option) => {
      const active = option === button;
      option.classList.toggle('selected', active);
      option.setAttribute('aria-pressed', String(active));
    });
    if (!motion.matches) img.animate([{ opacity: .55 }, { opacity: 1 }], { duration: 325 });
  });
});

if ('IntersectionObserver' in window && !motion.matches) {
  const reveals = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('reveal-in');
      reveals.unobserve(entry.target);
    });
  }, { threshold: .13 });
  $$('.guide-card,.app-copy,.app-stage,.producer-copy').forEach((node) => reveals.observe(node));
}

const venueLabels = {
  farmers_market: 'Farmers’ market', farm_shop: 'Farm shop', butcher: 'Independent butcher',
  farm: 'Farm', farm_gate_stall: 'Farm-gate stall',
};
const categories = {
  markets: ['farmers_market'], shops: ['farm_shop'], gates: ['farm', 'farm_gate_stall'],
  farmplaces: ['farm', 'farm_gate_stall', 'farm_shop'], butchers: ['butcher'],
};
const productLabels = { veg: 'Vegetables', fruit: 'Fruit' };
const directory = $('#directory');
const browse = $('#directory-browse');
const detail = $('#place-detail');
const query = $('#search-input');
const state = $('#state-filter');
const venue = $('#type-filter');
const results = $('#results');
const more = $('#more-results');
const count = $('#result-count');
const pageSize = 10;
let places;
let pendingRequest;
let limit = pageSize;
let lastRow;
let listScroll = 0;
let opener;

function normalise(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, '');
}

function searchText(place) {
  const products = place.products.map((product) => productLabels[product] || product.replaceAll('_', ' '));
  return normalise([place.name, place.locality, place.postcode, place.state, venueLabels[place.type], ...products].join(' '));
}

async function loadDirectory() {
  if (places) return;
  if (!pendingRequest) {
    pendingRequest = fetch('places.json').then(async (response) => {
      if (!response.ok) throw new Error('Directory unavailable');
      const records = await response.json();
      places = records.map((record) => ({ ...record, searchText: searchText(record) }))
        .sort((a, b) => a.name.localeCompare(b.name, 'en-AU'));
    }).finally(() => { pendingRequest = undefined; });
  }
  await pendingRequest;
}

async function renderAfterLoad() {
  count.textContent = 'Loading places…';
  results.replaceChildren();
  more.hidden = true;
  try {
    await loadDirectory();
    renderResults();
  } catch {
    count.textContent = 'The directory could not load.';
    const retry = element('button', 'text-action', 'Try again');
    retry.addEventListener('click', renderAfterLoad);
    results.append(retry);
  }
}

function renderResults() {
  if (!places) return;
  const tokens = normalise(query.value.trim()).split(/\s+/).filter(Boolean);
  const types = categories[venue.value];
  const filtered = places.filter((place) =>
    (!types || types.includes(place.type)) &&
    (!state.value || place.state === state.value) &&
    tokens.every((token) => place.searchText.includes(token))
  );
  count.textContent = filtered.length + (filtered.length === 1 ? ' place' : ' places') + (tokens.length || types || state.value ? ' found' : ' across Australia');
  results.replaceChildren();
  for (const place of filtered.slice(0, limit)) {
    const row = element('button', 'place-row');
    const text = element('span');
    text.append(element('span', 'place-title', place.name), element('span', 'place-meta', [venueLabels[place.type], place.locality + ', ' + place.state].join(' · ')));
    row.append(text, icon('diagonal'));
    row.addEventListener('click', () => openPlace(place, row));
    results.append(row);
  }
  if (!filtered.length) {
    const clear = element('button', 'text-action', 'Clear filters');
    clear.addEventListener('click', () => {
      query.value = ''; state.value = ''; venue.value = 'all';
      updateFilters(); query.focus();
    });
    results.append(element('p', 'empty-message', 'Try a nearby suburb, a different product or a broader place type.'), clear);
  }
  more.hidden = filtered.length <= limit;
}

function updateFilters() {
  limit = pageSize;
  renderResults();
}
query.addEventListener('input', updateFilters);
state.addEventListener('change', updateFilters);
venue.addEventListener('change', updateFilters);
more.addEventListener('click', () => {
  const firstNew = limit;
  limit += pageSize;
  renderResults();
  results.children[firstNew]?.focus();
});

function safeLink(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}

function externalButton(label, url, className) {
  const a = element('a', 'button ' + className, label);
  a.href = url;
  a.append(icon('diagonal'));
  return a;
}

function openPlace(place, row) {
  lastRow = row;
  listScroll = directory.scrollTop;
  browse.hidden = true;
  detail.hidden = false;
  const back = element('button', 'place-back');
  back.append(icon('right', 'flip'), document.createTextNode('Back to results'));
  back.addEventListener('click', () => {
    detail.hidden = true;
    browse.hidden = false;
    directory.setAttribute('aria-labelledby', 'directory-title');
    lastRow.focus({ preventScroll: true });
    directory.scrollTop = listScroll;
  });
  const title = element('h2', '', place.name);
  title.id = 'place-title';
  const facts = element('dl');
  const address = [place.address, place.locality, place.state, place.postcode].filter(Boolean).join(', ');
  const products = place.products.map((p) => productLabels[p] || (p[0].toUpperCase() + p.slice(1).replaceAll('_', ' ')));
  for (const [label, value] of [['Location', address], ['Published hours', place.hours], ['Produce listed', products.join(', ')]]) {
    if (value) facts.append(element('dt', '', label), element('dd', '', value));
  }
  const actions = element('div', 'detail-actions');
  const source = safeLink(place.source);
  if (source) actions.append(externalButton('Visit source', source, 'dark'));
  const map = 'https://maps.apple.com/?q=' + encodeURIComponent([place.name, address, 'Australia'].join(', '));
  actions.append(externalButton('Open in Maps', map, 'details-map'));
  const formatted = place.checked ? new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(place.checked + 'T00:00:00Z')) : '';
  const sourceNote = 'From public sources' + (formatted ? ', checked ' + formatted : '') + '. Check with the place before travelling.';
  detail.replaceChildren(back, element('p', 'eyebrow', venueLabels[place.type]), title, element('p', '', place.description), facts, element('p', 'source-note', sourceNote), actions);
  directory.setAttribute('aria-labelledby', title.id);
  back.focus({ preventScroll: true });
  directory.scrollTop = 0;
}

$$('[data-open]').forEach((button) => {
  button.addEventListener('click', () => {
    opener = button;
    query.value = ''; state.value = ''; venue.value = button.dataset.open;
    limit = pageSize;
    detail.hidden = true;
    browse.hidden = false;
    directory.setAttribute('aria-labelledby', 'directory-title');
    directory.showModal();
    document.body.classList.add('modal-open');
    $('#close-directory').focus({ preventScroll: true });
    directory.scrollTop = 0;
    renderAfterLoad();
  });
});
$('#close-directory').addEventListener('click', () => directory.close());
directory.addEventListener('click', (event) => {
  if (event.target === directory) {
    const rect = directory.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) directory.close();
  }
});
directory.addEventListener('close', () => {
  document.body.classList.remove('modal-open');
  opener?.focus({ preventScroll: true });
});
