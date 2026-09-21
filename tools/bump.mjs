// npm run bump -- raise BUILD, stamp a content hash on every asset, rewrite version.json.
// RUN IT BEFORE EVERY PUSH.
//
// Two places have to agree or the badge lies: the BUILD constant the game reports and the
// markup it is stamped into, so the number is on screen before a single line of the module has
// run. Pages caches index.html for ten minutes and a home-screen shortcut caches it harder, so
// a build that does not announce itself cannot be told apart from the one before it -- which
// means "the fix has not arrived" and "the fix did not work" look identical from the phone.
//
// THE ASSET HASHES ARE THE OTHER HALF, AND THEY EXIST BECAUSE FILES GET REPLACED IN PLACE.
// A re-exported alien, a re-modelled hammer -- same folder, same filename, new contents -- and
// a phone that already has that URL keeps what it has for ever. Nothing is baked, the file
// really did change, the browser simply never asked again. From where he is standing that is
// indistinguishable from the game ignoring him. Hand-bumped version constants work only when
// somebody remembers, and "somebody remembered" is not a mechanism; stamping BUILD on
// everything works too and re-downloads the whole repo on every push. The sha1 of each file's
// CONTENTS does neither: a file that changed gets a new URL and arrives, one that did not keeps
// its URL and stays cached.
//
// ADD A NEW ASSET FOLDER TO `DIRS` OR IT GOES STALE SILENTLY -- readdirSync is not recursive.
import fs from 'fs';
import crypto from 'crypto';

const F = 'index.html';
let s = fs.readFileSync(F, 'utf8');
const m = s.match(/const BUILD = '([A-Za-z]*)(\d+)';/);
if (!m) { console.error('no BUILD line in ' + F); process.exit(1); }
const next = process.argv[2] || m[1] + (parseInt(m[2], 10) + 1);
s = s.replace(/const BUILD = '[^']*';/, `const BUILD = '${next}';`);
s = s.replace(/<b id="buildN">[^<]*<\/b>/, `<b id="buildN">${next}</b>`);
s = s.replace(/<span id="bootBuild">[^<]*<\/span>/, `<span id="bootBuild">${next}</span>`);

const DIRS = ['models', 'models/characters', 'models/weapons', 'models/buildings', 'models/towers', 'images', 'audio', 'audio/plasma_sounds'];
const EXT = /\.(glb|png|jpe?g|webp|mp3|ogg|wav)$/i;
const map = {};
for (const d of DIRS) {
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d)) {
    const rel = d + '/' + f;
    if (!EXT.test(f) || !fs.statSync(rel).isFile()) continue;
    map[rel] = crypto.createHash('sha1').update(fs.readFileSync(rel)).digest('hex').slice(0, 8);
  }
}
const A = '/* ASSETS:START */', B = '/* ASSETS:END */';
const i = s.indexOf(A), j = s.indexOf(B);
if (i < 0 || j < 0) { console.error('no ASSETS block in ' + F); process.exit(1); }
const block = A + '\nconst ASSETS = ' + JSON.stringify(map) + ';\n' + B;
const before = s.slice(i, j + B.length);
s = s.slice(0, i) + block + s.slice(j + B.length);

fs.writeFileSync(F, s);
fs.writeFileSync('version.json', JSON.stringify({ build: next, time: new Date().toISOString() }) + '\n');
console.log('BUILD ' + m[1] + m[2] + ' -> ' + next);
const n = Object.keys(map).length;
if (before === block) console.log('assets: ' + n + ' hashed, none changed');
else {
  // SAY WHICH, because "I replaced it and nothing happened" is the bug this prevents
  const old = {}; const om = before.match(/const ASSETS = (\{.*\});/);
  if (om) try { Object.assign(old, JSON.parse(om[1])); } catch (e) {}
  const moved = Object.keys(map).filter(k => old[k] !== map[k]);
  console.log('assets: ' + n + ' hashed, ' + moved.length + ' CHANGED -> ' + (moved.join(' ') || '(first run)'));
}
