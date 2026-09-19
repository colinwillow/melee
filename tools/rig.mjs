// npm run rig -- THE REST POSE: height, facing, and whether the weapon mounts still agree.
//
// This is the tool to run after every re-export. A rig change under a mount the game depends on
// is SILENT: the weapon still parents, it just parents somewhere else, and "the gun is in the
// wrong place" and "his rig moved" are the same picture from a phone.
import { openGLB, poseAt, posOf, nodeIndex } from './glb.mjs';

const CHAR = process.argv[2] || 'models/characters/alien_antenna_game.glb';
const WEAPONS = process.argv.slice(3);
const defaults = ['models/weapons/alien_antenna_blaster_game.glb', 'models/weapons/alien_antenna_hammer_game.glb'];
const weps = WEAPONS.length ? WEAPONS : defaults;

const { json: g, read } = openGLB(CHAR);
const w = poseAt(g, read, null, 0);                 // the BIND pose: no clip playing
const at = n => { const i = nodeIndex(g, n); return i < 0 ? null : posOf(w[i]); };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const nx = v => { const d = Math.hypot(v[0], v[2]) || 1; return [v[0] / d, v[2] / d]; };

console.log('CHARACTER  ' + CHAR);
// EVERY SKINNED MESH, UNIONED -- not `meshes[0]`. This file has two, and the first one is a
// 2.9 cm prop: read alone it reported an authored height of 0.0289 m and wanted a scale of x60.
// A skinned mesh is the character; anything unskinned beside it is a prop that came along.
const skinned = new Set();
for (const n of g.nodes) if (n.skin != null && n.mesh != null) skinned.add(n.mesh);
let lo = Infinity, hi = -Infinity;
for (const [mi, m] of g.meshes.entries()) {
  if (skinned.size && !skinned.has(mi)) continue;
  for (const pr of m.primitives) {
    const a2 = g.accessors[pr.attributes.POSITION];
    if (!a2 || !a2.min) continue;
    lo = Math.min(lo, a2.min[1]); hi = Math.max(hi, a2.max[1]);
  }
}
const acc = { min: [0, lo, 0], max: [0, hi, 0] };
const H = hi - lo;
console.log('  skinned meshes: ' + (skinned.size || g.meshes.length) + ' of ' + g.meshes.length);
console.log('  authored height  ' + H.toFixed(4) + ' m   (mesh bbox Y; GLTFLoader binds skins with IDENTITY,');
console.log('                                        so geometry position IS world position at rest)');
console.log('  soles at y       ' + acc.min[1].toFixed(4) + ' m' + (Math.abs(acc.min[1]) > .01 ? '   <-- NOT ZERO: he will float or sink' : ''));
for (const t of [1.6, 1.75, 1.9]) console.log('    -> x' + (t / H).toFixed(3) + ' to stand ' + t.toFixed(2) + ' m');

// FACING. The toes are the primary measurement -- a foot points forwards, which is a geometric
// fact about a body -- and the shoulder span is the cross-check. Both can be wrong, but not
// usually in a way that makes them agree.
const lt = at('mixamorig_LeftToe_End'), lf = at('mixamorig_LeftFoot');
const rt = at('mixamorig_RightToe_End'), rf = at('mixamorig_RightFoot');
if (lt && lf && rt && rf) {
  const a = nx(sub(lt, lf)), b = nx(sub(rt, rf));
  const f = nx([a[0] + b[0], 0, a[1] + b[1]]);
  const yaw = Math.atan2(f[0], f[1]) * 180 / Math.PI;
  const ls = at('mixamorig_LeftShoulder'), rs = at('mixamorig_RightShoulder');
  let agree = 'n/a';
  if (ls && rs) { const s = nx(sub(ls, rs)); agree = (s[0] * f[1] + s[1] * -f[0]).toFixed(4); }
  console.log('\nFACING');
  console.log('  toes         (' + f[0].toFixed(4) + ', ' + f[1].toFixed(4) + ')  =  ' + yaw.toFixed(2) + ' deg' +
    (Math.abs(yaw) < 5 ? '   (+Z, which is NOT the -Z a glTF conventionally points)' : ''));
  console.log('  shoulders    cross-check ' + agree + '   (should be near +1)');
}

// THE MOUNTS. A weapon file is built around a root/tip PAIR; the character carries the same
// pair. If the two agree, the weapon parents with IDENTITY -- no scale, no offset, no rotation
// -- and nothing about where it sits is typed in the game. If they stop agreeing, this is where
// it shows, and it shows as a number rather than as a weapon in the wrong place on a phone.
const mounts = g.nodes.filter(n => /^weapon_root/.test(n.name || '')).map(n => n.name);
console.log('\nMOUNTS ON THE CHARACTER');
for (const mn of mounts) {
  const i = nodeIndex(g, mn);
  const kids = (g.nodes[i].children || []).map(c => g.nodes[c].name);
  const tip = kids.find(k => /tip/.test(k));
  const parent = g.nodes.findIndex(n => (n.children || []).includes(i));
  const rel = tip ? sub(at(tip), at(mn)) : null;
  console.log('  ' + mn.padEnd(20) + ' on ' + (g.nodes[parent]?.name || '?'));
  if (rel) console.log('    root->tip  (' + rel.map(v => v.toFixed(4)).join(', ') + ')  len ' + Math.hypot(...rel).toFixed(4) + ' m');
  const local = g.nodes[nodeIndex(g, tip)]?.translation;
  if (local) console.log('    tip local  (' + local.map(v => v.toFixed(4)).join(', ') + ')   <-- this is what a weapon file has to match');
}

console.log('\nWEAPONS');
for (const f of weps) {
  let wg;
  try { wg = openGLB(f); } catch (e) { console.log('  ' + f + '  -- CANNOT READ'); continue; }
  const j = wg.json;
  const root = j.nodes.find(n => /^weapon_root/.test(n.name || ''));
  if (!root) { console.log('  ' + f.split('/').pop() + '  -- NO weapon_root'); continue; }
  const rootI = j.nodes.indexOf(root);
  const tipI = (root.children || []).find(c => /tip/.test(j.nodes[c].name || ''));
  const tip = tipI != null ? j.nodes[tipI].translation : null;
  const mesh = (root.children || []).map(c => j.nodes[c]).find(n => n.mesh != null);
  const pa = j.accessors[j.meshes[mesh?.mesh ?? 0].primitives[0].attributes.POSITION];
  const size = pa.min ? [pa.max[0] - pa.min[0], pa.max[1] - pa.min[1], pa.max[2] - pa.min[2]] : null;
  console.log('  ' + f.split('/').pop());
  console.log('    mount      ' + root.name + (root.name === 'weapon_root_right' || root.name === 'weapon_root_left' ? '' : '   <-- NOT A NAME THE CHARACTER HAS'));
  if (tip) console.log('    tip local  (' + tip.map(v => v.toFixed(4)).join(', ') + ')');
  // does it MATCH the character's own pair? to three decimals, which is what "identity" means
  const cn = root.name, ci = nodeIndex(g, cn);
  if (ci >= 0 && tip) {
    const ct = (g.nodes[ci].children || []).find(c => /tip/.test(g.nodes[c].name || ''));
    const cl = ct != null ? g.nodes[ct].translation : null;
    if (cl) {
      const d = Math.hypot(cl[0] - tip[0], cl[1] - tip[1], cl[2] - tip[2]);
      console.log('    vs rig     ' + (d < 1e-3 ? 'MATCH (' + d.toExponential(1) + ') -- parents with IDENTITY'
        : 'DIFFERS by ' + d.toFixed(4) + ' armature units  <-- the weapon will sit wrong'));
    }
  } else if (ci < 0) console.log('    vs rig     THE CHARACTER HAS NO "' + cn + '"  <-- it will not mount at all');
  if (size) console.log('    size       ' + size.map(v => (v * 0.01).toFixed(3)).join(' x ') + ' m as authored' +
    '   (' + (Math.max(...size) * 0.01 / H * 100).toFixed(0) + '% of his height, and it stays that % at any RIG.height)');
  // A WEAPON MESH THAT IS SKINNED IS A DIFFERENT PROBLEM. A `skins` block beside the mesh is
  // not the same thing as the MESH referencing a skin -- Blender writes the armature out next
  // to a mesh that is merely parented to it. The reference ON THE MESH is the fact.
  const prim = j.meshes[mesh?.mesh ?? 0].primitives[0];
  if (mesh && mesh.skin != null && prim.attributes.JOINTS_0 != null)
    console.log('    NOTE       the mesh is genuinely SKINNED -- it needs a skeleton swap, not a rigid parent');
}
