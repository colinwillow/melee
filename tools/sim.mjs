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

const MELEE_BEAT = k => M.MELEE.beat[Math.min(k, M.MELEE.beat.length - 1)];
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


console.log('\n-- 9. THE GAIT USES ALL THREE CLIPS --');
// "walk at slower speeds, the run at mid speeds and the run fast as highest." A blend that
// never reaches its top clip is the bug this pins: the old bands put the sprint's handover at
// 3.90 against a top speed of 4.55, so `run_fwd_fast` lived in the top 14% of the stick.
function gaitAt(v) {
  reset(0, 0); p.slot = 0; p.grounded = true;
  for (let i = 0; i < 60; i++) { p.speed = v; p.vel.set(0, 0, v); M.rigAnim(DT); }
  const w = M.rig.cw, C = M.CLIPS;
  return { idle: w[C.idle] || 0, walk: w[C.walk] || 0, run: w[C.run] || 0, sprint: w[C.sprint] || 0 };
}
for (const [v, want] of [[0, 'idle'], [0.9, 'walk'], [3.5, 'run'], [7.0, 'sprint']]) {
  const g = gaitAt(v);
  const top = Object.keys(g).reduce((a, b) => (g[a] >= g[b] ? a : b));
  ok(`at ${v.toFixed(1).padStart(4)} m/s the dominant clip is ${want.padEnd(6)}`, top === want,
     `idle ${g.idle.toFixed(2)} walk ${g.walk.toFixed(2)} run ${g.run.toFixed(2)} sprint ${g.sprint.toFixed(2)}`);
}

console.log('\n-- 10. THE BLASTER IS A CHARGE SHOT, NOT A FIRING LOOP --');
// hold up on the right pad, charge, release -> exactly ONE bolt.
reset(0, 0); cam.az = 0;
p.slot = 1;                                     // blaster
ok('carrying it arms the gait', M.gunOut(), 'gunOut() is what puts him on the rifle idle');
M.BOLTS.length = 0;
const pushUp = () => { stick.R.down = 1; stick.R.x = 0; stick.R.y = -1; };   // -y is UP the pad
const letGo  = () => { stick.R.down = 0; stick.R.x = 0; stick.R.y = 0; };
let armedAt = -1;
for (let i = 0; i < 48; i++) { pushUp(); M.stepKit(DT); if (armedAt < 0 && p.aim) armedAt = i * DT; }
ok('holding up takes the firing position', p.aim === 1 && armedAt >= 0,
   `armed after ${armedAt.toFixed(3)} s (WEAP.armT ${M.WEAP.armT})`);
const chgHalf = p.chg;
for (let i = 0; i < 48; i++) { pushUp(); M.stepKit(DT); }
ok('the charge fills while it is held', p.chg > chgHalf && p.chg > .9,
   `${chgHalf.toFixed(2)} -> ${p.chg.toFixed(2)} of a full charge`);
ok('nothing has been fired yet -- it is not a loop', M.BOLTS.length === 0, `${M.BOLTS.length} bolts in the air`);
const atRelease = p.chg;
letGo(); M.stepKit(DT);
ok('the RELEASE is the shot', M.BOLTS.length === 1, `${M.BOLTS.length} bolt, fired at charge ${atRelease.toFixed(2)}`);
const fullBall = M.BOLTS.length ? M.BOLTS[0].size : 0;
ok('and the charge is spent', p.chg === 0 && p.aim === 0, `chg ${p.chg.toFixed(2)}, aim ${p.aim}`);
// A FUMBLE IS NOT A SHOT. Under `minChg` the release fires nothing -- otherwise every stray
// brush of the top of the pad is a bolt, and the charge stops meaning anything.
M.BOLTS.length = 0; p.chg = 0; p.aim = 0; p.armT = 0;
for (let i = 0; i < 8; i++) { pushUp(); M.stepKit(DT); }
const fumble = p.chg; letGo(); M.stepKit(DT);
ok('a flick off the top of the pad fires nothing', M.BOLTS.length === 0,
   `charge reached ${fumble.toFixed(3)}, under WEAP.minChg ${M.WEAP.minChg}`);
// and a bigger charge has to be a bigger ball, or the hold buys nothing
M.BOLTS.length = 0; p.chg = 0; p.aim = 0; p.armT = 0;
for (let i = 0; i < 32; i++) { pushUp(); M.stepKit(DT); }
const partial = p.chg; letGo(); M.stepKit(DT);
ok('a part charge makes a smaller ball than a full one',
   M.BOLTS.length === 1 && M.BOLTS[0].size < fullBall,
   `charge ${partial.toFixed(2)} -> ${M.BOLTS[0].size.toFixed(3)} m ball, vs ${atRelease.toFixed(2)} -> ${fullBall.toFixed(3)} m`);
M.BOLTS.length = 0;
// and a sideways drag is still the CAMERA, not the trigger
reset(0, 0); p.slot = 1;
for (let i = 0; i < 60; i++) { stick.R.down = 1; stick.R.x = 1; stick.R.y = 0; M.stepKit(DT); }
ok('a sideways drag never arms the trigger', p.aim === 0 && M.BOLTS.length === 0, 'WEAP.arc is what buys this');
letGo(); M.stepKit(DT);
ok('and letting go of a drag fires nothing', M.BOLTS.length === 0, `${M.BOLTS.length} bolts`);

console.log('\n-- 11. THE MELEE CHAIN TRAVELS --');
reset(0, 0); cam.az = 0; p.slot = 0;
let total = 0;
for (let k = 0; k < 3; k++) {
  const z0 = p.pos.z;
  M.meleeGo(0);
  run(MELEE_BEAT(k) + .05);
  total += p.pos.z - z0;
}
ok('three strikes carry him a real distance', total > 5,
   `${total.toFixed(2)} m over the chain (was about 1 m)`);


console.log('\n-- 12. THE LANDING PLAYS ALL THE WAY THROUGH --');
// The state used to last `land` seconds while the clip was scaled to play over `land * 1.9`,
// so the hard landing ended with more than half its clip still to run and the gait took over
// mid-roll. A state whose length disagrees with the clip it is playing can only ever cut it off.
reset(0, 0); cam.az = 0;
p.pos.y = 9; p.grounded = false; p.vel.set(0, 0, 0);
let landedAt = -1, tt = 0;
for (let i = 0; i < 200 && landedAt < 0; i++) { M.stepPlayer(DT); M.rigAnim(DT); tt += DT; if (p.land) landedAt = tt; }
ok('a long drop reads as the HARD landing', p.landHard === 1 && Math.abs(p.land - MOVE.landHard) < 1e-6,
   `impact ${p.fallV.toFixed(1)} m/s vs MOVE.hardLand ${MOVE.hardLand}, state ${p.land.toFixed(2)} s`);
// held still, the clip has to keep full weight well past halfway.
// ONCE IT IS IN, IT STAYS IN -- which is not the same as "it is at 1 on every frame". The
// weights are DAMPED, so the first fifth of a second is the blend arriving, and an earlier
// version of this case recorded that ramp as its minimum and called a working landing a
// failure. What is under test is whether anything pulls it back DOWN before `landFree`.
let heldTo = 0, wPeak = 0, wAfter = 1, arrived = 0;
for (let i = 0; i < Math.round(MOVE.landHard * .66 / DT); i++) {
  M.stepPlayer(DT); M.rigAnim(DT);
  if (!p.land) break;
  const w = M.rig.cw[M.CLIPS.landHard] || 0;
  heldTo = p.landT; wPeak = Math.max(wPeak, w);
  if (w > .9) arrived = 1;
  if (arrived) wAfter = Math.min(wAfter, w);
}
ok('the landing clip reaches full weight', wPeak > .95, `peaked at ${wPeak.toFixed(2)}`);
ok('and is not pulled back down before landFree', p.land > 0 && arrived && wAfter > .9,
   `still in it at ${heldTo.toFixed(2)} s of ${MOVE.landHard}, lowest weight after it arrived ${wAfter.toFixed(2)}`);
// and a nudge of the stick must not kill it early
reset(0, 0); p.pos.y = 9; p.grounded = false;
for (let i = 0; i < 200 && !p.land; i++) { M.stepPlayer(DT); M.rigAnim(DT); }
let killedAt = -1; tt = 0;
for (let i = 0; i < 200 && p.land; i++) { hold(0, -1); M.stepPlayer(DT); M.rigAnim(DT); tt += DT; }
killedAt = tt;
ok('the stick cannot run him out before landFree', killedAt >= MOVE.landHard * MOVE.landFree - DT * 2,
   `broke out at ${killedAt.toFixed(2)} s, floor is ${(MOVE.landHard * MOVE.landFree).toFixed(2)}`);

console.log('\n-- 13. THE CHARGED SWING IS A GROUND DASH, AND THE HOLD DECIDES HOW FAR --');
// **THIS CASE HAS NOW TRACKED THE RULE THROUGH THREE SHAPES**: m21's arc solved from the gap,
// m36's flat hop solved from the hold, and m37's ground dash that never leaves the floor at all.
// Each time it went red while the code was right until it was moved, which is a suite nobody
// reads. **When a rule changes, its case changes in the same commit.**
reset(0, 0); cam.az = 0; p.slot = 3;            // hammer
p.charge = 1; p.chargeT = M.MELEE.charge;       // fully wound
M.chargeRelease();
ok('it never leaves the ground', p.vel.y === 0 && p.grounded, `vy ${p.vel.y.toFixed(2)}, grounded ${p.grounded}`);
const farFull = p.goGap;
const yGo = p.pos.y;
let goApex = 0, zGo = p.pos.z;
run(1.2, () => { goApex = Math.max(goApex, p.pos.y - yGo); });
ok('and stays on the floor the whole way', goApex < .05, `${goApex.toFixed(3)} m up`);
ok('a full hold covers what it solved for', Math.abs((p.pos.z - zGo) - farFull) < 1.0,
   `travelled ${(p.pos.z - zGo).toFixed(2)} m for a ${farFull.toFixed(2)} m solve`);
ok('and that is a real distance', farFull > 7, `${farFull.toFixed(2)} m`);
// a half charge goes less far -- and that is the ONLY thing the hold changes now
reset(0, 0); cam.az = 0; p.slot = 3;
p.charge = 1; p.chargeT = M.MELEE.charge * .5;
M.chargeRelease();
ok('a half hold carries less far', p.goGap < farFull * .85, `${p.goGap.toFixed(2)} m against ${farFull.toFixed(2)}`);
// and a man in front still shortens it, so it lands ON him rather than through him
{
  const K = M.FOE;
  M.DUMMIES.length = 0;
  M.DUMMIES.push({ K, root: { position: { x: 0, y: 0, z: 5 }, rotation: { y: 0 } }, st: 'idle', hp: K.hp,
                   hpMax: K.hp, cool: 0, h: 0, actions: {}, clips: {}, cw: {}, bar: null });
  reset(0, 0); cam.az = 0; p.slot = 3;
  p.charge = 1; p.chargeT = M.MELEE.charge;
  M.chargeRelease();
  ok('a man in the way shortens it', p.goGap < farFull, `${p.goGap.toFixed(2)} m for a man at 5, free is ${farFull.toFixed(2)}`);
  const z1 = p.pos.z;
  run(1.2);
  ok('and it lands him ON him', Math.abs((p.pos.z - z1) - p.goGap) < 1.0,
     `travelled ${(p.pos.z - z1).toFixed(2)} m for a ${p.goGap.toFixed(2)} m solve`);
  M.DUMMIES.length = 0;
}
// AND A CHARGED HIT FLINGS HIM, WITH THE DISTANCE GRADED BY THE CHARGE
{
  const K = M.FOE;
  const mk = () => { M.DUMMIES.length = 0;
    const f = { K, root: { position: { x: 0, y: 0, z: 3 }, rotation: { y: 0 } }, st: 'idle', hp: K.hp,
                hpMax: K.hp, cool: 0, h: 0, vx: 0, vy: 0, vz: 0, actions: {}, clips: {}, cw: {}, bar: null };
    M.DUMMIES.push(f); return f; };
  reset(0, 0); p.slot = 3; p.charge = 1; p.chargeT = M.MELEE.charge;
  M.chargeRelease();
  const powFull = 1.0 * p.chargeGoK;
  reset(0, 0); p.slot = 3; p.charge = 1; p.chargeT = M.MELEE.charge * .5;
  M.chargeRelease();
  const powHalf = 1.0 * p.chargeGoK;
  let f = mk(); M.dummyBlow(f, 0, powFull, K.dmg.weap);
  const flungFull = Math.hypot(f.vx, f.vz), downFull = f.st === 'down';
  f = mk(); M.dummyBlow(f, 0, powHalf, K.dmg.weap);
  const flungHalf = Math.hypot(f.vx, f.vz);
  ok('a full charge flings him', downFull && flungFull > 3, `${flungFull.toFixed(1)} m/s, up ${f.vy.toFixed(1)}, power ${powFull.toFixed(2)} vs fling ${K.fling}`);
  ok('and a half charge flings him LESS', flungHalf < flungFull, `${flungHalf.toFixed(1)} against ${flungFull.toFixed(1)} m/s`);
  M.DUMMIES.length = 0;
}

console.log('\n-- 14. THE WARRIOR NOTICES, CLOSES, SWINGS, AND GOES DOWN --');
// **HIS BODY IS FABRICATED AND THAT IS A STATED GAP.** The warrior GLB is draco and no harness
// here can build a skin, so what is under test is the BRAIN -- which reads `root.position`,
// `st`, `hp` and a clip table and nothing else. The clip names are the real ones out of the
// file and the durations are real, so the beats and the scaling are the real arithmetic. The
// mount, the bar and the poses are device questions.
{
  const { openGLB } = await import(pathToFileURL(process.cwd() + '/tools/glb.mjs').href);
  const { json: wg, read: wread } = openGLB('models/characters/alien_warrior.glb');
  const K = M.FOE;
  K.loops = new Set([K.clips.idle, K.clips.walk, K.clips.run, K.clips.block]);
  const mkFoe = (x, z) => {
    const root = { position: { x, y: 0, z }, rotation: { y: 0 } };
    const d = { K, root, model: null, mixer: { update() {} }, actions: {}, clips: {}, cw: {},
                faceOff: 0, st: 'idle', t: 0, hp: K.hp, hpMax: K.hp, cool: 0, back: 0,
                vx: 0, vy: 0, vz: 0, cur: '', aggro: 0, think: 0, gap: 0, seen: 0, bar: null, barT: 0,
                h: 0 };
    for (const a of wg.animations || []) {
      let t0 = Infinity, t1 = 0;
      for (const ch of a.channels) { const t = wread(a.samplers[ch.sampler].input); t0 = Math.min(t0, t[0]); t1 = Math.max(t1, t[t.length - 1]); }
      d.clips[a.name] = { name: a.name, duration: t1 - t0 };
      d.actions[a.name] = { _w: 0, _r: false,
        reset() { this._r = true; return this; }, play() { this._r = true; return this; }, stop() { this._r = false; return this; },
        setEffectiveTimeScale() { return this; }, setEffectiveWeight(w) { this._w = w; return this; },
        getEffectiveWeight() { return this._w; }, isRunning() { return this._r; } };
    }
    M.DUMMIES.push(d);
    return d;
  };
  const clear = () => { M.DUMMIES.length = 0; };

  // EVERY NAME IN THE TABLE IS IN THE FILE. One that is not leaves a bone at zero total weight,
  // and the mixer blends a zero-weight bone back to the BIND pose -- the T-pose exactly.
  {
    const want = [];
    for (const k in K.clips) { const v = K.clips[k]; Array.isArray(v) ? want.push(...v) : want.push(v); }
    const have = new Set((wg.animations || []).map(a => a.name));
    const gone = want.filter(n => !have.has(n));
    ok('every clip the table names is in the file', gone.length === 0, gone.join(', '));
  }

  // --- he ignores you from far away, and notices when you are near
  clear(); reset(0, 0);
  let d = mkFoe(0, 60);
  M.stepDummies(DT);
  ok('he ignores you from 60 m', !d.aggro, `notice is ${K.notice} m`);
  d.root.position.z = K.notice - 2;
  M.stepDummies(DT);
  ok('and notices you inside `notice`', !!d.aggro, `at ${(K.notice - 2)} m`);

  // --- he closes the distance
  clear(); reset(0, 0);
  d = mkFoe(0, 16);
  for (let i = 0; i < 60 * 12; i++) M.stepDummies(DT);
  const gap = Math.hypot(d.root.position.x - p.pos.x, d.root.position.z - p.pos.z);
  ok('he closes to his reach', gap < K.hold + .6, `${gap.toFixed(2)} m, hold is ${K.hold}`);
  ok('and he faces you when he gets there', Math.abs(((d.h - Math.PI + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) < .3,
     `${(d.h * 180 / Math.PI).toFixed(0)} deg, you are at 180`);

  // --- and he hits you, and he does more than one thing while doing it
  clear(); reset(0, 0); p.hp = M.HEALTH.max;
  d = mkFoe(0, 2.2); d.aggro = 1; d.h = Math.PI;
  // **WHAT "NOT REPETITIVE" MEANS IS MEASURABLE**: over a long fight he uses more than one
  // state and more than one swing clip. *"They only ever do one swing, they don't try to block
  // at all, there's no variation."* Counting swings alone cannot see any of that.
  const seenSt = {}, seenSwing = {};
  let swings = 0;
  for (let i = 0; i < 60 * 40; i++) {
    const s0 = d.st, c0 = d.cur;
    M.stepDummies(DT);
    seenSt[d.st] = (seenSt[d.st] || 0) + 1;
    if (d.st === 'swing') { seenSwing[d.cur] = (seenSwing[d.cur] || 0) + 1; if (s0 !== 'swing' || c0 !== d.cur) swings++; }
  }
  ok('he swings at you, repeatedly', swings >= 3, `${swings} swings in 40 s`);
  ok('and it costs you health', p.hp < M.HEALTH.max, `HP ${p.hp.toFixed(0)} of ${M.HEALTH.max}`);
  ok('he uses more than one swing clip', Object.keys(seenSwing).length >= 2,
     Object.keys(seenSwing).length + ' of ' + K.clips.swings.length + ': ' + Object.keys(seenSwing).join(', '));
  ok('and more than one state -- he blocks and circles too', Object.keys(seenSt).length >= 3,
     JSON.stringify(seenSt));

  // --- every blow shoves him, not just the one that puts him down
  clear(); reset(0, 0);
  d = mkFoe(0, 3); d.hp = K.hp;
  const z0k = d.root.position.z;
  M.dummyBlow(d, 0, M.MELEE.power[0], K.dmg.fist);   // straight down +Z, away from the player
  ok('a landed punch shoves him', Math.hypot(d.vx, d.vz) > 1,
     `${Math.hypot(d.vx, d.vz).toFixed(2)} m/s, state ${d.st}`);
  for (let i = 0; i < 60; i++) M.stepDummies(DT);
  const moved = d.root.position.z - z0k;
  ok('and he actually travels', moved > .2 && moved < 3, `${moved.toFixed(2)} m in a second`);
  ok('and it stops', Math.hypot(d.vx, d.vz) < .1, `${Math.hypot(d.vx, d.vz).toFixed(3)} m/s left`);

  // --- and being hit does not look the same every time
  clear(); reset(0, 0);
  d = mkFoe(0, 3);
  const seenHit = {};
  for (let i = 0; i < 24; i++) {
    d.cool = 0; d.st = 'idle'; d.hp = K.hp;
    M.dummyBlow(d, 0, M.MELEE.power[i % 2], K.dmg.fist);
    if (d.st === 'hit') seenHit[d.cur] = (seenHit[d.cur] || 0) + 1;
  }
  ok('a hit does not look the same every time', Object.keys(seenHit).length >= 3,
     Object.keys(seenHit).length + ' of ' + K.clips.hits.length + ': ' + JSON.stringify(seenHit));

  // --- three of them do not stand inside each other
  clear(); reset(0, 0);
  const pack = [mkFoe(0, 8), mkFoe(.3, 8.2), mkFoe(-.2, 7.9)];
  for (const f of pack) f.aggro = 1;
  for (let i = 0; i < 60 * 10; i++) M.stepDummies(DT);
  let worst = 99;
  for (let i = 0; i < pack.length; i++) for (let j = i + 1; j < pack.length; j++)
    worst = Math.min(worst, Math.hypot(pack[i].root.position.x - pack[j].root.position.x,
                                       pack[i].root.position.z - pack[j].root.position.z));
  ok('three of them keep out of each other', worst > K.sep * 1.6,
     `closest pair ${worst.toFixed(2)} m, two radii is ${(K.sep * 2).toFixed(2)}`);

  // --- a swing thrown forwards does not hit a man standing behind him
  clear(); reset(0, 0); p.hp = M.HEALTH.max;
  d = mkFoe(0, 2.2); d.aggro = 1; d.h = 0;            // facing AWAY from the player
  d.st = 'swing'; d.t = 0; d.swung = 0; d.cur = K.clips.swings[0];
  for (let i = 0; i < 60 * 2; i++) M.stepDummies(DT);
  ok('a swing the wrong way misses', p.hp === M.HEALTH.max, `HP ${p.hp.toFixed(0)}`);

  // --- damage is per weapon, at a power a FIST actually carries
  clear(); reset(0, 0);
  d = mkFoe(0, 3); d.hp = K.hp;
  const PW = M.MELEE.power[0];                      // .45 -- the first punch of the chain
  M.dummyBlow(d, 0, PW, K.dmg.fist);  const afterFist = d.hp;
  d.cool = 0; d.st = 'idle';
  M.dummyBlow(d, 0, PW, K.dmg.bolt);  const afterBolt = d.hp;
  ok('a bolt costs more than a fist', (K.hp - afterFist) < (afterFist - afterBolt),
     `fist ${(K.hp - afterFist).toFixed(2)}, bolt ${(afterFist - afterBolt).toFixed(2)}`);
  // AND THE REAL CHAIN IS WHAT DECIDES HOW LONG A FIGHT IS -- three strikes at .45 / .52 / 1.0,
  // the last of which is over `fling` and launches him by design. Measuring the first strike's
  // power over and over measures a move nobody throws.
  clear(); reset(0, 0);
  d = mkFoe(0, 3); d.hp = K.hp;
  let blows = 0;
  while (d.st !== 'down' && blows < 40) {
    d.cool = 0; if (d.st !== 'down') d.st = 'idle';
    M.dummyBlow(d, 0, M.MELEE.power[blows % 3], K.dmg.fist); blows++;
  }
  ok('a melee chain puts him down', d.st === 'down', `${blows} strikes`);
  ok('and it took more than one', blows > 1, `${blows}`);

  // --- but ONE full-charge bolt flings him, whatever his health says
  clear(); reset(0, 0);
  d = mkFoe(0, 3); d.hp = K.hp;
  M.dummyBlow(d, 0, 1.0, K.dmg.bolt);
  ok('a full charge sends him flying outright', d.st === 'down' && Math.hypot(d.vx, d.vz) > 2,
     `${Math.hypot(d.vx, d.vz).toFixed(1)} m/s out, ${d.vy.toFixed(1)} up -- fling is ${K.fling}`);
  clear(); reset(0, 0);
  d = mkFoe(0, 3); d.hp = K.hp;
  M.dummyBlow(d, 0, .5, K.dmg.bolt);
  ok('and a half charge does not', d.st !== 'down', `state ${d.st}, hp ${d.hp.toFixed(1)}`);

  // --- a blast catches everybody in it
  clear(); reset(0, 0);
  const crowd = [mkFoe(0, 6), mkFoe(1.4, 6), mkFoe(-1.4, 6)];
  const before = crowd.map(f => f.hp);
  M.dummyHit(0, 6, 0, 1.0, M.WEAP.ball1 * .5 + M.WEAP.blast1, K.dmg.bolt);
  const struck = crowd.filter((f, i) => f.hp !== before[i] || f.st === 'down').length;
  ok('a full blast catches a crowd, not one of them', struck === 3, `${struck} of 3`);
  clear();

  // --- and he gets back up on his own clock. FROM HIS OWN KNOCK-DOWN, not from whatever state
  // the case before happened to leave lying about -- a harness reading a body it did not put
  // there measures the previous case.
  clear(); reset(0, 0);
  d = mkFoe(0, 9); d.hp = K.hp;          // far enough that he is not swinging while he stands up
  M.dummyBlow(d, 0, 1.0, K.dmg.bolt);
  let upAt = -1;
  for (let i = 0; i < 60 * 16; i++) { M.stepDummies(DT); if (upAt < 0 && d.st !== 'down') upAt = i * DT; }
  ok('he gets back up by himself', upAt > 0, `off the floor after ${upAt.toFixed(1)} s`);
  ok('at full health', d.hp === d.hpMax, `${d.hp} of ${d.hpMax}`);
  clear();
}

console.log('\n-- 15. THE HICK DOES NOT FIGHT, HE RUNS --');
// Same fabricated-body gap as the warrior: the GLB is draco, so what is under test is the brain
// and the table. His clip names and durations come straight out of the file.
{
  const { openGLB } = await import(pathToFileURL(process.cwd() + '/tools/glb.mjs').href);
  const { json: hg, read: hread } = openGLB('models/characters/hick_skinny.glb');
  const K = M.HICK;
  K.loops = new Set([K.clips.idle, K.clips.walk, K.clips.run, K.clips.flee]);
  const mkHick = (x, z) => {
    const root = { position: { x, y: 0, z }, rotation: { y: 0 } };
    const d = { K, root, model: null, mixer: { update() {} }, actions: {}, clips: {}, cw: {},
                faceOff: 0, st: 'idle', t: 0, hp: K.hp, hpMax: K.hp, cool: 0, back: 0,
                vx: 0, vy: 0, vz: 0, cur: '', aggro: 0, think: 0, gap: 0, bar: null, barT: 0,
                hx: x, hz: z, rx: x, rz: z, roamT: 0, fleeT: 0, h: 0 };
    for (const a of hg.animations || []) {
      let t0 = Infinity, t1 = 0;
      for (const ch of a.channels) { const t = hread(a.samplers[ch.sampler].input); t0 = Math.min(t0, t[0]); t1 = Math.max(t1, t[t.length - 1]); }
      d.clips[a.name] = { name: a.name, duration: t1 - t0 };
      d.actions[a.name] = { _w: 0, _r: false,
        reset() { this._r = true; return this; }, play() { this._r = true; return this; }, stop() { this._r = false; return this; },
        setEffectiveTimeScale() { return this; }, setEffectiveWeight(w) { this._w = w; return this; },
        getEffectiveWeight() { return this._w; }, isRunning() { return this._r; } };
    }
    M.DUMMIES.push(d);
    return d;
  };

  // EVERY NAME THE TABLE CARRIES IS IN THE FILE -- except the ones deliberately left empty,
  // which are the hook for clips he has not drawn. Those must NOT be reported as missing.
  {
    const want = [], blank = [];
    for (const k in K.clips) { const v = K.clips[k];
      (Array.isArray(v) ? v : [v]).forEach(n => (n ? want : blank).push(k)); }
    const have = new Set((hg.animations || []).map(a => a.name));
    const flat = [];
    for (const k in K.clips) { const v = K.clips[k]; Array.isArray(v) ? flat.push(...v) : flat.push(v); }
    const gone = flat.filter(n => n && !have.has(n));
    ok('every clip the table names is in the file', gone.length === 0, gone.join(', '));
    ok('and the unfinished poses are named and empty', blank.length >= 4, blank.join(', ') + ' -- the hook');
  }

  // --- he wanders near where he was put, and does not walk off
  M.DUMMIES.length = 0; reset(0, 0);
  let h = mkHick(20, 20);
  for (let i = 0; i < 60 * 60; i++) M.stepDummies(DT);
  const drift = Math.hypot(h.root.position.x - 20, h.root.position.z - 20);
  ok('he ambles and stays near home', drift < K.roam * 1.4 && drift > .2,
     `${drift.toFixed(1)} m from his spawn after a minute, roam is ${K.roam}`);

  // --- he does not fight, ever, whatever you do near him
  M.DUMMIES.length = 0; reset(0, 0); p.hp = M.HEALTH.max;
  h = mkHick(0, 2.0); h.aggro = 1;
  const st = {};
  for (let i = 0; i < 60 * 30; i++) { M.stepDummies(DT); st[h.st] = (st[h.st] || 0) + 1; }
  ok('he never swings or blocks', !st.swing && !st.block, JSON.stringify(st));
  ok('and standing on him costs you nothing', p.hp === M.HEALTH.max, `HP ${p.hp.toFixed(0)}`);

  // --- shoot him and he flies, lands, and runs AWAY
  M.DUMMIES.length = 0; reset(0, 0);
  h = mkHick(0, 6);
  M.dummyBlow(h, 0, 1.0, K.dmg.bolt);
  ok('a full charge launches him', h.st === 'down' && h.vy > 1,
     `up ${h.vy.toFixed(1)}, out ${Math.hypot(h.vx, h.vz).toFixed(1)} m/s`);
  let air = 0;
  for (let i = 0; i < 60 * 2; i++) { M.stepDummies(DT); if (h.root.position.y > .25) air++; }
  ok('and he is genuinely off the ground for a while', air > 12, `${(air / 60).toFixed(2)} s in the air`);
  const z1 = h.root.position.z;
  for (let i = 0; i < 60 * 12; i++) M.stepDummies(DT);
  ok('he gets back up', h.st !== 'down', `state ${h.st}`);
  ok('and runs AWAY', h.root.position.z - z1 > 3,
     `${(h.root.position.z - z1).toFixed(1)} m further off; you are at z 0`);
  ok('and eventually calms down', h.fleeT <= 0 || h.fleeT < K.fleeMax, `fleeT ${h.fleeT.toFixed(1)}`);
  M.DUMMIES.length = 0;
}

console.log('\n' + (fails ? fails + ' FAILED' : 'all ok') + '\n');
process.exit(fails ? 1 : 0);
