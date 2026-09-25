// npm run check:boot -- DOES THE MODULE ACTUALLY EVALUATE?
//
// `check:syntax` PARSES. It cannot see a `const` read above its own declaration, a throw at
// module top level, an undeclared assignment, or a `getElementById` that comes back null -- and
// every one of those is a BLANK PAGE: the boot card sits at the text it was born with, `init()`
// never runs, and there is nothing on screen or in a phone's console to say why.
//
// It runs the REAL module. `three` resolves to the VENDORED build through a shim that swaps
// WebGLRenderer, WebGLRenderTarget and PMREMGenerator for fakes, because a headless node has no
// GL context and those are the only things in the file that need one. The DOM, the canvases and
// localStorage are stubbed to the surface the file actually touches.
//
// AND IT EXITS HARD, because once the module is up `init()` waits on fetches that will never
// resolve, and a gate whose pass looks like a hang is a gate nobody runs.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';

// THE `three` SHIM IS WRITTEN HERE RATHER THAN ASSUMED. `vendor/GLTFLoader.js` imports the bare
// specifier 'three', which the page resolves through its <script type="importmap"> and node
// cannot resolve at all. Writing it here means an unrelated `npm i` -- which rewrites
// node_modules and would take a shim written by some other tool away -- cannot make this gate
// fail with a module-not-found that looks exactly like the blank page it exists to catch.
// A gate that cries wolf after an unrelated install is a gate nobody runs.
if (!fs.existsSync('node_modules/three/package.json')) {
  fs.mkdirSync('node_modules/three', { recursive: true });
  fs.writeFileSync('node_modules/three/package.json', JSON.stringify({
    name: 'three', version: '0.180.0-vendored', type: 'module', main: 'index.js',
    exports: { '.': './index.js' } }, null, 2));
  fs.writeFileSync('node_modules/three/index.js', "export * from '../../vendor/three.module.min.js';\n");
}

const html = fs.readFileSync('index.html', 'utf8');
const m = html.match(/<script type="module">([\s\S]*?)<\/script>/);
if (!m) { console.error('no module script in index.html'); process.exit(1); }

const TMP = path.join(os.tmpdir(), 'melee-boot');
fs.mkdirSync(TMP, { recursive: true });
const ROOT = pathToFileURL(process.cwd() + '/').href;

fs.writeFileSync(path.join(TMP, 'three-shim.mjs'), `
export * from '${ROOT}vendor/three.module.min.js';
import * as T from '${ROOT}vendor/three.module.min.js';
class FakeTarget { constructor(w, h, o) { this.width = w; this.height = h; this.texture = new T.Texture();
  this.depthTexture = (o && o.depthTexture) || null; } setSize() {} dispose() {} }
export { FakeTarget as WebGLRenderTarget };
class FakeRenderer {
  constructor() { this.domElement = globalThis.document.createElement('canvas');
    this.shadowMap = { enabled: false, type: 0 };
    this.info = { autoReset: true, render: { calls: 0, triangles: 0 }, reset() {} };
    this.capabilities = { isWebGL2: true, getMaxAnisotropy: () => 1, precision: 'highp' };
    this.outputColorSpace = ''; this.toneMapping = 0; this.toneMappingExposure = 1; }
  setSize(w, h) { this.domElement.width = w; this.domElement.height = h; }
  setPixelRatio() {} setClearColor() {} setRenderTarget() {} clear() {} render() {} dispose() {}
  compile() {} initTexture() {} getContext() { return { getParameter: () => 0 }; }
  getDrawingBufferSize(v) { return v.set(1280, 720); }
}
export { FakeRenderer as WebGLRenderer };
class FakePMREM { constructor() {} fromEquirectangular() { return { texture: new T.Texture() }; }
  compileEquirectangularShader() {} dispose() {} }
export { FakePMREM as PMREMGenerator };
`);

// STUBS:START -- lifted verbatim by any harness that needs the same headless page with a REAL
// fetch. A second harness with its own copy of these is two things to keep in step, which is
// the oldest mistake in this account; markers mean there is one copy.
const CTX2D = ['clearRect','fillRect','beginPath','moveTo','lineTo','arc','arcTo','closePath','fill','stroke',
  'save','restore','translate','rotate','scale','drawImage','fillText','strokeText','setTransform','clip',
  'quadraticCurveTo','bezierCurveTo','putImageData','ellipse','rect','setLineDash'];
function ctx2d() {
  const g = {};
  for (const k of CTX2D) g[k] = () => {};
  g.createLinearGradient = g.createRadialGradient = () => ({ addColorStop() {} });
  g.createImageData = g.getImageData = () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 });
  g.measureText = () => ({ width: 10 });
  return g;
}
const NODES = new Map();
function mkEl(tag = 'div', id = '') {
  return {
    tagName: (tag || 'div').toUpperCase(), id, nodeType: 1, children: [], childNodes: [], parentNode: null,
    style: new Proxy({}, { get: (t, k) => (k === 'setProperty' || k === 'removeProperty' ? () => {} : t[k] || ''),
                           set: (t, k, v) => (t[k] = v, true) }),
    dataset: {}, hidden: false, textContent: '', innerHTML: '', value: '', width: 1280, height: 720,
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    appendChild(c) { this.children.push(c); this.childNodes.push(c); c.parentNode = this; return c; },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) { this.children.splice(i, 1); this.childNodes.splice(i, 1); } return c; },
    insertBefore(c) { return this.appendChild(c); },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    setAttribute() {}, getAttribute: () => null, removeAttribute() {},
    setPointerCapture() {}, releasePointerCapture() {}, focus() {}, blur() {}, click() {}, remove() {},
    // A PAD LOOKS UP ITS OWN KNOB. Returning null here would be a TypeError at bind time, which
    // is the very class this gate exists for -- so the query answers for the one selector the
    // page actually uses and null for anything else.
    querySelector(sel) { return sel === '.knob' ? mkEl('div') : null; },
    querySelectorAll: () => [], contains: () => false, closest: () => null,
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 132, bottom: 132, width: 132, height: 132, x: 0, y: 0 }),
    getContext: () => ctx2d(), toDataURL: () => 'data:,',
  };
}
// A STUB THAT INVENTS AN ELEMENT FOR EVERY ID CAN NEVER CATCH A MISSING ONE. Returning a fresh
// div for whatever it is asked for means `getElementById('somethingDeleted')` succeeds here and
// returns NULL in the browser -- a TypeError at module scope, `init()` never running, and the
// boot card stuck for ever. That is exactly the failure this gate is for, and a stub that
// answers every question cannot catch a wrong one. The id set is parsed out of the page itself:
// markup attributes AND `el.id = '...'` assignments, so anything built at runtime still
// resolves, and an id that is genuinely not there returns null exactly as the browser does.
const DOMSRC = process.getBuiltinModule('fs').readFileSync('index.html', 'utf8');
const DOMIDS = new Set();
for (const mm of DOMSRC.matchAll(/\bid\s*=\s*["']([A-Za-z0-9_-]+)["']/g)) DOMIDS.add(mm[1]);
for (const mm of DOMSRC.matchAll(/\.id\s*=\s*["'`]([A-Za-z0-9_-]+)["'`]/g)) DOMIDS.add(mm[1]);
const doc = {
  body: mkEl('body'), documentElement: mkEl('html'), head: mkEl('head'),
  createElement: t => mkEl(t), createElementNS: (n, t) => mkEl(t), createTextNode: () => mkEl('text'),
  getElementById: id => {
    if (!DOMIDS.has(id)) return null;
    if (!NODES.has(id)) NODES.set(id, mkEl('div', id));
    return NODES.get(id);
  },
  querySelector: () => null, querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {}, hidden: false, visibilityState: 'visible',
  fonts: { ready: Promise.resolve(), load: () => Promise.resolve() },
};
globalThis.document = doc;
globalThis.window = globalThis;
globalThis.self = globalThis;
globalThis.innerWidth = 1280; globalThis.innerHeight = 720; globalThis.devicePixelRatio = 2;
// node 22 defines `navigator` as a getter-only global, so it has to be REDEFINED rather than
// assigned -- and so does anything else the runtime already owns.
Object.defineProperty(globalThis, 'navigator', { configurable: true, writable: true,
  value: { userAgent: 'node', maxTouchPoints: 0 } });
// **AND THE GATE CAN BE POINTED AT EITHER WORLD (m124).** `MEL_WORLD=weirdport npm run
// check:boot` takes the Weirdport branch, which is otherwise a path no gate has ever evaluated
// -- and a `const` read above its own declaration in there is a blank page exactly as it is
// anywhere else. Empty is the test site, so `npm run check` is unchanged.
const _w = process.env.MEL_WORLD || '';
globalThis.location = { href: 'http://x/' + (_w ? '?w=' + _w : ''), pathname: '/',
  search: _w ? '?w=' + _w : '', hash: '', reload() {}, replace() {} };
globalThis.localStorage = { _m: new Map(), getItem(k) { return this._m.has(k) ? this._m.get(k) : null; },
  setItem(k, v) { this._m.set(k, String(v)); }, removeItem(k) { this._m.delete(k); } };
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {};
globalThis.requestAnimationFrame = () => 0; globalThis.cancelAnimationFrame = () => {};
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
globalThis.fetch = () => Promise.reject(new Error('offline'));
globalThis.Image = class { set src(v) {} addEventListener() {} };
// STUBS:END

let src = m[1].replace(/(from\s*)['"]three['"]/g, `$1'${pathToFileURL(path.join(TMP, 'three-shim.mjs')).href}'`);
src = src.replace(/(from\s*)['"]\.\/vendor\//g, `$1'${ROOT}vendor/`);
const f = path.join(TMP, 'boot.mjs');
fs.writeFileSync(f, src);

// THE ASSET FAILURES ARE THE ENVIRONMENT, NOT THE CODE. node has no relative-URL base, so every
// load rejects before it reaches the network; failing on those would make the gate cry wolf on
// every run and nobody would read it twice. Anything ELSE that rejects is a real fault -- which
// is how a throw inside `init()` reaches the boot card in the real game.
const ENVY = /Invalid URL|Failed to parse URL|ERR_INVALID_URL|ENOTFOUND|fetch failed|offline|THREE\.GLTFLoader/i;
let failed = null;
const note = e => { const t = (e && (e.stack || e.message)) || String(e); if (!ENVY.test(t)) failed = failed || e; };
process.on('unhandledRejection', note);
process.on('uncaughtException', note);
const quiet = console.error, quietW = console.warn;
console.error = (...a) => { if (!ENVY.test(a.map(String).join(' '))) quiet(...a); };
console.warn = (...a) => { if (!ENVY.test(a.map(String).join(' '))) quietW(...a); };
try {
  await import(pathToFileURL(f).href + '?t=' + Date.now());
  await new Promise(r => setTimeout(r, 500));
} catch (e) { note(e); }
console.error = quiet; console.warn = quietW;

if (failed) {
  console.error('\nBOOT FAIL -- the module threw, which is a blank page and a boot card stuck on\n' +
                'the text it was born with. Nothing on screen or in a phone console says why.\n');
  console.error(failed && failed.stack ? failed.stack : failed);
  process.exit(1);
}
console.log('boot ok -- the module evaluates and init() runs');
process.exit(0);
