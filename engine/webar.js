// Homeview web AR for Android (Chrome + ARCore, WebXR "immersive-ar").
// Same behaviour as the iPhone app: the house appears at once on the ground where the user
// stands, at real 1:1 size, and can be moved anywhere:
// - one finger: up/down = farther/closer, left/right = around the user, at any distance;
// - two fingers: left/right or a twist turns it, up/down or a pinch changes its distance;
// - buttons: turn, nudge, raise/lower (sloping ground), lock, "Aseta maja".
// The house is never scaled.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const CSS = `
#hv-xr { position:fixed; inset:0; z-index:2147483000; display:none; touch-action:none; user-select:none;
  -webkit-user-select:none; font:15px/1.3 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color:#111; }
#hv-xr.on { display:block; }
#hv-xr .bar { position:absolute; top:max(10px, env(safe-area-inset-top)); left:12px; right:12px; display:flex; align-items:center;
  gap:10px; padding:9px 10px 9px 16px; border-radius:24px; background:rgba(255,255,255,.62); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); }
#hv-xr .bar .t { font-weight:650; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
#hv-xr .bar .d { font-variant-numeric:tabular-nums; white-space:nowrap; }
#hv-xr .bar .h { display:none; border:0; border-radius:14px; padding:4px 9px; background:rgba(240,140,40,.92); color:#fff; font:inherit; font-size:14px; }
#hv-xr .bar .h.on { display:inline-block; }
#hv-xr .bar .x { border:0; width:34px; height:34px; border-radius:17px; background:rgba(0,0,0,.08); font-size:18px; line-height:1; color:#111; }
#hv-xr .hint { position:absolute; top:calc(max(10px, env(safe-area-inset-top)) + 64px); left:50%; transform:translateX(-50%);
  max-width:86%; text-align:center; padding:8px 14px; border-radius:14px; background:rgba(255,255,255,.7); backdrop-filter:blur(10px); display:none; }
#hv-xr .hint.on { display:block; }
#hv-xr .place { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); display:none; border:0; border-radius:26px;
  padding:14px 22px; background:#fff; color:#000; font:inherit; font-weight:650; box-shadow:0 4px 18px rgba(0,0,0,.3); }
#hv-xr .place.on { display:block; }
#hv-xr .ctl { position:absolute; left:50%; bottom:max(14px, env(safe-area-inset-bottom)); transform:translateX(-50%); display:none;
  flex-direction:column; align-items:center; gap:8px; }
#hv-xr .ctl.on { display:flex; }
#hv-xr .tip { color:#fff; font-size:12.5px; text-shadow:0 1px 3px rgba(0,0,0,.7); white-space:nowrap; }
#hv-xr .row { display:flex; align-items:center; gap:10px; }
#hv-xr .col { display:flex; flex-direction:column; gap:8px; }
#hv-xr .pad { display:grid; grid-template-columns:44px 44px 44px; grid-template-rows:44px 44px 44px; gap:6px; }
#hv-xr .b { width:44px; height:44px; border:0; border-radius:22px; padding:0; background:rgba(255,255,255,.55);
  backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); display:flex; align-items:center; justify-content:center; color:#111; }
#hv-xr .b svg { width:20px; height:20px; fill:none; stroke:currentColor; stroke-width:2.2; stroke-linecap:round; stroke-linejoin:round; }
#hv-xr .lock { width:56px; height:64px; border-radius:18px; flex-direction:column; gap:3px; font-size:11px; }
#hv-xr .lock.locked { background:#fff; }
#hv-xr.locked .mv { opacity:.35; }
@media (orientation:landscape) {
  #hv-xr .ctl { left:auto; right:max(10px, env(safe-area-inset-right)); transform:scale(.85); transform-origin:bottom right; }
}`;

const I = {
  ccw: '<path d="M4 4v6h6"/><path d="M5.5 15a7 7 0 1 0 1.6-7.3L4 10"/>',
  cw: '<path d="M20 4v6h-6"/><path d="M18.5 15a7 7 0 1 1-1.6-7.3L20 10"/>',
  up: '<path d="M6 15l6-6 6 6"/>', down: '<path d="M6 9l6 6 6-6"/>',
  left: '<path d="M15 6l-6 6 6 6"/>', right: '<path d="M9 6l6 6-6 6"/>',
  aim: '<circle cx="12" cy="12" r="6"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
  raise: '<path d="M5 4h14M12 20V9M7 13l5-5 5 5"/>', lower: '<path d="M5 20h14M12 4v11M7 11l5 5 5-5"/>',
  lockOpen: '<rect x="5" y="11" width="11" height="9" rx="2"/><path d="M13 11V7a4 4 0 0 1 7-2.5"/>',
  lockShut: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
};
const svg = p => `<svg viewBox="0 0 24 24">${p}</svg>`;

let ui = null;
function buildUI() {
  if (ui) return ui;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const root = document.createElement('div'); root.id = 'hv-xr';
  root.innerHTML = `
    <div class="bar"><span class="t"></span><button class="h" type="button"></button><span class="d"></span>
      <button class="x" type="button" aria-label="Sulge">✕</button></div>
    <div class="hint"></div>
    <button class="place" type="button">⌂ Aseta maja</button>
    <div class="ctl"><div class="tip">Lohista sõrmega · keera kahe sõrmega</div>
      <div class="row">
        <div class="col"><button class="b mv" data-a="ccw">${svg(I.ccw)}</button><button class="b mv" data-a="cw">${svg(I.cw)}</button></div>
        <div class="pad">
          <span></span><button class="b mv" data-a="up">${svg(I.up)}</button><span></span>
          <button class="b mv" data-a="left">${svg(I.left)}</button><button class="b mv" data-a="aim">${svg(I.aim)}</button><button class="b mv" data-a="right">${svg(I.right)}</button>
          <span></span><button class="b mv" data-a="down">${svg(I.down)}</button><span></span>
        </div>
        <div class="col"><button class="b mv" data-a="raise">${svg(I.raise)}</button><button class="b mv" data-a="lower">${svg(I.lower)}</button></div>
        <button class="b lock" data-a="lock">${svg(I.lockOpen)}<span>Lukusta</span></button>
      </div></div>`;
  document.body.appendChild(root);
  const q = s => root.querySelector(s);
  ui = { root, title: q('.t'), dist: q('.d'), height: q('.h'), close: q('.x'), hint: q('.hint'), place: q('.place'), ctl: q('.ctl'), lock: q('.lock') };
  return ui;
}

const fmt = m => m.toFixed(1).replace('.', ',') + ' m';
const buzz = () => { try { navigator.vibrate && navigator.vibrate(8); } catch (e) {} };

// Soft dark patch under the house, built from rings of fading opacity.
function makeShadow(width, depth) {
  const g = new THREE.Group();
  const inner = -0.4, outer = 0.6, steps = 8, peak = 0.22;
  const corners = o => { const x = width / 2 + o, z = depth / 2 + o; return [[-x, -z], [x, -z], [x, z], [-x, z]]; };
  const add = (pts, idx, a) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts.flatMap(([x, z]) => [x, 0, z]), 3));
    geo.setIndex(idx);
    const m = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: a, depthWrite: false, side: THREE.DoubleSide });
    g.add(new THREE.Mesh(geo, m));
  };
  add(corners(inner), [0, 1, 2, 0, 2, 3], peak);
  for (let i = 0; i < steps; i++) {
    const o0 = inner + (outer - inner) * i / steps, o1 = inner + (outer - inner) * (i + 1) / steps;
    const t = (i + 0.5) / steps, idx = [];
    for (let c = 0; c < 4; c++) { const n = (c + 1) % 4; idx.push(c, 4 + c, 4 + n, c, 4 + n, n); }
    add(corners(o0).concat(corners(o1)), idx, peak * (1 - t * t * (3 - 2 * t)));
  }
  g.position.y = 0.008;
  return g;
}

export async function webARSupported() {
  try { return !!(navigator.xr && await navigator.xr.isSessionSupported('immersive-ar')); } catch (e) { return false; }
}

/**
 * Start the AR session. Must be called from a user gesture (it requests the session first).
 * @param {{title:string, distance:number, getModel:()=>Promise<ArrayBuffer|Blob>, onEnd?:()=>void}} opts
 */
export async function startWebAR(opts) {
  const u = buildUI();
  const session = await navigator.xr.requestSession('immersive-ar', {
    optionalFeatures: ['hit-test', 'dom-overlay', 'local-floor'],
    domOverlay: { root: u.root },
  });
  u.root.classList.add('on');
  u.title.textContent = opts.title || '';
  u.dist.textContent = '';
  u.hint.textContent = 'Laen maja…'; u.hint.classList.add('on');

  // --- renderer & scene
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.xr.enabled = true;
  renderer.domElement.style.display = 'none';
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7a776f, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(4, 10, 6); scene.add(sun);
  const camera = new THREE.PerspectiveCamera();
  const pivot = new THREE.Group(); pivot.visible = false; scene.add(pivot);

  let refSpace, floorKnown = false;
  try { refSpace = await session.requestReferenceSpace('local-floor'); floorKnown = true; }
  catch (e) { refSpace = await session.requestReferenceSpace('local'); }
  renderer.xr.setReferenceSpaceType(floorKnown ? 'local-floor' : 'local');
  await renderer.xr.setSession(session);
  const viewerSpace = await session.requestReferenceSpace('viewer');
  let hitSource = null;
  try { hitSource = await session.requestHitTestSource({ space: viewerSpace }); } catch (e) {}

  // --- state
  let loaded = false, placed = false, locked = false, ended = false;
  let width = 10, depth = 10, groundY = null, targetY = null, heightOff = 0;
  let camPos = new THREE.Vector3(), camFwd = new THREE.Vector3(0, 0, -1), hfov = 1.0, trackingSince = 0;
  const groundSamples = [];

  // --- load the configured house
  (async () => {
    try {
      const data = await opts.getModel();
      const buf = data instanceof Blob ? await data.arrayBuffer() : data;
      const gltf = await new GLTFLoader().parseAsync(buf, '');
      const house = gltf.scene;
      house.traverse(o => {
        if (!o.isMesh) return;
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of ms) if (m && /plinth/i.test(m.name || '')) { m.color.set('#8A867F'); m.roughness = 0.95; m.metalness = 0; }
      });
      const box = new THREE.Box3().setFromObject(house), c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
      house.position.set(-c.x, -box.min.y, -c.z);
      width = s.x; depth = s.z;
      pivot.add(house); pivot.add(makeShadow(width, depth));
      loaded = true;
      u.hint.classList.remove('on');
    } catch (e) {
      u.hint.textContent = 'Maja laadimine ebaõnnestus. Kontrolli internetiühendust ja proovi uuesti.';
    }
  })();

  // --- helpers
  const flat = () => { const f = new THREE.Vector3(camFwd.x, 0, camFwd.z); if (f.lengthSq() < 1e-6) f.set(0, 0, -1); return f.normalize(); };
  const rightOf = f => new THREE.Vector3(-f.z, 0, f.x);
  const ground = () => groundY ?? (floorKnown ? 0 : camPos.y - 1.45);

  function placeInFront(d) {
    const f = flat();
    const p = camPos.clone().addScaledVector(f, d + depth / 2);
    pivot.position.set(p.x, ground() + heightOff, p.z);
    targetY = ground();
    pivot.rotation.set(0, Math.atan2(-f.x, -f.z), 0);
    pivot.visible = true; placed = true;
    u.ctl.classList.add('on');
  }

  function moveStart() {
    const f = flat(), r = rightOf(f);
    const v = new THREE.Vector3(pivot.position.x - camPos.x, 0, pivot.position.z - camPos.z);
    const a = v.dot(f), b = v.dot(r);
    return { r: Math.max(Math.hypot(a, b), 0.5), phi: Math.atan2(b, a), cam: camPos.clone(), f, rt: r, rot: pivot.rotation.y };
  }
  function moveTo(s, r, phi) {
    r = Math.min(Math.max(r, depth / 2 + 0.5), 600);
    const p = s.cam.clone().addScaledVector(s.f, r * Math.cos(phi)).addScaledVector(s.rt, r * Math.sin(phi));
    pivot.position.x = p.x; pivot.position.z = p.z;
  }

  // --- gestures on the overlay (one recognizer for one or two fingers)
  const pts = new Map();
  let g0 = null;
  const centroid = () => { let x = 0, y = 0; for (const p of pts.values()) { x += p.x; y += p.y; } return { x: x / pts.size, y: y / pts.size }; };
  const two = () => { const [a, b] = [...pts.values()]; return { spread: Math.max(Math.hypot(b.x - a.x, b.y - a.y), 1), angle: Math.atan2(b.y - a.y, b.x - a.x) }; };
  const rebase = () => {
    if (!placed || locked || !pts.size) { g0 = null; return; }
    g0 = { s: moveStart(), c: centroid(), n: pts.size, t: pts.size >= 2 ? two() : null };
  };
  u.root.addEventListener('beforexrselect', e => e.preventDefault());
  u.root.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) buzz();
    rebase();
  });
  u.root.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!g0 || locked || !placed) return;
    if (pts.size !== g0.n) { rebase(); return; }
    const c = centroid(), tx = c.x - g0.c.x, ty = c.y - g0.c.y, rpp = hfov / innerWidth;
    let r = g0.s.r * Math.exp(-ty / 220);
    if (pts.size >= 2 && g0.t) {
      const t = two(), raw = t.spread / g0.t.spread;
      const k = raw > 1.08 ? raw / 1.08 : raw < 0.92 ? raw / 0.92 : 1;
      r /= k;
      let tw = t.angle - g0.t.angle;
      if (tw > Math.PI) tw -= 2 * Math.PI; else if (tw < -Math.PI) tw += 2 * Math.PI;
      pivot.rotation.y = g0.s.rot + tx * (Math.PI / innerWidth) - tw;
      moveTo(g0.s, r, g0.s.phi);
    } else {
      moveTo(g0.s, r, g0.s.phi + tx * rpp);
    }
  });
  const up = e => { if (pts.delete(e.pointerId)) rebase(); };
  u.root.addEventListener('pointerup', up);
  u.root.addEventListener('pointercancel', up);

  // --- buttons
  const nudge = (fw, rt) => { const f = flat(), r = rightOf(f); pivot.position.addScaledVector(f, fw).addScaledVector(r, rt); };
  const setHeight = dy => {
    heightOff = Math.min(Math.max(heightOff + dy, -1.5), 1.5);
    if (Math.abs(heightOff) < 0.01) heightOff = 0;
    u.height.textContent = '↕ ' + (heightOff > 0 ? '+' : '−') + fmt(Math.abs(heightOff));
    u.height.classList.toggle('on', heightOff !== 0);
  };
  u.height.addEventListener('click', () => setHeight(-heightOff));
  u.ctl.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !placed) return;
    const a = b.dataset.a;
    if (a === 'lock') {
      locked = !locked; u.root.classList.toggle('locked', locked); b.classList.toggle('locked', locked);
      b.innerHTML = svg(locked ? I.lockShut : I.lockOpen) + `<span>${locked ? 'Lukus' : 'Lukusta'}</span>`;
      buzz(); return;
    }
    if (locked) return;
    buzz();
    if (a === 'ccw') pivot.rotation.y += 5 * Math.PI / 180;
    else if (a === 'cw') pivot.rotation.y -= 5 * Math.PI / 180;
    else if (a === 'up') nudge(0.25, 0); else if (a === 'down') nudge(-0.25, 0);
    else if (a === 'left') nudge(0, -0.25); else if (a === 'right') nudge(0, 0.25);
    else if (a === 'aim') placeInFront(opts.distance);
    else if (a === 'raise') setHeight(0.1); else if (a === 'lower') setHeight(-0.1);
  });
  u.place.addEventListener('click', () => { if (!locked) { buzz(); placeInFront(opts.distance); } });
  u.close.addEventListener('click', () => session.end());

  // --- per frame
  const tmp = new THREE.Vector3(), ndc = new THREE.Vector3();
  let frameNo = 0, visible = true;
  renderer.setAnimationLoop((t, frame) => {
    if (!frame) return;
    const pose = frame.getViewerPose(refSpace);
    if (pose) {
      const m = new THREE.Matrix4().fromArray(pose.transform.matrix);
      camPos.setFromMatrixPosition(m);
      camFwd.set(0, 0, -1).transformDirection(m);
      const P = pose.views[0].projectionMatrix;
      hfov = 2 * Math.atan(1 / P[0]);
      if (!trackingSince && !pose.emulatedPosition) trackingSince = t;
    }
    // ground: the lowest surface the camera ray finds within 8 m, well below the phone
    if (hitSource && pose) {
      const hits = frame.getHitTestResults(hitSource);
      if (hits.length) {
        const hp = hits[0].getPose(refSpace);
        if (hp) {
          const p = hp.transform.position;
          if (p.y < camPos.y - 0.8 && Math.hypot(p.x - camPos.x, p.z - camPos.z) < 8) {
            groundSamples.push(p.y); if (groundSamples.length > 90) groundSamples.shift();
            const sorted = [...groundSamples].sort((a, b) => a - b);
            const lowish = sorted[Math.floor(sorted.length * 0.15)];
            if (groundY === null || Math.abs(lowish - groundY) > 0.03) {
              groundY = lowish; if (placed) targetY = groundY;
            }
          }
        }
      }
    }
    // place once the house is loaded and the phone looks roughly ahead
    if (!placed && loaded && trackingSince && (groundY !== null || t - trackingSince > 1200)) {
      if (Math.hypot(camFwd.x, camFwd.z) > 0.5) placeInFront(opts.distance);
    }
    if (placed) {
      if (targetY !== null) {
        const ty = targetY + heightOff;
        if (Math.abs(ty - pivot.position.y) > 0.002) pivot.position.y += (ty - pivot.position.y) * 0.15;
      }
      // distance to the nearest part of the house
      tmp.set(camPos.x - pivot.position.x, 0, camPos.z - pivot.position.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), -pivot.rotation.y);
      const dx = Math.max(Math.abs(tmp.x) - width / 2, 0), dz = Math.max(Math.abs(tmp.z) - depth / 2, 0);
      const txt = '📏 ' + fmt(Math.hypot(dx, dz));
      if (u.dist.textContent !== txt) u.dist.textContent = txt;
      // is any part of the house on screen?
      if (++frameNo % 10 === 0) {
        const xrCam = renderer.xr.getCamera(), cam0 = xrCam.cameras && xrCam.cameras[0] ? xrCam.cameras[0] : xrCam;
        const w = Math.max(depth, 4) / 2, probes = [[0, 1.5, 0], [w, 1, w], [-w, 1, w], [w, 1, -w], [-w, 1, -w]];
        let vis = false;
        for (const [x, y, z] of probes) {
          ndc.set(x, y, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), pivot.rotation.y).add(pivot.position);
          const toP = ndc.clone().sub(camPos);
          if (toP.dot(camFwd) <= 0) continue;
          ndc.project(cam0);
          if (Math.abs(ndc.x) < 0.95 && Math.abs(ndc.y) < 0.95) { vis = true; break; }
        }
        if (vis !== visible) { visible = vis; u.place.classList.toggle('on', !vis && !locked); }
      }
    }
    renderer.render(scene, camera);
  });

  if (opts.debug) opts.debug({ pivot, session, renderer, get placed() { return placed; }, get locked() { return locked; },
    get dist() { return u.dist.textContent; }, get heightOff() { return heightOff; }, get camPos() { return camPos; },
    get placeShown() { return u.place.classList.contains('on'); }, get hint() { return u.hint.classList.contains('on') ? u.hint.textContent : ''; } });

  session.addEventListener('end', () => {
    if (ended) return; ended = true;
    renderer.setAnimationLoop(null);
    try { hitSource && hitSource.cancel(); } catch (e) {}
    scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => m.dispose()); });
    pmrem.dispose(); renderer.dispose(); renderer.domElement.remove();
    u.root.classList.remove('on', 'locked'); u.ctl.classList.remove('on'); u.place.classList.remove('on');
    u.height.classList.remove('on'); u.hint.classList.remove('on');
    u.lock.classList.remove('locked'); u.lock.innerHTML = svg(I.lockOpen) + '<span>Lukusta</span>';
    opts.onEnd && opts.onEnd();
  });
  return session;
}
