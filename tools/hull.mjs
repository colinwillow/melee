// `npm run hull` -- DOES THE PROXY BLOB COME OUT SHAPED LIKE A BODY (m113)?
//
// m113's first version was a LATHE: one radius per height band, so a shoulder became a barrel
// and both ends of the wrap were a lumpy pillar rather than the two people. That is invisible
// from reading the code and obvious from one number -- the ratio of the widest sector of a row
// to its narrowest, which a body of revolution pins at exactly 1.00 by construction.
//
// IT LIFTS THE SHIPPED TEXT between the `PROF:` markers rather than restating it, because a
// tool with its own copy of the rule is this account's oldest mistake.
//
// AND IT NEEDS NO ASSET AND NO GPU, WHICH IS THE WHOLE POINT. Every character GLB here is draco
// and `DRACOLoader` decodes on a Worker built from a Blob URL, which node has not got -- so
// nothing in this container can build a skin. What is under test is not the export: it is
// whether the measurement, the hole fill, the smoothing and the wrap turn a cloud of vertices
// into a recognisable silhouette, and a synthetic body answers that exactly.
import fs from 'node:fs';

const src = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const a = src.indexOf('// PROF:START'), b = src.indexOf('// PROF:END');
if (a < 0 || b < 0) { console.error('hull: the PROF: markers are gone from index.html'); process.exit(1); }
const TEXT = src.slice(a, b);

// the constants come out of the file too, or this measures a shape the game does not build
const mt = src.match(/const MORPH = \{[\s\S]*?\n\};/);
const num = k => { const m = mt && mt[0].match(new RegExp('\\b' + k + ':\\s*([-\\d.]+)')); 
                   if (!m) { console.error('hull: MORPH.' + k + ' not found'); process.exit(1); } return +m[1]; };
const MORPH = { rings: num('rings'), seg: num('seg'), swell: num('swell'),
                pad: num('pad'), wob: num('wob') };

const lerp = (x, y, t) => x + (y - x) * t;
const ROWS = MORPH.rings + 1, S = MORPH.seg, NV = ROWS * S;
const MPH = { rows: ROWS, seg: S, H: 1,
              pos: new Float32Array(NV * 3), nrm: new Float32Array(NV * 3),
              _r: new Float32Array(NV),
              geo: { attributes: { position: {}, normal: {} } } };
const F = new Function('MORPH', 'lerp', 'MPH', TEXT + '\nreturn { mphProf, mphFill };')(MORPH, lerp, MPH);

// A SYNTHETIC BODY: torso, head, two arms straight out along +/-X, two legs with a gap.
function body(h, span) {
  const P = [];
  for (let i = 0; i < 6000; i++) {
    const u = Math.random(), a = Math.random() * Math.PI * 2;
    if (u < .30) { const y = h * (.45 + Math.random() * .40), r = h * .13;
                   P.push(Math.sin(a) * r, y, Math.cos(a) * r * .6); }
    else if (u < .40) { const y = h * (.86 + Math.random() * .14), r = h * .08;
                        P.push(Math.sin(a) * r, y, Math.cos(a) * r); }
    else if (u < .70) { const s = Math.random() < .5 ? 1 : -1;
                        P.push(s * (h * .13 + Math.random() * (span / 2 - h * .13)),
                               h * (.72 + Math.random() * .06), (Math.random() - .5) * h * .05); }
    else { const s = Math.random() < .5 ? 1 : -1, y = h * Math.random() * .45, r = h * .055;
           P.push(s * h * .09 + Math.sin(a) * r, y, Math.cos(a) * r); }
  }
  const v = new Float32Array(P);
  const at = { count: v.length / 3, getX: i => v[i*3], getY: i => v[i*3+1], getZ: i => v[i*3+2] };
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < at.count; i++) { lo = Math.min(lo, at.getY(i)); hi = Math.max(hi, at.getY(i)); }
  const mesh = { isSkinnedMesh: true, geometry: { attributes: { position: at },
                 boundingBox: { min: { y: lo }, max: { y: hi } }, computeBoundingBox() {} } };
  return { faceOff: 0, model: { scale: { x: 1 }, traverse: f => f(mesh) } };
}

const A = body(1.25, 1.10), B = body(1.85, 1.55);
const pa = F.mphProf(A), pb = F.mphProf(B);
const row = (g, i) => Array.from({ length: S }, (_, j) => g[i * S + j]);
const deg = j => Math.round(j / S * 360);
let bad = 0;
const ok = (c, msg) => { console.log((c ? '  ok   ' : '  FAIL ') + msg); if (!c) bad++; };

console.log('MORPH.rings ' + MORPH.rings + '  seg ' + S + '  swell ' + MORPH.swell +
            '  pad ' + MORPH.pad + '  wob ' + MORPH.wob);
console.log('A ' + A.profH.toFixed(3) + ' m   B ' + B.profH.toFixed(3) + ' m\n');

const ai = Math.round(.73 * MORPH.rings), ra = row(pa, ai);
console.log('ARM ROW i=' + ai + ', radius by bearing:');
console.log('  ' + ra.map((v, j) => deg(j) + ':' + v.toFixed(2)).join('  '));
let w = 0; for (let j = 1; j < S; j++) if (ra[j] > ra[w]) w = j;
const arm = Math.max(...ra) / Math.min(...ra);
console.log('  widest at ' + deg(w) + ' deg, ratio ' + arm.toFixed(2) + '\n');
// THE ARMS ARE AT +/-X, which is 90 and 270 degrees of `atan2(x, z)`.
ok(deg(w) === 90 || deg(w) === 270, 'the widest sector IS where the arms are');
// A LATHE PINS THIS AT 1.00. Anything over about 2 is plainly not a body of revolution.
ok(arm > 2.2, 'the arm row is not a barrel (ratio ' + arm.toFixed(2) + ' > 2.2)');

const li = Math.round(.22 * MORPH.rings), rl = row(pa, li);
const leg = Math.max(...rl) / Math.min(...rl);
console.log('\nLEG ROW i=' + li + ', ratio ' + leg.toFixed(2));
ok(leg > 1.4, 'the legs read as two things and not a post');

console.log('\nWRAP -- the arm row and the height across the lerp:');
const seen = [];
for (const u of [0, .25, .5, .75, 1]) {
  F.mphFill(pa, pb, A.profH, B.profH, u, 0, 0);
  const r = row(MPH._r, ai);
  seen.push([MPH.H, Math.max(...r)]);
  console.log('  a=' + u.toFixed(2) + '  H ' + MPH.H.toFixed(3) +
              '  widest ' + Math.max(...r).toFixed(3) + '  narrowest ' + Math.min(...r).toFixed(3));
}
// IT HAS TO TRAVEL, AND MONOTONICALLY -- a wrap that doubles back reads as a wobble, not a morph
let mono = 1;
for (let i = 1; i < seen.length; i++) if (seen[i][0] <= seen[i-1][0] || seen[i][1] <= seen[i-1][1]) mono = 0;
ok(mono, 'the height and the width travel from A to B without doubling back');
ok(Math.abs(seen[0][0] - A.profH) < .02 && Math.abs(seen[4][0] - B.profH) < .02,
   'and both ends are the bodies themselves');

// A NaN IS THE ONE FAULT THAT RENDERS AS NOTHING AT ALL, with nothing on screen to say why.
F.mphFill(pa, pb, A.profH, B.profH, .5, MORPH.wob, 1.7);
const nf = [...MPH.pos, ...MPH.nrm].filter(v => !isFinite(v)).length;
let dg = 0;
for (let k = 0; k < MPH.nrm.length; k += 3)
  if (Math.hypot(MPH.nrm[k], MPH.nrm[k+1], MPH.nrm[k+2]) < .5) dg++;
console.log('');
ok(nf === 0, 'no non-finite vertex or normal (' + nf + ')');
ok(dg === 0, 'no degenerate normal (' + dg + ' of ' + (MPH.nrm.length / 3) + ')');

console.log('\n' + (bad ? bad + ' FAILED' : 'all ok'));
process.exit(bad ? 1 : 0);
