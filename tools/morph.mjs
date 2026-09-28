// `npm run morph [target ...]` -- CAN WE GET A CHARACTER'S SHAPE ONTO ZAP'S TOPOLOGY WITHOUT
// RESCULPTING ANYTHING (m163)?
//
// *"I just wanna see how close we can get without me doing the sculpts, so that I know whether
// I need to go that route -- cause that's gonna be days or weeks of work."*
//
// **THE BASE IS ZAP'S OWN MESH, NOT A PROXY.** A capsule or sphere rig is a detour: the thing
// the game actually needs is one TOPOLOGY carrying every character, because a glTF morph target
// is a per-vertex delta and deltas only exist between meshes that share a vertex ordering. Zap
// already has 13,704 vertices in the right shape, so he IS the base and every other character
// becomes a set of deltas on him.
//
// **THE CORRESPONDENCE IS DONE IN BONE-LOCAL SPACE, AND THE SKIN WEIGHTS ARE WHY THIS WORKS.**
// Every vertex carries JOINTS_0/WEIGHTS_0, so it knows which bone owns it. A zap vertex on the
// left forearm is matched only against target vertices on the left forearm -- expressed in that
// bone's own frame, so the two limbs are compared as limbs rather than as points in a room.
// A plain nearest-point in world space snaps an armpit vertex onto the ribs and an inner-thigh
// vertex onto the other leg; this cannot, by construction.
//
// **AND GLTFLoader BINDS EVERY SKIN WITH THE IDENTITY MATRIX** (CLAUDE.md's own note), so the
// POSITION accessor IS the bind-pose world position and the bone's world matrix out of the node
// hierarchy is the frame to invert. Nothing has to be posed.
import fs from 'fs';
import { glb, prim } from './glbdec.mjs';

const ZAP = 'models/characters/alien_antenna_game.glb';
const OUT = 'models/characters/morph/';
const K = +(process.env.MK || 6);        // target vertices averaged per zap vertex
const SMOOTH = +(process.env.MS ?? 4);   // Laplacian passes over the delta field
const SMOOTH_K = .5;

// ---- matrices ------------------------------------------------------------------------------
const mul = (A, B) => [...Array(16)].map((_, i) => { const r = (i / 4) | 0, c = i % 4;
  return A[r*4]*B[c] + A[r*4+1]*B[4+c] + A[r*4+2]*B[8+c] + A[r*4+3]*B[12+c]; });
const ident = () => [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
function nodeMat(n) {
  if (n.matrix) { const m = n.matrix;
    return [m[0],m[4],m[8],m[12], m[1],m[5],m[9],m[13], m[2],m[6],m[10],m[14], m[3],m[7],m[11],m[15]]; }
  const T = n.translation || [0,0,0], [x,y,z,w] = n.rotation || [0,0,0,1], S = n.scale || [1,1,1];
  const R = [1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w),
             2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w),
             2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)];
  return [R[0]*S[0],R[1]*S[1],R[2]*S[2],T[0], R[3]*S[0],R[4]*S[1],R[5]*S[2],T[1],
          R[6]*S[0],R[7]*S[1],R[8]*S[2],T[2], 0,0,0,1];
}
// A RIGID INVERSE IS NOT ENOUGH HERE -- a Mixamo armature carries a scale (0.01 on these files)
// and transposing a scaled rotation is not its inverse. Full 4x4 inverse, cofactors and all.
// **AN AFFINE INVERSE, WRITTEN THE SAFE WAY AND TESTED.** My first version was a general 4x4
// cofactor expansion copied in COLUMN-major layout while everything here is ROW-major, and the
// failure was instructive: the 3x3 part came back exactly right and only the TRANSLATION column
// was wrong, so bones near their own frame origin (the thighs) transferred perfectly while the
// arms came out **seventeen thousand metres** off. A wrong matrix that is right for a third of
// the data is worse than one that is wrong everywhere, because the output still looks arguable.
// This form has nothing to get backwards: invert the 3x3 (these carry a 0.01 armature scale, so
// a transpose is NOT the inverse), then the translation is -R^-1 * t.
function inv(m) {
  const a=m[0],b=m[1],c=m[2], e=m[4],f=m[5],g=m[6], i=m[8],j=m[9],k=m[10];
  let det = a*(f*k - g*j) - b*(e*k - g*i) + c*(e*j - f*i);
  if (!det) return ident();
  det = 1 / det;
  const r0=(f*k-g*j)*det, r1=(c*j-b*k)*det, r2=(b*g-c*f)*det,
        r3=(g*i-e*k)*det, r4=(a*k-c*i)*det, r5=(c*e-a*g)*det,
        r6=(e*j-f*i)*det, r7=(b*i-a*j)*det, r8=(a*f-b*e)*det;
  const tx=m[3], ty=m[7], tz=m[11];
  return [r0,r1,r2, -(r0*tx+r1*ty+r2*tz),
          r3,r4,r5, -(r3*tx+r4*ty+r5*tz),
          r6,r7,r8, -(r6*tx+r7*ty+r8*tz),
          0,0,0,1];
}
const xf = (m, x, y, z) => [m[0]*x+m[1]*y+m[2]*z+m[3], m[4]*x+m[5]*y+m[6]*z+m[7], m[8]*x+m[9]*y+m[10]*z+m[11]];

// ---- one character, decoded and framed -------------------------------------------------------
async function read(file) {
  const { j, bin } = glb(file);
  const W = {};
  const walk = (i, par) => { const n = j.nodes[i]; const M = mul(par, nodeMat(n)); W[i] = M;
    for (const c of n.children || []) walk(c, M); };
  for (const r of j.scenes[j.scene || 0].nodes) walk(r, ident());
  const sk = j.skins[0];
  const joints = sk.joints.map(i => j.nodes[i].name);
  // the first primitive is the body on every file here (1 prim each, checked)
  const pr = j.meshes.find(m => m.primitives.some(p => p.attributes.JOINTS_0)).primitives[0];
  const d = await prim(j, bin, pr);
  // WHICH BONE OWNS EACH VERTEX: the heaviest of its four influences. A vertex genuinely shared
  // between two bones is at a joint, and at a joint either frame gives nearly the same answer.
  const P = d.attrs.POSITION, J = d.attrs.JOINTS_0, WT = d.attrs.WEIGHTS_0;
  const own = new Int32Array(d.count);
  for (let v = 0; v < d.count; v++) {
    let best = 0, bw = -1;
    for (let k = 0; k < 4; k++) { const w = WT[v*4+k]; if (w > bw) { bw = w; best = J[v*4+k]; } }
    own[v] = best | 0;
  }
  let lo = 1e9, hi = -1e9;
  for (let v = 0; v < d.count; v++) { const y = P[v*3+1]; if (y < lo) lo = y; if (y > hi) hi = y; }
  // the bone frames, by NAME so two files can be matched
  const frame = {}, framei = {};
  for (let b = 0; b < sk.joints.length; b++) {
    const M = W[sk.joints[b]];
    frame[joints[b]] = M; framei[joints[b]] = inv(M);
  }
  return { file, j, count: d.count, index: d.index, P, own, joints, frame, framei, h: hi - lo, lo };
}

// ---- the transfer ----------------------------------------------------------------------------
function transfer(A, B) {
  // SCALE BY HEIGHT, so a 0.864 hick and a 0.909 zap are compared limb-for-limb rather than the
  // hick coming out 5% short everywhere. It is the same normalisation the GAME does when it
  // draws every character at `RIG.height`.
  const s = A.h / B.h;
  // bucket the target's vertices by the NAME of the bone that owns them
  const by = new Map();
  for (let v = 0; v < B.count; v++) {
    const nm = B.joints[B.own[v]];
    const fi = B.framei[nm]; if (!fi) continue;
    const q = xf(fi, B.P[v*3], B.P[v*3+1], B.P[v*3+2]);
    let L = by.get(nm); if (!L) by.set(nm, L = []);
    L.push([q[0]*s, q[1]*s, q[2]*s, v]);
  }
  const delta = new Float32Array(A.count * 3);
  let miss = 0, moved = 0, worst = 0;
  for (let v = 0; v < A.count; v++) {
    const nm = A.joints[A.own[v]];
    const L = by.get(nm);
    const fi = A.framei[nm], f = A.frame[nm];
    if (!L || !L.length || !fi) { miss++; continue; }     // a bone the target has not got
    const q = xf(fi, A.P[v*3], A.P[v*3+1], A.P[v*3+2]);
    // K NEAREST, AVERAGED, NOT THE SINGLE NEAREST. One nearest vertex makes the result as noisy
    // as the target's own tessellation -- two adjacent zap vertices can snap to points a
    // centimetre apart and the surface comes out stippled.
    const best = [], bd = [];
    for (const t of L) {
      const dd = (t[0]-q[0])**2 + (t[1]-q[1])**2 + (t[2]-q[2])**2;
      let at = best.length;
      while (at > 0 && bd[at-1] > dd) at--;
      if (at < K) { best.splice(at, 0, t); bd.splice(at, 0, dd);
                    if (best.length > K) { best.pop(); bd.pop(); } }
    }
    let wx = 0, wy = 0, wz = 0, ws = 0, wr = 0;
    for (let k = 0; k < best.length; k++) {
      const w = 1 / (Math.sqrt(bd[k]) + 1e-4);
      wx += best[k][0] * w; wy += best[k][1] * w; wz += best[k][2] * w; ws += w;
      wr += Math.hypot(best[k][0], best[k][1], best[k][2]) * w;   // and their RADII
    }
    if (!ws) { miss++; continue; }
    let ax = wx/ws, ay = wy/ws, az = wz/ws;
    // **AVERAGING POSITIONS SHRINKS A SURFACE AND AVERAGING RADII DOES NOT, AND THAT BIAS WAS
    // THE WHOLE OF THE FIRST RESULT.** Every measurement came back SMALLER than the target --
    // height, head, every limb radius, on all five characters -- which is not noise, it is the
    // mean of K points on a convex surface lying inside that surface. So the direction comes
    // from the average (which is what the neighbourhood is good at) and the DISTANCE from the
    // bone's origin is set to the average of the candidates' own distances, which no amount of
    // smoothing can pull inward. `|avg| < avg(|p|)` is Jensen's inequality and it is why the
    // undershoot was systematic rather than random.
    const al = Math.hypot(ax, ay, az);
    if (al > 1e-6) { const k2 = (wr/ws) / al; ax *= k2; ay *= k2; az *= k2; }
    const p = xf(f, ax, ay, az);
    delta[v*3] = p[0] - A.P[v*3];
    delta[v*3+1] = p[1] - A.P[v*3+1];
    delta[v*3+2] = p[2] - A.P[v*3+2];
    const m = Math.hypot(delta[v*3], delta[v*3+1], delta[v*3+2]);
    moved += m; if (m > worst) worst = m;
  }
  return { delta, miss, mean: moved / A.count, worst, scale: s };
}

// **THE SMOOTHING IS OVER THE DELTA FIELD, NOT OVER THE RESULT.** Smoothing the result rounds
// off the character's real features; smoothing the CORRECTION only takes out the places where
// the nearest-point search disagreed with its neighbours, which is exactly the artefact.
function smooth(A, delta, passes) {
  const adj = new Array(A.count);
  for (let i = 0; i < A.index.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const a = A.index[i+k], b = A.index[i+(k+1)%3];
      (adj[a] || (adj[a] = [])).push(b); (adj[b] || (adj[b] = [])).push(a);
    }
  }
  let cur = delta;
  for (let p = 0; p < passes; p++) {
    const nx = new Float32Array(cur.length);
    for (let v = 0; v < A.count; v++) {
      const L = adj[v];
      if (!L || !L.length) { nx[v*3]=cur[v*3]; nx[v*3+1]=cur[v*3+1]; nx[v*3+2]=cur[v*3+2]; continue; }
      let ax=0, ay=0, az=0;
      for (const o of L) { ax+=cur[o*3]; ay+=cur[o*3+1]; az+=cur[o*3+2]; }
      ax/=L.length; ay/=L.length; az/=L.length;
      nx[v*3]   = cur[v*3]   + (ax - cur[v*3])   * SMOOTH_K;
      nx[v*3+1] = cur[v*3+1] + (ay - cur[v*3+1]) * SMOOTH_K;
      nx[v*3+2] = cur[v*3+2] + (az - cur[v*3+2]) * SMOOTH_K;
    }
    cur = nx;
  }
  return cur;
}

// **THE PASS MARK IS THE TARGET'S OWN SILHOUETTE, NOT A FEELING.** Apply the delta at full
// strength and measure the result against the character it is supposed to have become: height,
// shoulder span, hip span, and the radius of four limbs. If those land, the shape transferred;
// if they do not, no amount of looking at it will make it work.
function silhouette(count, P, own, joints, h0) {
  const band = (y0, y1) => { let w = 0;
    for (let v = 0; v < count; v++) { const y = P[v*3+1];
      if (y < y0 || y > y1) continue; const x = Math.abs(P[v*3]); if (x > w) w = x; }
    return w * 2; };
  let lo = 1e9, hi = -1e9;
  for (let v = 0; v < count; v++) { const y = P[v*3+1]; if (y < lo) lo = y; if (y > hi) hi = y; }
  const H = hi - lo;
  const at = f => lo + H * f;
  const lim = (nm) => { let n = 0, cx = 0, cy = 0, cz = 0;
    for (let v = 0; v < count; v++) if (joints[own[v]] === nm) { n++; cx += P[v*3]; cy += P[v*3+1]; cz += P[v*3+2]; }
    if (!n) return 0; cx/=n; cy/=n; cz/=n;
    let r = 0; for (let v = 0; v < count; v++) if (joints[own[v]] === nm)
      r += Math.hypot(P[v*3]-cx, P[v*3+1]-cy, P[v*3+2]-cz);
    return r / n; };
  return { H,
    shoulder: band(at(.76), at(.84)), chest: band(at(.62), at(.72)),
    hip: band(at(.48), at(.56)), head: band(at(.88), at(.98)),
    thigh: lim('mixamorig_LeftUpLeg'), calf: lim('mixamorig_LeftLeg'),
    arm: lim('mixamorig_LeftArm'), fore: lim('mixamorig_LeftForeArm') };
}
const row = (l, s) => l.padEnd(10) + ['H','head','shoulder','chest','hip','thigh','calf','arm','fore']
  .map(k => (s[k]||0).toFixed(4).padStart(9)).join('');

const files = process.argv.slice(2);
const targets = files.length ? files : ['models/characters/hick_skinny.glb',
  'models/characters/alien_warrior.glb', 'models/characters/hobo_01.glb',
  'models/characters/clancy.glb', 'models/characters/alien_female_purple.glb'];

const A = await read(ZAP);
console.log('base  ' + ZAP.split('/').pop() + '  ' + A.count + ' verts, ' +
            (A.index.length/3) + ' tris, ' + A.joints.length + ' joints, height ' + A.h.toFixed(4));
console.log('\n' + 'name'.padEnd(10) + ['H','head','shoulder','chest','hip','thigh','calf','arm','fore']
  .map(k => k.padStart(9)).join(''));
console.log(row('ZAP', silhouette(A.count, A.P, A.own, A.joints)));
fs.mkdirSync(OUT, { recursive: true });
const man = { base: ZAP, count: A.count, targets: [] };
const bins = [];
for (const f of targets) {
  const B = await read(f);
  const r = transfer(A, B);
  const sm = smooth(A, r.delta, SMOOTH);
  // the RESULT, to measure
  const R = new Float32Array(A.count * 3);
  for (let i = 0; i < R.length; i++) R[i] = A.P[i] + sm[i];
  const want = silhouette(B.count, B.P, B.own, B.joints);
  // the target measured at ZAP's height, which is what the transfer is aiming at
  const k = A.h / B.h;
  for (const key of Object.keys(want)) want[key] *= k;
  const got = silhouette(A.count, R, A.own, A.joints);
  const nm = f.split('/').pop().replace('.glb','');
  console.log('');
  console.log(row('want:' + nm.slice(0,4), want));
  console.log(row('got :' + nm.slice(0,4), got));
  // **ONLY THE SIX COLUMNS THAT MEAN ANYTHING.** `chest`, `hip` and `shoulder` are horizontal
  // BANDS and these are T-pose meshes, so all three catch the arms and report nonsense -- the
  // girl's hip came back 310% off, which is a fact about my ruler and not about the transfer.
  // Height, head width and the four limb radii are per-bone or full-mesh and cannot be fooled.
  const err = ['H','head','thigh','calf','arm','fore']
    .map(q => want[q] ? Math.abs(got[q]-want[q]) / want[q] : 0);
  console.log('  '.padEnd(10) + err.map(e => (e*100).toFixed(1).padStart(8) + '%').join(''));
  console.log('  miss ' + r.miss + '/' + A.count + '  mean move ' + (r.mean*100).toFixed(2) +
    ' cm(file)  worst ' + (r.worst*100).toFixed(2) + '  mean err ' +
    (err.reduce((a,b)=>a+b,0)/err.length*100).toFixed(1) + '%');
  bins.push(sm);
  man.targets.push({ key: nm, miss: r.miss, mean: +r.mean.toFixed(5), worst: +r.worst.toFixed(4),
                     err: +(err.reduce((a,b)=>a+b,0)/err.length).toFixed(4) });
}
// **ONE FILE, NOT FIVE, because every runtime asset costs a fetch and a hash line.** The targets
// are the same length by construction (they are all deltas on zap's topology), so the manifest
// needs an order and nothing else -- and a five-way fetch that half-arrives is five ways for the
// morph to be partly there.
// **AND THE VERTEX COUNT IS IN THE MANIFEST ON PURPOSE.** These deltas are indexed by zap's
// draco-decoded vertex ORDER, and the game decodes the same buffer with the same decoder -- but
// if a re-export ever changes that count the deltas are silently applied to the wrong vertices,
// which is a character turning inside out with nothing on screen saying why. The loader refuses
// on a mismatch rather than drawing it.
const all = new Float32Array(bins.length * A.count * 3);
bins.forEach((b, i) => all.set(b, i * A.count * 3));
fs.writeFileSync(OUT + 'shapes.bin', Buffer.from(all.buffer));
fs.writeFileSync(OUT + 'shapes.json', JSON.stringify(man, null, 1));
console.log('\nwrote ' + OUT + 'shapes.bin  ' + man.targets.length + ' targets x ' + A.count +
  ' verts = ' + (all.byteLength/1024/1024).toFixed(2) + ' MB');
