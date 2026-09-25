// WHAT IS ACTUALLY IN EACH SOUND FILE, AND HOW HARD IT HITS.
//
// *"Maybe run a little test and gauge the intensity of each of the waveforms, and then you
// could map that for the charge, so that when it charges more it plays a more intense one."*
// So the files are asked rather than ranked by ear -- which is the same argument `npm run gait`
// is built on, one asset type over: an ordering somebody guessed at is an ordering that drifts
// the moment a file is replaced.
//
// It runs the SHIPPED `sfxEdge` (lifted between the `EDGE:` markers), so what it reports is the
// window the game will ACTUALLY play -- not the whole file. A measurement of a path the game
// does not take measures a different game.
//
// Needs `npm i -D mpg123-decoder`.
import fs from 'fs';
import path from 'path';

const root = new URL('..', import.meta.url).pathname;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const src = html.slice(html.indexOf('function sfxEdge'), html.indexOf('// EDGE:END'));
if (!src.startsWith('function sfxEdge')) { console.error('EDGE markers not found'); process.exit(1); }
// the constants the lifted text reads, out of the file rather than retyped
const hit = +(/^\s*hit:\s*([\d.]+)/m.exec(html) || [])[1];
const pre = +(/^\s*pre:\s*([\d.]+)/m.exec(html) || [])[1];
const punch = +(/^\s*punch:\s*([\d.]+)/m.exec(html) || [])[1];
// **AND `skipMax` HAS TO COME ACROSS TOO (m139).** The lifted `sfxEdge` reads it, so leaving it
// out makes it `undefined`, the cap never fires, and the tool measures a rule the game does not
// have -- which is this repo's oldest mistake and the one these markers exist to prevent.
const skipMax = +(/^\s*skipMax:\s*([\d.]+)/m.exec(html) || [])[1];
if (!(hit > 0) || !(pre >= 0) || !(punch > 0) || !(skipMax >= 0)) {
  console.error('could not read SFX.hit / SFX.pre / SFX.punch / SFX.skipMax'); process.exit(1);
}
globalThis.SFX = { hit, pre, punch, skipMax };
const sfxEdge = (0, eval)(src + '\nsfxEdge');

let Dec;
try { ({ MPEGDecoder: Dec } = await import('mpg123-decoder')); }
catch { console.error('needs a decoder:  npm i -D mpg123-decoder'); process.exit(1); }

const args = process.argv.slice(2);
const dirs = args.length ? args : ['audio', 'audio/plasma_sounds'];
const files = [];
for (const d of dirs) {
  const abs = path.join(root, d);
  if (!fs.existsSync(abs)) continue;
  for (const f of fs.readdirSync(abs).sort())
    if (f.endsWith('.mp3')) files.push(path.join(d, f));
}
if (!files.length) { console.error('no mp3 found in ' + dirs.join(', ')); process.exit(1); }

// **AN ID3v2 TAG IS NOT AUDIO, AND mpg123's STREAMING DECODE CHOKES ON ONE.** Every file here
// carries one and his plasma exports carry 10 KB of it on a 30 KB file -- a THIRD of the bytes.
// Fed from byte zero the decoder returns MPG123_ERR on every frame and allocates until node
// dies, which is not a fact about the recording. The browser's `decodeAudioData` handles the
// tag perfectly well, so this is a harness concern and nothing to fix in the asset.
function id3(b) {
  if (b[0] !== 0x49 || b[1] !== 0x44 || b[2] !== 0x33) return 0;   // 'ID3'
  return 10 + ((b[6] << 21) | (b[7] << 14) | (b[8] << 7) | b[9]);  // syncsafe
}

const rows = [];
for (const rel of files) {
  const raw = new Uint8Array(fs.readFileSync(path.join(root, rel)));
  const skip = id3(raw);
  // A FRESH DECODER PER FILE. `reset()` is async and leaves `ready` settled, so reusing one
  // across a bank is how the first version ran out of memory.
  const dec = new Dec();
  await dec.ready;
  const { channelData, sampleRate } = await dec.decode(raw.subarray(skip));
  dec.free();
  const d = channelData[0];
  // THE SHIPPED EDGE, over a buffer shaped the way the browser hands one over
  const e = sfxEdge({ getChannelData: () => d, length: d.length, sampleRate,
                      duration: d.length / sampleRate });
  const a = Math.max(0, Math.round(e.a * sampleRate));
  const b = Math.min(d.length, Math.round(e.b * sampleRate));
  let peak = 0, sum = 0, n = 0;
  for (let i = a; i < b; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; sum += d[i] * d[i]; n++; }
  const rms = n ? Math.sqrt(sum / n) : 0;
  // THE ATTACK: how fast it gets to its own peak from the window's start. A short rise is a
  // CRACK and a long one is a swell, and that is most of what "punchy" means.
  let pk = a;
  for (let i = a; i < b; i++) if (Math.abs(d[i]) >= peak * .98) { pk = i; break; }
  // BODY: the fraction of the window over a quarter of the peak. A file that is loud for most
  // of its length reads heavier than one with a spike and a tail, at the same peak.
  let loud = 0;
  for (let i = a; i < b; i++) if (Math.abs(d[i]) > peak * .25) loud++;
  // **PUNCH IS ENERGY IN THE FIRST FEW MILLISECONDS, WHICH IS A DIFFERENT NUMBER FROM ALL OF
  // THE ABOVE.** `p0` is what arrives in the first 25 ms played from the ONSET and `p1` is the
  // same window played from `snd`'s `cut` -- so the ratio is exactly what throwing the run-up
  // away buys, per file, and it is the answer to *"how could we change the waveform to make it
  // punchier"*. `skip` is how much swell sits in front of the transient.
  const head = ms => {
    const s0 = Math.max(0, Math.round(ms[0] * sampleRate));
    const s1 = Math.min(d.length, Math.round((ms[0] + .025) * sampleRate));
    let t = 0, c = 0;
    for (let i = s0; i < s1; i++) { t += d[i] * d[i]; c++; }
    return c ? Math.sqrt(t / c) : 0;
  };
  const p0 = head([e.a]), p1 = head([e.p]);
  rows.push({ rel, sr: sampleRate, full: d.length / sampleRate, a: e.a, b: e.b, p: e.p,
              win: e.b - e.a, tag: skip, peak, rms, atk: (pk - a) / sampleRate,
              body: n ? loud / n : 0, p0, p1, gain: p1 / Math.max(1e-6, p0) });
}
// **INTENSITY IS NOT PEAK.** Every one of these is normalised or close to it, so peak alone
// ranks them all equal. What separates a light shot from a heavy one is how much ENERGY is in
// the window (rms), how long it goes on (win), and how much of it is loud (body). Peak is left
// in the table because a file that is NOT normalised would otherwise hide.
const score = r => r.rms * Math.pow(Math.min(r.win, 2.5), .5) * (.5 + r.body);

const w = Math.max(...rows.map(r => r.rel.length));
console.log(`\n${'file'.padEnd(w)}  ${'full'.padStart(6)} ${'window'.padStart(13)} ` +
            `${'peak'.padStart(5)} ${'rms'.padStart(6)} ${'atk ms'.padStart(6)} ` +
            `${'body'.padStart(5)} ${'score'.padStart(6)}  |  ${'skip'.padStart(5)} ` +
            `${'raw25'.padStart(6)} ${'cut25'.padStart(6)} ${'punch'.padStart(6)}`);
for (const r of rows)
  console.log(`${r.rel.padEnd(w)}  ${r.full.toFixed(3).padStart(6)} ` +
              `${(r.a.toFixed(3) + '..' + r.b.toFixed(3)).padStart(13)} ` +
              `${r.peak.toFixed(3).padStart(5)} ${r.rms.toFixed(4).padStart(6)} ` +
              `${(r.atk * 1000).toFixed(0).padStart(6)} ${r.body.toFixed(2).padStart(5)} ` +
              `${score(r).toFixed(4).padStart(6)}  |  ` +
              `${((r.p - r.a) * 1000).toFixed(0).padStart(4)}ms ` +
              `${r.p0.toFixed(4).padStart(6)} ${r.p1.toFixed(4).padStart(6)} ` +
              `${('x' + r.gain.toFixed(0)).padStart(6)}`);
console.log(`\nskip/raw25/cut25/punch: how much SWELL sits in front of the transient, and what` +
            `\nthe first 25 ms carries played from the onset vs from \`snd\`'s \`cut\`. That ratio` +
            `\nIS punch, and it is bought by starting later -- no sample is touched.`);

const bank = rows.filter(r => /plasma_sounds/.test(r.rel)).sort((x, y) => score(x) - score(y));
if (bank.length) {
  console.log('\nplasma bank, LIGHTEST first -- this is the order `SFX.files.plasma` wants:');
  console.log('  ' + bank.map(r => path.basename(r.rel, '.mp3')).join('  ->  '));
  const lo = score(bank[0]), hi = score(bank[bank.length - 1]);
  console.log(`  spread ${lo.toFixed(4)} .. ${hi.toFixed(4)}  = x${(hi / lo).toFixed(2)} ` +
              `across the bank`);
}
