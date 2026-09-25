// weirdportCity.js — loads the Weirdport filler city and applies the trim-sheet tint.
// Each building's wall/awning colour lives in its vertex colours (COLOR_0).
// The tint mask says which texels take that colour (walls, fascias, awning stripes)
// and which keep the painted texture as-is (window frames, glass, trim, roofs, props).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export async function loadWeirdportCity(scene, basePath = './exports/') {
  const tintMask = await new THREE.TextureLoader().loadAsync(basePath + 'textures/weirdport_trim_tintmask.png');
  tintMask.flipY = false;                  // match glTF UV convention
  tintMask.colorSpace = THREE.NoColorSpace;

  const gltf = await new GLTFLoader().loadAsync(basePath + 'weirdport_city_fill.glb');
  const patched = new Map();               // share one patched material per source material

  gltf.scene.traverse((obj) => {
    if (!obj.isMesh || obj.material.name !== 'City_Trim_Export') return;
    let mat = patched.get(obj.material.uuid);
    if (!mat) {
      mat = obj.material.clone();
      mat.vertexColors = true;             // gives us vColor in the shader
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.tintMask = { value: tintMask };
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform sampler2D tintMask;')
          .replace('#include <color_fragment>', `
            #ifdef USE_COLOR
              float tint = texture2D(tintMask, vMapUv).r;
              diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vColor.rgb, tint);
            #endif`);
      };
      mat.customProgramCacheKey = () => 'weirdport-trim';
      patched.set(obj.material.uuid, mat);
    }
    obj.material = mat;
    obj.castShadow = true;
    obj.receiveShadow = true;
  });

  scene.add(gltf.scene);
  return gltf.scene;
}

// Usage:
//   import { loadWeirdportCity } from './weirdportCity.js';
//   const city = await loadWeirdportCity(scene);
// Units are metres, Y-up. Lit windows/storefronts come from the emissive map,
// so a bloom pass (UnrealBloomPass) makes them glow at night.
