import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { createTimeline, onScroll, utils, stagger, svg } from 'animejs';

/** Runs the landing page's scroll story on its markup, which must already be in the document; returns the teardown. */
export function mountLanding(navigate) {
const controller = new AbortController();
const { signal } = controller;
const css = getComputedStyle(document.documentElement);
const tok = name => css.getPropertyValue(name).trim();
const narrowQuery = matchMedia('(max-width: 760px)');
const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');

// Eight stages on the loop: the first four on the development half, the last four on the operations half.
const STAGES = [
  { name: '需求分析', covered: false }, { name: '架构设计', covered: false },
  { name: '编码实现', covered: true }, { name: '代码评审', covered: false },
  { name: '测试验证', covered: true }, { name: '构建发布', covered: false },
  { name: '运维保障', covered: true }, { name: '维护演进', covered: false },
];
// Colours follow the theme: CSS takes the variables, and the canvas and scene timelines read their current values.
const half = i => (i < 4 ? { zh: '研发', css: 'var(--dev)', token: '--dev' } : { zh: '运维', css: 'var(--ops)', token: '--ops' });
const themeListeners = [];
document.getElementById('theme-toggle').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('aegis-theme', next); } catch {}
  themeListeners.forEach(apply => apply());
});

// The benchmarks at each covered stage, and the site route of every page the landing links to.
const STAGE_BENCHES = { 2: ['A'], 4: ['B'], 6: ['C', 'D'] };
const ROUTES = { index: '/benchmarks', board: '/leaderboard', A: '/benchmarks/bench-a', B: '/benchmarks/bench-b', C: '/benchmarks/bench-c', D: '/benchmarks/bench-d' };
const openPage = key => navigate(ROUTES[key]);
document.querySelectorAll('[data-proto]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); openPage(a.dataset.proto); }));
document.querySelectorAll('[data-bench]').forEach(el => {
  el.addEventListener('click', () => openPage(el.dataset.bench));
  el.addEventListener('keydown', e => { if (e.key === 'Enter') openPage(el.dataset.bench); });
});
// A stage with one benchmark opens it; a stage with several asks which.
const chooser = document.createElement('div'); chooser.className = 'chooser'; chooser.setAttribute('role', 'menu'); document.body.appendChild(chooser);
let chooserAnchor = null;
const closeChooser = () => { chooser.classList.remove('is-open'); chooserAnchor = null; };
function openStage(stage, anchor) {
  const benches = STAGE_BENCHES[stage];
  if (!benches) return;
  if (benches.length === 1) { openPage(benches[0]); return; }
  chooser.innerHTML = `<p>${pad2(stage)} ${STAGES[stage].name} · ${benches.length} 个评测基准</p>` + benches.map(b => `<a href="#" role="menuitem" data-pick="${b}">Bench ${b}</a>`).join('');
  chooser.querySelectorAll('[data-pick]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); closeChooser(); openPage(a.dataset.pick); }));
  const r = anchor.getBoundingClientRect();
  chooser.classList.add('is-open'); chooserAnchor = anchor;
  const w = chooser.offsetWidth, h = chooser.offsetHeight;
  const left = Math.min(innerWidth - w - 16, Math.max(16, r.left + r.width / 2 - w / 2));
  const top = r.bottom + h + 12 < innerHeight ? r.bottom + 8 : r.top - h - 8;
  chooser.style.transform = ''; chooser.style.left = `${left}px`; chooser.style.top = `${top}px`;
}
document.addEventListener('click', e => { if (chooserAnchor && !chooser.contains(e.target) && !chooserAnchor.contains(e.target)) closeChooser(); }, { signal });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeChooser(); }, { signal });
window.addEventListener('scroll', closeChooser, { passive: true, signal });
// Flush with the top edge at the top of the page; once the page scrolls the nav floats as a pill, as on the inner pages.
const nav = document.querySelector('.nav');
const floatNav = () => nav.classList.toggle('is-floating', scrollY > 8);
floatNav();
window.addEventListener('scroll', floatNav, { passive: true, signal });
// Position of each stage along the loop, as a share of one lap; the development half spans .25 to .75.
const STATION_AT = [0.35, 0.45, 0.55, 0.65, 0.85, 0.95, 1.05, 1.15];
const LAP_START = STATION_AT[0];
const pad2 = n => String(n + 1).padStart(2, '0');

// The mark is drawn from the same lemniscate as the loop, so the loop can settle into it exactly.
const LOOP_SIZE = 12; const LOOP_HALF_HEIGHT = LOOP_SIZE / Math.sqrt(8);
function lemniscatePath(from, to, steps) {
  return Array.from({ length: steps + 1 }, (_, k) => {
    const t = from + (to - from) * k / steps; const d = 1 + Math.sin(t) ** 2;
    return `${k ? 'L' : 'M'}${(LOOP_SIZE * Math.cos(t) / d).toFixed(3)} ${(LOOP_SIZE * Math.sin(t) * Math.cos(t) / d).toFixed(3)}`;
  }).join('');
}
const LOGO = { dev: lemniscatePath(Math.PI / 2, Math.PI * 1.5, 160), ops: lemniscatePath(-Math.PI / 2, Math.PI / 2, 160), lap: lemniscatePath(0, Math.PI * 2, 320) };
document.querySelectorAll('svg[data-logo]').forEach(el => {
  el.setAttribute('viewBox', `${-LOOP_SIZE} ${(-LOOP_HALF_HEIGHT).toFixed(3)} ${LOOP_SIZE * 2} ${(LOOP_HALF_HEIGHT * 2).toFixed(3)}`);
  const agentDot = el.dataset.logo === 'sign' && !reducedQuery.matches ? `<circle r="0.55"><animateMotion dur="16s" repeatCount="indefinite" path="${LOGO.lap}"/></circle>` : '';
  el.innerHTML = `<path class="dev" d="${LOGO.dev}"/><path class="ops" d="${LOGO.ops}"/>${agentDot}`;
});

const rail = document.getElementById('rail');
const railButtons = STAGES.map((stage, i) => {
  if (i === 4) rail.appendChild(document.createElement('hr'));
  const b = document.createElement('button');
  b.type = 'button';
  b.className = stage.covered ? 'is-covered' : '';
  b.style.setProperty('--c', half(i).css);
  b.setAttribute('aria-label', `${pad2(i)} ${stage.name}${stage.covered ? '' : '（规划中）'}`);
  b.innerHTML = `<span class="name">${half(i).zh} · ${stage.name}${stage.covered ? '' : ' · 规划中'}</span>${pad2(i)}<span class="dot"></span>`;
  b.addEventListener('click', () => scrollToSection(`stage-${pad2(i)}`));
  rail.appendChild(b);
  return b;
});

const sections = [...document.querySelectorAll('[data-key]')];
const keys = sections.map(s => s.dataset.key);
let anchors = sections.map(() => 0);
const sectionTop = el => el.getBoundingClientRect().top + scrollY;
function measure() {
  const vh = innerHeight; const max = Math.max(1, document.documentElement.scrollHeight - vh);
  anchors = sections.map((el, i) => (i === 0 ? 0 : Math.min(max, Math.max(0, sectionTop(el) + el.offsetHeight / 2 - vh / 2))));
  return max;
}
function scrollToSection(id) {
  const i = sections.findIndex(s => s.id === id);
  window.scrollTo({ top: anchors[i], behavior: reducedQuery.matches ? 'auto' : 'smooth' });
}
document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const id = a.getAttribute('href').slice(1);
  if (sections.some(s => s.id === id)) { e.preventDefault(); scrollToSection(id); }
}));

const toast = document.getElementById('toast');
let toastTimer;
document.querySelectorAll('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
  const source = document.getElementById(btn.dataset.copy);
  try { await navigator.clipboard.writeText(source.textContent); }
  catch { const range = document.createRange(); range.selectNodeContents(source); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range); }
  toast.textContent = btn.dataset.done;
  toast.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-on'), 1800);
}));

// Where the agent rests at each section: at a stage, or one full lap back at the start once the tour is over.
const travelAt = key => (key.startsWith('focus') ? STATION_AT[+key.split(':')[1]] : key === 'far' || key === 'logo' ? LAP_START + 1 : LAP_START);

// The scroll story: one timeline in scroll pixels, sought by the page's scroll position.
const shot = { t: 0 };
const agent = { u: LAP_START };
let timeline = null; let observer = null;
let onLayout = () => {};
function buildStory() {
  if (observer) observer.revert();
  if (timeline) timeline.revert();
  const max = measure(); const vh = innerHeight; const last = sections.length - 1;
  shot.t = 0; agent.u = LAP_START;
  timeline = createTimeline({ autoplay: false, defaults: { ease: 'inOutSine' } });
  for (let i = 0; i < last; i++) {
    const from = anchors[i]; const span = anchors[i + 1] - from;
    if (span <= 0) continue;
    timeline.add(shot, { t: [i, i + 1], duration: span * 0.72 }, from + span * 0.14);
    timeline.add(agent, { u: [travelAt(keys[i]), travelAt(keys[i + 1])], duration: span * 0.72 }, from + span * 0.14);
  }
  sections.forEach((section, k) => {
    const copy = section.querySelector('[data-fade]');
    if (!copy) return;
    const at = anchors[k];
    if (k > 0) {
      utils.set(copy, { opacity: 0, translateY: 28 });
      timeline.add(copy, { opacity: [0, 1], translateY: [28, 0], duration: vh * 0.3, ease: 'outCubic' }, Math.max(0, at - vh * 0.45));
    }
    timeline.add(copy, { opacity: [1, 0], translateY: [0, -28], duration: vh * 0.28, ease: 'inCubic' }, Math.min(max - 1, at + vh * 0.3));
    section.querySelectorAll('.leaders').forEach((leaders, n) => {
      utils.set(leaders, { '--reveal': 0 });
      timeline.add(leaders, { '--reveal': [0, 1], duration: vh * 0.35, ease: 'outCubic' }, Math.max(0, at - vh * 0.3 + n * vh * 0.08));
    });
  });
  timeline.add({ end: 0 }, { end: 1, duration: 1 }, max - 1);
  observer = onScroll({ target: document.body, enter: 'top top', leave: 'bottom bottom', sync: 0.9 });
  observer.link(timeline);
  onLayout();
}

// A covered stage's scene is also a way into its benchmark.
document.querySelectorAll('.vignette').forEach(el => {
  const stage = +el.dataset.stage; el.style.setProperty('--c', half(stage).css);
  const benches = STAGE_BENCHES[stage];
  if (!benches) return;
  el.classList.add('is-link');
  el.insertAdjacentHTML('beforeend', `<span class="go">${benches.map(b => `Bench ${b}`).join(' · ')} →</span>`);
  el.addEventListener('click', () => openStage(stage, el));
});

// Each stage's small scene loops while the reader is at that stage. The timelines hold colour values, so a theme change rebuilds them.
const buildVignettes = () => [...document.querySelectorAll('.vignette')].map(el => {
  const stage = +el.dataset.stage;
  const FAINT = tok('--ink-3'); const OK = tok('--ok'); const BAD = tok('--bad'); const OPS = tok('--ops');
  const root = el.querySelector('svg'); const q = sel => [...root.querySelectorAll(sel)];
  const tl = createTimeline({ autoplay: false, loop: true, playbackRate: 0.7, defaults: { ease: 'outCubic' } });
  tl.set(root, { opacity: 1 }, 0);
  const draw = sel => svg.createDrawable(q(sel));
  const scenes = [
    () => {
      const strokes = draw('.draw'); const ticks = draw('.tick');
      tl.set(strokes, { draw: '0 0' }, 0).set(ticks, { draw: '0 0' }, 0).set(q('.row'), { opacity: 0, translateX: -10 }, 0)
        .add(strokes, { draw: ['0 0', '0 1'], duration: 520, delay: stagger(140) }, 100)
        .add(q('.row'), { opacity: [0, 1], translateX: [-10, 0], duration: 320, delay: stagger(160) }, '-=120')
        .add(ticks, { draw: ['0 0', '0 1'], duration: 260, delay: stagger(240) }, '+=80');
    },
    () => {
      const links = draw('.link'); const motion = svg.createMotionPath(root.querySelector('#v1-flow'));
      tl.set(q('.node'), { scale: 0, opacity: 0 }, 0).set(links, { draw: '0 0' }, 0).set(q('.dot'), { opacity: 0 }, 0)
        .add(q('.node'), { scale: [0, 1], opacity: [0, 1], duration: 360, delay: stagger(150), ease: 'outBack' }, 100)
        .add(links, { draw: ['0 0', '0 1'], duration: 420, delay: stagger(120) }, '-=100')
        .add(q('.dot'), { opacity: [0, 1], duration: 120 })
        .add(q('.dot'), { translateX: motion.translateX, translateY: motion.translateY, duration: 1500, ease: 'inOutSine' });
    },
    () => {
      const lines = q('.code'); const caret = q('.caret')[0];
      tl.set(lines, { width: 0 }, 0).set(caret, { x: 56, y: 57 }, 0);
      lines.forEach((line, k) => {
        const x = +line.getAttribute('x'); const y = +line.getAttribute('y'); const w = +line.dataset.w || +line.getAttribute('width');
        line.dataset.w = String(w);
        tl.set(caret, { x, y: y - 3 }).add(line, { width: [0, w], duration: 120 + w * 2.2, ease: 'linear' }).add(caret, { x: x + w + 4, duration: 120 + w * 2.2, ease: 'linear' }, '<<');
      });
    },
    () => {
      const marks = draw('.draw');
      tl.set(q('.drow'), { opacity: 0 }, 0).set(q('.mark-bg'), { opacity: 0 }, 0).set(q('.comment'), { scale: 0, opacity: 0 }, 0).set(marks, { draw: '0 0' }, 0)
        .add(q('.drow'), { opacity: [0, 1], duration: 260, delay: stagger(110) }, 100)
        .add(q('.mark-bg'), { opacity: [0, 1], duration: 300, delay: stagger(140) })
        .add(q('.comment'), { scale: [0, 1], opacity: [0, 1], duration: 360, ease: 'outBack' }, '+=200')
        .add(marks, { draw: ['0 0', '0 1'], duration: 420, delay: stagger(160) }, '+=500');
    },
    () => {
      const rows = q('.trow'); const checks = rows.map(r => svg.createDrawable(r.querySelector('.chk'))[0]); const cross = draw('.cross');
      tl.set(q('.st'), { stroke: FAINT }, 0).set(checks, { draw: '0 0' }, 0).set(cross, { draw: '0 0', opacity: 1 }, 0).set(q('.prog'), { width: 0 }, 0).set(q('.rerun'), { opacity: 0 }, 0);
      rows.forEach((row, k) => {
        const st = row.querySelector('.st');
        if (k === 2) tl.add(st, { stroke: BAD, duration: 160 }).add(cross, { draw: ['0 0', '0 1'], duration: 220 }, '<<');
        else tl.add(st, { stroke: OK, duration: 160 }).add(checks[k], { draw: ['0 0', '0 1'], duration: 220 }, '<<');
        tl.add(q('.prog'), { width: 60 * (k + 1) - (k === 2 ? 60 : 0) - (k > 2 ? 60 : 0), duration: 200 }, '<<');
      });
      tl.add(q('.rerun'), { opacity: [0, 1], duration: 200 }, '+=300')
        .add(cross, { opacity: [1, 0], duration: 200 }, '+=300')
        .add(rows[2].querySelector('.st'), { stroke: OK, duration: 200 }, '<<')
        .add(checks[2], { draw: ['0 0', '0 1'], duration: 220 })
        .add(q('.prog'), { width: 300, duration: 300 }, '<<')
        .add(q('.rerun'), { opacity: 0, duration: 200 });
    },
    () => {
      const stops = q('.st');
      tl.set(stops, { stroke: FAINT }, 0).set(q('.token'), { translateX: 0 }, 0).set(q('.done'), { scale: 1, opacity: 0 }, 0)
        .add(stops[0], { stroke: OPS, duration: 160 }, 100);
      [84, 168, 252].forEach((dx, k) => tl.add(q('.token'), { translateX: dx, duration: 520, ease: 'inOutSine' }, '+=180').add(stops[k + 1], { stroke: OPS, duration: 160 }));
      tl.add(q('.done'), { scale: [1, 1.9], opacity: [0.9, 0], duration: 700 });
    },
    () => {
      const sig = draw('.sig'); const rec = draw('.rec');
      tl.set(sig, { draw: '0 0' }, 0).set(rec, { draw: '0 0' }, 0).set(q('.pulse'), { scale: 0.5, opacity: 0 }, 0).set(q('.status'), { fill: BAD }, 0)
        .set(q('.alert-text'), { opacity: 1 }, 0).set(q('.ok-text'), { opacity: 0 }, 0)
        .add(sig, { draw: ['0 0', '0 1'], duration: 1100, ease: 'linear' }, 100)
        .add(q('.pulse'), { scale: [0.5, 2.4], opacity: [1, 0], duration: 600, ease: 'outQuad' })
        .add(q('.pulse'), { scale: [0.5, 2.4], opacity: [1, 0], duration: 600, ease: 'outQuad' })
        .add(rec, { draw: ['0 0', '0 1'], duration: 1000, ease: 'linear' }, '+=150')
        .add(q('.status'), { fill: OK, duration: 220 }, '-=200')
        .add(q('.alert-text'), { opacity: 0, duration: 150 }, '<<')
        .add(q('.ok-text'), { opacity: 1, duration: 200 });
    },
    () => {
      const scatter = [[-48, -34, -18], [30, 46, 14], [-14, 52, -8], [52, -40, 22], [-60, 24, 12], [34, 14, -16]];
      q('.block').forEach((b, k) => tl.set(b, { translateX: scatter[k][0], translateY: scatter[k][1], rotate: scatter[k][2] }, 0));
      tl.set(q('.v-old'), { opacity: 1 }, 0).set(q('.v-new'), { opacity: 0 }, 0)
        .add(q('.block'), { translateX: 0, translateY: 0, rotate: 0, duration: 700, delay: stagger(110), ease: 'inOutCubic' }, 400)
        .add(q('.v-old'), { opacity: 0, duration: 200 }, '+=150')
        .add(q('.v-new'), { opacity: 1, duration: 250 });
    },
  ];
  scenes[stage]();
  tl.add(root, { opacity: [1, 0], duration: 320 }, '+=1500');
  // The resting frame shown under reduced motion: the scene's last moment before it fades.
  const rest = tl.duration - 340;
  return { el, stage, tl, rest, playing: false };
});
let vignettes = buildVignettes();
themeListeners.push(() => { vignettes.forEach(v => v.tl.revert()); vignettes = buildVignettes(); });

let renderer = null;
try { renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('scene'), antialias: true, powerPreference: 'high-performance' }); }
catch { document.documentElement.classList.add('no-webgl'); }

// Smoke: soft points that stream along the loop. Their spread, size and opacity take them from a drifting cloud to a fine line.
const SMOKE_SHADER = {
  vertexShader: `attribute float aS; attribute vec3 aRand; attribute float aSeed;
    uniform float uTime; uniform float uSpread; uniform float uSize; uniform float uPixelRatio;
    uniform vec3 uDev; uniform vec3 uOps; uniform vec3 uMist; uniform float uTint;
    varying vec3 vColor;
    vec3 lemniscate(float s) { float t = s * 6.2831853; float d = 1.0 + sin(t) * sin(t); return vec3(12.0 * cos(t) / d, 0.7 * sin(t), 12.0 * sin(t) * cos(t) / d); }
    void main() {
      float s = fract(aS + uTime * 0.0024 * (0.6 + 0.8 * aSeed));
      vec3 p = lemniscate(s);
      float a = uTime * (0.1 + aSeed * 0.18) + aSeed * 6.2831853;
      vec3 off = vec3(aRand.x * cos(a) - aRand.z * sin(a), aRand.y, aRand.x * sin(a) + aRand.z * cos(a));
      off += 0.7 * vec3(sin(s * 31.0 + uTime * 0.24 + aSeed * 9.0), 0.5 * sin(s * 23.0 + uTime * 0.16), cos(s * 27.0 + uTime * 0.2 + aSeed * 5.0));
      p += off * uSpread * (0.35 + 0.65 * aSeed);
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = uSize * uPixelRatio * (0.5 + aSeed) * (30.0 / -mv.z);
      float dev = smoothstep(0.2, 0.3, s) * (1.0 - smoothstep(0.7, 0.8, s));
      vColor = mix(uMist, mix(uOps, uDev, dev), uTint);
    }`,
  // On the dark page the smoke glows (added light); on the light page it is a soft haze laid over the paper.
  fragmentShader: `uniform float uAlpha; uniform float uLight; varying vec3 vColor;
    void main() { float r = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, r); float k = a * a * uAlpha;
      gl_FragColor = uLight > 0.5 ? vec4(vColor, min(1.0, k * 1.3)) : vec4(vColor * k, 1.0); }`,
};

if (renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(tok('--bg'));
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 600);
  const loop = new THREE.Group(); scene.add(loop);
  const logoSlot = document.getElementById('logo-slot');
  const lineMaterials = [];
  const lineMaterial = params => { const m = new LineMaterial({ worldUnits: false, transparent: true, ...params }); lineMaterials.push(m); return m; };
  const devColor = new THREE.Color(tok('--dev')); const opsColor = new THREE.Color(tok('--ops')); const bgColor = new THREE.Color(tok('--bg')); const inkColor = new THREE.Color(tok('--ink')); const faintColor = new THREE.Color(tok('--ink-3'));
  // Materials whose colour is one theme token, recoloured when the theme changes.
  const themed = [];
  const tinted = (material, token) => { material.color.set(tok(token)); themed.push([material, token]); return material; };
  const halfColor = x => { const dev = THREE.MathUtils.smoothstep(x, 0.2, 0.3) * (1 - THREE.MathUtils.smoothstep(x, 0.7, 0.8)); return opsColor.clone().lerp(devColor, dev); };

  const pointAt = s => { const t = s * Math.PI * 2; const d = 1 + Math.sin(t) ** 2; return new THREE.Vector3(12 * Math.cos(t) / d, 0.7 * Math.sin(t), 12 * Math.sin(t) * Math.cos(t) / d); };
  const curve = new THREE.CatmullRomCurve3(Array.from({ length: 480 }, (_, k) => pointAt(k / 480)), true);
  const SEGMENTS = 1200;
  const pathPoints = curve.getPoints(SEGMENTS);
  const pathGeometry = new LineGeometry();
  pathGeometry.setPositions(pathPoints.flatMap(p => [p.x, p.y, p.z]));
  pathGeometry.setColors(pathPoints.flatMap((_, k) => halfColor(k / SEGMENTS).toArray()));
  const pathMaterial = lineMaterial({ vertexColors: true, linewidth: 2 });
  loop.add(new Line2(pathGeometry, pathMaterial));
  const underlayMaterial = lineMaterial({ vertexColors: true, linewidth: 9, opacity: 0.1 });
  loop.add(new Line2(pathGeometry, underlayMaterial));

  const SMOKE = 9000; const rnd = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  const smokeGeometry = new THREE.BufferGeometry();
  smokeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(SMOKE * 3), 3));
  smokeGeometry.setAttribute('aS', new THREE.Float32BufferAttribute(Float32Array.from({ length: SMOKE }, () => rnd()), 1));
  smokeGeometry.setAttribute('aRand', new THREE.Float32BufferAttribute(Float32Array.from({ length: SMOKE * 3 }, () => rnd() * 2 - 1), 3));
  smokeGeometry.setAttribute('aSeed', new THREE.Float32BufferAttribute(Float32Array.from({ length: SMOKE }, () => rnd()), 1));
  const smokeMaterial = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uSpread: { value: 3 }, uSize: { value: 50 }, uAlpha: { value: 0.05 }, uPixelRatio: { value: renderer.getPixelRatio() }, uDev: { value: devColor }, uOps: { value: opsColor }, uMist: { value: new THREE.Color(tok('--mist')) }, uTint: { value: 0.35 }, uLight: { value: 0 } }, vertexShader: SMOKE_SHADER.vertexShader, fragmentShader: SMOKE_SHADER.fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const smoke = new THREE.Points(smokeGeometry, smokeMaterial); smoke.frustumCulled = false; loop.add(smoke);

  const dots = [];
  for (let x = -26; x <= 26; x += 1.3) for (let z = -16; z <= 16; z += 1.3) dots.push(x, -0.9, z);
  const floorGeometry = new THREE.BufferGeometry(); floorGeometry.setAttribute('position', new THREE.Float32BufferAttribute(dots, 3));
  const floorMaterial = tinted(new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false }), '--ink-3');
  scene.add(new THREE.Points(floorGeometry, floorMaterial));

  // Chevrons drifting along the loop show which way it runs.
  const CHEVRONS = 26;
  const chevronGeometry = new LineSegmentsGeometry();
  chevronGeometry.setPositions(new Float32Array(CHEVRONS * 12)); chevronGeometry.setColors(new Float32Array(CHEVRONS * 12));
  const chevronMaterial = lineMaterial({ vertexColors: true, linewidth: 1.5 });
  loop.add(new LineSegments2(chevronGeometry, chevronMaterial));

  // The agent and its wake: a short stretch of the loop behind it, fading into the floor colour.
  const WAKE = 48;
  const wakeGeometry = new LineGeometry();
  wakeGeometry.setPositions(new Float32Array(WAKE * 3)); wakeGeometry.setColors(new Float32Array(WAKE * 3));
  const wake = new Line2(wakeGeometry, lineMaterial({ vertexColors: true, linewidth: 3 }));
  loop.add(wake);
  const writeLine = (geometry, positions, colors) => {
    const segment = (src, dst) => { for (let k = 0; k < src.length / 3 - 1; k++) dst.set(src.subarray(k * 3, k * 3 + 6), k * 6); };
    segment(positions, geometry.attributes.instanceStart.data.array); geometry.attributes.instanceStart.data.needsUpdate = true;
    segment(colors, geometry.attributes.instanceColorStart.data.array); geometry.attributes.instanceColorStart.data.needsUpdate = true;
  };
  const circlePoints = (r, n = 64) => Array.from({ length: n + 1 }, (_, k) => { const a = k / n * Math.PI * 2; return [Math.cos(a) * r, Math.sin(a) * r, 0]; }).flat();
  const ring = (r, token, params = {}) => { const g = new LineGeometry(); g.setPositions(circlePoints(r)); const l = new Line2(g, tinted(lineMaterial({ linewidth: 1.5, ...params }), token)); l.computeLineDistances(); return l; };

  const labelsLayer = document.getElementById('labels');
  const stations = STAGES.map((stage, i) => {
    const token = half(i).token;
    const base = new THREE.Group(); base.position.copy(pointAt(STATION_AT[i] % 1)); loop.add(base);
    const face = new THREE.Group(); base.add(face);
    let ripple = null;
    if (stage.covered) {
      face.add(new THREE.Mesh(new THREE.CircleGeometry(0.24, 48), tinted(new THREE.MeshBasicMaterial(), token)));
      face.add(ring(0.42, token));
      ripple = ring(0.42, token, { opacity: 0 }); face.add(ripple);
    } else {
      face.add(new THREE.Mesh(new THREE.CircleGeometry(0.26, 48), tinted(new THREE.MeshBasicMaterial(), '--bg')));
      face.add(ring(0.26, '--ink-3', { dashed: true, dashSize: 0.07, gapSize: 0.06 }));
    }
    const label = document.createElement('div');
    label.className = 'slabel' + (stage.covered ? ' is-link' : ' is-planned');
    label.innerHTML = `<b>${pad2(i)}</b>${stage.name}`;
    labelsLayer.appendChild(label);
    // The node itself is the target: it opens the stage's benchmark, or says the stage is still being built.
    const hot = document.createElement('button'); hot.type = 'button'; hot.tabIndex = -1;
    hot.className = 'hotspot' + (stage.covered ? '' : ' is-planned'); hot.style.setProperty('--c', half(i).css);
    hot.dataset.tip = stage.covered ? `${STAGE_BENCHES[i].map(b => `Bench ${b}`).join(' · ')} →` : '评测基准建设中';
    labelsLayer.appendChild(hot);
    if (stage.covered) { hot.addEventListener('click', () => openStage(i, hot)); label.addEventListener('click', () => openStage(i, label)); }
    return { ...stage, index: i, base, face, ripple, label, hot };
  });
  const lobeLabels = [['研发', 'DEV', 'var(--dev)', new THREE.Vector3(-7.2, 0, 0)], ['运维', 'OPS', 'var(--ops)', new THREE.Vector3(7.2, 0, 0)]].map(([zh, en, color, at]) => {
    const el = document.createElement('div'); el.className = 'llabel'; el.style.setProperty('--c', color);
    el.innerHTML = `<strong>${zh}</strong><span>${en}</span>`; labelsLayer.appendChild(el);
    return { el, at };
  });
  const agentFace = new THREE.Group(); loop.add(agentFace);
  agentFace.add(new THREE.Mesh(new THREE.CircleGeometry(0.13, 32), tinted(new THREE.MeshBasicMaterial(), '--ink')));
  agentFace.add(ring(0.24, '--ink', { opacity: 0.6 }));

  const applyTheme = () => {
    const light = document.documentElement.dataset.theme === 'light';
    devColor.set(tok('--dev')); opsColor.set(tok('--ops')); bgColor.set(tok('--bg')); inkColor.set(tok('--ink')); faintColor.set(tok('--ink-3'));
    scene.background.set(bgColor);
    for (const [material, token] of themed) material.color.set(tok(token));
    smokeMaterial.uniforms.uMist.value.set(tok('--mist'));
    smokeMaterial.uniforms.uLight.value = light ? 1 : 0;
    smokeMaterial.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending; smokeMaterial.needsUpdate = true;
    pathGeometry.setColors(pathPoints.flatMap((_, k) => halfColor(k / SEGMENTS).toArray()));
  };
  applyTheme(); themeListeners.push(applyTheme);

  // Fit the loop and its labels into a screen rectangle, from a fixed viewing direction.
  const probe = new THREE.PerspectiveCamera(36, 1, 0.1, 600);
  const v = new THREE.Vector3();
  function fit(rect, dir, withLabels = true) {
    const w = innerWidth, h = innerHeight; probe.aspect = w / h; probe.updateProjectionMatrix();
    const samples = [];
    for (let k = 0; k < 96; k++) samples.push(loop.localToWorld(pointAt(k / 96)));
    if (withLabels) for (const s of stations) samples.push(loop.localToWorld(s.base.position.clone().add(new THREE.Vector3(0, 1.1, 0))));
    const box = d => {
      probe.position.copy(dir).multiplyScalar(d); probe.lookAt(0, 0, 0); probe.updateMatrixWorld();
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const p of samples) { v.copy(p).project(probe); const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      return { x0, x1, y0, y1 };
    };
    let d = 40;
    for (let k = 0; k < 4; k++) { const b = box(d); d *= Math.max((b.x1 - b.x0) / (rect.right - rect.left), (b.y1 - b.y0) / (rect.bottom - rect.top)); }
    const b = box(d);
    return { pos: dir.clone().multiplyScalar(d).toArray(), target: [0, 0, 0], off: [(b.x0 + b.x1) / 2 - (rect.left + rect.right) / 2, (b.y0 + b.y1) / 2 - (rect.top + rect.bottom) / 2] };
  }
  const fits = {}; let focusPoint = [0, 0];
  onLayout = () => {
    const w = innerWidth, h = innerHeight; const narrow = narrowQuery.matches;
    // The mark's slot as it stands once the page is scrolled to the end, where the loop lies flat and settles into it.
    loop.rotation.y = 0; loop.updateMatrixWorld(true);
    const slot = document.getElementById('logo-slot').getBoundingClientRect();
    const slotTop = slot.top + scrollY - Math.max(0, document.documentElement.scrollHeight - h);
    fits.logo = { ...fit({ left: slot.left, right: slot.right, top: slotTop, bottom: slotTop + slot.height }, new THREE.Vector3(0, 1, 0.012).normalize(), false), slotTop };
    loop.rotation.y = narrow ? -Math.PI / 2 : 0; loop.updateMatrixWorld(true);
    const dir = narrow ? new THREE.Vector3(0, 1.15, 0.75).normalize() : new THREE.Vector3(0, 0.62, 1).normalize();
    const low = narrow ? new THREE.Vector3(0, 0.9, 1).normalize() : new THREE.Vector3(0, 0.36, 1).normalize();
    // Behind the title the loop overflows the screen, so it reads as atmosphere rather than a diagram.
    fits.smoke = fit(narrow ? { left: -0.25 * w, right: 1.25 * w, top: 0.02 * h, bottom: 1.05 * h } : { left: -0.1 * w, right: 1.1 * w, top: 0.12 * h, bottom: 1.02 * h }, low);
    const mapIndex = sections.findIndex(s => s.id === 'map');
    const mapCopy = sections[mapIndex].querySelector('.copy');
    const mapCopyBottom = mapCopy.offsetTop + mapCopy.offsetHeight - anchors[mapIndex];
    const side = narrow ? 20 : 96;
    fits.map = fit({ left: side, right: w - side, top: Math.max(110, mapCopyBottom + 56), bottom: h - (narrow ? 24 : 40) }, dir);
    // Behind the closing sections the loop is mist again, framed as it is behind the title.
    fits.far = fits.smoke;
    // Focused, the station sits in the free column with room for its scene above it.
    const stageCopy = document.querySelector('#stage-03 .copy');
    const textRight = stageCopy.offsetLeft + stageCopy.offsetWidth;
    focusPoint = narrow ? [w / 2, h * 0.45] : [Math.min(w - 230, Math.max(w * 0.68, textRight + 240)), h * 0.78];
  };

  const world = new THREE.Vector3();
  function keyState(key, narrow) {
    const [type, arg] = key.split(':');
    // The mark follows its slot as the footer scrolls into place, so it never rests on the copy above.
    if (type === 'logo') return { ...fits.logo, off: [fits.logo.off[0], fits.logo.off[1] - (logoSlot.getBoundingClientRect().top - fits.logo.slotTop)] };
    if (type !== 'focus') return fits[type];
    // The camera keeps facing the loop from the front and only slides and zooms, so the reader always knows where on the loop they are.
    const S = stations[+arg].base.getWorldPosition(world).clone();
    const dir = narrow ? [0, 0.9, 0.75] : [0.1, 0.55, 1]; const d = narrow ? 17 : 15;
    const n = Math.hypot(...dir);
    return { pos: [S.x + dir[0] / n * d, S.y + dir[1] / n * d, S.z + dir[2] / n * d], target: S.toArray(), off: [innerWidth / 2 - focusPoint[0], innerHeight / 2 - focusPoint[1]] };
  }
  const tmp = new THREE.Vector3(); const projected = new THREE.Vector3();
  function toScreen(p) { projected.copy(p).project(camera); return { x: (projected.x * 0.5 + 0.5) * innerWidth, y: (-projected.y * 0.5 + 0.5) * innerHeight, inView: projected.z < 1 && Math.abs(projected.x) < 1.05 && Math.abs(projected.y) < 1.05 }; }
  function place(el, p, opacity) {
    const s = toScreen(p); const visible = s.inView && opacity > 0.02;
    el.style.opacity = visible ? opacity.toFixed(3) : '0';
    if (visible) el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px) translate(-50%, -100%)`;
  }

  const tether = document.getElementById('tether');
  const tetherLine = document.createElementNS('http://www.w3.org/2000/svg', 'line'); tether.appendChild(tetherLine);
  const chevronPositions = chevronGeometry.attributes.instanceStart.data.array; const chevronColors = chevronGeometry.attributes.instanceColorStart.data.array;
  const wakePositions = new Float32Array(WAKE * 3); const wakeColors = new Float32Array(WAKE * 3);
  const up = new THREE.Vector3(0, 1, 0); const side = new THREE.Vector3(); const tangent = new THREE.Vector3(); const p = new THREE.Vector3();
  const inverseLoop = new THREE.Quaternion();
  const veilSide = document.getElementById('veil-side'); const veilDim = document.getElementById('veil-dim'); const veilHero = document.getElementById('veil-hero');
  const signLogo = document.querySelector('svg[data-logo="sign"]'); signLogo.style.opacity = '0';
  let elapsed = 0; let lastTime = performance.now();
  const render = now => {
    const dt = Math.min(0.05, (now - lastTime) / 1000); lastTime = now;
    const reduced = reducedQuery.matches; const narrow = narrowQuery.matches;
    if (!reduced) elapsed += dt;
    const t = shot.t; const i = Math.floor(t); const f = t - i; const j = Math.min(i + 1, keys.length - 1);
    const weight = new Map();
    weight.set(keys[i], (weight.get(keys[i]) || 0) + (1 - f));
    weight.set(keys[j], (weight.get(keys[j]) || 0) + f);
    const smokeW = weight.get('smoke') || 0; const mapW = weight.get('map') || 0; const farW = weight.get('far') || 0; const logoW = weight.get('logo') || 0;
    // The loop is mist behind the title and again behind the closing sections, and a fine line everywhere else.
    const mist = Math.min(1, smokeW + farW);
    const form = 1 - mist;
    // At the very end it lies flat in the footer and hands over to the mark drawn there.
    const handover = THREE.MathUtils.smoothstep(logoW, 0.86, 1);
    loop.rotation.y = narrow ? -Math.PI / 2 * (1 - logoW) : 0;
    loop.updateMatrixWorld(true);

    const A = keyState(keys[i], narrow); const B = keyState(keys[j], narrow);
    const mix = (a, b) => a.map((x, k) => x + (b[k] - x) * f);
    camera.position.set(...mix(A.pos, B.pos));
    camera.lookAt(...mix(A.target, B.target));
    const [ox, oy] = mix(A.off, B.off);
    camera.setViewOffset(innerWidth, innerHeight, ox, oy, innerWidth, innerHeight);
    camera.updateMatrixWorld();
    scene.updateMatrixWorld();
    inverseLoop.copy(loop.quaternion).invert();

    // The smoke condenses into the line as the reader leaves the title.
    const ease = form * form * (3 - 2 * form);
    smokeMaterial.uniforms.uTime.value = elapsed;
    // Behind the title the smoke is a pale, nearly neutral mist; it takes on the two halves' colours as it condenses.
    smokeMaterial.uniforms.uSpread.value = 1.9 * (1 - ease) + 0.04;
    smokeMaterial.uniforms.uSize.value = 46 * (1 - ease) + 2.2;
    smokeMaterial.uniforms.uAlpha.value = (farW > 0 ? 0.016 : 0.026) * (1 - ease) + 0.14 * ease * (1 - logoW);
    smokeMaterial.uniforms.uTint.value = 0.35 + 0.55 * ease;
    veilHero.style.opacity = smokeW.toFixed(3);
    pathGeometry.instanceCount = Math.floor(THREE.MathUtils.smoothstep(form, 0.35, 0.95) * SEGMENTS);
    // On the way to the footer only faint smoke crosses the copy; the line shows once it is nearly in the mark's place.
    const nearMark = logoW > 0 ? THREE.MathUtils.smoothstep(logoW, 0.72, 0.9) : 1;
    pathMaterial.opacity = THREE.MathUtils.smoothstep(form, 0.3, 0.8) * nearMark * (1 - handover);
    underlayMaterial.opacity = 0.1 * pathMaterial.opacity;
    floorMaterial.opacity = 0.32 * pathMaterial.opacity * (1 - logoW);
    chevronMaterial.opacity = 0.85 * pathMaterial.opacity * (1 - logoW);
    signLogo.style.opacity = handover.toFixed(3);

    const u = reduced ? LAP_START : agent.u;
    for (let k = 0; k < CHEVRONS; k++) {
      const s = ((k / CHEVRONS) + elapsed * 0.004) % 1;
      curve.getPoint(s, p); curve.getTangent(s, tangent); side.crossVectors(tangent, up).normalize();
      const tip = p.clone().addScaledVector(tangent, 0.16);
      const a = p.clone().addScaledVector(tangent, -0.1).addScaledVector(side, 0.15);
      const b = p.clone().addScaledVector(tangent, -0.1).addScaledVector(side, -0.15);
      chevronPositions.set([...a.toArray(), ...tip.toArray(), ...b.toArray(), ...tip.toArray()], k * 12);
      const c = halfColor(s);
      for (let q = 0; q < 4; q++) chevronColors.set(c.toArray(), k * 12 + q * 3);
    }
    chevronGeometry.attributes.instanceStart.data.needsUpdate = true; chevronGeometry.attributes.instanceColorStart.data.needsUpdate = true;
    for (let k = 0; k < WAKE; k++) {
      const s = ((u - 0.07 * (1 - k / (WAKE - 1))) % 1 + 1) % 1;
      curve.getPoint(s, p); wakePositions.set([p.x, p.y + 0.02, p.z], k * 3);
      wakeColors.set(bgColor.clone().lerp(inkColor, (k / (WAKE - 1)) ** 1.6).toArray(), k * 3);
    }
    writeLine(wakeGeometry, wakePositions, wakeColors);
    const showAgent = form > 0.98 && logoW < 0.05;
    wake.visible = showAgent; agentFace.visible = showAgent;
    curve.getPoint(u % 1, p); agentFace.position.copy(p).add(new THREE.Vector3(0, 0.03, 0));
    agentFace.quaternion.copy(inverseLoop).multiply(camera.quaternion);

    let current = -1;
    for (const s of stations) {
      const at = STATION_AT[s.index] % 1;
      const focusW = weight.get(`focus:${s.index}`) || 0;
      if (focusW > 0.5) current = s.index;
      const reached = THREE.MathUtils.smoothstep(form, 0.55 + at * 0.35, 0.65 + at * 0.35);
      s.base.scale.setScalar(reached * (1 + 0.5 * focusW) * (1 - logoW));
      s.face.quaternion.copy(inverseLoop).multiply(camera.quaternion);
      if (s.ripple) { const phase = (elapsed * 0.22 + s.index * 0.23) % 1; s.ripple.scale.setScalar(1 + phase * 1.1); s.ripple.material.opacity = (1 - phase) * 0.55 * reached; }
      place(s.label, s.base.getWorldPosition(tmp).add(new THREE.Vector3(0, 0.5, 0)), mapW * reached);
      if (s.covered) s.label.style.pointerEvents = mapW * reached > 0.5 ? 'auto' : 'none';
      const at2 = toScreen(s.base.getWorldPosition(tmp)); const active = Math.max(mapW, focusW) * reached;
      s.hot.style.transform = `translate(${at2.x.toFixed(1)}px, ${at2.y.toFixed(1)}px)`;
      s.hot.style.opacity = active > 0.3 && at2.inView ? '1' : '0';
      s.hot.style.pointerEvents = active > 0.5 && at2.inView ? 'auto' : 'none';
    }
    for (const l of lobeLabels) place(l.el, loop.localToWorld(tmp.copy(l.at)), mapW);

    // The focused stage's scene floats above its station, tied to it by a short dashed line.
    let tetherShown = false;
    for (const vg of vignettes) {
      const focusW = weight.get(`focus:${vg.stage}`) || 0;
      const s = toScreen(stations[vg.stage].base.getWorldPosition(tmp));
      const box = vg.el.getBoundingClientRect();
      const left = Math.min(innerWidth - box.width - 16, Math.max(16, s.x - box.width / 2));
      const top = Math.max(76, s.y - box.height - (narrow ? 34 : 46));
      vg.el.style.opacity = (focusW * focusW).toFixed(3);
      vg.el.style.pointerEvents = focusW > 0.5 && STAGE_BENCHES[vg.stage] ? 'auto' : 'none';
      vg.el.style.transform = `translate(${left.toFixed(1)}px, ${(top + (1 - focusW) * 16).toFixed(1)}px)`;
      if (focusW > 0.5) {
        tetherShown = true; tether.style.setProperty('--c', half(vg.stage).css);
        tetherLine.setAttribute('x1', s.x); tetherLine.setAttribute('y1', s.y - 14); tetherLine.setAttribute('x2', s.x); tetherLine.setAttribute('y2', top + box.height);
        tetherLine.style.opacity = String((focusW - 0.5) * 2);
        if (!vg.playing) { vg.playing = true; if (reduced) vg.tl.seek(vg.rest); else vg.tl.restart(); }
      } else if (vg.playing) { vg.playing = false; vg.tl.pause(); }
    }
    if (!tetherShown) tetherLine.style.opacity = '0';

    veilSide.style.opacity = Math.max(0, 1 - smokeW - mapW - logoW).toFixed(3);
    veilDim.style.opacity = (farW * 0.25).toFixed(3);
    railButtons.forEach((b, k) => b.classList.toggle('is-current', k === current));
    renderer.render(scene, camera);
  };

  const resize = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    for (const m of lineMaterials) m.resolution.set(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    onLayout();
  };
  window.addEventListener('resize', resize, { signal });
  resize();
  renderer.setAnimationLoop(render);
}

let rebuildTimer;
window.addEventListener('resize', () => { clearTimeout(rebuildTimer); rebuildTimer = setTimeout(buildStory, 200); }, { signal });
document.fonts.ready.then(() => { if (!signal.aborted) buildStory(); });
buildStory();

return () => {
  controller.abort();
  clearTimeout(rebuildTimer);
  clearTimeout(toastTimer);
  observer?.revert();
  timeline?.revert();
  renderer?.setAnimationLoop(null);
  renderer?.dispose();
  renderer?.forceContextLoss();
  chooser.remove();
};
}
