// SKATE CLIPS, LIFTED OFF SHREDWORLD'S COLIN AND RETARGETED OFFLINE (m150).
//
//   node tools/skate.mjs [../city/models/colin.glb] [models/skate.glb]
//
// **THE TWO RIGS ARE THE SAME RIG, WHICH IS WHY THIS IS A FILE AND NOT A RUNTIME PATH.**
// Measured over the 59 joints they share: mean rest-pose offset **0.06 deg**, worst 3.00 on
// `weapon_tip` (a marker, not a body bone), and the Hips agree to **0.02** with the same
// `Armature[0.01] > root > Hips` chain -- so the per-bone delta a retarget exists to apply is
// nothing at all. What DOES differ is how big the two men are: Colin's hips sit at 52.830
// armature units and zap's at 40.078, so the HIPS TRANSLATION -- the body's height off the
// ground, which every crouch, push and landing in this set uses -- has to be re-expressed.
//
// **IT IS `retarget`'s OWN FORM, DONE ONCE HERE RATHER THAN EVERY LOAD**: `p' = restT + k *
// (p - restS)`, which is exact at the bind pose by construction and proportional everywhere
// else. A scaled ABSOLUTE (`k * p`) is the version that looks right and is not -- it also
// scales wherever the artist happened to put the pelvis relative to the armature origin, which
// is a free choice per export and was 11.5 units of it on one rig in m119.
//
// **AND THE 9 BONES ZAP HAS NOT GOT ARE THUMBS** (plus Colin's `weapon_root`, which is his gun
// mount and nothing to do with a deck). Their tracks are dropped: nobody sees a thumb curl on
// a skateboard at eight metres, and a track whose target is not in the scene is a console
// warning per clip per load.
//
// **EVERY OTHER POSITION TRACK IS DROPPED TOO** -- a bone's translation is its LENGTH, and
// applied to another skeleton it stretches it. The Hips is the one exception and it is the one
// that is remapped. Scale tracks go with them: measured, all of Colin's hold their rest value.
//
// The output has NO mesh, NO skin, NO material and NO image -- it is a node tree and seven
// animations, which is all `gltf.animations` needs. 10.2 MB in, a few tens of KB out.
import fs from 'fs';

const SRC = process.argv[2] || '../city/models/colin.glb';
const OUT = process.argv[3] || 'models/skate.glb';
const WANT = /^(skate_|.*ollie|front_flip|back_flip)$|^skate_/i;
// **`back_flip` IS AUTHORED AS A STANDING FLIP AND ITS FIRST 12 FRAMES ARE A CROUCH AND A PUSH
// OFF THE FLOOR** -- which, played on a board already in the air, reads as him crouching on
// nothing before he goes over. Shredworld cuts it with a `TRIM` entry at runtime; here there
// is no such machinery and no reason for one, so the head comes off the keys. 12 frames at the
// 30 fps every clip in that file is authored at.
// **DELETE THIS THE MOMENT AN EXPORT BAKES THE CUT IN**, or it is taken twice.
const TRIM = { back_flip: 12 / 30 };

const buf = fs.readFileSync(SRC);
let o = 12, J = null, BIN = null;
while (o < buf.length) {
  const len = buf.readUInt32LE(o), ty = buf.readUInt32LE(o + 4);
  if (ty === 0x4E4F534A) J = JSON.parse(buf.slice(o + 8, o + 8 + len).toString('utf8'));
  if (ty === 0x004E4942) BIN = buf.slice(o + 8, o + 8 + len);
  o += 8 + len;
}
if (!J || !BIN) { console.error('skate: ' + SRC + ' is not a GLB with a JSON and a BIN chunk'); process.exit(1); }

// ---- the target's rest pose, for the hips remap -------------------------------------------
const TGT = 'models/characters/alien_antenna_game.glb';
let o2 = 12, JT = null; const bt = fs.readFileSync(TGT);
while (o2 < bt.length) { const l = bt.readUInt32LE(o2), t = bt.readUInt32LE(o2 + 4);
  if (t === 0x4E4F534A) JT = JSON.parse(bt.slice(o2 + 8, o2 + 8 + l).toString('utf8'));
  o2 += 8 + l; }
const tgtJoint = {}; for (const n of JT.nodes) tgtJoint[n.name] = n;
const HIP = 'mixamorig_Hips';
const rS = (J.nodes.find(n => n.name === HIP) || {}).translation;
const rT = (tgtJoint[HIP] || {}).translation;
if (!rS || !rT) { console.error('skate: no ' + HIP + ' rest translation in one of the two files'); process.exit(1); }
const k = rT[1] / rS[1];
console.log('hips rest  colin ' + rS.map(v => v.toFixed(3)).join(', ') +
            '   ->  zap ' + rT.map(v => v.toFixed(3)).join(', ') + '   k ' + k.toFixed(4));

// ---- which clips, and which tracks survive -------------------------------------------------
const anims = J.animations.filter(a => WANT.test(a.name));
if (!anims.length) { console.error('skate: nothing in ' + SRC + ' matched ' + WANT); process.exit(1); }
const have = new Set(Object.keys(tgtJoint));
const nodeName = i => J.nodes[i].name;

// ---- copy accessors on demand ---------------------------------------------------------------
const outAcc = [], outBV = [], parts = []; let off = 0; const seen = new Map();
// which key a cut falls on, decided ONCE per (time accessor, cut) and shared by both halves of
// every sampler that uses it. One key before the cut is kept, so the clip opens on a real pose
// rather than interpolating out of nothing.
const trimAt = new Map();
function trimIndex(ai, shift) {
  if (!shift) return 0;
  const key = ai + '@' + shift;
  if (trimAt.has(key)) return trimAt.get(key);
  const { a, out } = raw(ai);
  let i = 0; while (i < a.count && out.readFloatLE(i * 4) < shift) i++;
  const from = Math.max(0, Math.min(a.count - 2, i - 1));
  trimAt.set(key, from);
  return from;
}
// **HOW FAR THE WHOLE CLIP MOVES, decided once off its LONGEST time accessor** -- the one that
// actually carries the motion -- and then applied to every track in it, so the two-key holds
// end where the animation does instead of pinning the duration at its old length.
function clipShift(an, cut) {
  if (!cut) return 0;
  let best = null, bn = -1;
  for (const sm of an.samplers) { const c = J.accessors[sm.input].count; if (c > bn) { bn = c; best = sm.input; } }
  const { a, out } = raw(best);
  let i = 0; while (i < a.count && out.readFloatLE(i * 4) < cut) i++;
  return out.readFloatLE(Math.max(0, Math.min(a.count - 2, i - 1)) * 4);
}
const CSZ = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const BYTES = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
function raw(ai) {
  const a = J.accessors[ai], bv = J.bufferViews[a.bufferView];
  const comp = CSZ[a.type], bs = BYTES[a.componentType], stride = bv.byteStride || comp * bs;
  const base = (bv.byteOffset || 0) + (a.byteOffset || 0);
  const out = Buffer.alloc(a.count * comp * bs);
  for (let i = 0; i < a.count; i++) BIN.copy(out, i * comp * bs, base + i * stride, base + i * stride + comp * bs);
  return { a, comp, bs, out };
}
// **THE TRIM IS AN INDEX, NOT A TIME, AND IT IS PASSED TO BOTH HALVES OF THE SAMPLER (m154).**
// The first version took a TIME, worked the index out while copying the INPUT accessor, and
// stashed it in a variable for the OUTPUT to read -- which is fine exactly once. `push` memoises
// by accessor, `back_flip`'s 60 channels share two time accessors, so from the second channel
// on the input came back CACHED, the index was never recomputed, and the output was copied from
// zero: **43 rotation values against 31 times, with every value 12 frames out of step with the
// time it is keyed at.** 38 of its 60 samplers, and it is the only clip with a trim.
// A memo that skips the side effect its caller depends on is the bug; the fix is to have no
// side effect. `trimIndex` decides it once per (accessor, cut) and both calls are given it.
function push(ai, rewrite, from, shift) {
  const key = ai + (rewrite ? '#h' : '') + (shift ? '#t' + from + '_' + shift : '');
  if (seen.has(key)) return seen.get(key);
  const { a, comp, bs, out } = raw(ai);
  if (a.componentType !== 5126) { console.error('skate: accessor ' + ai + ' is not float -- quantised animation is not handled'); process.exit(1); }
  if (rewrite) for (let i = 0; i < a.count; i++) for (let c = 0; c < 3; c++) {
    const p = i * 12 + c * 4;
    out.writeFloatLE(rT[c] + k * (out.readFloatLE(p) - rS[c]), p);
  }
  // **THE TRIM IS A KEY FILTER, AND IT IS IN THE DEDUPE KEY** -- ten distinct time accessors
  // back four hundred samplers in this file, so a trim applied to a shared array without the
  // key would cut every clip that happens to be the same length. (The `times` landmine, one
  // level up: the fix there is to clone, and the fix here is not to share.)
  let out2 = out, count = a.count;
  if (shift) {
    const stepN = comp * bs;
    count = a.count - from;
    out2 = Buffer.alloc(count * stepN);
    out.copy(out2, 0, from * stepN, a.count * stepN);
    // **THE SHIFT IS THE CLIP'S, NOT THE ACCESSOR'S OWN t0 (m154).** A bone that does not move
    // is exported as TWO keys spanning the whole clip, and two keys cannot be trimmed -- so
    // re-basing each accessor to its own first time left those holds still reaching 1.767 s
    // while the real motion ended at 1.400, and `clip.duration` is the MAX over every track.
    // **A duration that lies is worse than an untrimmed clip**, because `trickDur` and the
    // playback rate are both solved from it: the flip was being stretched over 26% more time
    // than it has motion in it.
    if (a.type === 'SCALAR')
      for (let i = 0; i < count; i++)
        out2.writeFloatLE(Math.max(0, out2.readFloatLE(i * 4) - shift), i * 4);
  }
  while (off % 4) { parts.push(Buffer.alloc(1)); off++; }
  outBV.push({ buffer: 0, byteOffset: off, byteLength: out2.length });
  parts.push(out2); off += out2.length;
  // min/max are required on the input (time) accessor of every sampler
  let mn = null, mx = null;
  if (a.type === 'SCALAR') { mn = [Infinity]; mx = [-Infinity];
    for (let i = 0; i < count; i++) { const v = out2.readFloatLE(i * 4); if (v < mn[0]) mn[0] = v; if (v > mx[0]) mx[0] = v; } }
  const id = outAcc.length;
  outAcc.push({ bufferView: outBV.length - 1, componentType: 5126, count, type: a.type,
                ...(mn ? { min: mn, max: mx } : {}) });
  seen.set(key, id);
  return id;
}

// ---- the node tree, joints only ---------------------------------------------------------------
const keep = [], remap = new Map();
J.nodes.forEach((n, i) => { remap.set(i, keep.length); keep.push(i); });
const nodes = keep.map(i => { const n = J.nodes[i]; const c = { name: n.name };
  if (n.translation) c.translation = n.translation;
  if (n.rotation) c.rotation = n.rotation;
  if (n.scale) c.scale = n.scale;
  if (n.children) c.children = n.children.map(x => remap.get(x));
  return c; });

const animations = [];
let kept = 0, dropped = 0, hips = 0;
for (const a of anims) {
  const samplers = [], channels = [];
  const shift = clipShift(a, TRIM[a.name] || 0);
  for (const ch of a.channels) {
    const nm = nodeName(ch.target.node), path = ch.target.path;
    if (!have.has(nm)) { dropped++; continue; }
    if (path === 'scale') { dropped++; continue; }
    if (path === 'translation' && nm !== HIP) { dropped++; continue; }
    const s = a.samplers[ch.sampler];
    const isHip = path === 'translation' && nm === HIP;
    if (isHip) hips++;
    const from = trimIndex(s.input, shift);
    samplers.push({ input: push(s.input, false, from, shift), output: push(s.output, isHip, from, shift),
                    interpolation: s.interpolation || 'LINEAR' });
    channels.push({ sampler: samplers.length - 1, target: { node: remap.get(ch.target.node), path } });
    kept++;
  }
  animations.push({ name: a.name, samplers, channels });
  let dur = 0;
  for (const sm of samplers) { const mx = outAcc[sm.input].max; if (mx && mx[0] > dur) dur = mx[0]; }
  console.log('  ' + a.name.padEnd(24) + channels.length + ' tracks, ' + dur.toFixed(3) + 's' +
              (shift ? '  (head cut ' + shift.toFixed(3) + 's)' : ''));
}

const bin = Buffer.concat(parts);
const json = Buffer.from(JSON.stringify({
  asset: { version: '2.0', generator: 'melee tools/skate.mjs' },
  scene: 0, scenes: [{ nodes: J.scenes[J.scene || 0].nodes.map(i => remap.get(i)) }],
  nodes, animations, accessors: outAcc, bufferViews: outBV,
  buffers: [{ byteLength: bin.length }],
}), 'utf8');
const pad = b => b.length % 4 ? Buffer.concat([b, Buffer.alloc(4 - b.length % 4, b === json ? 0x20 : 0)]) : b;
const jc = pad(json), bc = bin.length % 4 ? Buffer.concat([bin, Buffer.alloc(4 - bin.length % 4)]) : bin;
const head = Buffer.alloc(12); head.write('glTF', 0); head.writeUInt32LE(2, 4);
head.writeUInt32LE(12 + 8 + jc.length + 8 + bc.length, 8);
const h1 = Buffer.alloc(8); h1.writeUInt32LE(jc.length, 0); h1.writeUInt32LE(0x4E4F534A, 4);
const h2 = Buffer.alloc(8); h2.writeUInt32LE(bc.length, 0); h2.writeUInt32LE(0x004E4942, 4);
fs.writeFileSync(OUT, Buffer.concat([head, h1, jc, h2, bc]));

console.log('\n' + animations.length + ' clips, ' + kept + ' tracks kept, ' + dropped +
            ' dropped (thumbs, scales, non-hips positions), ' + hips + ' hips tracks remapped');
console.log(OUT + '  ' + (fs.statSync(OUT).size / 1024).toFixed(1) + ' KB');

// **AND IT CHECKS ITS OWN OUTPUT, BECAUSE THE ONE THING THAT WENT WRONG HERE IS SILENT.** A
// sampler whose input and output counts disagree is a clip whose values are keyed at the wrong
// times: it parses, it plays, and what comes out is a pose nobody authored.
let bad = 0;
for (const a of animations) for (const sm of a.samplers)
  if (outAcc[sm.input].count !== outAcc[sm.output].count) bad++;
if (bad) { console.error('SKATE: ' + bad + ' samplers have input/output counts that disagree'); process.exit(1); }
console.log('checked: every sampler\'s input and output agree');
