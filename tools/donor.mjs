// npm run donor [src.glb] [out.glb] -- A CHARACTER'S ANIMATIONS, WITH THE CHARACTER TAKEN OUT.
//
// *"We can borrow animations from my Colin GLB from other repos... Colin has very similar
// proportions... I think Colin is a good donor for those animations."* A donor is only ever read
// for two things: his BIND POSE (the bones at rest, which `retarget` measures the delta off) and
// his CLIPS. His meshes, his 42 face morphs, his textures and his materials are never drawn --
// and they are 6 of his 10 MB, on a phone, on the boot path, for nothing.
//
// So this keeps the node tree, the skin's joint list (GLTFLoader marks a node as a BONE because a
// skin names it, whether or not any mesh uses that skin -- which is what makes the bones survive
// with no mesh at all), and every animation sampler. It drops meshes, materials, textures,
// images, every `weights` channel, every scale channel and every non-Hips translation.
// The binary chunk is rebuilt with only the bytes those accessors still point at.
//
// **WHAT THE GAME CANNOT MEASURE ON A DONOR WITH NO MESH IS HIS HEIGHT**, because `bodyProto`
// takes `authored` off the skinned geometry. So this decodes the draco meshes BEFORE throwing
// them away and prints the number to type into the donor's `authored` field -- measured once,
// here, rather than guessed there.
import fs from 'fs';
import { glb, prim } from './glbdec.mjs';

const SRC = process.argv[2] || '../city/models/colin.glb';
const OUT = process.argv[3] || 'models/characters/donors/colin_anims.glb';
// THE CLIPS NO NPC CAN EVER REACH. Nobody on the street rides a board, holds a rifle or hangs
// off a bar, and `CINEMA_4D_Main` / `Neutral_Idle` are exporter residue and a duplicate of
// `idle_neutral`. A fourth argument replaces the pattern (`''` keeps everything).
const SKIP = new RegExp(process.argv[4] != null ? process.argv[4] || '^$^' : '^(rifle_|skate_|bar_|CINEMA_4D|Neutral_Idle$)');
const { j, bin } = glb(SRC);

let lo = Infinity, hi = -Infinity;
for (const m of j.meshes || []) for (const pr of m.primitives) {
  const d = await prim(j, bin, pr); if (!d) continue;
  const p = d.attrs.POSITION;
  for (let i = 1; i < p.length; i += 3) { if (p[i] < lo) lo = p[i]; if (p[i] > hi) hi = p[i]; }
}

const keep = new Set();
for (const s of j.skins || []) if (s.inverseBindMatrices != null) keep.add(s.inverseBindMatrices);
const anims = [];
for (const a of j.animations || []) {
  if (SKIP.test(a.name)) continue;
  // **ONLY WHAT `retarget` READS**: every bone's rotation and the Hips' translation. A position
  // track on any other bone bakes the DONOR's bone length (it is dropped there anyway), and the
  // scale tracks are a flat 1.000 that the retarget never looks at -- together they are half
  // the file. A morph `weights` track has no mesh to land on.
  const ch = a.channels.filter(c => c.target.node != null && (c.target.path === 'rotation' ||
    (c.target.path === 'translation' && /Hips$/.test(j.nodes[c.target.node].name || ''))));
  if (!ch.length) continue;
  const used = [...new Set(ch.map(c => c.sampler))], remap = new Map(used.map((s, i) => [s, i]));
  const samplers = used.map(s => a.samplers[s]);
  for (const s of samplers) { keep.add(s.input); keep.add(s.output); }
  anims.push({ name: a.name, samplers, channels: ch.map(c => ({ sampler: remap.get(c.sampler), target: c.target })) });
}

// REBUILD THE BINARY: one bufferView per kept accessor, 4-byte aligned.
const accMap = new Map(), accessors = [], views = [], parts = [];
let off = 0;
for (const ai of [...keep].sort((a, b) => a - b)) {
  const a = j.accessors[ai], bv = j.bufferViews[a.bufferView];
  if (bv.byteStride) throw new Error('interleaved accessor ' + ai + ' -- not handled');
  const start = (bv.byteOffset || 0) + (a.byteOffset || 0);
  const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type];
  const CB = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[a.componentType];
  const len = a.count * NC * CB;
  const pad = (4 - (off % 4)) % 4;
  if (pad) { parts.push(Buffer.alloc(pad)); off += pad; }
  parts.push(Buffer.from(bin.subarray(start, start + len)));
  views.push({ buffer: 0, byteOffset: off, byteLength: len });
  off += len;
  const na = Object.assign({}, a, { bufferView: views.length - 1 }); delete na.byteOffset;
  accMap.set(ai, accessors.length); accessors.push(na);
}
const tail = (4 - (off % 4)) % 4; if (tail) { parts.push(Buffer.alloc(tail)); off += tail; }

const nodes = j.nodes.map(n => { const o = Object.assign({}, n); delete o.mesh; delete o.skin; delete o.weights; return o; });
const skins = (j.skins || []).map(s => { const o = Object.assign({}, s);
  if (s.inverseBindMatrices != null) o.inverseBindMatrices = accMap.get(s.inverseBindMatrices); return o; });
for (const a of anims) for (const s of a.samplers) { s.input = accMap.get(s.input); s.output = accMap.get(s.output); }
const out = { asset: Object.assign({}, j.asset, { generator: 'tools/donor.mjs (animations only)' }),
  scene: j.scene || 0, scenes: j.scenes, nodes, skins, animations: anims, accessors,
  bufferViews: views, buffers: [{ byteLength: off }] };

let js = Buffer.from(JSON.stringify(out));
const jp = (4 - (js.length % 4)) % 4; if (jp) js = Buffer.concat([js, Buffer.alloc(jp, 0x20)]);
const binB = Buffer.concat(parts);
const H = Buffer.alloc(12), JH = Buffer.alloc(8), BH = Buffer.alloc(8);
H.writeUInt32LE(0x46546C67, 0); H.writeUInt32LE(2, 4); H.writeUInt32LE(12 + 8 + js.length + 8 + binB.length, 8);
JH.writeUInt32LE(js.length, 0); JH.writeUInt32LE(0x4E4F534A, 4);
BH.writeUInt32LE(binB.length, 0); BH.writeUInt32LE(0x004E4942, 4);
fs.mkdirSync(OUT.replace(/\/[^/]+$/, ''), { recursive: true });
fs.writeFileSync(OUT, Buffer.concat([H, JH, js, BH, binB]));
console.log(`${SRC}  ->  ${OUT}`);
console.log(`  ${(fs.statSync(SRC).size / 1e6).toFixed(2)} MB -> ${(fs.statSync(OUT).size / 1e6).toFixed(2)} MB, ` +
            `${anims.length} clips, ${(j.skins || [])[0]?.joints.length || 0} joints, ${accessors.length} accessors`);
console.log(`  AUTHORED HEIGHT ${(hi - lo).toFixed(4)}  (mesh Y ${lo.toFixed(4)} .. ${hi.toFixed(4)}) -- type this into the donor's \`authored\``);
