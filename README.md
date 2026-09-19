# Melee

A web-based, mobile-first twin-stick action game. Three.js r180, native ES modules, an import
map, **no build step** — `index.html` opens and runs.

**Play:** https://colinwillow.github.io/melee/

Pages serves `main` / `(root)` directly — **there is no CI and no workflow**, because there is
nothing to build. Push to `main` and it is live.

## Controls

Two thumbs, and each pad means one thing in every state:

| | **LEFT PAD — the body** | **RIGHT PAD — the verb** |
|---|---|---|
| **hold** | move | hold **up**: charge a shot (blaster) / wind up (hammer) |
| **tap** | next weapon | jump |
| **flick** | dodge roll, in the flicked direction | strike, in the flicked direction |
| **drag** | — | orbit the camera |

With the blaster out, **pushing the right pad straight up and holding** takes the firing
position: a reticle appears and converges as the shot charges, the gun's blue parts light up,
and **letting go fires the ball you charged**. A nudge cannot reach the trigger and a sideways
drag is still the camera. With the hammer out, holding winds up and letting go swings.

Keyboard, for debugging on a laptop only: WASD / arrows to move, J and L to orbit.

## Layout

- `index.html` — everything: renderer, world, rig, clips, input, locomotion, camera.
- `models/characters/alien_antenna_game.glb` — 62-joint Mixamo rig, armature scaled 0.01,
  11,059 tris, 24 clips at 24 fps. Carries **`weapon_root_left` / `weapon_tip`** on the left
  hand and **`weapon_root_right` / `weapon_tip_2`** on the right.
- `models/weapons/*.glb` — the blaster and the hammer, each built around `weapon_root_right`
  with the tip at exactly `(-14.3102, 0, 0)`: **byte-identical to the character's own mount**,
  so they parent with identity and nothing about where they sit is typed in the game.
- `vendor/` — three r180, GLTFLoader, DRACOLoader + wasm, BufferGeometryUtils, SkeletonUtils.
- `tools/` — the gates and the measuring tools. See `CLAUDE.md`.

## Tooling

```sh
npm run check      # ~4s: the syntax gate plus the boot gate. Run before every push.
npm run bump       # raise BUILD, hash the assets, rewrite version.json. Run before every push.
npm run clips      # what is actually in each animation
npm run gait       # the measured reference speed of every locomotion clip
```

No dependencies. The tools read the GLBs directly — the animation samplers are not draco
compressed, so every question about a clip is answerable in about a second with nothing
installed.
