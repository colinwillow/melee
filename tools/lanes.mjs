// npm run lanes -- bake Weirdport's street centrelines out of his own export.
//
// THE CARS NEED A GRAPH AND THERE IS NOTHING IN EITHER GLB THAT IS ONE. No lane nodes, no
// route empties, no centreline curves -- m145 looked and reported that, and the two ways out
// were "he authors named empties in Blender" or "we derive it here". This is deriving it here.
//
// **THE ROAD IS NOT A MESH. It is asphalt that nothing is standing on.** `ground_asphalt_col`
// is EIGHT TRIANGLES -- one 280 x 250 m slab under the entire slice -- and `vis_asphalt` is one
// merged primitive spanning the same box. The blocks, the sidewalks, the lots, the grass and
// the plazas are laid ON TOP of it. So "where is the road" is a TOP SURFACE question and not a
// name question: rasterise every up-facing ground triangle in the file, keep the highest at
// each cell, and the road is wherever asphalt (or its paint, or a parked car) won.
//
// **AND DRACO DOES DECODE IN NODE.** This file's notes say nine times that nothing in this
// container can decode a mesh, because `DRACOLoader` builds its decoder on a Worker from a Blob
// URL. The Worker is three's packaging, not draco's: `vendor/draco/draco_wasm_wrapper.js` is an
// ordinary emscripten module and `DracoDecoderModule({ wasmBinary })` runs perfectly well here.
// The whole visual file decodes in about a second. (It has to be copied to a `.cjs` -- the repo
// is `"type": "module"`, so node refuses to require() the vendored `.js` and hands back `{}`.)
//
// **THE MEASUREMENT IS BAKED AND THE STRUCTURE IS DERIVED.** What goes into index.html is
// thirteen streets -- where they run and how wide they are. The junctions, the graph and the
// lanes fall out of that at load, so a bug in the graph is a code fix and not a re-bake.
import fs from 'fs';

const GLB  = 'models/portland/slice_downtown/weirdport_slice_visual_draco.glb';
const HTML = 'index.html';
const DRACO = 'vendor/draco/';
const TMP = 'tools/.lanes-draco.cjs';

// the play area, and the grid it is rasterised on
const C = 1, X0 = -140, X1 = 140, Z0 = -125, Z1 = 125;
const NX = Math.round((X1 - X0) / C), NZ = Math.round((Z1 - Z0) / C);
// what counts as road once it is the top surface. Paint is ON the road and a parked car is
// standing on it; everything else in the file is something you do not drive over.
const ROADMAT = /^(BK_Asphalt|Paint_(White|Yellow|Red|Bike_Green)|vehicles_pack_01|Metal_Manhole)$/;
const MINW = 6, MAXW = 18;   // a run across a street, in metres
const TOL  = 2;              // how far two run midpoints may sit apart and be one centreline
const MINN = 15;             // how many runs a centreline needs before it is a street
const GAP  = 14;             // how much missing road a centreline may bridge
const MINL = 20;             // the shortest segment worth emitting

// ---- GLB ----------------------------------------------------------------
function readGLB(p) {
  const b = fs.readFileSync(p);
  let o = 12, json = null, bin = null;
  while (o < b.length) {
    const len = b.readUInt32LE(o), type = b.readUInt32LE(o + 4);
    const d = b.subarray(o + 8, o + 8 + len);
    if (type === 0x4E4F534A) json = JSON.parse(d.toString('utf8'));
    else if (type === 0x004E4942) bin = d;
    o += 8 + len; if (len % 4) o += 4 - (len % 4);
  }
  return { json, bin };
}
const mul = (a, b) => { const o = new Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; }
  return o; };
function nodeWorld(g) {
  const I = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
  const local = n => {
    if (n.matrix) return n.matrix.slice();
    const t = n.translation || [0,0,0], q = n.rotation || [0,0,0,1], s = n.scale || [1,1,1];
    const [x,y,z,w] = q;
    const m = [1-2*(y*y+z*z), 2*(x*y+z*w), 2*(x*z-y*w), 0,
               2*(x*y-z*w), 1-2*(x*x+z*z), 2*(y*z+x*w), 0,
               2*(x*z+y*w), 2*(y*z-x*w), 1-2*(x*x+y*y), 0, 0,0,0,1];
    for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) m[c*4+r] *= s[c];
    m[12]=t[0]; m[13]=t[1]; m[14]=t[2]; return m;
  };
  const out = new Array(g.nodes.length).fill(null);
  const walk = (i, parent) => { const n = g.nodes[i], w = mul(parent, local(n)); out[i] = w;
    for (const c of (n.children || [])) walk(c, w); };
  for (const r of g.scenes[g.scene || 0].nodes) walk(r, I);
  return out;
}
const xf = (m, x, y, z) => [m[0]*x+m[4]*y+m[8]*z+m[12], m[1]*x+m[5]*y+m[9]*z+m[13], m[2]*x+m[6]*y+m[10]*z+m[14]];

// ---- draco --------------------------------------------------------------
let D = null;
async function draco() {
  if (D) return D;
  // the repo is "type": "module", so the vendored .js will not require(). A .cjs copy will.
  fs.writeFileSync(TMP, fs.readFileSync(DRACO + 'draco_wasm_wrapper.js'));
  const { createRequire } = await import('module');
  const req = createRequire(import.meta.url);
  const Mod = req('./' + TMP.replace(/^tools\//, ''));
  D = await Mod({ wasmBinary: fs.readFileSync(DRACO + 'draco_decoder.wasm') });
  return D;
}
async function decodePrim(g, bin, pr) {
  const d = await draco();
  const ext = pr.extensions && pr.extensions['KHR_draco_mesh_compression'];
  if (!ext) return null;
  const bv = g.bufferViews[ext.bufferView];
  const buf = bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
  const dec = new d.Decoder(), ab = new d.DecoderBuffer();
  ab.Init(new Int8Array(buf), buf.length);
  const geom = new d.Mesh();
  const st = dec.DecodeBufferToMesh(ab, geom);
  if (!st.ok() || geom.ptr === 0) throw new Error('draco decode failed: ' + st.error_msg());
  const at = dec.GetAttributeByUniqueId(geom, ext.attributes.POSITION);
  const count = geom.num_points(), nb = count * 3 * 4;
  let ptr = d._malloc(nb);
  dec.GetAttributeDataArrayForAllPoints(geom, at, d.DT_FLOAT32, nb, ptr);
  const pos = new Float32Array(d.HEAPF32.buffer, ptr, count * 3).slice();
  d._free(ptr);
  const nF = geom.num_faces(); ptr = d._malloc(nF * 3 * 4);
  dec.GetTrianglesUInt32Array(geom, nF * 3 * 4, ptr);
  const index = new Uint32Array(d.HEAPU32.buffer, ptr, nF * 3).slice();
  d._free(ptr);
  d.destroy(geom); d.destroy(ab); d.destroy(dec);
  return { pos, index };
}

// ---- the top surface ----------------------------------------------------
async function topSurface(g, bin) {
  const W = nodeWorld(g);
  const H = new Float32Array(NX * NZ).fill(-9), M = new Int16Array(NX * NZ).fill(-1);
  let prims = 0, tris = 0;
  for (let i = 0; i < g.nodes.length; i++) {
    const n = g.nodes[i]; if (n.mesh === undefined) continue;
    const m = W[i];
    for (const pr of g.meshes[n.mesh].primitives) {
      const a = g.accessors[pr.attributes.POSITION];
      // A DRACO PRIMITIVE STILL CARRIES min/max ON ITS POSITION ACCESSOR (the spec requires
      // it), so a whole skyline can be rejected without decoding a byte of it.
      let lo = 1e9, hi = -1e9;
      for (let c = 0; c < 8; c++) {
        const p = xf(m, c&1?a.max[0]:a.min[0], c&2?a.max[1]:a.min[1], c&4?a.max[2]:a.min[2]);
        lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]);
      }
      if (lo > 3 || hi < -2) continue;
      const d = await decodePrim(g, bin, pr); if (!d) continue;
      prims++;
      const p = d.pos, ix = d.index;
      for (let t = 0; t < ix.length; t += 3) {
        const A = xf(m, p[ix[t]*3], p[ix[t]*3+1], p[ix[t]*3+2]);
        const B = xf(m, p[ix[t+1]*3], p[ix[t+1]*3+1], p[ix[t+1]*3+2]);
        const Cc = xf(m, p[ix[t+2]*3], p[ix[t+2]*3+1], p[ix[t+2]*3+2]);
        const ux=B[0]-A[0], uy=B[1]-A[1], uz=B[2]-A[2], vx=Cc[0]-A[0], vy=Cc[1]-A[1], vz=Cc[2]-A[2];
        const ny = uz*vx - ux*vz, L = Math.hypot(uy*vz-uz*vy, ny, ux*vy-uy*vx) || 1;
        if (ny / L < .6) continue;                          // a wall is not a surface to stand on
        const ay = (A[1]+B[1]+Cc[1]) / 3; if (ay < -2 || ay > 3) continue;
        tris++;
        const mnx=Math.min(A[0],B[0],Cc[0]), mxx=Math.max(A[0],B[0],Cc[0]);
        const mnz=Math.min(A[2],B[2],Cc[2]), mxz=Math.max(A[2],B[2],Cc[2]);
        const i0=Math.max(0,Math.floor((mnx-X0)/C)), i1=Math.min(NX-1,Math.floor((mxx-X0)/C));
        const k0=Math.max(0,Math.floor((mnz-Z0)/C)), k1=Math.min(NZ-1,Math.floor((mxz-Z0)/C));
        const den=(B[2]-Cc[2])*(A[0]-Cc[0])+(Cc[0]-B[0])*(A[2]-Cc[2]); if (Math.abs(den)<1e-9) continue;
        for (let ii=i0; ii<=i1; ii++) for (let kk=k0; kk<=k1; kk++) {
          const px=X0+(ii+.5)*C, pz=Z0+(kk+.5)*C;
          const aa=((B[2]-Cc[2])*(px-Cc[0])+(Cc[0]-B[0])*(pz-Cc[2]))/den;
          const bb=((Cc[2]-A[2])*(px-Cc[0])+(A[0]-Cc[0])*(pz-Cc[2]))/den;
          if (aa<-.02||bb<-.02||aa+bb>1.02) continue;
          const y = A[1]*aa + B[1]*bb + Cc[1]*(1-aa-bb), o = kk*NX+ii;
          if (y > H[o]) { H[o] = y; M[o] = pr.material; }
        }
      }
    }
  }
  return { M, prims, tris };
}

// ---- centrelines --------------------------------------------------------
function centrelines(road) {
  const at = (i,k) => (i<0||k<0||i>=NX||k>=NZ) ? 0 : road[k*NX+i];
  // a run ACROSS a street is its width, so the run's midpoint is a point on its centreline
  const scan = alongX => {
    const out = [], A = alongX?NX:NZ, B = alongX?NZ:NX;
    for (let b = 0; b < B; b++) { let s = -1;
      for (let a = 0; a <= A; a++) {
        const v = a < A ? (alongX ? at(a,b) : at(b,a)) : 0;
        if (v && s < 0) s = a;
        else if (!v && s >= 0) { const w = (a-s)*C; if (w>=MINW && w<=MAXW) out.push({mid:(s+a-1)/2, w}); s = -1; }
      } }
    return out;
  };
  const cluster = pts => {
    pts.sort((p,q) => p.mid - q.mid);
    const cl = []; let cur = null;
    for (const p of pts) { if (cur && p.mid - cur.last <= TOL) { cur.pts.push(p); cur.last = p.mid; }
      else { cur = { pts:[p], last:p.mid }; cl.push(cur); } }
    return cl.filter(c => c.pts.length >= MINN).map(c => ({
      mid: c.pts.reduce((s,p) => s + p.mid, 0) / c.pts.length,
      w: c.pts.map(p => p.w).sort((a,b) => a-b)[c.pts.length >> 1] }));
  };
  // walk a centreline and cut it where the road actually stops
  const segs = (ci, alongX) => {
    const A = alongX?NX:NZ, out = []; let s = -1, miss = 0;
    const c = Math.round(ci);
    for (let a = 0; a <= A; a++) {
      // sampled ACROSS the street rather than on one cell: a centreline half a metre off would
      // otherwise fall down a join in the asphalt and cut the street in two
      let v = 0; if (a < A) for (let o = -2; o <= 2 && !v; o++) v = alongX ? at(a, c+o) : at(c+o, a);
      if (v) { if (s < 0) s = a; miss = 0; }
      else if (s >= 0) { miss++; if (miss*C > GAP || a === A) {
        const e = a - miss; if ((e-s)*C >= MINL) out.push([s, e]); s = -1; miss = 0; } }
    }
    return out;
  };
  const st = [];
  for (const c of cluster(scan(true)))            // runs measured along X -> the street runs along Z
    for (const [s,e] of segs(c.mid, false)) st.push([0, +(X0+(c.mid+.5)*C).toFixed(1), +(Z0+(s+.5)*C).toFixed(1), +(Z0+(e+.5)*C).toFixed(1), c.w]);
  for (const c of cluster(scan(false)))
    for (const [s,e] of segs(c.mid, true))  st.push([1, +(Z0+(c.mid+.5)*C).toFixed(1), +(X0+(s+.5)*C).toFixed(1), +(X0+(e+.5)*C).toFixed(1), c.w]);
  return st;
}

// ---- go -----------------------------------------------------------------
const t0 = Date.now();
const { json: g, bin } = readGLB(GLB);
const { M, prims, tris } = await topSurface(g, bin);
const names = g.materials.map(m => m.name || '');
const road = new Uint8Array(NX*NZ);
let cells = 0;
for (let o = 0; o < M.length; o++) if (M[o] >= 0 && ROADMAT.test(names[M[o]])) { road[o] = 1; cells++; }
const st = centrelines(road);
try { fs.unlinkSync(TMP); } catch {}

console.log('[lanes] ' + prims + ' ground primitives, ' + tris + ' up-facing triangles, ' +
  cells + ' road cells of ' + (NX*NZ) + ' in ' + ((Date.now()-t0)/1000).toFixed(1) + 's');
for (const s of st) console.log('   ' + (s[0] ? 'E-W  z ' + String(s[1]).padStart(7) + '   x ' + String(s[2]).padStart(7) + ' .. ' + String(s[3]).padStart(7)
                                                : 'N-S  x ' + String(s[1]).padStart(7) + '   z ' + String(s[2]).padStart(7) + ' .. ' + String(s[3]).padStart(7))
  + '   ' + (s[3]-s[2]).toFixed(0).padStart(4) + ' m long, ' + s[4] + ' m wide');
if (!st.length) { console.error('[lanes] NO STREETS FOUND -- refusing to write an empty graph'); process.exit(1); }

const body = 'const WPLANES = [\n' +
  st.map(s => '  [' + s.join(', ') + '],').join('\n') +
  '\n];';
let html = fs.readFileSync(HTML, 'utf8');
const re = /(\/\/ LANES:START[\s\S]*?\n)[\s\S]*?(\n\/\/ LANES:END)/;
if (!re.test(html)) { console.error('[lanes] no LANES:START/END markers in ' + HTML); process.exit(1); }
html = html.replace(re, (_, a, b) => a + body + b);
fs.writeFileSync(HTML, html);
console.log('[lanes] wrote ' + st.length + ' streets into ' + HTML + ' (' + body.length + ' bytes)');
