// npm run gait -- WHAT SPEED IS EACH LOCOMOTION CLIP ACTUALLY WALKING AT?
//
// The clips animate IN PLACE (measured: the `root` bone carries 0.03 degrees of noise and no
// translation at all), so locomotion is code-driven and every gait clip has to be time-scaled
// by `speed / ref`. Get `ref` wrong and the feet slide -- and `ref` is exactly the kind of
// number that gets eyeballed, shipped, and then costs a build. The city repo typed two of them
// by eye and was 36% too fast on one and 37% too slow on the other, in opposite directions.
//
// SO IT IS MEASURED, AND THE MEASUREMENT IS THE PLANTED FOOT. While a foot is on the ground it
// does not move in the world; in the BODY's frame it therefore travels backwards at exactly the
// speed the body travels forwards. That holds for a walk, a run and a sprint alike with no
// assumption about stride length, double support or float time -- which is what makes it better
// than peak-to-peak foot excursion, the obvious alternative, which over-counts a walk (double
// support) and under-counts a run (float).
//
// A FOOT IS PLANTED WHEN IT IS MOVING BACKWARDS, which needs no threshold at all: the sign
// separates stance from swing by itself. A HEIGHT gate was the first version and it needs a
// fraction nobody can justify -- at 0.25 it called 74% of a walk cycle stance (too many) and
// found ONE planted frame on the right foot of `run_fwd` (too few), which is a measurement
// disagreeing with itself. Height survives only as a weak second opinion.
//
// AND EACH FOOT IS MEASURED SEPARATELY SO THE TWO CAN BE COMPARED. A pooled median hides the
// one failure that matters: if the left foot says one speed and the right says another, the
// number is not to be trusted, and the tool says so rather than quietly averaging them.
import { openGLB, poseAt, posOf, nodeIndex } from './glb.mjs';

const FILE = process.argv[2] || 'models/characters/alien_antenna_game.glb';
const { json: g, read } = openGLB(FILE);

// The clips whose reference speed the game needs, and what each is called in index.html.
const WANT = [
  ['walk_fwd', 'GAIT.walkRef'], ['run_fwd', 'GAIT.runRef'], ['run_fwd_fast', 'GAIT.sprintRef'],
  ['run_bwd', 'GAIT.backRef'], ['strafe_left', 'GAIT.strafeRef'], ['strafe_right', 'GAIT.strafeRef'],
  ['rifle_run', 'GAIT.aimRunRef'], ['rifle_run_shoot', 'GAIT.aimRunRef'],
  ['idle_01', '(control: must read ~0)'], ['idle_rifle', '(control: must read ~0)'],
];

const rootI = nodeIndex(g, 'root');
const feet = [
  { toe: nodeIndex(g, 'mixamorig_LeftToeBase'), name: 'L' },
  { toe: nodeIndex(g, 'mixamorig_RightToeBase'), name: 'R' },
];
if (rootI < 0 || feet.some(f => f.toe < 0)) { console.error('rig is missing root or toe bones'); process.exit(1); }

const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };

console.log(`GAIT REFERENCE SPEEDS  --  ${FILE}`);
console.log('measured off the PLANTED foot travelling backwards in the body frame\n');
console.log('clip                 dur      stanceL stanceR   speed m/s   travel  destination');
console.log('-----------------------------------------------------------------------------------');

const out = {};
for (const [name, dest] of WANT) {
  const anim = g.animations.find(a => a.name === name);
  if (!anim) { console.log(`  ${name.padEnd(20)} -- ABSENT`); continue; }
  let t0 = Infinity, t1 = 0;
  for (const ch of anim.channels) {
    const t = read(anim.samplers[ch.sampler].input);
    t0 = Math.min(t0, t[0]); t1 = Math.max(t1, t[t.length - 1]);
  }
  const dur = t1 - t0, N = Math.max(4, Math.round(dur * 24)) + 1;

  const fr = [];
  for (let i = 0; i < N; i++) {
    const t = t0 + (dur * i) / (N - 1);
    const w = poseAt(g, read, anim, t);
    const r = posOf(w[rootI]);
    fr.push({ t, toes: feet.map(f => { const p = posOf(w[f.toe]); return [p[0] - r[0], p[1] - r[1], p[2] - r[2]]; }) });
  }

  const per = [], stance = [0, 0], dirs = [];
  for (let k = 0; k < feet.length; k++) {
    const ys = fr.map(f => f.toes[k][1]);
    const lo = Math.min(...ys), hi = Math.max(...ys), mid = lo + (hi - lo) * 0.5;
    // pass 1: the low frames give a rough direction of travel for this foot
    const low = [];
    for (let i = 1; i < fr.length; i++) {
      if (ys[i] > mid && ys[i - 1] > mid) continue;
      const a = fr[i - 1].toes[k], b = fr[i].toes[k];
      low.push({ i, dx: b[0] - a[0], dz: b[2] - a[2], dt: fr[i].t - fr[i - 1].t });
    }
    let sx = 0, sz = 0;
    for (const e of low) { sx += e.dx; sz += e.dz; }
    const L = Math.hypot(sx, sz) || 1; sx /= L; sz /= L;
    dirs.push([sx, sz]);
    // pass 2: keep only the frames actually travelling that way. THE DIRECTION IS DERIVED,
    // NEVER ASSUMED -- an earlier version tested for the foot moving backwards in +Z, which is
    // right for a run and exactly WRONG for a backpedal (the stance foot slides FORWARD) and for
    // a strafe (it slides sideways). Both duly came back with the two feet disagreeing by 34%
    // and 44%, which is the check catching the tool rather than the asset.
    const v = [];
    for (const e of low) {
      const m = Math.hypot(e.dx, e.dz);
      if (m < 1e-6) continue;
      if ((e.dx * sx + e.dz * sz) / m < 0.5) continue;   // within 60 deg of the stance direction
      stance[k]++; v.push(m / e.dt);
    }
    per.push(median(v));
  }
  const got = per.filter(x => x > 0);
  const v = got.length ? got.reduce((a, b) => a + b, 0) / got.length : 0;
  const spread = got.length === 2 ? Math.abs(per[0] - per[1]) / (v || 1) : 1;
  out[name] = v;
  // the two feet should also agree about WHICH WAY he is going, which is what says a strafe
  // is a strafe. Reported as a bearing off his nose: 0 forward, 180 backpedal, +/-90 sideways.
  const bd = dirs.reduce((a, d) => [a[0] + d[0], a[1] + d[1]], [0, 0]);
  const way = (Math.atan2(-bd[0], -bd[1]) * 180 / Math.PI);
  const flag = v < 0.02 ? '' : spread > 0.25
    ? `  <-- FEET DISAGREE ${(spread * 100).toFixed(0)}%  (L ${per[0].toFixed(2)}  R ${per[1].toFixed(2)})` : '';
  out[name + '@dir'] = way;
  console.log(`  ${name.padEnd(20)} ${dur.toFixed(3)}s ${String(stance[0]).padStart(7)} ${String(stance[1]).padStart(7)}   ${v.toFixed(3).padStart(9)}  ${(v < 0.02 ? '     ' : (way >= 0 ? '+' : '') + way.toFixed(0) + '\u00b0').padStart(6)}  ${dest}${flag}`);
}

// A CLIP'S REFERENCE SPEED IS IN FILE UNITS AND THE GAME DRAWS HIM SCALED.
// Everything above is measured on the rig as authored; the game scales him to RIG.height, so
// every one of these must be multiplied by the same factor or the feet slide by exactly that
// ratio. Printed rather than assumed: it is one multiplication and it is invisible.
const acc = g.accessors[g.meshes[0].primitives[0].attributes.POSITION];
const authored = acc.max[1] - acc.min[1];
console.log(`\nauthored height ${authored.toFixed(4)} m  (mesh bbox Y -- GLTFLoader binds skins with IDENTITY, so this is metres)`);
for (const H of [1.6, 1.75, 1.9]) {
  const k = H / authored;
  const s = n => out[n] != null ? (out[n] * k).toFixed(2).padStart(5) : '   --';
  console.log(`  RIG.height ${H.toFixed(2)} (x${k.toFixed(3)})  walk${s('walk_fwd')}  run${s('run_fwd')}  sprint${s('run_fwd_fast')}  back${s('run_bwd')}  strafeL${s('strafe_left')}  strafeR${s('strafe_right')}  aimRun${s('rifle_run')}`);
}
console.log('\nThese are the speeds the clips WANT. They are the reference speeds, not a speed');
console.log('limit -- what he is ALLOWED to do is MOVE.run, which is a separate choice.');
