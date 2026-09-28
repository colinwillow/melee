// tools/ktx.mjs -- UASTC/ETC1S -> KTX2 for a GLB's embedded textures.   npm run ktx [glb] [etc1s]
//
// **THE POINT IS RESIDENT MEMORY, NOT FILE SIZE.** A WebP or a JPEG in a GLB is compressed on
// the WIRE and the GPU holds it as full RGBA with mips -- so `toon_city_visual.glb` is 5.6 MB
// of image data and about **176 MB** on the phone, which on iOS does not throw: it kills the
// tab. KTX2 stays GPU-COMPRESSED IN MEMORY, so the same picture at the same pixel count costs
// a quarter (UASTC -> ASTC/BC7, 8 bpp) or an eighth (ETC1S -> ETC2/BC1, 4 bpp).
//
// **IT REWRITES THE GLB RAW AND NEVER DECODES A MESH, WHICH IS THE WHOLE DESIGN.** The obvious
// build is gltf-transform, and that has to decode draco to read the file and RE-ENCODE it to
// write one -- so the geometry that comes out is not the geometry that went in, and a re-encode
// artefact would show up as "the city looks different" with nothing pointing at this tool. Here
// every bufferView that is not an image is copied BYTE FOR BYTE and the tool asserts it.
//
// It swaps `EXT_texture_webp` for `KHR_texture_basisu` on each texture, drops the WebP source
// where nothing else uses it, and leaves the sampler alone.
//
// **AND IT WRITES A NEW FILE RATHER THAN REPLACING HIS.** He re-exports from Blender onto the
// same path constantly (m61), so a tool that overwrites its own input eats his next export the
// first time somebody runs it twice.
import fs from 'fs';
import path from 'path';
import { encodeToKTX2 } from 'ktx2-encoder';
import sharp from 'sharp';

const SRC = process.argv[2] || 'models/toon_city/toon_city_visual.glb';
const ETC1S = process.argv.slice(2).includes('etc1s');
const OUT = SRC.replace(/\.glb$/, '_ktx2.glb');

// **RGBA ALWAYS (`ensureAlpha`).** basis reads a 32-bit raster and a 3-channel buffer is read
// as garbage from the second pixel on -- a whole texture of colour noise, which looks like an
// encoder bug and is a stride.
const decode = async buf => {
  const { data, info } = await sharp(Buffer.from(buf)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data: new Uint8Array(data) };
};

const pad4 = n => (4 - (n % 4)) % 4;

function readGLB(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32LE(0) !== 0x46546C67) throw new Error(file + ' is not a GLB');
  let o = 12, json = null, bin = null;
  while (o + 8 <= b.length) {
    const len = b.readUInt32LE(o), ty = b.readUInt32LE(o + 4);
    const body = b.subarray(o + 8, o + 8 + len);
    if (ty === 0x4E4F534A) json = JSON.parse(body.toString('utf8'));
    else if (ty === 0x004E4942) bin = body;
    o += 8 + len;
  }
  if (!json || !bin) throw new Error('GLB has no JSON or no BIN chunk');
  return { g: json, bin };
}

const { g, bin } = readGLB(SRC);
const imgs = (g.images || []).filter(i => i.bufferView !== undefined);
if (!imgs.length) { console.error('no embedded images in ' + SRC); process.exit(1); }
console.log(SRC + ': ' + imgs.length + ' embedded images, ' + (ETC1S ? 'ETC1S' : 'UASTC + zstd'));

// ---- encode
const opt = ETC1S ? { isUASTC: false, qualityLevel: 200, compressionLevel: 2 }
                  : { isUASTC: true, needSupercompression: true };
const newImg = new Map();           // image index -> ktx2 bytes
let srcPx = 0, dstBytes = 0, srcBytes = 0;
for (let i = 0; i < g.images.length; i++) {
  const im = g.images[i];
  if (im.bufferView === undefined) continue;
  const bv = g.bufferViews[im.bufferView];
  const src = new Uint8Array(bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength));
  const meta = await sharp(Buffer.from(src)).metadata();
  const t0 = Date.now();
  const out = await encodeToKTX2(src, { ...opt, isYFlip: false, generateMipmap: true, imageDecoder: decode });
  newImg.set(i, out);
  srcPx += meta.width * meta.height; srcBytes += src.length; dstBytes += out.byteLength;
  process.stdout.write('  [' + String(i + 1).padStart(2) + '/' + g.images.length + '] ' +
    meta.width + 'x' + meta.height + '  ' + (src.length / 1024).toFixed(0) + ' KB -> ' +
    (out.byteLength / 1024).toFixed(0) + ' KB  ' + ((Date.now() - t0) / 1000).toFixed(1) + 's\n');
}

// ---- the textures. `EXT_texture_webp` out, `KHR_texture_basisu` in.
let swapped = 0;
for (const t of g.textures || []) {
  const e = t.extensions || {};
  const src = e.EXT_texture_webp ? e.EXT_texture_webp.source
            : e.EXT_texture_avif ? e.EXT_texture_avif.source : t.source;
  if (src === undefined || !newImg.has(src)) continue;
  delete e.EXT_texture_webp; delete e.EXT_texture_avif;
  e.KHR_texture_basisu = { source: src };
  t.extensions = e;
  // **AND THE FALLBACK `source` GOES.** glTF says a `source` beside the extension is the
  // uncompressed fallback -- and it points at the SAME image, which is now a KTX2, so a
  // reader without the extension would try to decode a KTX2 as a PNG. There is no fallback.
  delete t.source;
  swapped++;
}
const used = new Set(['KHR_materials_emissive_strength']);
for (const x of g.extensionsUsed || []) if (!/^EXT_texture_(webp|avif)$/.test(x)) used.add(x);
used.add('KHR_texture_basisu');
g.extensionsUsed = [...used];
g.extensionsRequired = [...new Set([...(g.extensionsRequired || []).filter(x => !/^EXT_texture_/.test(x)), 'KHR_texture_basisu'])];
for (const im of g.images) if (newImg.has(g.images.indexOf(im))) im.mimeType = 'image/ktx2';

// ---- rebuild the BIN. Every non-image view is copied verbatim; the image views are replaced.
const parts = [];
let cursor = 0, copied = 0, copiedBytes = 0;
for (let i = 0; i < g.bufferViews.length; i++) {
  const bv = g.bufferViews[i];
  const imgIx = g.images.findIndex(im => im.bufferView === i);
  const data = imgIx >= 0 && newImg.has(imgIx)
    ? Buffer.from(newImg.get(imgIx))
    : Buffer.from(bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength));
  if (imgIx < 0) { copied++; copiedBytes += data.length; }
  // **A BUFFERVIEW WITH A `byteStride` MUST STAY 4-BYTE ALIGNED** or every accessor on it reads
  // shifted -- which is a mesh of noise and nothing saying why.
  const pad = pad4(cursor);
  if (pad) { parts.push(Buffer.alloc(pad)); cursor += pad; }
  bv.byteOffset = cursor; bv.byteLength = data.length;
  parts.push(data); cursor += data.length;
}
const newBin = Buffer.concat(parts);
g.buffers = [{ byteLength: newBin.length }];

const jsonBuf = Buffer.from(JSON.stringify(g), 'utf8');
const jPad = pad4(jsonBuf.length), bPad = pad4(newBin.length);
const total = 12 + 8 + jsonBuf.length + jPad + 8 + newBin.length + bPad;
const out = Buffer.alloc(total);
out.writeUInt32LE(0x46546C67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(total, 8);
let p = 12;
out.writeUInt32LE(jsonBuf.length + jPad, p); out.writeUInt32LE(0x4E4F534A, p + 4);
jsonBuf.copy(out, p + 8); out.fill(0x20, p + 8 + jsonBuf.length, p + 8 + jsonBuf.length + jPad);
p += 8 + jsonBuf.length + jPad;
out.writeUInt32LE(newBin.length + bPad, p); out.writeUInt32LE(0x004E4942, p + 4);
newBin.copy(out, p + 8);
fs.writeFileSync(OUT, out);

// ---- **IT READS BACK WHAT IT WROTE, AND THE ASSERTION IS THE GEOMETRY.** "It produced a file"
// is not "it produced a GLB": the one thing this tool must never do is disturb a mesh, so every
// non-image bufferView in the output is compared BYTE FOR BYTE against the input.
{
  const a = readGLB(SRC), b2 = readGLB(OUT);
  let bad = 0, checked = 0;
  for (let i = 0; i < a.g.bufferViews.length; i++) {
    if (a.g.images.some(im => im.bufferView === i)) continue;
    const x = a.bin.subarray(a.g.bufferViews[i].byteOffset || 0, (a.g.bufferViews[i].byteOffset || 0) + a.g.bufferViews[i].byteLength);
    const y = b2.bin.subarray(b2.g.bufferViews[i].byteOffset || 0, (b2.g.bufferViews[i].byteOffset || 0) + b2.g.bufferViews[i].byteLength);
    checked++;
    if (!x.equals(y)) { bad++; console.error('  bufferView ' + i + ' CHANGED'); }
  }
  if (bad) { console.error('GEOMETRY CHANGED IN ' + bad + ' VIEWS -- not shipping this'); process.exit(1); }
  const ktx = (b2.g.textures || []).filter(t => t.extensions && t.extensions.KHR_texture_basisu).length;
  if (!ktx) { console.error('no texture ended up on KHR_texture_basisu'); process.exit(1); }
  console.log('  verified: ' + checked + ' non-image bufferViews byte-identical, ' + ktx + ' textures on KHR_texture_basisu');
}

// RESIDENT is the number that matters. RGBA+mips is w*h*4*1.33; UASTC transcodes to 8 bpp and
// ETC1S to 4, both with the same mip tail.
const bpp = ETC1S ? 0.5 : 1;
console.log('\n  ' + path.basename(SRC) + ' -> ' + path.basename(OUT));
console.log('  wire      ' + (srcBytes / 1048576).toFixed(1) + ' MB -> ' + (dstBytes / 1048576).toFixed(1) + ' MB');
console.log('  RESIDENT  ' + (srcPx * 4 * 1.33 / 1048576).toFixed(0) + ' MB -> ~' +
            (srcPx * bpp * 1.33 / 1048576).toFixed(0) + ' MB   (' + swapped + ' textures)');
