import fs from 'fs';
const DRACO='vendor/draco/', TMP='tools/.probe/d.cjs';
let D=null;
export async function draco(){
  if(D) return D;
  fs.writeFileSync(TMP, fs.readFileSync(DRACO+'draco_wasm_wrapper.js'));
  const {createRequire}=await import('module');
  const req=createRequire(new URL('file:///home/user/melee/tools/.probe/x.mjs'));
  const Mod=req('./d.cjs');
  D=await Mod({wasmBinary: fs.readFileSync(DRACO+'draco_decoder.wasm')});
  return D;
}
export function glb(p){
  const b=fs.readFileSync(p);
  const jl=b.readUInt32LE(12);
  const j=JSON.parse(b.subarray(20,20+jl).toString('utf8'));
  const off=20+jl;
  const bin=b.subarray(off+8, off+8+b.readUInt32LE(off));
  return {j,bin};
}
const TY={5126:['DT_FLOAT32',Float32Array,'HEAPF32',4],5125:['DT_UINT32',Uint32Array,'HEAPU32',4],
          5123:['DT_UINT16',Uint16Array,'HEAPU16',2],5121:['DT_UINT8',Uint8Array,'HEAPU8',1]};
const NC={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
export async function prim(j,bin,pr){
  const d=await draco();
  const ext=pr.extensions&&pr.extensions.KHR_draco_mesh_compression;
  if(!ext) return null;
  const bv=j.bufferViews[ext.bufferView];
  const buf=bin.subarray(bv.byteOffset||0,(bv.byteOffset||0)+bv.byteLength);
  const dec=new d.Decoder(), ab=new d.DecoderBuffer();
  ab.Init(new Int8Array(buf), buf.length);
  const g=new d.Mesh();
  const st=dec.DecodeBufferToMesh(ab,g);
  if(!st.ok()||g.ptr===0) throw new Error('decode failed '+st.error_msg());
  const out={count:g.num_points(), faces:g.num_faces(), attrs:{}};
  for(const [name,id] of Object.entries(ext.attributes)){
    const acc=j.accessors[pr.attributes[name]];
    const at=d.GetAttributeByUniqueId?d.GetAttributeByUniqueId(g,id):dec.GetAttributeByUniqueId(g,id);
    const nc=NC[acc.type], T=TY[acc.componentType]||TY[5126];
    const nb=out.count*nc*4;
    const ptr=d._malloc(nb);
    dec.GetAttributeDataArrayForAllPoints(g,at,d.DT_FLOAT32,nb,ptr);
    out.attrs[name]=new Float32Array(d.HEAPF32.buffer,ptr,out.count*nc).slice();
    d._free(ptr);
  }
  const nF=g.num_faces(); const p2=d._malloc(nF*3*4);
  dec.GetTrianglesUInt32Array(g,nF*3*4,p2);
  out.index=new Uint32Array(d.HEAPU32.buffer,p2,nF*3).slice();
  d._free(p2);
  d.destroy(g);d.destroy(ab);d.destroy(dec);
  return out;
}
