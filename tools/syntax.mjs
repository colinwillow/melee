// npm run check:syntax -- ~1s. Does every module script in the page still PARSE?
// A file that will not parse is a BLANK PAGE: the module never evaluates, the boot card sits
// for ever on the text it was born with, and nothing on screen or in a phone's console says
// why. That is not a wrong guess he can look at and correct -- it is a round trip with nothing
// in it, which is why this one second is always spent.
import fs from 'fs';
import { execFileSync } from 'child_process';
import os from 'os';
import path from 'path';

const file = process.argv[2] || 'index.html';
const html = fs.readFileSync(file, 'utf8');
let bad = 0, n = 0;

const re = /<script type="module">([\s\S]*?)<\/script>/g;
let m;
while ((m = re.exec(html))) {
  const f = path.join(os.tmpdir(), `melee-syntax-${n++}.mjs`);
  fs.writeFileSync(f, m[1]);
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { bad++; console.error(e.stderr.toString()); }
}
// and the plain scripts in the head -- the crash trap and the zoom guard, which are the two
// things that must work when nothing else does
const re2 = /<script>([\s\S]*?)<\/script>/g;
let k = 0;
while ((m = re2.exec(html))) {
  const f = path.join(os.tmpdir(), `melee-inline-${k++}.js`);
  fs.writeFileSync(f, m[1]);
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { bad++; console.error('inline script: ' + e.stderr.toString()); }
}

// A STATE THAT POSES HIM MUST ALSO HAVE SET HIS CLIP WEIGHTS.
// `rigAnim` is the only function that writes weights. A branch that positions the rig and
// returns without going through it leaves the mixer on whatever it last had -- which is the
// idle at weight 1, for ever, in that state. It is a source-shape test rather than a
// behavioural one, it is crude, and it costs nothing and always runs -- which is the whole
// argument, because no offline harness here can build a skin to test it properly.
{
  let miss = 0;
  html.split('\n').forEach((ln, i) => {
    if (!/\brigAnim\s*\(/.test(ln) && /setWeights\s*\(/.test(ln) === false) return;
  });
  html.split('\n').forEach((ln, i) => {
    if (!/rig\.mixer\.update\s*\(/.test(ln)) return;
    // the mixer may only be stepped where the weights have just been written
    const around = html.split('\n').slice(Math.max(0, i - 4), i + 1).join('\n');
    if (/rigAnim\s*\(/.test(around)) return;
    miss++; console.error('line ' + (i + 1) + ': steps the mixer without setting clip weights first\n  ' + ln.trim());
  });
  if (miss) { console.error('POSE WITHOUT ANIM'); bad++; }
}

// **`boxesNear` TAKES AN ARRAY AND `boxNear` TAKES A POINT RECORD, AND THE SCRATCH BUFFERS FOR
// THE TWO ARE ONE LETTER APART (m155).** `_bnG` is a list and `_bnpG` is a `{d, nx, nz, cx, cz}`,
// and m153's `railNear` handed the second to the first -- `out.push(...)` on an object, a hard
// TypeError on the frame he tapped in the air over anything. Nothing in the language catches
// it, both gates ran green, and it reached his phone.
// Crude, a source-shape test rather than a behavioural one, and it costs nothing and always
// runs -- which is the argument this file already makes for the one above it.
{
  // **THE TEST IS THE DECLARATION, NOT THE NAME.** A prefix rule flagged `_bvL` -- the collider
  // view's own perfectly good array -- which is a gate crying wolf on correct code, and this
  // file's oldest complaint about its own chip. What makes a scratch the right KIND is that it
  // was declared as a list.
  const arrays = new Set();
  for (const m of html.matchAll(/([A-Za-z_$][\w$]*)\s*=\s*\[\s*\]/g)) arrays.add(m[1]);
  let miss = 0;
  html.split('\n').forEach((ln, i) => {
    const m = ln.match(/\bboxesNear\s*\([^)]*,\s*([A-Za-z_$][\w$]*)\s*\)/);
    if (!m) return;
    if (arrays.has(m[1])) return;
    miss++; console.error('line ' + (i + 1) + ': boxesNear needs an ARRAY scratch (_bnX), got `' +
      m[1] + '`, which is not declared as one\n  ' + ln.trim());
  });
  if (miss) { console.error('WRONG SCRATCH KIND'); bad++; }
}

console.log(bad ? 'SYNTAX FAIL' : `syntax ok (${n} module + ${k} inline)`);
process.exit(bad ? 1 : 0);
