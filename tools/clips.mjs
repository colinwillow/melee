// npm run clips -- WHAT IS ACTUALLY IN EACH ANIMATION?
//
// "He holds the pose" is a sentence with half a dozen causes and they are not distinguishable
// by reading the code. This reads the samplers straight out of the GLB -- they are NOT draco
// compressed, draco only ever touches mesh primitives -- so every one of those causes has an
// answer in about a second and with nothing installed.
//
// A QUATERNION COMPONENT DELTA IS NOT A ROTATION. `q` and `-q` are the same rotation, so a
// component swinging from -1 to +1 reads as a delta of 2 and is a sign flip the interpolant
// takes the short way round. Measuring components makes a six-frame stride and a static clip
// look identical; the honest number is 2*acos(|dot|), which is sign-insensitive by construction.
//
// AND IT ASKS FOR VALUES, NOT DELTAS, when the question is "is this track sane". A scale track
// pinned at 0.00 is not CHANGING, so a metric that asks whether a track moves says it is fine
// while the upper half of the body is collapsed to a point.
import { openGLB } from './glb.mjs';

const FILE = process.argv[2] || 'models/characters/alien_antenna_game.glb';
const { json: g, read } = openGLB(FILE);
const nm = i => g.nodes[i]?.name || ('#' + i);
const qdeg = (a, b) => 2 * Math.acos(Math.min(1, Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]))) * 180 / Math.PI;

console.log(FILE);
console.log('  ' + (g.animations || []).length + ' animations, ' + (g.skins?.[0]?.joints.length || 0) + ' joints, ' +
            (g.meshes || []).length + ' mesh(es), extensions: ' + (g.extensionsUsed || []).join(' '));

// THE SHARED TIMES ARRAY. GLTFLoader resolves each accessor ONCE and caches it, and
// KeyframeTrack keeps the Float32Array BY REFERENCE -- so if this number is much smaller than
// the sampler count, any code that shifts "each track's" times in place subtracts the same
// offset from one array over and over, the times go deeply negative, the duration comes back
// NEGATIVE, and every clip in the file freezes on its final frame. Clone before you mutate.
const acc = new Set(); let samplers = 0;
for (const a of g.animations || []) for (const s of a.samplers) { acc.add(s.input); samplers++; }
console.log('  time accessors: ' + acc.size + ' distinct across ' + samplers + ' samplers' +
            (acc.size < samplers / 2 ? '   <-- SHARED. clone `times` before mutating it.' : ''));

const markers = new Set((g.nodes || []).filter(n => /^weapon_(root|tip)|^bar_/.test(n.name || '')).map(n => n.name));
const hips = (g.nodes || []).findIndex(n => /Hips$/.test(n.name || ''));

console.log('\nclip                            dur    keys  moving  worst    start   hips XZ   flags');
console.log('--------------------------------------------------------------------------------------');
const rows = [];
for (const a of g.animations || []) {
  let t0 = Infinity, t1 = 0, keys = 0, moving = 0, worst = 0;
  const flags = [];
  let hipsXZ = 0;
  for (const ch of a.channels) {
    const s = a.samplers[ch.sampler], t = read(s.input), v = read(s.output);
    t0 = Math.min(t0, t[0]); t1 = Math.max(t1, t[t.length - 1]);
    keys = Math.max(keys, t.length);
    const name = nm(ch.target.node);
    if (ch.target.path === 'rotation') {
      let d = 0;
      for (let i = 4; i < v.length; i += 4) d = Math.max(d, qdeg([v[0], v[1], v[2], v[3]], [v[i], v[i + 1], v[i + 2], v[i + 3]]));
      if (d > 2) moving++;
      worst = Math.max(worst, d);
      // A MOUNT MARKER'S REST POSE IS THE PLACEMENT, so a clip must never move one: both
      // markers are children of the hand, so the hand's own animation already carries them and
      // a track ON the marker is the weapon moving inside his fist.
      if (markers.has(name) && d > 0.5) flags.push('MARKER ' + name + ' ' + d.toFixed(0) + 'deg');
    } else if (ch.target.path === 'scale') {
      let mn = Infinity, mx = -Infinity;
      for (const x of v) { mn = Math.min(mn, x); mx = Math.max(mx, x); }
      if (mn < 0.99 || mx > 1.01) flags.push('SCALE ' + name + ' ' + mn.toFixed(2) + '..' + mx.toFixed(2));
    } else if (ch.target.path === 'translation') {
      let d = 0;
      for (let i = 3; i < v.length; i += 3) d = Math.max(d, Math.hypot(v[i] - v[0], v[i + 1] - v[1], v[i + 2] - v[2]));
      if (ch.target.node === hips) {
        let xm = Infinity, xM = -Infinity, zm = Infinity, zM = -Infinity;
        for (let i = 0; i < v.length; i += 3) { xm = Math.min(xm, v[i]); xM = Math.max(xM, v[i]); zm = Math.min(zm, v[i + 2]); zM = Math.max(zM, v[i + 2]); }
        hipsXZ = Math.max(xM - xm, zM - zm) * 0.01;
      } else if (d * 0.01 > 0.01) flags.push('POS ' + name + ' ' + (d * 0.01).toFixed(2) + 'm');
    }
  }
  rows.push({ n: a.name, dur: t1 - t0, keys, moving, worst, t0, hipsXZ, flags });
}
rows.sort((a, b) => a.n.localeCompare(b.n));
for (const r of rows) {
  const stat = r.moving === 0 ? '  <-- STATIC, exporter residue' : '';
  console.log('  ' + r.n.padEnd(30) + r.dur.toFixed(3).padStart(5) + 's' + String(r.keys).padStart(6) +
    String(r.moving).padStart(8) + r.worst.toFixed(0).padStart(6) + 'deg' + r.t0.toFixed(4).padStart(9) +
    r.hipsXZ.toFixed(3).padStart(9) + '  ' + (r.flags.join(' ') || '') + stat);
}
const off = rows.filter(r => r.t0 > 1e-4);
if (off.length) console.log('\n' + off.length + ' clip(s) start at ' + off[0].t0.toFixed(4) +
  's rather than zero -- one held frame at the top of every loop. `normaliseClips` shifts it.');
console.log('\n"moving" is bones whose rotation leaves its first key by more than 2 degrees.');
