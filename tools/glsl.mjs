// npm run glsl -- DOES THE SHADER SPLICE ACTUALLY LAND?
//
// The blaster's charge glow is a string spliced into three's own fragment shader, and a string
// is the one thing neither gate can check: `check:syntax` parses the JavaScript AROUND it and
// `check:boot` has no GPU and never compiles one. A `.replace()` whose anchor is not in the
// chunk does not throw -- it returns the string unchanged -- so the uniform is never declared,
// the glow never happens, and on the device it is an effect that silently does not exist.
//
// IT READS THE ANCHORS OUT OF `index.html` RATHER THAN RESTATING THEM. A tool carrying its own
// copy of the strings would happily pass while the game splices something else entirely, which
// is the oldest mistake there is.
import fs from 'fs';
import * as THREE from '../vendor/three.module.min.js';

const html = fs.readFileSync('index.html', 'utf8');
const src = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];

// every `.replace('<anchor>', ...)` inside the shader-patching function
const fn = src.slice(src.indexOf('function blasterGlow'), src.indexOf('// WHERE THE SHOT COMES OUT'));
if (!fn) { console.error('blasterGlow not found in index.html'); process.exit(1); }
const anchors = [...fn.matchAll(/\.replace\(\s*'((?:[^'\\]|\\.)*)'/g)].map(m => m[1].replace(/\\n/g, '\n'));
if (!anchors.length) { console.error('no .replace() anchors found -- has the splice moved?'); process.exit(1); }

const frag = THREE.ShaderLib.physical.fragmentShader;
const vert = THREE.ShaderLib.physical.vertexShader;
console.log('three r' + THREE.REVISION + '  physical fragment shader: ' + frag.split('\n').length + ' lines\n');

let bad = 0;
for (const a of anchors) {
  const inFrag = frag.includes(a), inVert = vert.includes(a);
  const label = a.replace(/\n/g, '\\n');
  console.log('  ' + (inFrag || inVert ? 'ok  ' : 'MISSING') + '  ' +
    (label.length > 56 ? label.slice(0, 53) + '...' : label) + (inVert && !inFrag ? '   (vertex)' : ''));
  if (!inFrag && !inVert) bad++;
}

// and the things the spliced code READS have to exist where it is put
const needs = [
  ['totalEmissiveRadiance', /vec3\s+totalEmissiveRadiance/],
  ['diffuseColor', /vec4\s+diffuseColor/],
];
console.log('');
for (const [name, re] of needs) {
  const ok = re.test(frag);
  console.log('  ' + (ok ? 'ok  ' : 'MISSING') + '  the splice reads `' + name + '`, which the chunk declares');
  if (!ok) bad++;
}
// ORDER MATTERS: the glow reads the TEXEL, so it has to run after `map_fragment` has multiplied
// the map into `diffuseColor`. Spliced in before it, it would measure the flat base colour and
// light the whole gun evenly instead of its blue parts.
const iMap = frag.indexOf('#include <map_fragment>');
const iEm = frag.indexOf('#include <emissivemap_fragment>');
const order = iMap >= 0 && iEm > iMap;
console.log('  ' + (order ? 'ok  ' : 'WRONG') + '  <emissivemap_fragment> comes after <map_fragment>, so diffuseColor is the texel');
if (!order) bad++;

console.log('\n' + (bad ? bad + ' PROBLEM(S) -- the splice would silently do nothing' : 'the splice lands'));
process.exit(bad ? 1 : 0);
