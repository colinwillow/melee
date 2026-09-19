// npm run sim -- DRIVE THE SHIPPED LOCOMOTION HEADLESSLY.
//
// Everything that matters about movement here is reachable without a GPU: the collider is boxes
// and `stepPlayer` is arithmetic. So "does he go where the thumb points" has an answer in a few
// seconds rather than costing him a look.
//
// IT CALLS `melee.stepPlayer`; IT NEVER RESTATES THE RULE. A harness with its own copy of the
// code measures a game that does not exist -- which is how a suite can pass happily while
// movement runs backwards.
//
// WHAT IT CANNOT SEE: anything to do with the SKIN. The character GLB is draco compressed and
// DRACOLoader wants a Worker, so no harness here can build a rig. Clips, weights, the mounts
// and the poses all belong on the phone (and to `npm run clips` / `npm run rig`, which read the
// file directly). `rig.ready` stays false and `rigAnim` no-ops against an empty action table.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';

// ---- the same headless page the boot gate builds, lifted between its own markers ----
const boot = fs.readFileSync('tools/boot.mjs', 'utf8');
const stubs = boot.slice(boot.indexOf('// STUBS:START'), boot.indexOf('// STUBS:END'));
(0, eval)(stubs);

if (!fs.existsSync('node_modules/three/package.json')) {
  fs.mkdirSync('node_modules/three', { recursive: true });
  fs.writeFileSync('node_modules/three/package.json', JSON.stringify({
    name: 'three', version: '0.180.0-vendored', type: 'module', main: 'index.js', exports: { '.': './index.js' } }));
  fs.writeFileSync('node_modules/three/index.js', "export * from '../../vendor/three.module.min.js';\n");
}
const TMP = path.join(os.tmpdir(), 'melee-sim');
fs.mkdirSync(TMP, { recursive: true });
const ROOT = pathToFileURL(process.cwd() + '/').href;
fs.writeFileSync(path.join(TMP, 'three-shim.mjs'), `
export * from '${ROOT}vendor/three.module.min.js';
import * as T from '${ROOT}vendor/three.module.min.js';
class R { constructor(){ this.domElement = globalThis.document.createElement('canvas');
  this.shadowMap={enabled:false,type:0}; this.info={autoReset:true,render:{calls:0,triangles:0},reset(){}};
  this.capabilities={isWebGL2:true,getMaxAnisotropy:()=>1,precision:'highp'};
  this.outputColorSpace=''; this.toneMapping=0; this.toneMappingExposure=1; }
  setSize(){} setPixelRatio(){} setClearColor(){} setRenderTarget(){} clear(){} render(){} dispose(){}
  compile(){} initTexture(){} getContext(){return{getParameter:()=>0};} getDrawingBufferSize(v){return v.set(1280,720);} }
export { R as WebGLRenderer };
class T2 { constructor(){ this.texture = new T.Texture(); } setSize(){} dispose(){} }
export { T2 as WebGLRenderTarget };
class P { fromEquirectangular(){ return { texture: new T.Texture() }; } compileEquirectangularShader(){} dispose(){} }
export { P as PMREMGenerator };
`);
const html = fs.readFileSync('index.html', 'utf8');
let src = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
src = src.replace(/(from\s*)['"]three['"]/g, `$1'${pathToFileURL(path.join(TMP, 'three-shim.mjs')).href}'`)
         .replace(/(from\s*)['"]\.\/vendor\//g, `$1'${ROOT}vendor/`);
const f = path.join(TMP, 'sim.mjs');
fs.writeFileSync(f, src);

const quiet = console.error, qw = console.warn;
console.error = () => {}; console.warn = () => {};
await import(pathToFileURL(f).href + '?t=' + Date.now());
await new Promise(r => setTimeout(r, 250));
console.error = quiet; console.warn = qw;

const M = globalThis.melee;
if (!M || !M.stepPlayer) { console.error('the module did not expose its steps'); process.exit(1); }
const { player: p, stick, cam, MOVE } = M;
const DT = 1 / 60;

function reset(x = 0, z = 0) {
  p.pos.set(x, M.groundAt(x, z, 0, MOVE.step), z);
  p.vel.set(0, 0, 0);
  p.heading = p.faceH = 0; p.speed = 0; p.grounded = true;
  p.roll = p.melee = p.chargeGo = p.charge = p.aim = p.fire = p.land = p.jump = 0;
  p.meleeChain = 0; p.goT = 0; p.airT = 0; p.coyote = 0;
  stick.L.x = stick.L.y = stick.L.down = 0;
  stick.R.x = stick.R.y = stick.R.down = 0;
}
function hold(x, y) { stick.L.down = 1; stick.L.x = x; stick.L.y = y; }
function run(secs, fn) {
  const n = Math.round(secs / DT);
  for (let i = 0; i < n; i++) { if (fn) fn(i * DT); M.stepPlayer(DT); M.rigAnim(DT); }
}
// FABRICATED ACTIONS, WITH THE REAL DURATIONS. No harness here can build a skin (the GLB is
// draco and DRACOLoader wants a Worker), and `meleeGo` rightly refuses to enter a state whose
// clip is absent -- so the melee path is unreachable without these. They carry the durations
// read straight out of the file, so the time scaling under test is the real arithmetic.
{
  const { openGLB } = await import(pathToFileURL(process.cwd() + '/tools/glb.mjs').href);
  const { json: g, read } = openGLB('models/characters/alien_antenna_game.glb');
  for (const a of g.animations || []) {
    let t0 = Infinity, t1 = 0;
    for (const ch of a.channels) { const t = read(a.samplers[ch.sampler].input); t0 = Math.min(t0, t[0]); t1 = Math.max(t1, t[t.length - 1]); }
    M.rig.clips[a.name] = { name: a.name, duration: t1 - t0 };
    M.rig.actions[a.name] = {
      _w: 0, _r: false,
      reset() { this._r = true; return this; }, play() { this._r = true; return this; }, stop() { this._r = false; return this; },
      setEffectiveTimeScale() { return this; }, setEffectiveWeight(w) { this._w = w; return this; },
      getEffectiveWeight() { return this._w; }, isRunning() { return this._r; },
    };
  }
}

const fin = v => Number.isFinite(v);
let fails = 0;
const ok = (name, cond, detail) => {
  console.log('  ' + (cond ? 'ok  ' : 'FAIL') + '  ' + name.padEnd(52) + (detail || ''));
  if (!cond) fails++;
};

console.log('\n-- 1. HE WALKS AWAY FROM THE CAMERA, AT EVERY CAMERA BEARING --');
// The version that passes while being wrong is "he walks north". That works until you turn the
// lens, which is the first thing anybody does. What has to be pinned is the DIRECTION relative
// to the camera, at several bearings.
for (const az of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 2.4]) {
  reset(0, 0); cam.az = az;
  run(1.2, () => hold(0, -1));                 // thumb straight UP the pad
  // away from the camera is the boom direction flipped: the lens sits at -sin(az),-cos(az)
  const want = { x: Math.sin(az), z: Math.cos(az) };
  const got = Math.hypot(p.pos.x, p.pos.z);
  const dot = got > .1 ? (p.pos.x / got) * want.x + (p.pos.z / got) * want.z : 0;
  ok(`az ${(az * 180 / Math.PI).toFixed(0).padStart(4)}deg  -> moves away from the lens`,
     dot > .99 && got > 1, `travelled ${got.toFixed(2)} m, dot ${dot.toFixed(4)}`);
}

console.log('\n-- 2. NOTHING GOES NON-FINITE --');
reset(0, 0); cam.az = 0;
let bad = 0;
run(6, t => {
  hold(Math.sin(t * 3), Math.cos(t * 2.3));
  if (Math.floor(t * 10) % 17 === 0) p.jump = 1;
  if (!fin(p.pos.x) || !fin(p.pos.y) || !fin(p.pos.z) || !fin(p.vel.x) || !fin(p.speed) || !fin(p.faceH)) bad++;
});
ok('6 s of thrashing the stick stays finite', bad === 0, `${bad} bad frames, ended ${p.pos.x.toFixed(1)},${p.pos.y.toFixed(2)},${p.pos.z.toFixed(1)}`);

console.log('\n-- 3. TOP SPEED IS THE SPEED THE FASTEST CLIP WALKS AT --');
reset(0, 0); cam.az = 0;
run(4, () => hold(0, -1));
ok('reaches MOVE.max holding the stick', Math.abs(p.speed - MOVE.max) < .15,
   `${p.speed.toFixed(2)} m/s vs MOVE.max ${MOVE.max}`);

console.log('\n-- 4. THE STEP-UP AND THE JUMP --');
// the 0.40 m box is under MOVE.step, so it is WALKED onto; the 1.15 m one is not
// A HARNESS THAT KEEPS DRIVING AFTER THE THING UNDER TEST HAS FINISHED IS MEASURING ITS OWN
// INPUT. The first version held the stick for 2.5 s and read the END state -- by which point he
// had walked onto the box, across it, and off the far side, so it reported y 0.00 and called a
// working step-up a failure. What is under test is whether he ever GOT up there.
reset(6, 2); cam.az = Math.PI;                  // facing -Z, toward the short box at (6,-3)
let topY = 0;
run(2.5, () => { hold(0, -1); if (p.grounded) topY = Math.max(topY, p.pos.y); });
ok('walks up onto the 0.40 m box', topY > .35, `highest ground he stood on: ${topY.toFixed(2)} m`);
reset(0, 0); cam.az = 0;
const y0 = p.pos.y; let apex = 0;
p.jump = 1;
run(1.4, () => { apex = Math.max(apex, p.pos.y - y0); });
ok('a jump gets off the ground and comes back', apex > 1.2 && p.grounded,
   `apex ${apex.toFixed(2)} m, back on the ground ${p.grounded}`);

console.log('\n-- 5. THE BOXES ARE SOLID --');
reset(-12, 2); cam.az = Math.PI;                // straight at the 5 m tower at (-12,-6)
run(3, () => hold(0, -1));
// the near face is z = -4.90 and he is a cylinder of radius r, so the correct stop is
// -4.90 + r = -4.56. An earlier pass mark of -4.4 ignored the radius and failed a clean stop.
ok('stops against the tower rather than passing through', p.pos.z > -4.90 + p.r - .06,
   `ended z ${p.pos.z.toFixed(2)}, face -4.90 + r ${p.r} = ${(-4.9 + p.r).toFixed(2)}`);

console.log('\n-- 6. THE DODGE ROLL TRAVELS, AND IN THE DIRECTION ASKED FOR --');
reset(0, 0); cam.az = 0;
M.rollGo(Math.PI / 2);                          // +X
run(1.4);
ok('rolls the way it was pointed', p.pos.x > 1.5 && Math.abs(p.pos.z) < .5,
   `moved to ${p.pos.x.toFixed(2)}, ${p.pos.z.toFixed(2)}`);

console.log('\n-- 7. A STRIKE LUNGES AND THEN STOPS --');
reset(0, 0); cam.az = 0;
M.meleeGo(0);
run(.1);
const mid = p.speed;
run(2);
ok('the lunge carries and then comes to rest', mid > 1.5 && p.speed < .4,
   `peak ${mid.toFixed(2)} m/s -> ${p.speed.toFixed(2)} m/s, travelled ${p.pos.z.toFixed(2)} m`);

console.log('\n-- 8. HE DOES NOT MOONWALK --');
// `plant` is the third idea and its absence IS the moonwalk: the velocity goes on answering the
// stick while the body has already turned. At a run his TRAVEL and his FACING have to agree.
reset(0, 0); cam.az = 0;
run(1.5, () => hold(0, -1));
run(1.5, () => hold(1, 0));                     // hard right turn, held
const travel = Math.atan2(p.vel.x, p.vel.z);
let off = Math.abs(travel - p.faceH);
while (off > Math.PI) off = Math.abs(off - Math.PI * 2);
ok('travel and facing agree at a run', off < .25,
   `${(off * 180 / Math.PI).toFixed(1)} deg apart at ${p.speed.toFixed(2)} m/s`);

console.log('\n' + (fails ? fails + ' FAILED' : 'all ok') + '\n');
process.exit(fails ? 1 : 0);
