// Read a GLB with no dependencies: the JSON chunk, the BIN chunk, and the accessors.
//
// The mesh primitives are DRACO compressed and this cannot decode those -- but the ANIMATION
// SAMPLERS are not (draco only ever touches mesh primitives), so every question about a clip
// is answerable from here in a few milliseconds and with nothing installed. That is the whole
// reason these tools need no node_modules at all.
import fs from 'fs';

const CT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

export function openGLB(path) {
  const b = fs.readFileSync(path);
  if (b.readUInt32LE(0) !== 0x46546C67) throw new Error('not a GLB: ' + path);
  let off = 12, json = null, bin = null;
  while (off + 8 <= b.length) {
    const len = b.readUInt32LE(off), type = b.readUInt32LE(off + 4);
    const data = b.subarray(off + 8, off + 8 + len);
    if (type === 0x4E4F534A) json = JSON.parse(data.toString('utf8'));
    else if (type === 0x004E4942) bin = data;
    off += 8 + len + (len % 4 ? 4 - (len % 4) : 0);
  }
  const g = json;
  // A BUFFERVIEW MAY BE INTERLEAVED. Reading it as a flat typed array then gives whatever
  // sat beside it in the stride, which is silently wrong rather than an error.
  const read = ai => {
    const a = g.accessors[ai], bv = g.bufferViews[a.bufferView];
    const TA = CT[a.componentType], n = NC[a.type];
    const base = (bv.byteOffset || 0) + (a.byteOffset || 0), st = bv.byteStride;
    if (st && st !== n * TA.BYTES_PER_ELEMENT) {
      const o = new TA(a.count * n);
      for (let i = 0; i < a.count; i++) o.set(new TA(bin.buffer, bin.byteOffset + base + i * st, n), i * n);
      return o;
    }
    return new TA(bin.buffer, bin.byteOffset + base, a.count * n);
  };
  return { json: g, bin, read };
}

// ---- just enough matrix maths to pose a skeleton ----
export const mul = (a, b) => {
  const o = new Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = s;
  }
  return o;
};
export const trs = (t, q, s) => {
  const [x, y, z, w] = q, x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  return [(1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0,
          (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0,
          (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0,
          t[0], t[1], t[2], 1];
};
export const IDENT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

// Sample one clip at time `t` and return every node's WORLD matrix.
// A channel that a clip does not key is left at the node's REST value, which is what the
// glTF spec says and is also the landmine that put the bar grip where the muzzle should be
// in the city repo: keying a marker in one clip writes that pose into every other clip's
// rest fallback. Worth knowing; it is why `npm run clips` checks the markers.
export function poseAt(g, read, anim, t) {
  const local = g.nodes.map(n => ({
    t: (n.translation || [0, 0, 0]).slice(),
    q: (n.rotation || [0, 0, 0, 1]).slice(),
    s: (n.scale || [1, 1, 1]).slice(),
  }));
  if (anim) for (const ch of anim.channels) {
    const sm = anim.samplers[ch.sampler], times = read(sm.input), vals = read(sm.output);
    const n = ch.target.path === 'rotation' ? 4 : 3;
    // find the segment
    let i = 0;
    while (i < times.length - 1 && times[i + 1] < t) i++;
    const t0 = times[i], t1 = times[Math.min(i + 1, times.length - 1)];
    const u = t1 > t0 ? Math.max(0, Math.min(1, (t - t0) / (t1 - t0))) : 0;
    const a = [], b = [];
    for (let k = 0; k < n; k++) { a.push(vals[i * n + k]); b.push(vals[Math.min(i + 1, times.length - 1) * n + k]); }
    let v;
    if (n === 4) {
      // SLERP, and along the SHORT way: q and -q are the same rotation, so a naive lerp
      // between two keys whose signs differ takes the long way round the sphere.
      let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
      let bb = b.slice(); if (dot < 0) { bb = b.map(x => -x); dot = -dot; }
      if (dot > 0.9995) v = a.map((x, k) => x + (bb[k] - x) * u);
      else {
        const th = Math.acos(Math.min(1, dot)), st = Math.sin(th);
        const wa = Math.sin((1 - u) * th) / st, wb = Math.sin(u * th) / st;
        v = a.map((x, k) => x * wa + bb[k] * wb);
      }
      const L = Math.hypot(...v) || 1; v = v.map(x => x / L);
    } else v = a.map((x, k) => x + (b[k] - x) * u);
    const L = local[ch.target.node];
    if (ch.target.path === 'translation') L.t = v;
    else if (ch.target.path === 'rotation') L.q = v;
    else L.s = v;
  }
  const world = new Array(g.nodes.length);
  const walk = (i, p) => {
    const L = local[i], m = mul(p, trs(L.t, L.q, L.s));
    world[i] = m;
    for (const c of g.nodes[i].children || []) walk(c, m);
  };
  for (const s of g.scenes[g.scene || 0].nodes) walk(s, IDENT);
  return world;
}
export const posOf = m => [m[12], m[13], m[14]];
export const nodeIndex = (g, name) => g.nodes.findIndex(n => n.name === name);
