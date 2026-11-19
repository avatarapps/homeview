// Homeview house configurator – shared engine for every client.
// The page (a client's index.html) only loads this file; everything client-specific
// (houses, option lists, texts) comes from client.js next to that page.
import { LIBRARY, GROUPS, TEXTS } from './options.js';

const ENGINE = new URL('./', import.meta.url);           // .../engine/
const PAGE = new URL('./', document.baseURI);            // the client's folder
const C = (await import(new URL('client.js', PAGE).href)).default;
const T = { ...TEXTS, ...(C.texts || {}) };
const OPTIONS = { ...structuredClone(LIBRARY), ...(C.options || {}) };
const HIDDEN = new Set(C.hidden || []);
const EXTRAS = C.extras || [];
const HOUSES = C.houses;
const BUILD = C.build || '1';                            // bump in client.js on every model update (cache)
const KEY = 'hv5-' + C.id;                               // per-client storage: clients never see each other's state
// Test: landscape around the house (?maastik=1|2). Light stays from sky.hdr so colours don't change;
// the photo is only the visible backdrop, projected onto the ground. Panoramas: Poly Haven, CC0.
const SCENE = { 1: 'mets', 2: 'niit' }[new URLSearchParams(location.search).get('maastik')];
const POLAR = SCENE ? 81 : 74;                           // lower camera shows the horizon behind the house

// ---- page --------------------------------------------------------------------------
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
const head = (tag, attrs) => { const e = document.createElement(tag); Object.assign(e, attrs); document.head.appendChild(e); return e; };
head('link', { rel:'stylesheet', href:'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,500&display=swap' });
const qrLib = new Promise(r => { const s = head('script', { src:'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js' }); s.onload = r; s.onerror = r; });
await import('https://cdn.jsdelivr.net/npm/@google/model-viewer@4/dist/model-viewer.min.js');

const groupHtml = g => {
  const label = (C.labels || {})[g.key] || g.label;
  const custom = g.custom ? `<label class="custom"><input type="color" data-custom="${g.key}"><input type="text" maxlength="7" data-custom-hex="${g.key}" placeholder="#2C3243"><span>Oma värvikood</span></label>` : '';
  return `<div class="group" id="grp-${g.key}"><div class="label">${esc(label)} <b id="lbl-${g.key}"></b></div><div class="row" data-bind="${g.key}"></div>${custom}</div>`;
};
const opts = list => list.map(o => `<option>${esc(o)}</option>`).join('');
document.body.insertAdjacentHTML('afterbegin', `
<header>
  <h1><span class="hn"></span><span class="tail"> – ${esc(T.tagline)}</span></h1>
  <button class="hdr-ar" type="button" id="hdr-ar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 2.8 20 7.3v9.4l-8 4.5-8-4.5V7.3z"/><path d="M4 7.3l8 4.5 8-4.5M12 11.8v9.4"/></svg>${esc(T.arButton)}</button>
</header>
<model-viewer id="mv" alt="Maja 3D-mudel"
  ar ar-modes="webxr quick-look scene-viewer" ar-scale="fixed" ar-placement="floor"
  camera-controls touch-action="pan-y" shadow-intensity="1" shadow-softness="0.35"
  tone-mapping="aces" exposure="0.95"
  camera-orbit="-25deg 74deg 30m" field-of-view="32deg" camera-target="0m 2m -7m" min-camera-orbit="auto auto 10m" max-camera-orbit="auto 88deg 80m"
  interaction-prompt="none">
  <button class="house-nav prev" type="button" id="nav-prev" aria-label="Eelmine maja"><span class="arr">←</span><span class="nm"></span></button>
  <button class="house-nav next" type="button" id="nav-next" aria-label="Järgmine maja"><span class="nm"></span><span class="arr">→</span></button>
  <span class="lock">${esc(T.lock)}</span>
  <button slot="ar-button" class="ar-btn">${esc(T.arButton)}</button>
  <div class="ar-bar">
    <div class="row" data-bind="facadeColor" data-compact></div>
    <div class="row" data-bind="roofColor" data-compact></div>
  </div>
</model-viewer>
<div class="spacer"></div>
<div class="panel">
  <aside class="qr-card" aria-label="${esc(T.arButton)}">
    <div class="qr-title">${esc(T.qrTitle)}</div>
    <div id="qr"></div>
    <div class="qr-sub">${esc(T.qrSub)}</div>
  </aside>
  <div class="group" id="grp-ardist"><div class="label">${esc(T.arDist)} <b id="lbl-ardist"></b></div><div class="row" id="ardist"></div></div>
  ${GROUPS.filter(g => !HIDDEN.has(g.key)).map(groupHtml).join('\n  ')}
  <div class="group"><div class="label">${esc(T.extras)}</div><div class="row" id="extras"></div></div>
  <p class="note">${esc(T.note)}</p>
  <div class="group">
    <div class="label">${esc(T.yourChoice)}</div>
    <dl id="summary"></dl>
    <div class="cta-bar">
      <button class="secondary" type="button" id="copy-link">${esc(T.copyLink)}</button>
    </div>
  </div>
</div>
<section class="quote" id="pakkumine">
  <h2>${esc(T.askQuote)}</h2>
  <form id="qform">
    <label>Nimi<input name="nimi" required autocomplete="name"></label>
    <label>E-post<input name="email" type="email" required autocomplete="email"></label>
    <label>Telefon (soovi korral)<input name="tel" type="tel" autocomplete="tel"></label>
    <label>Krundi asukoht<input name="krunt" placeholder="aadress või katastritunnus"></label>
    <label>Valmidusaste<select name="valmidus">${opts(T.stages)}</select></label>
    <label>Millal soovid ehitada?<select name="aeg">${opts(T.timings)}</select></label>
    <div class="files"><span class="flabel">Pildid krundilt</span><label class="secondary file-btn">+ Lisa pildid<input name="pildid" type="file" accept="image/*" multiple></label></div>
    <div id="thumbs"></div>
    <label>Lisainfo<textarea name="info" rows="3" placeholder="nt soovin saunat, laiemat terrassi …"></textarea></label>
    <input name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">
    <button class="primary" type="submit">${esc(T.askQuote)}</button>
    <div class="sub" id="qmsg"></div>
  </form>
</section>`);

// ---- state -------------------------------------------------------------------------
if (HOUSES.length < 2) document.documentElement.classList.add('single-house');
let house = HOUSES[0];
let pendingCam = null;
const saved = {};
let touched = new Set();
const SWATCH_GROUPS = GROUPS.filter(g => g.swatches).map(g => g.key);
const state = { custom:{} };
for (const x of EXTRAS) state[x.id] = false;

const mv = document.getElementById('mv');
let cache = {};
const tex = name => cache[name] ??= mv.createTexture(new URL(`tex/${name}.png`, ENGINE).href);
const mat = name => mv.model?.getMaterialByName(name);
const find = (k, id) => OPTIONS[k].find(o => o.id === id);
const colourOf = k => state.custom[k] ?? find(k, state[k] ?? OPTIONS[k][0].id)?.hex ?? (k === 'facadeColor' ? '#2C3243' : colourOf('facadeColor'));
const hasExtra = id => house.extras.includes(id) && state[id];
const hasGarage = () => (house.garage || []).includes(state.size);
const glbName = () => `${house.id}${state.size}_c${+hasExtra('carport')}_p${+hasExtra('panels')}_m${state.muntins === 'jah' ? 1 : 0}`;
const glbUrl = n => new URL(`${n}.glb?v=${BUILD}`, PAGE).href;

async function setTex(m, base, normal = true) {
  if (!m) return;
  m.pbrMetallicRoughness.baseColorTexture.setTexture(await tex(base));
  if (normal && m.normalTexture) m.normalTexture.setTexture(await tex(base + '_n'));
}
const col = (name, hex) => mat(name)?.pbrMetallicRoughness.setBaseColorFactor(hex);

let applying = Promise.resolve();   // the AR export waits for colours and textures to be in place
function apply() { applying = applyNow(); return applying; }
async function applyNow() {
  if (!mv.model) return;
  const fm = find('facadeMat', state.facadeMat), rm = find('roofMat', state.roofMat);
  await setTex(mat('wall'), fm.tex);
  col('wall', colourOf('facadeColor'));
  await setTex(mat('roof'), rm.tex);
  col('roof', colourOf('roofColor'));
  mat('roof')?.pbrMetallicRoughness.setRoughnessFactor(rm.rough);
  mat('roof')?.pbrMetallicRoughness.setMetallicFactor(rm.metal);
  await setTex(mat('soffit'), 'boards_h');
  await setTex(mat('deck'), 'deck');
  await setTex(mat('curtain'), 'curtain', false);
  col('frame', colourOf('frame'));
  col('fascia', find('fascia', state.fascia).hex ?? colourOf('facadeColor'));
  col('deck', colourOf('deck'));
  col('door', state.custom.door ?? find('door', state.door).hex ?? colourOf('facadeColor'));
  col('garage', colourOf('garage'));
  render();
}

function setModel() {
  const n = glbName();
  if (mv.dataset.glb !== n) {
    const camKey = house.id + state.size;
    if (mv.dataset.cam !== camKey) { mv.dataset.cam = camKey; const [d0, tz, az = -25, dm, ty = 2] = house.cam[state.size]; const d = innerWidth < 700 ? (dm ?? d0) : d0; pendingCam = [`${az}deg ${POLAR}deg ${d}m`, `0m ${ty}m ${tz}m`]; }
    mv.dataset.glb = n; mv.src = glbUrl(n);
    mv.alt = `${house.name} 3D-mudel`;
  }
  else apply();
}

let render = function () {
  document.querySelectorAll('[data-bind]').forEach(row => {
    const k = row.dataset.bind;
    row.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', !state.custom[k] && b.dataset.id === state[k]));
    const lbl = document.getElementById('lbl-' + k);
    if (lbl) lbl.textContent = state.custom[k] ?? find(k, state[k] ?? OPTIONS[k][0].id)?.name ?? '';
  });
  document.querySelectorAll('#extras button').forEach(b => b.setAttribute('aria-pressed', state[b.dataset.id]));
  document.querySelectorAll('[data-custom]').forEach(i => { i.value = colourOf(i.dataset.custom).toLowerCase(); });
  document.querySelectorAll('[data-custom-hex]').forEach(i => { if (document.activeElement !== i) i.value = colourOf(i.dataset.customHex); });
};

function buildRow(row) {
  const k = row.dataset.bind, compact = row.hasAttribute('data-compact');
  row.innerHTML = '';
  for (const o of OPTIONS[k]) {
    const b = document.createElement('button');
    b.dataset.id = o.id; b.title = o.name; b.setAttribute('aria-label', o.name);
    if (SWATCH_GROUPS.includes(k)) { b.className = 'sw'; b.style.background = o.hex; }
    else {
      b.className = 'chip';
      const dot = 'hex' in o ? `<span class="dot" style="background:${o.hex ?? 'linear-gradient(135deg,#fff 50%,#2C3243 50%)'}"></span>` : '';
      b.innerHTML = dot + esc(compact ? o.name.split(' ').slice(-1)[0] : o.name);
    }
    b.addEventListener('click', e => {
      e.stopPropagation(); state[k] = o.id; delete state.custom[k]; if (k !== 'size') touched.add(k);
      (k === 'muntins' || k === 'size') ? setModel() : apply();
    });
    row.appendChild(b);
  }
}
// size is per house: filled in by useHouse()
document.querySelectorAll('[data-bind]').forEach(r => { if (r.dataset.bind !== 'size') buildRow(r); });
for (const x of EXTRAS) {
  const b = document.createElement('button');
  b.className = 'chip'; b.dataset.id = x.id; b.textContent = '+ ' + x.name;
  b.addEventListener('click', () => { state[x.id] = !state[x.id]; setModel(); });
  document.getElementById('extras').appendChild(b);
}

const valid = h => /^#[0-9a-fA-F]{6}$/.test(h);
document.querySelectorAll('[data-custom]').forEach(i => i.addEventListener('input', e => {
  state.custom[i.dataset.custom] = e.target.value.toUpperCase(); touched.add(i.dataset.custom); apply();
}));
document.querySelectorAll('[data-custom-hex]').forEach(i => i.addEventListener('input', e => {
  let v = e.target.value.trim(); if (!v.startsWith('#')) v = '#' + v;
  if (valid(v)) { state.custom[i.dataset.customHex] = v.toUpperCase(); touched.add(i.dataset.customHex); apply(); }
}));

mv.environmentImage = new URL('sky.hdr', ENGINE).href;
if (SCENE) {
  mv.skyboxImage = new URL(`scene/${SCENE}.jpg`, ENGINE).href;
  mv.setAttribute('skybox-height', '2m');
}
mv.addEventListener('load', () => {
  cache = {};
  if (pendingCam) { mv.cameraOrbit = pendingCam[0]; mv.cameraTarget = pendingCam[1]; mv.jumpCameraToGoal(); pendingCam = null; }
  apply();
});

// ---- persistence: URL hash + localStorage ---------------------------------------------
// Link format (do not change – links are in customers' emails):
// #h<house index><one base-36 digit per ORDER group><carport><panels><garage>[-<group index><hex>]...
async function updateQR() {
  await qrLib;
  const box = document.getElementById('qr'); if (!box || typeof qrcode === 'undefined') return;
  const q = qrcode(0, 'M'); q.addData(configLink()); q.make();
  box.innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
}
const ORDER = ['size','facadeMat','facadeColor','roofMat','roofColor','frame','muntins','door','fascia','deck'];
const CORDER = [...ORDER, 'garage'];
function encodeState() {
  let s = ORDER.map(k => Math.max(0, OPTIONS[k].findIndex(o => o.id === state[k])).toString(36)).join('');
  s += (state.carport ? 1 : 0) + '' + (state.panels ? 1 : 0);
  s += Math.max(0, OPTIONS.garage.findIndex(o => o.id === state.garage)).toString(36);
  for (const [k, hex] of Object.entries(state.custom || {})) { const i = CORDER.indexOf(k); if (i >= 0) s += '-' + i.toString(36) + hex.replace('#', ''); }
  return s;
}
function loadState(s) {
  try {
    const [main, ...cus] = s.split('-');
    if (main.length < ORDER.length + 2) return false;
    ORDER.forEach((k, i) => { const o = OPTIONS[k][parseInt(main[i], 36)]; if (o) state[k] = o.id; });
    state.carport = main[ORDER.length] === '1'; state.panels = main[ORDER.length + 1] === '1';
    state.garage = OPTIONS.garage[parseInt(main[ORDER.length + 2] || '0', 36)]?.id ?? OPTIONS.garage[0].id;
    state.custom = {};
    cus.forEach(c => { const k = CORDER[parseInt(c[0], 36)]; const hex = '#' + c.slice(1).toUpperCase(); if (k && /^#[0-9A-F]{6}$/.test(hex)) state.custom[k] = hex; });
    return true;
  } catch { return false; }
}
const hIdx = () => HOUSES.indexOf(house);
const snapshot = () => JSON.parse(JSON.stringify(state));
const store = (k, v) => { try { localStorage.setItem(`${KEY}-${k}`, JSON.stringify(v)); } catch {} };
const recall = (k, d) => { try { return JSON.parse(localStorage.getItem(`${KEY}-${k}`)) ?? d; } catch { return d; } };
function persist() {
  const enc = encodeState();
  saved[house.id] = snapshot();
  store('house', house.id); store('saved', saved); store('touched', [...touched]);
  try { history.replaceState(null, '', location.pathname + location.search + '#h' + hIdx() + enc); } catch {}
  updateQR();
}
function useHouse(h) {
  house = h; OPTIONS.size = h.sizes;
  const row = document.querySelector('.panel [data-bind="size"]'); if (row) buildRow(row);
}
const fresh = h => Object.assign(state, h.defaults, { custom:{} }, Object.fromEntries(EXTRAS.map(x => [x.id, false])));
function switchHouse(dir) {
  saved[house.id] = snapshot();
  const next = HOUSES[(hIdx() + dir + HOUSES.length) % HOUSES.length];
  useHouse(next);
  for (const k of Object.keys(state)) delete state[k];
  if (saved[next.id]) Object.assign(state, saved[next.id]);
  else fresh(next);                                   // first visit: the house opens with its own look
  setModel(); render();
}
document.getElementById('nav-prev').addEventListener('click', e => { e.stopPropagation(); switchHouse(-1); });
document.getElementById('nav-next').addEventListener('click', e => { e.stopPropagation(); switchHouse(1); });
Object.assign(saved, recall('saved', {})); touched = new Set(recall('touched', []));
let fromHash = false;
useHouse(house); fresh(house);
if (location.hash.startsWith('#h')) {
  const h = HOUSES[parseInt(location.hash[2], 10)];
  if (h) { useHouse(h); fromHash = loadState(location.hash.slice(3)); }
} else if (location.hash.startsWith('#c')) {
  fromHash = loadState(location.hash.slice(2));            // older single-house links
}
if (!fromHash) {
  const h = HOUSES.find(x => x.id === recall('house', null));
  if (h) { useHouse(h); if (saved[h.id]) Object.assign(state, saved[h.id]); }
}
if (!OPTIONS.size.some(o => o.id === state.size)) fresh(house);

// ---- summary -------------------------------------------------------------------------
const labelOf = k => (C.labels || {})[k] || GROUPS.find(g => g.key === k).label;
const SUMMARY = ['facadeMat','facadeColor','roofMat','roofColor','frame','muntins','door','fascia','deck'].filter(k => !HIDDEN.has(k));
function summaryRows() {
  const sz = find('size', state.size);
  const rows = [['Maja', `${house.name} ${sz.short} m² – ${T.areaA} ${sz.brutto} m², ${T.areaB} ${sz.netto} m²${hasGarage() ? ', garaažiga' : ''}`]];
  for (const k of SUMMARY) {
    const o = find(k, state[k]);
    const v = state.custom[k] ? `oma toon ${state.custom[k]}` : (o.name + (o.hex ? ` (${o.hex})` : ''));
    rows.push([labelOf(k), v]);
  }
  if (hasGarage() && !HIDDEN.has('garage')) {
    const o = find('garage', state.garage);
    rows.push([labelOf('garage'), state.custom.garage ? `oma toon ${state.custom.garage}` : o.name + (o.hex ? ` (${o.hex})` : '')]);
  }
  if (house.extras.length) rows.push([T.extras, EXTRAS.filter(x => hasExtra(x.id)).map(x => x.name.toLowerCase()).join(', ') || 'ei']);
  return rows;
}
function renderSummary() {
  document.getElementById('summary').innerHTML = summaryRows().map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('');
}
const _render = render;
render = function () {
  _render(); renderSummary(); persist();
  const sz = find('size', state.size);
  document.querySelector('h1 .hn').textContent = `${house.name} ${sz.short} m²`;
  document.title = `${house.name} ${sz.short} m² – ${T.tagline}`;
  const ex = document.getElementById('extras');
  ex.closest('.group').style.display = house.extras.length ? '' : 'none';
  const gg = document.getElementById('grp-garage'); if (gg) gg.style.display = hasGarage() ? '' : 'none';
  ex.querySelectorAll('button').forEach(b => {
    const x = EXTRAS.find(e => e.id === b.dataset.id);
    b.style.display = house.extras.includes(x.id) ? '' : 'none';
    b.textContent = (state[x.id] ? '✓ ' : '+ ') + x.name;
  });
  const n = HOUSES.length, i = hIdx();
  document.querySelector('#nav-prev .nm').textContent = HOUSES[(i - 1 + n) % n].name;
  document.querySelector('#nav-next .nm').textContent = HOUSES[(i + 1) % n].name;
};

const PUBLIC_URL = /^https?:$/.test(location.protocol) ? location.origin + location.pathname : C.publicUrl;
const configLink = () => PUBLIC_URL + '#h' + hIdx() + encodeState();
document.getElementById('copy-link').addEventListener('click', async e => {
  const btn = e.currentTarget;
  try { await navigator.clipboard.writeText(configLink()); } catch {}
  btn.textContent = T.copied; setTimeout(() => btn.textContent = T.copyLink, 1600);
});

// ---- quote request -------------------------------------------------------------------
const fileInput = document.querySelector('#qform input[type=file]');
fileInput.addEventListener('change', () => {
  const t = document.getElementById('thumbs'); t.innerHTML = '';
  [...fileInput.files].forEach(f => { const i = document.createElement('img'); i.src = URL.createObjectURL(f); t.appendChild(i); });
});
const STARTED = Date.now();
const API = 'https://www.secondsun.ee/api/homeview-paring';
document.getElementById('qform').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target, f = new FormData(form), msg = document.getElementById('qmsg');
  const btn = form.querySelector('button[type=submit]');
  const sz = find('size', state.size);
  const meta = {
    client: C.id, clientName: C.name,
    house: `${house.name} ${sz.short} m²`, summary: summaryRows(), link: configLink(),
    name: f.get('nimi'), email: f.get('email'), phone: f.get('tel'), plot: f.get('krunt'),
    stage: f.get('valmidus'), timing: f.get('aeg'), info: f.get('info'), website: f.get('website'), startedAt: STARTED,
  };
  const body = new FormData();
  body.append('meta', JSON.stringify(meta));
  [...fileInput.files].slice(0, 5).forEach(file => body.append('files', file, file.name));
  btn.disabled = true; btn.textContent = 'Saadan…'; msg.textContent = '';
  try {
    const res = await fetch(API, { method: 'POST', body });
    const out = await res.json().catch(() => ({}));
    if (res.ok && out.ok) {
      form.reset(); document.getElementById('thumbs').innerHTML = '';
      btn.textContent = 'Päring saadetud ✓';
      msg.textContent = T.sent;
      return;
    }
    msg.textContent = out.message || 'Saatmine ebaõnnestus. Proovi uuesti.';
  } catch {
    msg.textContent = 'Saatmine ebaõnnestus – kontrolli internetiühendust ja proovi uuesti.';
  }
  btn.disabled = false; btn.textContent = T.askQuote;
});

const IS_IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
if (IS_IOS) document.body.classList.add('is-ios');
const hdrAr = document.getElementById('hdr-ar');
// --- AR distance: the house is pushed this far away from the point where AR anchors it,
// so it lands where it should stand on the plot instead of on top of the viewer.
const AR_DISTS = [3, 10, 20, 30];
let arDist = +(localStorage.getItem('hv-ardist') || 10);
if (!AR_DISTS.includes(arDist)) arDist = 10;
const distRow = document.getElementById('ardist');
const drawDist = () => {
  distRow.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.m === arDist));
  document.getElementById('lbl-ardist').textContent = arDist + ' m';
};
for (const m of AR_DISTS) {
  const b = document.createElement('button'); b.className = 'chip'; b.dataset.m = m; b.textContent = m + ' m';
  b.addEventListener('click', () => { arDist = m; try { localStorage.setItem('hv-ardist', m); } catch (e) {} drawDist(); });
  distRow.appendChild(b);
}
drawDist();
const sceneOf = v => { const k = Object.getOwnPropertySymbols(v).find(x => x.description === 'scene'); return k ? v[k] : null; };
let arShift = 0;
const shiftHouse = dz => {
  const sc = sceneOf(mv); if (!sc || !sc.models) return false;
  for (const m of sc.models) { m.position.z += dz; m.updateMatrixWorld(true); }
  arShift += dz; return true;
};
const unshift = () => { if (arShift) shiftHouse(-arShift); };
let xrStarted = false;
mv.addEventListener('ar-status', e => {
  if (e.detail.status === 'session-started') xrStarted = true;
  if (e.detail.status === 'not-presenting' || e.detail.status === 'failed') { xrStarted = false; unshift(); }
});

// --- iPhone: the Homeview App Clip (free dragging, nudge buttons, distance readout) ---
const APP_CLIP_READY = false;     // switch on once the App Clip is live; ?clip=1 forces it for testing
const hexOf = h => (h || '').replace('#', '');
function clipLink() {
  const sz = find('size', state.size);
  const roof = find('roofMat', state.roofMat), fm = find('facadeMat', state.facadeMat);
  const p = new URLSearchParams({
    n: `${house.name} ${sz.short} m²`,
    m: new URL(`app/${glbName()}.usdz`, PAGE).href,
    t: new URL('tex/', ENGINE).href,
    d: String(arDist),
    wall: hexOf(colourOf('facadeColor')), wallTex: fm.tex,
    roof: hexOf(colourOf('roofColor')), roofTex: roof.tex, roofR: String(roof.rough), roofM: String(roof.metal),
    deck: hexOf(colourOf('deck')), deckTex: 'deck',
    frame: hexOf(colourOf('frame')), fascia: hexOf(colourOf('fascia')),
    door: hexOf(state.custom.door ?? find('door', state.door).hex ?? colourOf('facadeColor')),
    garage: hexOf(colourOf('garage')),
  });
  return 'https://homeview.secondsun.ee/ar?' + p.toString();
}

// --- Android: our own WebXR AR view (same controls as the iPhone app); Scene Viewer stays as fallback ---
let webar = null;   // the loaded module once WebXR AR is known to work on this device
if (!IS_IOS && navigator.xr) {
  import('./webar.js').then(async m => {
    if (await m.webARSupported()) { webar = m; document.body.classList.add('can-ar'); hdrAr.style.display = ''; }
  }).catch(() => {});
}
let webarOn = false;
async function startWebAR() {
  if (webarOn) return; webarOn = true;
  const sz = find('size', state.size);
  try {
    await webar.startWebAR({
      title: `${house.name} ${sz.short} m²`,
      distance: arDist,
      getModel: async () => { try { await applying; } catch (e) {} return mv.exportScene({ binary: true }); },
      onEnd: () => { webarOn = false; },
    });
  } catch (e) { webarOn = false; if (mv.canActivateAR) mv.activateAR(); }
}

async function startAR() {
  if (IS_IOS && (APP_CLIP_READY || new URLSearchParams(location.search).has('clip'))) {
    location.href = clipLink(); return;
  }
  if (webar) { startWebAR(); return; }
  if (!mv.canActivateAR) { mv.scrollIntoView(); return; }
  unshift();
  shiftHouse(-(arDist - 1));          // the model's front edge sits 1 m from its origin
  try { await mv.activateAR(); }
  finally { if (!xrStarted) unshift(); }   // Quick Look got its own copy; WebXR keeps it until the session ends
}
hdrAr.addEventListener('click', startAR);
const slotBtn = document.querySelector('.ar-btn');
slotBtn.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); startAR(); }, true);
mv.addEventListener('load', e => { const ok = !!e.target.canActivateAR || !!webar; if (!ok) hdrAr.style.display = 'none'; document.body.classList.toggle('can-ar', ok); });
const setHH = () => document.documentElement.style.setProperty('--hh', document.querySelector('header').offsetHeight + 'px');
new ResizeObserver(setHH).observe(document.querySelector('header')); setHH();
addEventListener('scroll', () => document.body.classList.toggle('scrolled', scrollY > 40), { passive:true });
setModel();
render();
