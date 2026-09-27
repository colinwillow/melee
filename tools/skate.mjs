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
const outAcc = [], outBV = [], parts = []; let off = 0, cutFrom = 0; const seen = new Map();
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
function push(ai, rewrite, cut) {
  const key = ai + (rewrite ? '#h' : '') + (cut ? '#t' + cut : '');
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
  if (cut) {
    const isT = a.type === 'SCALAR';
    const stepN = comp * bs;
    let from = 0;
    if (isT) { while (from < count && out.readFloatLE(from * 4) < cut) from++; from = Math.max(0, from - 1); }
    else from = cutFrom;
    count = a.count - from;
    out2 = Buffer.alloc(count * stepN);
    out.copy(out2, 0, from * stepN, a.count * stepN);
    if (isT) { cutFrom = from;
      const t0 = out2.readFloatLE(0);
      for (let i = 0; i < count; i++) out2.writeFloatLE(out2.readFloatLE(i * 4) - t0, i * 4); }
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
  for (const ch of a.channels) {
    const nm = nodeName(ch.target.node), path = ch.target.path;
    if (!have.has(nm)) { dropped++; continue; }
    if (path === 'scale') { dropped++; continue; }
    if (path === 'translation' && nm !== HIP) { dropped++; continue; }
    const s = a.samplers[ch.sampler];
    const isHip = path === 'translation' && nm === HIP;
    if (isHip) hips++;
    const cut = TRIM[a.name] || 0;
    cutFrom = 0;
    const inp = push(s.input, false, cut);      // FIRST: it is what decides where the cut falls
    samplers.push({ input: inp, output: push(s.output, isHip, cut),
                    interpolation: s.interpolation || 'LINEAR' });
    channels.push({ sampler: samplers.length - 1, target: { node: remap.get(ch.target.node), path } });
    kept++;
  }
  animations.push({ name: a.name, samplers, channels });
  console.log('  ' + a.name.padEnd(24) + channels.length + ' tracks');
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
