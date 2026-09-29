# Melee — working rules

Mobile-first twin-stick action game. Single-file Three.js r180 in `index.html` (native ES
modules, import map, **no build step**).

**PUSH STRAIGHT TO `main`. ALWAYS.** Pages serves `main` and he previews live on a phone, so a
change sitting on a branch cannot be tested, which means it is not done. Branch all you like
while working; end on `main`. Do not open a pull request unless he asks for one — it is an extra
click between the work and the phone it has to run on. *(Asked and answered, c m3: "we always
push to main". Do not ask again.)*

**Run `npm run bump` before every push** — it raises `BUILD` in all three places and rewrites
`version.json`. Pages caches `index.html` for ten minutes and a home-screen shortcut caches it
harder, so a build that does not announce itself cannot be told apart from the one before it —
which means "the fix has not arrived" and "the fix did not work" are the same picture from the
phone. The number is the big cyan figure top-left and it is also on the boot card, because
**"which build is he actually looking at" is half of every boot question** and the card is
`z-index: 20` over the badge for the whole load.

**THERE IS NO CI AND THERE MUST NOT BE ONE.** Pages serves `main` / `(root)` directly, which is
right for a repo with no build step: push to `main` and it is live, with nothing in between.
A `.github/workflows/pages.yml` existed briefly and was deleted — under branch deployment it
deploys nothing and fails on every single push, so all it produces is a red X that has to be
ignored, and a red X that always means nothing is worse than no signal at all. (For the record,
CI cannot turn Pages on by itself either: `enablement: true` on `configure-pages` comes back
`Create Pages site failed. Error: Resource not accessible by integration` — the workflow token
may deploy to a Pages site but may not create one.) **The gates run here, before the push, not
on a server.**

## Verification budget

**HE TESTS THE GAME. YOU DO NOT.** He asks for a change, you make it, you `npm run bump`, you
push, and you say **"shipped unverified"** with the build number. Then he looks at it on his
phone and tells you what is next. That is the loop, it is the only loop, and nothing in this
repo is allowed to get between the change and the phone. **A wrong guess costs him one look. A
verification pass costs him the round trip he was going to spend looking anyway**, which is
strictly worse than being wrong — and it comes out of a fixed window he is paying for.

**The only thing that runs by default:**

```sh
npm run check      # ~4s: the syntax gate and the boot gate
```

Those two earn their seconds because they are the one failure he **cannot** look at and correct:
a file that will not parse, or a module that throws at top level, is a **BLANK PAGE** — the boot
card sits on the text it was born with and there is nothing on screen or in a phone's console to
say why. That is not a wrong guess he can judge; it is a round trip with nothing in it. Say the
word and `check:boot` goes too.

**AND DRACO DECODES HERE. THE COLLISION GLB IS NOT DRACO EITHER (m129, m147).**
`vendor/draco/draco_wasm_wrapper.js` is an ordinary emscripten module -- the Worker is THREE's
packaging, not draco's -- so `DracoDecoderModule({ wasmBinary })` runs in node and the whole
510-node Weirdport visual decodes in 1.2 s (`tools/lanes.mjs` does it). **What is still true is
that nothing here can build a SKIN**: that needs a mixer and a skeleton, not a decoder.
The rest of this note stands:
`weirdport_slice_collision.glb` is plain glTF -- only `weirdport_slice_visual_draco.glb` is
compressed. m124 and m127 both say "the collision GLB is draco and nothing in this container can
decode a mesh" and that is **false**: every collider vertex in Weirdport can be read here in a
second with `fs.readFileSync` and a 20-line GLB chunk walk, which is how m129 measured the
vehicle boxes. What genuinely cannot be decoded is the VISUAL mesh. Anything about the collider
-- box sizes, orientations, `solidColumns`' output, where a body can stand -- is measurable
offline and should be measured rather than reasoned about.

**Do NOT run, unless he asks for it by name:**

```sh
npm run sim        # drives the shipped stepPlayer over the real collider
npm run glsl       # does the shader splice still land
npm run clips      # what is actually in each animation
npm run gait       # the measured reference speed of every locomotion clip
npm run rig        # height, facing, and whether the weapon mounts still agree
npm run icons      # rebuild the home-screen icon set from one square artwork
npm run sfx        # what is in each sound file, and how hard it hits (needs mpg123-decoder)
npm run hull       # does the DNA morph's proxy come out shaped like a body
npm run morph      # transfer each character's SHAPE onto zap's topology and measure how close
                   # it got. Writes deltas to models/characters/morph/ (gitignored -- seconds
                   # to regenerate, and stale the moment the method changes). Nothing in the
                   # game reads them yet. See NOTES.md for what the numbers mean.
npm run ktx        # UASTC/ETC1S -> KTX2 for a GLB's textures. RUN AFTER EVERY toon_city
                   # RE-EXPORT, or the phone plays old textures on new geometry.
npm run twins      # the 42 chunked wallB_* twins out of toon_city_kit_pieces.glb, no textures.
                   # RUN AFTER EVERY RE-EXPORT OF THE PIECE LIBRARY (the kit city reads the
                   # `_twins` file, not his)
npm run lanes      # re-bake Weirdport's street centrelines -- RUN IT AFTER A RE-EXPORT OF THE
                   # VISUAL GLB, because it WRITES `WPLANES` into index.html
```

**These exist because of what they FOUND, and that is what they are for now — a record, not a
gate.** `sim` found a collider bug (a 40 cm kerb was a wall); `gait` replaced three eyeballed
constants with measurements and caught its own first version being wrong; `rig` is what to run
after a re-export, because a rig change under a mount is silent. Keep them working when you
change what they cover. **Do not reach for them to feel sure before pushing.**

If a probe would genuinely settle something reading the code has not — the problem is real, it
is not going away, and guessing has already failed once — say so in **one sentence**, name the
tool, and let him decide. Do not run it and report afterwards.

**Reporting:** one or two lines on what changed and what to look at. Say "shipped unverified"
plainly; do not claim it looks right.

## What the assets actually are (all measured, none assumed)

`npm run rig` reprints all of this. **Run it after every re-export**: a rig change under a mount
the game depends on is silent, and "the gun is in the wrong place" and "his rig moved" are the
same picture from a phone.

- **`models/characters/alien_antenna_game.glb`** — 62-joint Mixamo rig, armature scaled 0.01,
  11,059 tris, one material, draco + `EXT_texture_webp`. **Authored height 0.9087 m**, soles at
  exactly y = 0, so `RIG.height` 1.75 wants ×1.926 — and that scale is MEASURED off the geometry
  at load, never typed, so a re-export at any size lands right with no edit.
- **HE FACES +Z, NOT THE −Z A glTF CONVENTIONALLY POINTS.** Toes read (0.0000, 1.0000) and the
  shoulder span cross-checks to **1.0000**. This matters more than it sounds: get it wrong and
  he runs exactly backwards at every heading, and because the camera swings round behind him
  what that looks like is **inverted controls**, so the stick maths gets blamed for it. It is
  measured at load from the TOES (a foot points forwards, which is a geometric fact about a
  body, and averaging the pair cancels the splay) and cross-checked against the shoulders, which
  is strictly the weaker of the two — it needs the left/right naming to be honest AND the
  up-cross-forward to come out the right way round, and those can be wrong at once and hide each
  other.
- **24 clips at exactly 24 fps.** `CINEMA_4D_Main` is one frame with **0 bones moving** —
  exporter residue, dropped. The other 23 each move 21–46 bones.
- **FOUR WEAPON MOUNTS, AND THE WEAPONS MATCH THEM TO 5.3e-6.**
  `weapon_root_left`/`weapon_tip` on the left hand, `weapon_root_right`/`weapon_tip_2` on the
  right. Both weapon files are built around `weapon_root_right` with the tip at exactly
  `(-14.3102, 0, 0)` — **byte-identical to the character's own pair** — so they parent with
  **IDENTITY**: no scale, no offset, no rotation, and nothing about where a weapon sits is typed
  in the game. `weapFit`-style nudging was never needed and must not be reintroduced.
- **THE LEFT MOUNT IS UNUSED AND THE MOUNT IS FOUND BY NAME**, so a weapon exported onto the
  left hand lands in the left hand with no code change here. That is the hook for dual wield.
- **`weapon_tip` IS NOT THE MUZZLE.** The blaster's mesh runs from x +11.7 to −38.2 in armature
  units and the tip marker sits at −14.3, about 28% along. The pair defines the mount's POSITION
  and AXIS, which is all it has to do and all the game uses it for. If a muzzle flash is ever
  wanted, measure it off the mesh bounds — do not assume the tip is it.
- **`models/buildings/alien_base_01.glb`** — Tripo output, and the GOOD shape for a phone:
  **1 mesh, 1 material, 1 texture — 8,439 triangles in a SINGLE draw call**, draco +
  `EXT_texture_webp`, 842 KB of albedo. Triangles are the last thing that costs anything here
  and draw calls are the first, so a generated shell whose detail lives in its albedo is cheap
  in exactly the way a building assembled from forty primitives is not.
  **It is authored on a UNIT CUBE** (1.000 × 0.764 × 0.993), which is a normalisation and not a
  size, so `BLD.height` is the only number that means anything and the scale is measured off the
  geometry at load. A re-export at any size lands right with no edit.
  **Tripo writes `doubleSided: true` on everything** and it is turned off — on a closed shell
  that is pure wasted fill on the one part of a mobile GPU that is actually scarce, and it
  disables backface culling for no benefit at all. **Check it on every generated asset.**
  **2048 IS THE RIGHT CALL AND IT WAS CHECKED RATHER THAN ARGUED.** Texel density, not how it
  looks in a viewport: the atlas unwraps the WHOLE shell, so ~4.19M texels spread over roughly
  400 m² of surface is **~80 texels per metre** after packing waste. Against a 390 px phone at
  dpr 3, a 55° lens at fifteen metres sees 15.6 m across 1170 physical pixels — **75 px per
  metre.** So 2048 is almost exactly 1:1 at the distance the building is actually looked at, and
  1024 would be 40 against 75, which is the soft he saw. **Judging a map's size by zooming in
  in Blender measures a camera the game never uses.**
  **The 400 KB WebP is 400 KB on the WIRE and full RGBA in memory** — 2048² × 4 × 1.33 with
  mips is **~22 MB**. Compression in the file only buys download time. One building at that is
  nothing; TWENTY distinct ones is 440 MB and a dead tab. **The fix is never a smaller map** --
  it is `gltf-transform uastc`/`etc1s` to KTX2, which stays GPU-compressed in MEMORY and takes
  22 MB to about 5.6 with the same picture. Do it when the count makes it matter.
  **AND `models/buildings` HAD TO GO INTO `bump.mjs`'s `DIRS`** (m25) — `readdirSync` is not
  recursive, so a new asset folder is a new entry there or every file in it goes stale silently.
  He replaced this one IN PLACE, 4K down to 2048, same path, new bytes: without the hash a phone
  that already had the URL keeps the 4K for ever, and from where he is standing that is
  indistinguishable from the resize not having happened.
- **`models/towers/alien_tower_01.glb`** (m60) — Tripo output like the building and the same good
  shape for a phone: **1 mesh, 1 material, 1 texture, 8,202 triangles in a single draw call**,
  draco + `EXT_texture_webp`, a 2048 map at 622 KB on the wire and **~21 MB resident**.
  **ITS NODE IS NOT AT IDENTITY, AND IT IS THE FIRST EXPORT HERE THAT IS NOT.** The mesh node
  carries a **90-degree rotation about +X** (the art is authored Z-up), so the two bounds are
  different questions and only one of them is the answer:
      POSITION accessor (LOCAL)   0.609 x 0.610 x 0.999   <- its long axis is Z
      after the node (WORLD)      0.609 x **0.999** x 0.610
  **`buildBuildings` unions `geometry.boundingBox.applyMatrix4(o.matrixWorld)` rather than
  trusting the accessor**, which was written as a habit for "an export that is not [at identity]"
  and had never once mattered. This is the file that collects on it: read the raw bounds and the
  tower comes out **32 m wide and 19.5 m tall, lying on its side**. `Box3.setFromObject` is still
  the wrong tool for a SKINNED mesh and the right union is still this one.
  **AND `doubleSided: true`, like every Tripo asset** -- forced to `FrontSide` by the builder,
  which is pure wasted fill on a closed shell otherwise. Check it on every generated asset.
  **At `height` 32 the scale is x32.03 and the plan is 19.5 x 19.5 m** -- slightly NARROWER than
  the building's 20.9 at half the height, which is what makes it read as a tower rather than as
  a bigger block. Both footprints fall out of the art, because `height` is the one typed number.
  **AND `models/towers` HAD TO GO INTO `bump.mjs`'s `DIRS`** -- `readdirSync` is not recursive,
  so a new asset folder is a new entry there or every file in it goes stale silently. **Fourth
  time**, after `models/buildings` (m25), `audio/plasma_sounds` (m58) and Shredworld's own.
- **HER MATERIAL WAS NEVER BROKEN AND THE `alphaTest` WAS MINE (m30).** *"Normals are still
  messed up... I can re-export the file, I don't know what I did to the materials."* He did
  nothing. Read straight out of the file: metallic 0, roughness 0.9, one base colour texture,
  **no normal map**, a grey `KHR_materials_specular` -- there is nothing wrong in there.
  **What `alphaTest .5` does to a texture whose alpha is not a cutout mask is punch holes
  through her, and what you see through a hole is the inside of her far surface** -- which is
  *"like I'm seeing the back of the normals"* exactly. It survived m29 because m29 only took
  back the sidedness.
  **A FIX THAT IS NOT JUSTIFIED BY A MEASUREMENT IS A SECOND BUG**, and this was the third time
  in two builds that two things about one material were changed at once. What stays is the one
  change that IS justified: `BLEND` is the exporter default whenever a texture carries an alpha
  channel at all, and a transparent skin sorts against itself, so the flag comes off. Nothing
  else is touched. `SHE.alphaTest` exists and is 0.
- **A MODEL SWAPPED IN PLACE REACHES THE SERVER BY ITSELF AND REACHES HIS PHONE ONLY VIA THE HASH
  (m61).** *"I'm used to things where when you just swap the model out of the repository it just
  automatically updates, but I feel like you're running something we have to explicitly tell
  you."* Two halves, and only one of them is automatic:
      the REPO     Pages serves `main` and `TOWER.file` already names that path. A same-path
                   re-export needs NO code change and no reference anywhere. That half is free.
      his PHONE    every runtime asset URL goes through `A(path)`, and `bump.mjs` bakes a sha1 of
                   each file's CONTENTS into the `ASSETS` block. **Until a bump moves that hash
                   the URL is unchanged and the browser serves the bytes it already has** -- which
                   is indistinguishable from the re-export not having happened. m25 paid for this
                   once already on the 4K-to-2048 building.
  So a swap costs `npm run bump && git push`, by whoever notices -- it is not something only this
  side can do. The tell that one is outstanding is the hash in `index.html` disagreeing with the
  file on disk.
  **AND A RE-EXPORT CAN MOVE A MEASURED PROPERTY SILENTLY**, which is the other reason to say so:
  every number this builder uses is read off the geometry, so a shape change moves the scale and
  the footprint with nothing in the file to say it did. Old against new, through the same parse:
      structure   1 mesh / 1 material / 1 image, draco + webp, doubleSided, node +90 about +X,
                  same node translation   -- IDENTICAL, so no code change and no builder concern
      geometry    world height span 0.9995 -> 0.9741 (-2.5%), plan 0.6089 x 0.6099 unchanged
      therefore   scale x32.02 -> **x32.85**, footprint 19.5 -> **20.0 x 20.0 m**
  **CHECKED AS RECTANGLES AGAIN RATHER THAN ASSUMED TO STILL FIT.** Half a metre of footprint is
  not nothing when the m60 placement was chosen by clearance: at (-28, 30) the tower now spans
  x -38..-18, z 20..40, which clears the nearest box (-16, 12) by 5.5 m in z, the building's own
  plan by 17.5 m in x, and every one of the thirteen bodies -- the nearest, the hick at (-17, 11),
  by 1.0 m in x and 9 m in z. A building overlapping a box is the m24 lesson: nothing on screen
  disagrees with anything and the player simply cannot walk there.

- **`models/characters/alien_female_purple.glb`** — 10,966 tris, one material, one 2K WebP
  (406 KB on the wire, ~22 MB resident), draco + `EXT_texture_webp` + `KHR_materials_specular`.
  **Authored height 0.9995 m**, toes read **+1.2 deg** so she faces +Z like the alien. **No
  weapon mounts** — she is an NPC, not a wearer. 3 clips (`idle_01`, `walk_fwd`, `run_fwd`, all
  7.54 s) plus `CINEMA_4D_Main` residue, dropped.
  **193 JOINTS, AND 135 OF THEM ARE HAIR AND TAIL**: six chains off `mixamorig_Head` at 16 / 23
  / 19 / 16 / 23 / 19 bones, and a 19-bone tail off `mixamorig_Hips`.
  **SHE IS OPAQUE AND `doubleSided` AS OF THE m31 RE-EXPORT** — `alphaMode` is absent, which is
  the glTF default, so `buildShe` does nothing to her material but the emissive lift. The first
  export was `BLEND`, which is what an exporter writes whenever the texture carries an alpha
  channel at all, and a transparent skin **sorts against itself**: her far side draws over her
  near side. **Check `alphaMode` on every character export** — but see the m30 note below
  before "fixing" it, because the cure there was worse than the disease.
  **Measured gait** (planted foot, `npm run gait`'s own method): walk 0.898, run 2.478 m/s at
  her ×1.751.
- **`models/characters/alien_warrior.glb`** (m35) — 59-joint Mixamo rig, **authored height
  0.7749 m**, soles at exactly y = 0, one skinned mesh, draco + `EXT_texture_webp`. Toes read
  (0.0000, 1.0000): he faces **+Z** like everyone else here. **`weapon_root` on
  `mixamorig_RightHand`, tip local (0, 0, 36.1845)** — and `models/weapons/spikey_mace.glb` is
  built around the same pair to **8.6e-6**, so it parents with IDENTITY and nothing about where
  the mace sits is typed in the game. *"I placed the bones on his rig, so you can just drop the
  mace onto the same orientation."* He had already done the hard part; `npm run rig` said so
  before a line was written.
  **54 clips at 24 fps, and TWO of them are exporter residue** — `CINEMA_4D_Main` and
  `alien_warrior_rigged_mixamo`, one frame each with 0 bones moving. `FOE.drop` takes both.
  **A FULL COMBAT SET**: idle x3, block + block react, walk/run forward/back/left/right, turns,
  five melee attacks, three combos, two kicks, a run-jump attack, two taunts, four hit
  reactions plus a big one, a fall, a get-up, two disarms and two equips. *"We can probably
  strip out a ton of them"* — what is used is in `FOE.clips`, and the ones nothing names are
  `crouch_*`, the `unarmed_*` family (a whole second locomotion set for when he has no mace),
  `standing_disarm_*`, `standing_melee_attack_kick_*`, the three combos and
  `standing_melee_run_jump_attack`. **None of them cost anything until they are named** — the
  mixer only builds an action per clip — so there is no hurry to cut them.
  **AND HIS GAIT MEASUREMENT ARGUED WITH ITSELF.** `npm run gait` flagged FEET DISAGREE 100% on
  three of the seven locomotion clips: its stance test is "the foot moving BACKWARDS in the body
  frame", and this rig's hips carry a yaw the antenna alien's does not, so one foot never
  qualified. The direction-free reading is the SLOWER foot each frame -- which is the planted
  one by definition -- at its plateau:
      standing_walk_forward  0.359 authored  x2.386 -> 0.86 m/s    (walkRef)
      standing_run_forward   0.749           x2.386 -> 1.79 m/s    (runRef)
  Both are slow for a man his size and they are what the clips are doing; `FOE.run` is above the
  reference on purpose and `tsHi` caps how far past. **The honest fix for a slow clip is a
  faster clip**, not a bigger number.
  **`npm run gait` NOW FALLS BACK TO `mixamorig_Hips`** when a rig has no `root` bone. It
  reported "rig is missing root or toe bones" on a rig that is perfectly fine, which is a tool
  refusing to measure the asset rather than a fact about the asset.
- **`models/characters/hick_skinny.glb`** (m38) — 65-joint Mixamo rig, **authored height
  0.8638 m**, soles at exactly y = 0, one skinned mesh, draco + `EXT_texture_webp` +
  `KHR_materials_specular`. Toes read (0.0000, 1.0000): **+Z** like everyone else.
  **NO WEAPON MOUNTS AT ALL**, which is right — he is an NPC, not a wearer. (`npm run rig` used
  to report that as a mismatch, which reads as a broken export; it says "carries no weapon
  mounts" now. **"No mounts at all" and "the wrong mount" are different facts.**)
  **24 clips, and TWO of them are static**: `CINEMA_4D_Main` residue, and **`idle` itself moves
  ZERO bones past two degrees** — so `drunk_idle` is his idle and `idle` is not used. A man
  standing perfectly still reads as a statue beside three that are moving.
  **HIS GAIT MEASURES CLEAN, WHICH THE WARRIOR'S DID NOT** — the two feet AGREE on `walking` and
  `running`, and `idle` reads 0.002 m/s, the control that says the measurement can be trusted:
      walking            0.619 authored  x2.026 -> 1.25 m/s
      running            1.508           x2.026 -> 3.06    (`fleeRef`)
      drunk_walk         0.292           x2.026 -> 0.59    (`walkRef`; feet disagree 43%, which
                                                            is what a drunk walk IS)
      drunk_run_forward  0.989           x2.026 -> 2.00    (`runRef`)
  **THE DRUNK SET IS THE STUMBLE SET.** *"He does have drunk versions of everything, so
  theoretically you could shoot him and he could stumble around."* His hit reactions are his own
  drunk turns rather than anything borrowed.
  **NOTHING USES** `left/right_strafe*`, the four turn clips, `backward_walking_turn`,
  `run_backward_arc_right`, `drunk_walk_backwards` (beyond the hit pool) or `drunk_run_backward`.
- **`models/characters/hobo_01.glb`** (m41) — 65-joint Mixamo rig, **authored height 0.8784 m**,
  soles at exactly y = 0, one skinned mesh, draco + `EXT_texture_webp` + `KHR_materials_specular`.
  Toes read (0.0000, 1.0000): **+Z** like everyone else here. **No weapon mounts**, which is right.
  **30 clips at 24 fps, and TWO of them are static**: `CINEMA_4D_Main` residue, and — exactly as
  on the hick — **`idle` itself moves only two bones by 2 degrees**, so `drunk_idle` is his idle.
  A man standing perfectly still reads as a statue beside three that are moving.
  **HE IS THE HICK PLUS THE FOUR POSES THE HICK NEVER HAD**: `Head_Hit`, `Hit_To_Body`,
  `Big_Hit_To_Head`, `hit_and_fall`, `get_up`, and `in_air`.
      drunk_walk         0.285 authored  x1.981 -> 0.56 m/s  (`walkRef`; feet disagree 47%,
                                                              which is what a drunk walk IS)
      drunk_run_forward  0.921                  -> 1.82      (`runRef`)
      running            1.350                  -> 2.67      (`fleeRef` -- he sobers up to run)
  **NOTHING USES** `walking`, `left/right_strafe*`, the four turn clips, `backward_walking_turn`,
  `run_backward_arc_right`, `drunk_run_backward`, `drunk_walking_turn` or `jump`.
- **`models/characters/clancy.glb`** (m73) — 27-joint rig, **authored height 0.9028 m**, soles at
  exactly y = 0, 1 mesh / 1 material / 1 texture, draco + `EXT_texture_webp` +
  `KHR_materials_specular`. Toes read (0.0000, 1.0000) and the shoulder span cross-checks to
  **1.0000**: he faces **+Z** like everyone else here. **No weapon mounts**, which is right.
  **37 clips**, plus `CINEMA_4D_Main` residue, dropped.
  **AND HE ALREADY HAS THE AIR POSE HE THINKS HE HAS NOT.** *"Eventually I should've put in an
  air pose, because I wanted to be able to be hit by both you and NPCs, kinda launching, and maybe
  he'll roll around or something -- but I don't have that yet."* He does: `falling_idle` is a real
  float, `falling_to_roll` is the roll he described, and `hard_landing` is the arrival. **Same
  shape as m67's finding one character over** -- read the export before taking his word for what
  is missing from it, because the clips he has forgotten are the ones already paid for.
  **HIS GAIT MEASURED CLEAN ON TWO CLIPS AND NOT ON THE ONE NAMED `walking`.** `npm run gait`
  flagged it **FEET DISAGREE 157%** (L 0.51, R 0.06), which is the warrior's own m35 shape, so it
  is not used at all -- `mutant_walking` and `running` both have their two feet corroborating, and
  `clancy_idle_01` reading **0.024 m/s** is the control that says the other two can be trusted:
      mutant_walking   0.265 authored  x2.026 -> 0.54 m/s   (`walkRef`)
      running          0.711           x2.026 -> 1.44       (`runRef` and `fleeRef`)
  **NOTHING USES** `walking`, the mutant attack clips, or the remaining two dozen. They cost
  nothing until they are named, and *"you're welcome to make him attack, I don't really care"* is
  a slot rather than a build.

- **A NEW NPC COST A TABLE AND A LOAD LINE, AND THAT IS m35 COLLECTING (m41, `HOBO`).** *"He's got
  all the same animations as the hick, so he's just an NPC and walks around -- but I gave him
  more. Three hit animations, you can knock him down, he has a get-up, and I gave him an in-air
  pose so you can launch him."* Every one of those already had a state waiting for it: the bolt,
  the swept limb, `bodyFly`, `bodySep`, the player's own resolver and `foeWander` all reach
  anything in `DUMMIES`, and `d.K` is what lets a third table mean a third character rather than a
  third code path. **No builder worth the name, no second brain, one line in `init()`.**
  **AND HE IS WHERE THE HICK'S EMPTY HOOKS FINALLY POINT AT SOMETHING.** m38 wrote `downF`,
  `downB`, `upF`, `upB` as `''` because the poses were not drawn, and the STATES ran regardless --
  the hick flew, landed, got up and ran away with nothing to show for it. Those same states now
  play real clips with **no branch added anywhere**, which is the whole return on keeping a state
  machine and an animation separate.
  **THE BEATS ARE NEAR THE CLIPS' OWN LENGTHS, NOT THE HICK'S.** m37's lesson: a reaction too fast
  to read is the same reaction every time, and `hit_and_fall` is 3.0 s -- at 2x it is a man being
  deleted rather than knocked over. `downBeat` 1.6, `upBeat` 1.8.
  **ONE FALL AND ONE GET-UP, SO THE PAIR CANNOT DISAGREE.** Two clips per direction is two chances
  for the fall to end face-down while the get-up starts face-up, which is the `COP.flip` bug one
  repo over; with one of each there is nothing to mismatch and nothing to measure.
- **SMOKE IS NOT THE SPARK POOL, AND ALL THREE OF ITS DIFFERENCES MATTER (m41, `SMOKE`,
  `puffPool`).** *"I added a joint in the hick for the tip of his cigarette, so we can make some
  fun smoke."* A spark is **additive**, **falls**, and **holds its size**; a puff of smoke is
  **alpha-blended**, **rises** and **grows** -- and grey additive over a white floor is a glow
  rather than a wisp. Nothing in the step is shared, so nothing in the step is shared.
  **WHAT *IS* WORTH HAVING EXACTLY ONCE IS THE PLUMBING**, and it is the part that is easy to get
  wrong: `gl_PointSize = aSize * uPx / -mv.z` with `uPx` derived per frame from the framebuffer
  height over tan(fov/2), so a point is N world METRES at any lens. A tuned constant changes size
  whenever the fov does, and this game's fov moves. `puffPool` builds that and `puffFlush` uploads
  it; the two pools share both and share nothing else. **A material is a draw call either way, so
  a second pool costs one call and buys a whole vocabulary.**
  **AND A PUFF LEAVES THE MAN.** It is emitted AT the joint's world position and then lives in the
  world. The spark swarm's `follow` does the opposite on purpose (m39: sparks that stay ON a body
  being knocked across the street is the difference between "particles happened near him" and
  "something is happening TO him"), and applying it here would be a man with a cloud stuck to his
  face.
  **THE PLACEMENT IS HIS AND NOTHING ABOUT IT IS TYPED.** `cigarette_tip` is a child of
  `mixamorig_Head`, so it rides every clip for free -- he can look about, stumble and be knocked
  over and the smoke still leaves the end of the cigarette. Same property the weapon mounts have,
  and `npm run sim` pins both halves: the node is in the file, and its parent is the head.
  **THE JOINT IS LOOKED UP ONCE, AT SPAWN.** `getObjectByName` walks the whole model, which is not
  a per-frame thing to do, and the node never moves in the hierarchy.
  **AND THE INTERVAL IS ROLLED PER PUFF, NOT FIXED.** A fixed one is a metronome, which is exactly
  what smoke is not; and each body's first puff is offset, so three of them are not one clock.
  **WHAT NO HARNESS HERE CAN SEE IS WHETHER IT LOOKS LIKE SMOKE** -- the GLB is draco and nothing
  in this container can build a skin, so the joint's world position at runtime is a device
  question. `mel.smoke(x, y, z)` fires one anywhere, and `mel.SMOKE` is live.
- **THE SECOND ICON WENT IN AT `icons/` AND THE TOOL ONLY LOOKED AT THE ROOT (m47).** *"I added a
  new icon, can you make the necessary transitions."* It did: four v2 files, all reading back
  clean, **every one byte-identical to v1** — because the new art was one directory over from
  where the picker was looking and it fell through to the old `icons/src.png`. A new version
  number carrying the old picture is the single worst outcome this tool has, because it is
  **indistinguishable from the icon not updating at all**, and the round-trip check cannot see it:
  those files are perfectly valid PNGs of the wrong thing.
  **HE DROPS IT WHEREVER IT LANDS OFF THE PHONE** — the root the first time, `icons/` the second,
  with a name like `CAB27B3D-....png`. So both are searched, newest wins, **and the generated
  names are excluded**: they are PNGs in `icons/` too, and picking `icon-512-v1.png` as the source
  would rebuild the whole set out of a 512 px downsample of itself.
  **AND IT SAYS WHAT IT READ.** The path, the size and a sha of the source, plus every other
  candidate it passed over. "It used the wrong file" is silent otherwise, which is how this cost a
  round in the first place.
  **THE GUARD IS AGAINST THE VERSION BELOW.** If every file of a new `V` is byte-for-byte the
  previous one's, the source was wrong — so it says so and **exits 1**. Verified by pointing it at
  the old art on purpose: `EVERY v2 FILE IS BYTE-IDENTICAL TO v1`, exit 1; at the new art, exit 0.
  **Check the thing you are testing is really broken before believing the test that says it is
  caught**, which is the one discipline that makes a guard worth having.
  **v1 IS DELETED AND HIS FILE IS NOW `icons/src.png`.** One known path for the source, and
  nothing left in the folder that the page does not reference.
- **THE HOME-SCREEN ICON, AND THE VERSION GOES IN THE FILENAME (m44, `npm run icons`).** One
  square artwork in, the whole set out: 512 and 192 for the manifest, **180 for the
  `apple-touch-icon`** (which is the one iOS actually uses — it reads the manifest but will not
  take an icon from it) and 32 for the tab.
  **`?v=2` IS THE ONE CACHE-BUSTER THAT CANNOT WORK HERE.** A phone that has seen
  `icons/apple-touch-icon.png` keeps what it has for ever and a home-screen shortcut keeps it
  harder, so a new icon has to arrive under a NEW URL — and **iOS drops an `apple-touch-icon`
  link whose href carries a query string ENTIRELY**, so the thing meant to make the new icon
  appear is what makes NO icon appear and the home screen falls back to a screenshot of the
  page. `V` at the top of `tools/icons.mjs` writes the number into the NAME. Raise it with the
  art, re-run, repoint `index.html` and `manifest.webmanifest`.
  **WHICH IS ALSO WHY `icons/` IS DELIBERATELY NOT IN `bump.mjs`'s `DIRS`.** Every other asset
  here is cache-busted with a content hash in a query string, and this is the one folder where
  that is fatal. It is the only exception and it has to stay one.
  **AND IT IS NOT A PLAIN RESIZE.** Two things, and both are things generated icon art does:
  it **CROPS THE MARGIN** (app-icon art usually arrives with the rounded corners already DRAWN
  and flat space outside them, and iOS masks the icon itself — ship that and you get a rounded
  icon inset in a square with a second rounded shape inside it), and it **FLATTENS** onto the
  artwork's own corner colour, because **iOS composites a transparent PNG onto BLACK**, not onto
  the home screen. His first icon needed neither — 1254 px, no alpha, art to all four edges,
  corner `rgb(246,200,141)` — and the tool says so rather than staying quiet.
  **IT READS BACK WHAT IT WROTE.** The encoder is hand-rolled on node's own zlib, so "it
  produced files" is not "it produced icons": a wrong filter byte or a bad CRC writes a file of
  exactly the right size that no decoder will open, and **the first thing that would notice is
  his phone showing a screenshot instead of an icon.** One decode and one comparison per size.
  **AND THE FIRST ENCODER WROTE A 1024 ICON AT 2.9 MB** — the source file's size, which is the
  tell that nothing was compressing: it left every scanline on filter 0, which on photographic
  art gives deflate nothing to find. Per-scanline adaptive filtering is what PNG is for. 1024 is
  gone as well: nothing on a phone asks for one.
- **Sizes are proportional and must stay that way.** Blaster 0.499 m authored = 55% of his
  height; hammer 0.614 m = 68%. "As authored" means proportional to the wearer, so they keep
  those percentages at any `RIG.height` and **no scale is applied to either**.

## Landmines — the index. **THE FULL TEXT IS IN `NOTES.md` AND IT IS 633 KB.**

**THIS FILE IS LOADED IN FULL ON EVERY SINGLE TURN AND `NOTES.md` IS NOT.** That is the whole
reason for the split (m149): the landmine section had grown to 633 KB — about 160,000 tokens of
instructions in front of every message, before a word of conversation — which is why this repo
started compacting every other prompt and burning a week of credit in a day. The notes were
worth writing and they are not worth re-reading in full a hundred times a day.

**SO: `grep -n` `NOTES.md` BEFORE TOUCHING A SYSTEM, AND READ THE ENTRY.** Grep for the symbol
(`pushCars`, `boxLocal`, `bodyBorrow`, `SFX.edge`), for the build (`(m146`), or for the words in
his report. Nearly every one of these was paid for with a whole build, and the story is what
makes the rule stick — but it belongs behind a grep, not in the prompt.

**NEW NOTES GO IN `NOTES.md`, AT THE TOP**, in the same shape as the rest: what he said, what
was actually wrong, what was measured, and what must not be re-done. Add a line HERE only for a
rule that has to be in front of me *before* I know which system I am in.

### The ones that must be in front of me every time

- **A `const` OR `let` READ ABOVE ITS OWN DECLARATION IS A BLANK PAGE.** Nine times. `npm run
  check:boot` exists for exactly this and it is the reason it is not optional.
- **NEVER SCRUB A VELOCITY WITH A BARE `*= k` PER FRAME** — `Math.exp(-k*dt)` or `damp`, always.
- **NEVER ASK `action.isRunning()` WHETHER A CLIP STILL MATTERS — ASK ITS WEIGHT.** And
  re-entering a `ONCE` clip has to rewind it, on the STATE, never on the damped weight.
- **THE CLIP WEIGHT TABLE MUST SUM TO 1.** A zero-weight bone is blended back to BIND, which is
  the T-pose exactly.
- **ONE WRITER PER VALUE.** `cam.az`, `p.heading`, a bone, a sun direction. Two writers is a
  loop that never settles, and it has shown up five times.
- **A NEW ASSET FOLDER GOES IN `DIRS` IN `bump.mjs`** or every file in it goes stale silently.
  Eleven times. **AND CHECK `EXT` TOO** -- the folder can be listed and the file still never
  hashed, which is how `toon_city_obb.json` and `impact_marks.json` shipped stale-by-construction
  for two builds (m164). **The tell is a bump printing a hash count that did not move on a run
  where a file did change.**
- **A TOOL MUST RUN THE SHIPPED TEXT, NOT A COPY OF THE RULE.** Lift it between its `NAME:`
  markers. A harness that measures a path the game does not take measures a different game —
  this repo's oldest and most expensive mistake.
- **DERIVE THE PASS MARK FROM THE GEOMETRY, NEVER FROM WHAT LOOKS ABOUT RIGHT**, and ask what a
  check would still pass with.
- **A BEHAVIOUR ASSERTED ONLY IN A COMMENT IS NOT A BEHAVIOUR.** Five times: the comment said
  what it should do and the line under it did something else.
- **WHEN A FEATURE DOES NOTHING, CHECK WHERE IT IS CALLED BEFORE WHAT IT DOES.** Five times.
- **+X IS HIS LEFT.** Forward is `(sin h, cos h)`, his right is `(-fz, fx)`. Measure it, never
  argue it — this file gets handedness backwards about half the time when it reasons.
- **MEASURE A BODY WITH GEOMETRY BOUNDS, NEVER `Box3.setFromObject`** (the armature is 0.01).
- **PUT THE NUMBER THAT TELLS THE CASES APART IN THE CHIP.** There is no console on a phone, so
  "it never loaded", "it loaded wrong" and "it loaded and is elsewhere" are one picture.
- **A NUMBER THAT EXISTS TO RESCUE A STAND-IN GOES WHEN THE STAND-IN DOES.**
- **A COLLIDER THAT REJECTS IS NOT A FILE THAT LACKS (m166).** `triAdd` keeps only up-facing
  faces, so "the triangles are in" and "the WALLS are in" are different claims and this file
  made the first while meaning the second for seven builds. Count what a store actually kept.
- **GLTFLoader LOWER-CASES ANY ATTRIBUTE NAME IT DOES NOT KNOW (m172).** `_CHUNK` in the file is
  `_chunk` in the game, and a check that reads the FILE cannot see it. Fabricate test scenes the
  way the loader builds them.
- **A TASTE DECISION IS HIS.** Put it on a switch he can reach on the phone; do not ship a pick
  and an argument for it.

## The control map — read this before touching either pad

**LEFT PAD is the BODY. RIGHT PAD is the VERB.** That has to hold in every state or neither pad
means anything you can carry from one situation to the next.

| | left | right |
|---|---|---|
| hold | move | **hold UP**: firing position, charge, release to fire (blaster) / wind up (hammer) |
| inner wheel | **the WEAPONS, one segment each (m173)** | the blaster's CHARGE / AUTO / **DNA** (m112) |
| outer wheel | **Clancy: ROAM / PACK**, or **REVERT** while disguised (m121) | — |
| tap | **jump (m173)** — so a thumb holding the trigger can still jump | jump |
| flick | dodge roll, in the flicked direction | strike, in the flicked direction |
| drag | — | orbit the camera |

**ON THE BOARD (m167) THE TWO HALVES MEAN THE SAME THINGS**, which is the whole point of having
a map at all:

| | left | right |
|---|---|---|
| hold | steer; forward = push, pulled back = brake (held, latched) | **hold UP**: the blaster, exactly as on foot |
| tap | ollie (m173) — the same as the right tap | ollie — or catch a rail, in the air |
| flick | up/down = front/back flip · **left/right = BARREL ROLL** · down while HOLDING it = step on, on it = step off | the deck's own tricks (kickflip / 360 / the two shove-its) |
| drag | — | orbit the camera (and a follow cam takes over `CAM.idle` after the thumb lifts) |

- **THE HAMMER'S WIND-UP IS THE SAME GESTURE AS THE TRIGGER, AND THE SAME CODE (`padUp`).**
  Both are "the thumb pushed UP past `fireAt`, kept past `keepAt`, inside `arc`". Until m46 the
  wind-up had no direction test at all and armed on any hold, so a camera drag swung the hammer.
  If either ever needs its own threshold, give it its own constant — do not fork the predicate.
- **The trigger does NOT wait for `MOVE.tapT` the way an ordinary hold does.** A push to
  `fireAt` (.78) is already far past the tap's own `far < .42`, so the jump and the trigger
  cannot collide and the firing position can be entered as fast as the thumb moves.
- **The trigger is a full pull, HELD, and all four gates earn their keep.** `fireAt` is how far
  up the pad it arms (a nudge cannot reach it); `keepAt` is how far back DOWN it stands down,
  and **the gap between them is hysteresis** — a thumb rolling inward as it lifts must not
  cancel the shot you meant, and without it a full pull only fires from exactly full stretch;
  `armT` is how long it has to be up there, so a flick to the top and straight back is not a
  shot however far it went; and `arc` is how far off straight up it may be and still be a
  trigger rather than a look. **That last one is what lets this share a pad that is already
  full** — a sideways drag is still the camera, and pushing straight up barely orbits because
  its X is near zero.
- **A HOLD ONLY MEANS "AIM" WHEN SOMETHING THAT AIMS IS EQUIPPED.** Unarmed or with the hammer
  the right pad is purely the camera and the jump, so the conflict between "drag" and "hold"
  only exists where it buys something.
- **THE GESTURE VOCABULARY IS DELIBERATELY NOT FULL.** Left-pad press-and-hold-in-place is
  unassigned, and so is anything on a second tap. Those are the slots to spend next; do not
  spend one on something the gait blend already handles for free.
- **AND A FLICK IS A SWEEP ACROSS THE PAD, NOT MERELY A FAST MOVE (m104).** A thumb coming off the
  glass produces a fast move and an immediate lift, which is geometrically the same event -- so
  what separates them is DISTANCE (`FLICK.at` .95 of the pad's radius) and no timing window ever
  could. See the landmine.
- **AND THE BUILD NUMBER IS NOT THE ONLY TAP TARGET ANY MORE (m124).** The world key sits under
  it, in the same top-left gutter and out of the play area, and swaps between the test site and
  Weirdport. It RELOADS, and it says which world it is in by having the name on it. **The
  `COLLIDERS` key is under that again (m128)** and draws the boxes; both stack off the chip's
  MEASURED height, so a chip that grows a line pushes them down rather than being sat on.
- **THE PADS CAN FLOAT (`STICK.dyn`, tap the build number).** Fixed they are 148 px; floating they
  are 132 and appear where the thumb lands. Everything downstream reads the pad's own rect, so a
  gesture means the same thing in both.

## Still open

- **THE TOON CITY IS A THIRD WORLD** (`TCITY`, world key `toon`, `?w=toon`). m157 took it from
  2,327 draw calls to ~72; m158 added his collision file, his `weirdkit_tint` paint, the rim and
  bounce lights, and **the KTX2 bake — 176 MB of texture down to 22**; m159 **threw the box
  rasteriser out** and took his own `toon_city_obb.json` (491 oriented boxes) plus the solids'
  triangles through `triAdd`; **m166 put EVERY triangle in a second store (`SURF`) and moved the
  bolt's impact onto it** — see `NOTES.md`.
  **`TCITY.file` POINTS AT THE BAKED GLB** — his own export is `TCITY.raw`, and **the bake has to
  be re-run (`npm run ktx models/toon_city/toon_city_visual.glb etc1s`, about 10 minutes) after
  EVERY re-export**, or the phone plays old textures on new geometry. The tell is `npm run bump`
  reporting `toon_city_visual.glb` CHANGED.
  **HIS EXPORTS NO LONGER CARRY `EXT_mesh_gpu_instancing`, AND THEY WILL NOT AGAIN** — *"the
  Blender export option only merged 1,382 objects down to 1,328, and it nearly made 98 objects
  vanish. From here on, every export I make leaves that extension off."* So `buildTCity`'s own
  instancing pass sees every object as a plain node. **The skip on `o.isInstancedMesh` in both
  its passes STAYS** — it costs nothing and an `isInstancedMesh` is also an `isMesh`, so a
  traversal that merges without it silently destroys the inner instances.
  What is left: **no spawn search** (0,0, harmless) and the bodies still stand at test-site
  coordinates.
  **AND THE OLD NOTE HERE SAID HIS COLLISION FILE CARRIES "the 71 buildings' triangles and almost
  nothing else". THAT WAS WRONG AND m166 MEASURED IT.** The file is nine meshes — `road_city`,
  `ground_sidewalks`, `ground_lots`, `ground_curbs`, 71 `bld_*`, `prop_street`,
  `prop_tree_trunks` and `solid_posts` — **37,702 triangles covering everything**, and every one
  of the 444 boxes it is paired with has real triangles inside it (bld 71/71, prop 231/231,
  solid 142/142, 0 empty). What was missing was never the data: `triAdd` throws away 26,693 of
  those triangles as "not a floor", which is right for WALKING and left every wall in the city
  with no surface at all. **A store that rejects is not the same thing as a file that lacks.**
  Walking is still boxes; every IMPACT is now the real triangle.
  **THE BREAKABLES, THE DECALS AND THE WATER SPOUT ALL LANDED AT m160** — 179 breakables in 7
  types, 16 impact marks in one pooled draw call, and `fx_hydrant_water_spout` off his own
  marker. See `NOTES.md`. **The collider view draws the walkable TRIANGLES now as well as the
  boxes**, because it showed only the boxes and the honest reading of that picture was that the
  triangles were not there.
  What is still missing on them: **no spray sound** (`SPOUT.snd` is the hook — this repo has no
  water recording and one is not faked), no breakable reacts to a CAR hitting it, and the piles
  are capped at 6 because a pile is 3–5 draw calls.
  **AND THEY WERE UNFINDABLE UNTIL m166.** 179 of them among 1,382 objects, each looking exactly
  like the prop beside it, and the chip only carried a COUNT — which is not a direction. It
  carries the nearest one's DISTANCE now, and **`mel.brk()` puts him beside it**; no `BRK` token
  at all means this world has none, which is the other half of the same report.
  `mel.TCITY` / `mel.LIGHTX` / `mel.DECAL` / `mel.BRK` / `mel.SPOUT` / `mel.SURF` are live;
  `mel.mark()`, `mel.brk()`, `mel.smash()` and `mel.spout()` fire one of each where he stands.
  `inst`/`merge`/`tex`/`col` want a reload.

- **THE BUILDING KIT IS A FOURTH WORLD** (`KIT`, world key `kit`, `?w=kit`, m170). His test
  house: two floors, a roof, stairs, two ladders, 20 breakable walls and **261 chunk colliders**
  that are EXACT (every wall is a pure +Y rotation at unit scale, so a chunk's collider is an
  oriented box — verified: 6,264 of 6,264 chunk vertices inside their own box, 0.0000 m escape).
  Shoot or swing at a wall and chunks die, then `kitFlood` drops anything no longer connected to
  an anchored one. `mel.kitBoom()` / `mel.kitWipe()`; the chip says `KIT<standing>/<built>`.
  **`KIT.vis` POINTS AT THE BAKED GLB** — his export is `KIT.raw`, and the bake
  (`npm run ktx models/building_kit/building_kit_test_visual.glb etc1s`, ~20 s) has to be re-run
  after EVERY re-export or the phone plays old textures on new geometry. 53 MB resident → ~7.
  **THE CHUNK BOXES ARE BLENDER Z-UP**: `(x, y, z) → (x, z, −y)`, re-sorted, then the wall's
  world matrix. `kitBox` is the one place that does it. **And the geometry is SHARED** — ten
  wall nodes on one mesh — so `kitClone` on the first hit is mandatory, not a nicety.
  **m171: the doors swing away from you as you walk into them (no button), the roll-up shutter
  rolls up, the roof hatch opens for you from BELOW and is a lid from above, the glass breaks
  and blows out the way the shot was going, and a dead chunk throws a real piece of the wall** —
  its own triangles lifted out before the collapse. The `col_*` colliders are hidden (m170 drew
  them). `KIT.hatchSign` flips the lid if it lifts the wrong way. The chip adds `P<parts>` and
  `D<debris>`.
  **m178: HIS GENERATOR'S ROW (BKG0..BKG3) loads beside the house** from
  `building_kit_generated_visual_ktx2.glb` (re-bake `..._generated_visual.glb` after every export),
  with one combined `building_kit_collision.glb`. **Everything is BATCHED at load** (`kitBatch`:
  1,505 draws -> 84) -- walls keep a vertex/index RANGE each so chunks still collapse and throw
  debris. Ladders pair by building (`kitSlot`), AC units are parts that fall with their host chunk,
  awnings/signs fall and ivy puffs (`kitHang`).
  **STILL NOT BUILT:** the `nav_*`/`room_*` markers are loaded and nothing reads them (fire,
  firemen, repair, police don't exist yet), and the world loads **no bodies at all**,
  deliberately — every `at` table here is test-site coordinates.
- **THE KIT CITY IS A FIFTH WORLD** (`KCITY`, world key `tkit`, `?w=tkit`, m180) — the toon city
  with his sixty kit buildings; `toon` is still the old set for comparison. The visual goes through
  `buildTCity` unchanged, the buildings through `buildKit`, the collision through `buildKCityCol`
  (every kit collider is an 8-corner turned box, fitted by `kitObb`; the piece_id is in the NAME).
  **Every wall is INTACT until its first hit** and then `kitSwap` puts its chunked twin in (his
  five steps). Buildings 12,233 draws -> 88; 19,814 nodes pruned. **Re-run after his exports:**
  `npm run ktx models/toon_city_kit/toon_city_visual.glb etc1s`, the same for
  `toon_city_kit_buildings.glb`, and `npm run twins` for the piece library.
  **Buildings, ladders and the cutaway are TURNED** (`KBLD` c/s, `KCLIMB` u/n, `KCUT.xf`) — the
  house and the row have yaw 0, where it is the old arithmetic. **No bodies**, like the kit world.
  **m181: the X-RAY is the default in both kit worlds** (kit surfaces between the lens and him
  dither to `KIT.xrayMin` in a screen circle, never erased; `cut` is still on the INSIDE chip), a
  ladder only latches from its FRONT (the piece's local +Z), and on a roof the lens pulls out.
  **NOT BUILT:** interior culling for far buildings (his suggestion 3), and a swapped twin is 3–4
  draws of its own. `mel.kitBoom()` swaps and breaks where he stands; the chip says `SW<swaps>`.
- **The ragdoll has no self-collision (m156).** `doll.hulls` is empty, so a limb can pass into
  his own torso — her hair has head/chest/hips spheres for exactly that reason. The arms are
  pinned at the shoulder under a .85 cone and cannot reach far, so it is left out rather than
  guessed at. `mel.DOLL` is live and `mel.DOLL.on = 0` is the A/B.

- **No death.** The player's health runs to zero and regenerates; nothing happens at the bottom.
  That is a decision to be made rather than an oversight.
- **The warrior does not chase you far and cannot catch you.** `FOE.run` 2.6 m/s against a
  player who sprints at 7.2 -- deliberate for now, and limited by what `standing_run_forward` is
  actually walking at. A faster approach than the clip can sell is a scramble.
- **The rapid fire shares the blaster's model**, which makes the two slots identical to look at.
  Its own GLB is one `file:` in `WEAP.slots`.
- **THE SKATEBOARD IS SHREDWORLD'S AS OF m167** — a board-only follow camera, the air barrel
  roll on the left pad's sideways flick, **the blaster live while riding** (the deck stopped
  being a weapon slot; `p.riding` is its own fact and every board clip has a `__legs` half so
  the gun pose composes with it rather than averaging into a shrug), and `top` 13 → 19 with
  `roll` .11 → .065 so a board coasts like a vehicle. See `NOTES.md`.
  **THE STATED GAP IS THE BARREL**: `stepSkate` owns the heading, so he faces down the board
  while the reticle can be anywhere. The SHOT goes where the reticle is; the gun visibly does
  not. Shredworld answered that with a spine twist at c126 and **melee deleted its spine-twist
  mechanism after three attempts each of which made it worse** — that is not going back in.
  **AND `SK8.trick.rollSide` IS A DIAL, NOT A MEASUREMENT**: no harness here can build a skin,
  so which way a flick rolls him could not be settled offline. `-1` if it is backwards.
  **m169 FIXED THREE OF ITS NUMBERS AND ONLY ONE WAS TASTE.** The barrel roll's pivot was typed
  at Shredworld's .95, which is a measurement of COLIN — zap's hips are at **0.772 m** and 0.95
  is his chest, which is why it read as spinning about his head. It is `rig.hipY`, measured in
  `buildRig` on the bind pose, with `SK8.trick.pivot` as a multiplier on it. The ollie went
  9.2 → **12.6** (2.12 m → 3.97, and it was softer than his on-foot jump, which is backwards).
  And the air tap is the **second jump** now as well as the rail catch — the catch outranks it,
  and `p.jumps > 0` means rolling off a kerb grants nothing.
  **ASK WHETHER A BORROWED CONSTANT IS A FACT ABOUT THE PHYSICS OR ABOUT A BODY.** The ollie
  transferred (same gravity); the pivot could not.
- **THE SKATEBOARD HAS TRICKS AS OF m152.** Push, roll, steer, ollie, land, and in the AIR:
  **right pad flick** up = kickflip, down = 360 flip, left/right = the two pop shove-its;
  **left pad flick** up/down = front/back flip. **AND IT GRINDS (m153)** -- a tap of the right
  pad IN THE AIR catches the top edge of any solid box near him, which is every bench, kerb,
  planter, parapet, plaza rail and moving CAR in the world, because `BOXES` already is the rail
  set. Still missing: a bail, fakie, the half cab, and RAMPS (he asked, and deferred it
  himself: *"I also wanna build some skate ramps. Maybe we can do that later."*). **And there is no riding-and-
  shooting**: the board is a kit SLOT, so the blaster is put away to take it out, which is
  Shredworld's c113/c115 (independent slots plus an upper-body override) and is a build.
  `SK8.top` is 19 m/s as of m167 and every other number in `SK8` is live on `mel.SK8`.
- **The cars are not drivable**, which he deferred himself (*"maybe after"*). They DO hit you
  as of m149 -- see `CARHIT` -- and **a guard still blunts one**, because a car goes through
  `playerHurt` like every other blow. Blocking a car is silly and it is also a deliberate act
  with the thumb in an odd place, so it is left alone rather than given a seventh argument.
- **The traffic knows nothing about the freeway, the bridge ramps or the diagonals.** `npm run
  lanes` finds streets that run along X or along Z, which is what downtown Portland is; the
  I-405 and the bridge approaches are curves and are simply not in the graph.
- **No stun weapons, no rocket launcher, no arrest.** `FOE.dmg` is the hook: a weapon is an entry
  in it, and a different EFFECT (a stun, a launch) is a field beside the number.
- **Nothing uses `crouch_*`, the whole `unarmed_*` locomotion family, the disarms, the kicks, the
  three combos or `standing_melee_run_jump_attack`.** They cost nothing until they are named.
- **No sprint control**: walk/run/sprint is a pure speed blend off the left stick's magnitude,
  which is what the four clips support. A dedicated sprint gesture is a slot, not a clip.
- `weapon_root_left` is unused. Dual wield is a weapon file exported onto it and one roster line.
- **(m130 built both of these. Kept because the COST argument is the part that stays true.)**
- **THE SUN SHAFTS AND THE DUST (m129's costing, m130's build).** *"The sun
  makes these nice rays... and these little dust kind of particle things that glimmer."* The dust
  is nearly free -- `SPK` is already a pooled `Points` with per-point size, colour and alpha in
  ONE draw call and a `gl_PointSize` derived from the framebuffer, so an ambient drifting field is
  a new emitter on machinery that exists. **The rays are the expensive one**: there is **no post
  chain in this game at all** (one `renderer.render(scene, camera)`, no `EffectComposer`, no
  render targets), so real volumetric shafts mean rendering the whole scene to a texture for the
  first time -- which on a phone at dpr 2 is exactly the fill cost already suspected of costing
  frames. **Billboard shafts** -- a few additive cones on the sun's own vector, one draw call, no
  post -- are the mobile answer and are what to build first.
- **THE VEHICLE COLLIDERS ARE THE AABB OF A ROTATED CAR (m129 measured it, m131 fixed the OTHER
  half of it -- the vehicles themselves are still open).** 55 of
  them, mean plan-area inflation **x1.28** and worst **x2.13** -- a 2.25 x 4.00 m car at an angle
  becomes a near-square 4.79 x 5.92 box, which is why it reads as cockeyed rather than merely big.
  **The orientation is already gone from the collision export** (every node is at identity and the
  boxes are baked axis-aligned), but the VISUAL file still has it: `inst_car_1_i_2` is at 64.8 deg
  at (74, 36) and predicts 5.91 x 4.79, and `prop_car_1_i_col2` at that exact position measures
  4.79 x 5.92. So it is fixable from this side by pairing on position and carrying `b.yaw` --
  Shredworld's oriented-box answer -- or by his export emitting the rotated box.
  **(THE SECOND FAULT I CLAIMED HERE WAS WRONG -- see m131.** 62 of 202 `solid_`/`bld_` meshes do
  have an inflated AABB, but only 21 collapse to it at all and only 4 are both; the rasteriser
  follows their true shape, which is what it is for. The real second fault was the 12-triangle
  shortcut, and m131 fixed it.)
- No audio at all.
- **THE VIRUS TURN IS THE PROXY BLOB AS OF m168** — the same `MORPH` shape the DNA gun uses,
  driven per body from a small pool, travelling between two silhouettes measured off the two
  KINDS' prototypes. **One shape on screen, never two bodies**; m165's husk, grow and
  `stopAllAction` are all gone (that last one T-posed the thing it was written to freeze — see
  `NOTES.md`). `mel.VIRUS.blobs` caps how many run at once; `NO VPROF <kind>` in the chip means
  a prototype yielded no silhouette and the turn fell back to the instant swap.
- **Nobody reacts to the disguise.** The DNA gun (m112) changes what he is DRAWN as and nothing
  else -- *"if people see you they get afraid of you, if cops see you they shoot at you, but if
  you transform into one of them they don't think anything of it"* is `foeTarget`'s aggro rule
  and its own build. And there is no sample-and-return and no DNA the gun holds: the shot
  transforms you on the spot, which is deliberate.
- **A disguise's weapon is on its HAND, not on a joint (m122).** Every rig but the warrior's has
  no `weapon_root` at all, and his is spelt differently and belongs to the mace -- so `mphMounts`
  copies zap's own hand-to-mount local transform onto the borrowed `mixamorig_RightHand`. It puts
  the gun where he holds it, proportional to the wearer, and it **cannot fit a hand it was not
  measured on**: zap's wrist-to-grip offset is his, so on a rig whose hands are a different shape
  it sits a little off. The day an export carries `weapon_root_right` and `weapon_tip_2` that rig
  uses its own joint with no code change here.
- **A disguise keeps HIS collider and HIS speeds at the KIND's height** (`MORPH.tall`), so a
  1.78 m hick stands in a 1.25 m cylinder. The camera's look point and the ledge hang both scale
  by `bodyK()` (m122); `WALL.tall` / `chest` / `stand` deliberately do NOT, because those are a
  threshold and a standoff rather than a placement -- so a box that is cover for zap is cover for
  a body a head taller, which is arguable and is stated rather than assumed. `MORPH.tall = 0`
  draws him at zap's height and is the A/B; changing the collider mid-game is m52's whole build.
- **THE LEDGE GRAB IS A TEST-SITE FEATURE LOOSE IN A 4,086-BOX CITY (m128).** m102 built
  `ledgeFind` against ten boxes on a white floor plus a stack put there on purpose; in Weirdport
  every column-run top edge over `LEDGE.tall` is a candidate lip, including ones with nothing
  drawn on them. He has already caught one in mid-street. **Nothing is changed about it yet, on
  purpose** -- the collider view went in first so the next fix is aimed at a box somebody has
  actually seen rather than at a threshold that looked about right.
- **THE TEST SITE IS ONE OF TWO WORLDS NOW (m124).** Weirdport -- his Blender slice of downtown
  Portland -- is the other. **It has people in it as of m127** -- placed by a sweep of the real
  collider rather than typed -- and it still has **no grind rails on its ten metal nodes, no
  motorcycle circuit, and flat colours on its ground** until he bakes those surfaces. Every one of those is written up above
  with why. What it does have is 3,684 walkable triangles, 4,086 collider boxes, ramps you can
  ride, a deck you can walk on and under, and a spawn that was searched rather than typed.
- The test site is a white floor and ten boxes, with a painted street grid round it (m110). It is
  a test site, not a level. **The streets have no relief** -- no kerb, no lamp, no crossing --
  and the one thing standing between them and all three is `camHit` having a minimum height,
  so that a bolt is stopped by a wall and not by a pavement. That is the next build.
- `MOVE.hardLand` (8.0 m/s) picks `landing_hard` over `landing_soft` by IMPACT SPEED, not by how
  long he was in the air — a long float onto a box top is a soft landing and a short drop off a
  ledge at pace is not. The number is a guess and wants a look on the phone.

