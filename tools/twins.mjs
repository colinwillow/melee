// tools/twins.mjs -- the 42 chunked `wallB_*` twins out of his piece library.   npm run twins [glb]
//
// **THE KIT CITY USES THE LIBRARY FOR ONE THING: THE GEOMETRY OF EACH WALL'S CHUNKED TWIN (m180).**
// A twin is dressed in the BUILDINGS' materials by name, so the library's own textures are never
// drawn -- and they are 3.0 MB of the 5.7 MB file on the wire, plus a decode on the phone, for
// pictures that are thrown away. This writes only the `wallB_*` nodes (6 kinds x 7 styles), their
// meshes and the accessors those need, with the material NAMES and extras kept and every texture
// dropped. The twin's own glass, door and collider children are left out: the building already
// has its own, and `kitTwinIndex` never spawned them.
//
// **EVERY BUFFERVIEW IT KEEPS IS COPIED BYTE FOR BYTE**, `ktx.mjs`'s rule: nothing is decoded or
// re-encoded, so the geometry that comes out is the geometry he exported. It writes a NEW file
// beside his, and has to be RE-RUN AFTER EVERY RE-EXPORT of the library -- the tell is `npm run
// bump` reporting `toon_city_kit_pieces.glb` CHANGED with the `_twins` file beside it unmoved.
import fs from 'fs';

const SRC = process.argv[2] || 'models/toon_city_kit/toon_city_kit_pieces.glb';
const OUT = SRC.replace(/_pieces\.glb$/, '_twins.glb');
if (OUT === SRC) { console.error('refusing to overwrite ' + SRC); process.exit(1); }

const b = fs.readFileSync(SRC);
if (b.readUInt32LE(0) !== 0x46546C67) { console.error(SRC + ' is not a GLB'); process.exit(1); }
let o = 12, g = null, bin = null;
while (o + 8 <= b.length) {
  const len = b.readUInt32LE(o), ty = b.readUInt32LE(o + 4), body = b.subarray(o + 8, o + 8 + len);
  if (ty === 0x4E4F534A) g = JSON.parse(body.toString('utf8')); else if (ty === 0x004E4942) bin = body;
  o += 8 + len;
}
const keep = g.nodes.map((n, i) => [n, i]).filter(([n]) => n.mesh !== undefined && n.extras && n.extras.chunks && /^wallB_/.test(n.extras.piece || ''));
if (!keep.length) { console.error('no wallB_* twins in ' + SRC); process.exit(1); }

const out = { asset: { version: '2.0', generator: 'melee tools/twins.mjs from ' + SRC.split('/').pop() },
              scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], materials: [], accessors: [], bufferViews: [],
              buffers: [{ byteLength: 0 }] };
const chunks = [];
let off = 0;
const bvMap = new Map(), accMap = new Map(), matMap = new Map(), meshMap = new Map();
const bv = i => {
  if (bvMap.has(i)) return bvMap.get(i);
  const v = g.bufferViews[i], src = bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength);
  const pad = (4 - (off % 4)) % 4;
  if (pad) { chunks.push(Buffer.alloc(pad)); off += pad; }
  const nv = { buffer: 0, byteOffset: off, byteLength: v.byteLength };
  if (v.byteStride) nv.byteStride = v.byteStride;
  if (v.target) nv.target = v.target;
  chunks.push(Buffer.from(src)); off += v.byteLength;
  out.bufferViews.push(nv); bvMap.set(i, out.bufferViews.length - 1);
  return out.bufferViews.length - 1;
};
const acc = i => {
  if (accMap.has(i)) return accMap.get(i);
  const a = { ...g.accessors[i] };
  if (a.sparse) { console.error('sparse accessor ' + i + ' -- not handled'); process.exit(1); }
  if (a.bufferView !== undefined) a.bufferView = bv(a.bufferView);
  out.accessors.push(a); accMap.set(i, out.accessors.length - 1);
  return out.accessors.length - 1;
};
const mat = i => {
  if (i === undefined) return undefined;
  if (matMap.has(i)) return matMap.get(i);
  const m = g.materials[i], nm = { name: m.name };
  if (m.extras) nm.extras = m.extras;
  if (m.doubleSided) nm.doubleSided = true;
  if (m.alphaMode) nm.alphaMode = m.alphaMode;
  const pbr = m.pbrMetallicRoughness || {};
  nm.pbrMetallicRoughness = {};
  for (const k of ['baseColorFactor', 'metallicFactor', 'roughnessFactor']) if (pbr[k] !== undefined) nm.pbrMetallicRoughness[k] = pbr[k];
  out.materials.push(nm); matMap.set(i, out.materials.length - 1);
  return out.materials.length - 1;
};
const mesh = i => {
  if (meshMap.has(i)) return meshMap.get(i);
  const m = g.meshes[i];
  if (m.primitives.some(p => p.extensions && Object.keys(p.extensions).length)) { console.error('mesh ' + m.name + ' carries a primitive extension (draco?) -- not handled'); process.exit(1); }
  const nm = { name: m.name, primitives: m.primitives.map(p => {
    const q = { attributes: {} };
    for (const [k, v] of Object.entries(p.attributes)) q.attributes[k] = acc(v);
    if (p.indices !== undefined) q.indices = acc(p.indices);
    if (p.material !== undefined) q.material = mat(p.material);
    if (p.mode !== undefined) q.mode = p.mode;
    return q; }) };
  if (m.extras) nm.extras = m.extras;
  out.meshes.push(nm); meshMap.set(i, out.meshes.length - 1);
  return out.meshes.length - 1;
};
for (const [n] of keep) {
  // placed at the origin: the game reads each twin's chunk table and its mesh relative to the node
  const nn = { name: n.name, mesh: mesh(n.mesh), extras: n.extras };
  if (n.rotation) nn.rotation = n.rotation;
  if (n.scale) nn.scale = n.scale;
  out.nodes.push(nn); out.scenes[0].nodes.push(out.nodes.length - 1);
}
const BIN = Buffer.concat(chunks);
const pad4 = n => (4 - (n % 4)) % 4;
const binP = Buffer.concat([BIN, Buffer.alloc(pad4(BIN.length))]);
out.buffers[0].byteLength = binP.length;
let js = Buffer.from(JSON.stringify(out), 'utf8');
js = Buffer.concat([js, Buffer.alloc(pad4(js.length), 0x20)]);
const head = Buffer.alloc(12), jh = Buffer.alloc(8), bh = Buffer.alloc(8);
head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + binP.length, 8);
jh.writeUInt32LE(js.length, 0); jh.writeUInt32LE(0x4E4F534A, 4);
bh.writeUInt32LE(binP.length, 0); bh.writeUInt32LE(0x004E4942, 4);
fs.writeFileSync(OUT, Buffer.concat([head, jh, js, bh, binP]));
// **AND IT CHECKS ITS OWN WORK**: every kept bufferView byte-identical to the source's
let same = 0;
for (const [si, di] of bvMap) {
  const s = g.bufferViews[si], d = out.bufferViews[di];
  if (Buffer.compare(bin.subarray(s.byteOffset || 0, (s.byteOffset || 0) + s.byteLength), binP.subarray(d.byteOffset, d.byteOffset + d.byteLength)) === 0) same++;
}
const styles = new Set(keep.map(([n]) => n.extras.style)), kinds = new Set(keep.map(([n]) => n.extras.piece));
console.log(SRC + ' -> ' + OUT);
console.log('  ' + keep.length + ' twins (' + kinds.size + ' kinds x ' + styles.size + ' styles), ' + out.meshes.length + ' meshes, ' +
  out.materials.length + ' materials (names only), ' + same + '/' + bvMap.size + ' bufferViews byte-identical');
console.log('  ' + (b.length / 1e6).toFixed(2) + ' MB -> ' + (fs.statSync(OUT).size / 1e6).toFixed(2) + ' MB');
if (same !== bvMap.size) { console.error('  BUFFERVIEWS DIFFER'); process.exit(1); }
