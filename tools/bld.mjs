// Does the building rasteriser produce a collider a player can actually walk into?
//
// It lifts the SHIPPED `solidColumns` out of index.html between the `COLS:` markers -- a
// harness with its own copy of the rule is this repo's oldest mistake -- and runs it over two
// shells that no GLB is needed to build: a CLOSED box, and one with NO FLOOR, which is what a
// generated building usually is. The second is the case that shipped a collider made entirely
// of zero-height boxes floating at roof height, which `resolveBoxes` skips on
// `p.y + hh < b.miny`: "there is no collider on the building whatsoever".
import fs from 'fs';
import * as THREE from 'three';

// a path may be given, so the fix can be checked by running the harness against the OLD file
const html = fs.readFileSync(process.argv[2] || new URL('../index.html', import.meta.url), 'utf8');
const src = html.slice(html.indexOf('// COLS:START'), html.indexOf('// COLS:END'));
if (!src) { console.error('COLS markers not found'); process.exit(1); }
globalThis.THREE = THREE;   // the lifted text is module code and reaches THREE as a global
const solidColumns = (0, eval)(src + '\nsolidColumns');

const CFG = { cell: 1.0, maxCells: 4096, tol: .45, full: .92 };
const STEP = .35;   // MOVE.step -- a box whose top is under this is a kerb, not a wall

function shell(w, h, d, floor, hole) {
  // a rectangular shell, optionally with no floor, optionally with a notch out of one side so
  // there is an overhang to see (a canopy: solid above, air below)
  const v = [], f = [];
  const P = (x, y, z) => { v.push(x, y, z); return v.length / 3 - 1; };
  const quad = (a, b, c, d2) => { f.push(a, b, c, a, c, d2); };
  const X = w / 2, Z = d / 2;
  const t = [P(-X, h, -Z), P(X, h, -Z), P(X, h, Z), P(-X, h, Z)];
  quad(t[0], t[1], t[2], t[3]);
  if (floor) { const b = [P(-X, 0, -Z), P(X, 0, -Z), P(X, 0, Z), P(-X, 0, Z)]; quad(b[3], b[2], b[1], b[0]); }
  // four walls, which are VERTICAL and therefore contribute no vertical-ray crossing at all
  for (const [x0, z0, x1, z1] of [[-X,-Z,X,-Z],[X,-Z,X,Z],[X,Z,-X,Z],[-X,Z,-X,-Z]])
    quad(P(x0,0,z0), P(x1,0,z1), P(x1,h,z1), P(x0,h,z0));
  if (hole) { // a canopy slab out to the side at 2/3 height, with nothing under it
    const y = h * 2 / 3, o = X + 3;
    const a = [P(X,y,-Z), P(o,y,-Z), P(o,y,Z), P(X,y,Z)];
    quad(a[0], a[1], a[2], a[3]);
    const b = [P(X,y-.4,-Z), P(o,y-.4,-Z), P(o,y-.4,Z), P(X,y-.4,Z)];
    quad(b[3], b[2], b[1], b[0]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setIndex(f);
  const m = new THREE.Mesh(g);
  m.updateMatrixWorld(true);
  return m;
}

let bad = 0;
const run = (label, mesh, wantGround) => {
  const out = [];
  const n = solidColumns(mesh, CFG, out);
  const low = out.filter(b => b.miny <= STEP && b.maxy > STEP).length;
  const flat = out.filter(b => b.maxy - b.miny < .05).length;
  // **"SOME BOX REACHES THE GROUND" IS NOT THE TEST.** The old rasteriser left eight of three
  // hundred and thirty-five touching the floor -- the shallow rim, where a triangle's own y
  // range happened to make a span -- and a collider that is 2% present is a building you walk
  // through. A solid shell wants MOST of its footprint standing on the ground.
  const ok = !wantGround || low / n >= .5;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label.padEnd(26)} ${String(n).padStart(4)} boxes, ` +
              `${String(low).padStart(4)} reach the ground, ${flat} zero-height, ` +
              `top ${Math.max(0, ...out.map(b => b.maxy)).toFixed(2)} m`);
  return out;
};

// **THE CASE THAT ACTUALLY SHIPPED.** A generated building has no vertical faces at all -- it
// is an organic shell, so every triangle is SLANTED. The old reading took a slanted triangle's
// plane height at the cell centre as BOTH the low and the high mark, so a shell with no floor
// under it gave one number per cell and every box came out zero-height, floating at the
// surface. `resolveBoxes` skips those on `p.y + hh < b.miny`: no collider whatsoever.
function dome(r, h, n) {
  const v = [], f = [];
  const P = (x, y, z) => { v.push(x, y, z); return v.length / 3 - 1; };
  const top = P(0, h, 0);
  const ring = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; ring.push(P(Math.cos(a) * r, 0, Math.sin(a) * r)); }
  for (let i = 0; i < n; i++) f.push(top, ring[i], ring[(i + 1) % n]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setIndex(f);
  const m = new THREE.Mesh(g); m.updateMatrixWorld(true); return m;
}
run('SLANTED shell, no floor',   dome(10, 16, 48), true);
run('closed box 20x16x20',       shell(20, 16, 20, true,  false), true);
run('NO FLOOR 20x16x20',         shell(20, 16, 20, false, false), true);
run('closed + side canopy',      shell(20, 16, 20, true,  true),  true);
const c = run('NO FLOOR + side canopy', shell(20, 16, 20, false, true), true);
// and the canopy has to still be a canopy: something solid out past the wall with air under it
// THE PASS MARK COMES FROM THE GEOMETRY, NOT FROM WHAT LOOKS ABOUT RIGHT. The canopy runs from
// x = 10 (the wall) to 13, and a merged run starts on a cell edge, so its box begins at exactly
// 10 -- the first version of this line asked for `minx > 10.5` and failed a correct answer.
const over = c.filter(b => b.minx >= 10 && b.miny > 3 && b.maxy < 12);
console.log(`     canopy: ${over.length} boxes out past the wall with air under them` +
            (over.length ? ` (lowest at y ${Math.min(...over.map(b => b.miny)).toFixed(2)})` : ''));
if (!over.length) { console.log('FAIL the overhang was filled in solid'); bad++; }
process.exit(bad ? 1 : 0);
