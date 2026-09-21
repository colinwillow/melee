// npm run icons [src.png] -- turn ONE square artwork into the home-screen icon set.
//
// **IT IS NOT A PLAIN RESIZE, AND THE TWO THINGS IT DOES EXTRA BOTH MATTER.**
//
// 1. **IT CROPS THE MARGIN.** Generated app-icon art nearly always arrives with the rounded
//    corners already DRAWN and flat space outside them -- and iOS masks the icon itself. Ship
//    that and you get a rounded icon inset in a square, with a second rounded shape inside it.
// 2. **IT FLATTENS.** iOS composites a transparent PNG onto BLACK, not onto the home screen,
//    so an icon with alpha gets a black halo wherever the art is soft. The fill is the
//    artwork's OWN corner colour, so the flatten is invisible.
//
// **AND THE VERSION GOES IN THE FILENAME, NEVER IN A QUERY STRING.** A phone that has seen
// `icons/apple-touch-icon.png` keeps what it has for ever and a home-screen shortcut keeps it
// harder, so a new icon has to arrive under a NEW URL -- and `?v=2`, the obvious way to do
// that, is the one way that cannot work: **iOS drops an `apple-touch-icon` link whose href
// carries a query string, entirely.** The cache-buster meant to make the new icon appear is
// what makes NO icon appear, and the home screen falls back to a screenshot of the page.
// Raise `V` with the art, re-run, and repoint `index.html` and the manifest.
// That is also why `icons/` is deliberately NOT in `bump.mjs`'s `DIRS`: everything else here
// is cache-busted with a hash in a query string, and this is the one folder that must not be.
//
// Even then iOS only re-reads it when the shortcut is removed and re-added -- and the PAGE is
// cached too, so hard-reload before adding it or the phone re-reads the OLD head.
//
// No dependencies: node's own zlib, a PNG decoder for what his exporter writes (8-bit,
// non-interlaced), a box resample, and a PNG encoder.
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const V = 1;                                   // RAISE THIS WITH THE ART
const OUT = 'icons';
// 512 and 192 are the manifest's, 180 is the apple-touch-icon, 32 is the favicon. **NO 1024**:
// nothing on a phone asks for one and a lossless 1024 of photographic art is two megabytes.
const SIZES = [512, 192, 180, 32];
const TOL = 10;                                // how close to the corner colour still counts
                                               // as margin, per channel out of 255

// ---- PNG in ---------------------------------------------------------------------------------
function decode(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let p = 8, ihdr = null, idat = [], pal = null, trns = null;
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8);
    const body = buf.slice(p + 8, p + 8 + len);
    if (type === 'IHDR') ihdr = { w: body.readUInt32BE(0), h: body.readUInt32BE(4),
                                  bd: body[8], ct: body[9], interlace: body[12] };
    else if (type === 'IDAT') idat.push(body);
    else if (type === 'PLTE') pal = body;
    else if (type === 'tRNS') trns = body;
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (!ihdr) throw new Error('no IHDR');
  if (ihdr.bd !== 8) throw new Error('bit depth ' + ihdr.bd + ' -- export 8-bit');
  if (ihdr.interlace) throw new Error('interlaced -- export without Adam7');
  const CH = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ihdr.ct];
  if (!CH) throw new Error('colour type ' + ihdr.ct);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const { w, h } = ihdr, stride = w * CH;
  const out = Buffer.alloc(h * stride);
  // UNFILTER. Every scanline carries its own filter byte and three of the five refer to the
  // line above, so this cannot be done out of order or in parallel.
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride, up = dst - stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= CH ? out[dst + x - CH] : 0;
      const b = y > 0 ? out[up + x] : 0;
      const c = (x >= CH && y > 0) ? out[up + x - CH] : 0;
      let v = raw[src + x];
      if (ft === 1) v += a;
      else if (ft === 2) v += b;
      else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      out[dst + x] = v & 255;
    }
  }
  // to straight RGBA, whatever came in
  const px = Buffer.alloc(w * h * 4);
  for (let i = 0, n = w * h; i < n; i++) {
    let r, g, b, a = 255;
    if (ihdr.ct === 0) { r = g = b = out[i]; }
    else if (ihdr.ct === 4) { r = g = b = out[i * 2]; a = out[i * 2 + 1]; }
    else if (ihdr.ct === 2) { r = out[i * 3]; g = out[i * 3 + 1]; b = out[i * 3 + 2]; }
    else if (ihdr.ct === 6) { r = out[i * 4]; g = out[i * 4 + 1]; b = out[i * 4 + 2]; a = out[i * 4 + 3]; }
    else { const k = out[i]; r = pal[k * 3]; g = pal[k * 3 + 1]; b = pal[k * 3 + 2]; a = trns && k < trns.length ? trns[k] : 255; }
    px[i * 4] = r; px[i * 4 + 1] = g; px[i * 4 + 2] = b; px[i * 4 + 3] = a;
  }
  return { w, h, px, ct: ihdr.ct };
}

// ---- PNG out (RGB, opaque -- iOS wants no alpha here anyway) --------------------------------
const crc = zlib.crc32 || (() => { const T = []; for (let n = 0; n < 256; n++) { let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; }
  return (b, s = 0) => { let c = ~s >>> 0; for (const x of b) c = T[(c ^ x) & 255] ^ (c >>> 8); return (~c) >>> 0; }; })();
function chunk(type, body) {
  const len = Buffer.alloc(4); len.writeUInt32BE(body.length);
  const t = Buffer.from(type, 'ascii'), c = Buffer.alloc(4);
  c.writeUInt32BE(crc(Buffer.concat([t, body])) >>> 0);
  return Buffer.concat([len, t, body, c]);
}
// **THE FILTER IS CHOSEN PER SCANLINE, NOT LEFT AT NONE.** Filter 0 on a photograph is a
// deflate stream with nothing to find: the first version of this wrote a 1024 icon at 2.9 MB,
// which is the SOURCE file's size and the tell that no compression was happening. The standard
// heuristic -- try all five and keep the one whose bytes sum smallest as signed -- is what PNG
// is for, and it costs one pass over the image.
function filterRow(cur, prev, ft, CH, stride, out) {
  for (let x = 0; x < stride; x++) {
    const a = x >= CH ? cur[x - CH] : 0, b = prev ? prev[x] : 0, c = (x >= CH && prev) ? prev[x - CH] : 0;
    let v = cur[x];
    if (ft === 1) v -= a;
    else if (ft === 2) v -= b;
    else if (ft === 3) v -= (a + b) >> 1;
    else if (ft === 4) {
      const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
      v -= (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
    }
    out[x] = v & 255;
  }
}
function encode(w, h, rgb) {
  const stride = w * 3, CH = 3, raw = Buffer.alloc(h * (stride + 1));
  const try_ = Buffer.alloc(stride), best = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const cur = rgb.slice(y * stride, y * stride + stride);
    const prev = y > 0 ? rgb.slice((y - 1) * stride, y * stride) : null;
    let bestFt = 0, bestScore = Infinity;
    for (let ft = 0; ft < 5; ft++) {
      filterRow(cur, prev, ft, CH, stride, try_);
      let score = 0;
      for (let x = 0; x < stride; x++) { const v = try_[x]; score += v < 128 ? v : 256 - v; }
      if (score < bestScore) { bestScore = score; bestFt = ft; try_.copy(best); }
    }
    raw[y * (stride + 1)] = bestFt;
    best.copy(raw, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
                        chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ---- the two things a plain resize does not do ----------------------------------------------
// FLATTEN ONTO THE ARTWORK'S OWN CORNER COLOUR. iOS composites a transparent PNG onto BLACK.
function flatten(im, fill) {
  const o = Buffer.alloc(im.w * im.h * 3);
  for (let i = 0, n = im.w * im.h; i < n; i++) {
    const a = im.px[i * 4 + 3] / 255;
    for (let k = 0; k < 3; k++) o[i * 3 + k] = Math.round(im.px[i * 4 + k] * a + fill[k] * (1 - a));
  }
  return o;
}
// AND CROP THE MARGIN. A row counts as margin only if EVERY pixel in it is within `TOL` of the
// corner colour -- one pixel of art stops the walk, which is what stops this eating the picture.
function trim(w, h, rgb) {
  const at = (x, y) => [rgb[(y * w + x) * 3], rgb[(y * w + x) * 3 + 1], rgb[(y * w + x) * 3 + 2]];
  const bg = at(0, 0);
  const near = (x, y) => { const p = at(x, y); return Math.abs(p[0] - bg[0]) <= TOL && Math.abs(p[1] - bg[1]) <= TOL && Math.abs(p[2] - bg[2]) <= TOL; };
  const rowBg = y => { for (let x = 0; x < w; x++) if (!near(x, y)) return false; return true; };
  const colBg = x => { for (let y = 0; y < h; y++) if (!near(x, y)) return false; return true; };
  let t = 0, b = h - 1, l = 0, r = w - 1;
  while (t < b && rowBg(t)) t++;
  while (b > t && rowBg(b)) b--;
  while (l < r && colBg(l)) l++;
  while (r > l && colBg(r)) r--;
  return { t, b, l, r, bg };
}
// BOX RESAMPLE. Every source pixel inside the destination pixel's footprint, averaged -- which
// is what keeps a 1254 px artwork legible at 32.
function resize(sw, sh, src, n) {
  const o = Buffer.alloc(n * n * 3);
  for (let y = 0; y < n; y++) {
    const y0 = Math.floor(y * sh / n), y1 = Math.max(y0 + 1, Math.floor((y + 1) * sh / n));
    for (let x = 0; x < n; x++) {
      const x0 = Math.floor(x * sw / n), x1 = Math.max(x0 + 1, Math.floor((x + 1) * sw / n));
      let r = 0, g = 0, b = 0, c = 0;
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
        const i = (yy * sw + xx) * 3; r += src[i]; g += src[i + 1]; b += src[i + 2]; c++;
      }
      const i = (y * n + x) * 3; o[i] = Math.round(r / c); o[i + 1] = Math.round(g / c); o[i + 2] = Math.round(b / c);
    }
  }
  return o;
}

// ---- run -------------------------------------------------------------------------------------
// DROP A PNG IN THE REPO ROOT AND RUN IT -- which is what he actually does, straight off a
// phone with a name like `9B305A72-....png`. Newest wins, and `icons/src.png` is the fallback
// so re-running with no argument after a tidy-up still measures the art that is in the repo.
let src = process.argv[2];
if (!src) {
  const here = fs.readdirSync('.').filter(f => /\.png$/i.test(f) && fs.statSync(f).isFile());
  src = here.length ? here.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0]
      : (fs.existsSync(path.join(OUT, 'src.png')) ? path.join(OUT, 'src.png') : null);
  if (!src) { console.error('no PNG in the repo root and no ' + OUT + '/src.png -- npm run icons <file.png>'); process.exit(1); }
}
const im = decode(fs.readFileSync(src));
console.log(src + '  ' + im.w + ' x ' + im.h + '  colour type ' + im.ct + (im.ct === 6 || im.ct === 4 ? '  (has alpha -- flattened)' : ''));
if (im.w !== im.h) console.log('  NOT SQUARE -- it will be centre-cropped to the shorter side');

// the fill is the corner pixel's own colour, so the flatten cannot show
const fill = [im.px[0], im.px[1], im.px[2]];
let rgb = flatten(im, fill);
let { t, b, l, r, bg } = trim(im.w, im.h, rgb);
const cw = r - l + 1, ch = b - t + 1;
console.log('  corner colour  rgb(' + bg.join(',') + ')');
if (cw !== im.w || ch !== im.h)
  console.log('  MARGIN CROPPED  ' + im.w + 'x' + im.h + ' -> ' + cw + 'x' + ch +
              '  (top ' + t + ', bottom ' + (im.h - 1 - b) + ', left ' + l + ', right ' + (im.w - 1 - r) + ')');
else console.log('  no margin to crop -- the art reaches all four edges');

// square it up about the centre of what is left, so nothing is stretched
const side = Math.min(cw, ch);
const ox = l + ((cw - side) >> 1), oy = t + ((ch - side) >> 1);
const sq = Buffer.alloc(side * side * 3);
for (let y = 0; y < side; y++)
  rgb.copy(sq, y * side * 3, ((oy + y) * im.w + ox) * 3, ((oy + y) * im.w + ox + side) * 3);

fs.mkdirSync(OUT, { recursive: true });
for (const n of SIZES) {
  const name = n === 180 ? `apple-touch-icon-v${V}.png` : `icon-${n}-v${V}.png`;
  const want = resize(side, side, sq, n);
  const buf = encode(n, n, want);
  fs.writeFileSync(path.join(OUT, name), buf);
  // **AND IT READS BACK WHAT IT WROTE.** "It produced files" is not "it produced icons": a
  // hand-rolled encoder with a wrong filter or a bad CRC writes a file of exactly the right
  // size that no decoder will open, and the first thing that would notice is his phone showing
  // a screenshot instead of an icon. One decode, one comparison, and the failure is here.
  const back = decode(buf);
  let bad = 0;
  if (back.w !== n || back.h !== n) bad = -1;
  else for (let i = 0; i < n * n; i++)
    if (back.px[i * 4] !== want[i * 3] || back.px[i * 4 + 1] !== want[i * 3 + 1] || back.px[i * 4 + 2] !== want[i * 3 + 2]) bad++;
  if (bad) { console.error('  ' + name + ' DOES NOT READ BACK (' + bad + ')'); process.exitCode = 1; }
  console.log('  ' + OUT + '/' + name + '  ' + (buf.length / 1024).toFixed(0) + ' KB  reads back clean');
}
console.log('\nV is ' + V + '. Raise it in this file when the art changes, re-run, and repoint');
console.log('index.html and manifest.webmanifest -- the version is in the FILENAME because iOS');
console.log('drops an apple-touch-icon link whose href carries a query string.');
