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

**AND THE COLLISION GLB IS NOT DRACO, WHICH WAS STATED WRONGLY TWICE (m129).**
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

## Landmines

- **A KEYFRAME TRACK'S `times` ARRAY IS SHARED, AND MUTATING IT IN PLACE IS THE WORST BUG THIS
  CLASS OF FILE HAS.** This export has **4,464 samplers referencing 33 distinct time accessors**
  — `npm run clips` prints that ratio and flags it. GLTFLoader resolves each accessor once and
  caches it, and `KeyframeTrack` keeps the `Float32Array` **by reference**. So shifting "each
  track's" times to remove the start offset subtracts it from the same array about a hundred and
  thirty times: the times go deeply negative, `resetDuration()` comes back NEGATIVE, and a track
  evaluated past its last key returns that key — **every clip in the file frozen on its final
  frame, for ever.** It reads as "he just holds the pose", and weights, loop modes and playback
  rates are all fine and all irrelevant. `normaliseClips` does
  `t.times = Float32Array.from(t.times)` before touching anything, and a clip whose duration
  comes back non-positive says so rather than going quiet.
- **EVERY CLIP STARTS AT 1/24 s**, which is one held frame at the top of every loop — 8% of a
  0.5 s run cycle spent standing still. Shifted to zero (see above for how, carefully).
- **THE REDUNDANT TRACKS ARE SAFE TO STRIP AND THAT WAS CHECKED, NOT ASSUMED.** All 62 scale
  tracks in all 23 clips hold their rest value to within 5.4e-7, and every position track except
  the Hips holds its rest value to within 2.3e-5 armature units. So stripping them is a no-op
  that removes ~2,700 channels of work per frame. **The Hips translation STAYS** — it is the
  body's height off the ground, and every crouch, landing and roll in this set uses it. If a
  future export animates a finger's position or a bone's scale on purpose, `npm run clips` says
  so and those two filters are what to revisit.
- **A SCALE TRACK PINNED AT ZERO IS NOT A TRACK THAT "DOES NOT MOVE".** A metric that asks
  whether a track CHANGES reports a bone collapsed to a point as fine. Read VALUES, not deltas,
  when the question is "is this track sane". None of this file's are — checked.
- **A QUATERNION COMPONENT DELTA IS NOT A ROTATION.** `q` and `−q` are the same rotation, so a
  component swinging −1 → +1 reads as a delta of 2 and is a sign flip the interpolant takes the
  short way round. Measuring components makes a six-frame stride and a static clip look
  identical. The honest number is `2·acos(|dot|)`.
- **NEVER ASK `action.isRunning()` WHETHER A CLIP STILL MATTERS — ASK ITS WEIGHT.** three ends a
  `LoopOnce` clip with `clampWhenFinished ? paused = true : enabled = false`, and `isRunning()`
  is `enabled && !paused`, so every clip in `ONCE` is *not running* from the instant it
  finishes. A clip shut down inside `else if (a.isRunning())` therefore keeps the 1.0 it was
  last given and goes on applying its final frame for the rest of the session — a landing pose
  welded into the walk.
- **AND RE-ENTERING A `ONCE` CLIP HAS TO REWIND IT, ON THE STATE AND NOT ON THE DAMPED WEIGHT.**
  Rewinding only once the weight has decayed is right for a clip you left alone and wrong for
  one you are re-entering immediately: roll, roll again before the first has faded, and the
  action is still PAUSED on its last frame — which on a roll is a forward step. `playOnce` is
  called BY the state that starts the clip. That is the same landmine as the one above wearing
  its other face: a paused action is indistinguishable from a live one from outside.
- **THE TARGET WEIGHTS MUST SUM TO 1.** A zero-weight bone is blended back to its BIND value by
  the mixer, which is the **T-pose exactly**, so a table that dips below 1 mid-crossfade bleeds
  the bind pose in and one missing clip name is enough to do it. `setWeights` falls back to the
  idle and the clip table is checked against the file at load, with anything absent named in the
  chip rather than failing silently.
- **ANIMATION IS WEIGHTS, NOT CROSSFADES.** `rigAnim` asks for a set of clip weights each frame
  and `setWeights` damps toward it. A `crossFadeFrom` state machine has to know what it is
  coming *from*, which breaks the first time two transitions overlap — and they always
  eventually overlap.
- **A GAIT IS A BLEND BY MEASURED SPEED, NEVER A RUN FLAG**, and every reference speed in `GAIT`
  is measured by `npm run gait` rather than eyeballed. It reads the speed the **planted foot**
  slides backwards at in the body frame, which is exactly the speed the clip is walking at, with
  no assumption about stride length, double support or float time. At ×1.926:
  walk 0.84, run 3.09, sprint 4.55, back 2.23, strafe ~2.0, aim-run 3.36 m/s.
  **`MOVE.max` is the sprint's own speed** so the fastest clip plays at 1.0× at full tilt and
  the feet never slide at the top of the range.
  **THE TOOL'S FIRST VERSION WAS WRONG AND SAID SO ITSELF:** it gated stance on the foot moving
  backwards in +Z, which is right for a run and exactly wrong for a backpedal (the stance foot
  slides FORWARD) and for a strafe (sideways). Both came back with the two feet disagreeing by
  34% and 44% — the check catching the tool rather than the asset. The direction is DERIVED per
  foot now, and the `travel` column reads +6° for the walk, −172° for the backpedal and +87° for
  the left strafe, which is the measurement describing itself.
  **`run_fwd_fast`'s two feet still disagree by 34%** (L 2.77, R 1.96). That is a real asymmetry
  in the clip, reported rather than hidden. If the sprint ever reads limpy, that is why.
- **A GAIT BAND IS READ AGAINST THE STICK, NOT AGAINST THE SPEED RANGE (m27).** *"I was trying
  to go really slow to make him do his walk and he was basically doing a slow run -- half
  stride. And I don't think I ever see the fast run."* Both are the same table, and the
  arithmetic says it outright. `MOVE.max` is 7.2 and the pad curve is `mag^1.4`, so the
  deflection that asks for a speed is `.12 + (sp/7.2)^(1/1.4) * .88`:
      walkAt .30    ->  21% of the stick. INSIDE the noise of a thumb, so the walk was
                        unreachable and everything holdable landed in the crossfade.
      at 36%        ->  walk .64 / run .36, walk pushed to 1.37x and run CLAMPED at tsLo .55
                        -- a fast walk averaged with a slow-motion run. That IS the half stride.
      sprintAt 5.00 ->  85% of the stick before `run_fwd_fast` is ever pure.
  **Bands are chosen by where they land on the PAD.** Re-cut so each clip owns a stretch and the
  crossfades are short: idle 0-25%, walk 25-38%, run ~55%, sprint 76%+.
  **And no amount of blending fixes two clips both playing at the wrong rate.** walk 0.84 and
  run 3.09 are **3.7x apart with nothing authored between them**, so in the middle each is off
  by ~1.9x whatever you do -- the only real fix is to spend as little of the stick in there as
  possible. **A jog clip is what would close it properly.**
  **The weights are a CHAIN so they sum to exactly 1** (`A`, `A(1-B)`, `AB(1-C)`, `ABC`), with
  `idleAt` its own edge rather than sharing `walkAt` -- that is what lets the walk own real pad
  while the idle still lets go promptly. A table that dips below 1 mid-crossfade bleeds the BIND
  pose in, which is the T-pose exactly.
  **`tsHi` came down 1.9 -> 1.6**: at 1.9 the walk clip is a cartoon scramble for the whole
  crossfade.
- **ONE SOUND FOR ONE EVENT (m27).** *"I think it's playing two sounds for the charge -- there's
  a waaaaa which is good and then an electrical zap I don't need."* Exactly two voices on one
  event: `chargeStart`'s synth hum, which rises for as long as the trigger is held and IS the
  charge, and a one-shot `zap` fired beside it. m26 capped the zap's length, which made it
  shorter and no less redundant -- **the fix for a duplicate is not a quieter duplicate.** The
  sample is still loaded and `mel.snd('zap')` still plays it; nothing in the blaster asks for it.
- **A FLOOR MEANT FOR ONE THING MUST NOT BE SHARED WITH ANOTHER (m27, `chargeGoH`).** The
  charged leap's APEX was scaled by `chargeGoK`, whose floor is `MELEE.finishMin` .45 -- so the
  shortest real swing already jumped 45% as high as the longest and the hold bought almost
  nothing you could see. That floor exists because a half-charge swing still has to LAND, which
  is about power and reach; how HIGH he goes has no such floor and wants the whole range. Its
  own curve (`finishHiK0` .30 to 1), and the apex doubled at the top: 4.6 m on top of him at a
  full charge against 1.4 for a bare release.
- **`idle_01` READS 0.002 m/s AND THAT IS THE CONTROL.** A measurement with no case that must
  come back zero is a measurement nobody can trust.
- **THE CLIPS ANIMATE IN PLACE.** The `root` bone carries 0.03° of noise and no translation at
  all, so locomotion is entirely code-driven. Do not go looking for root motion.
- **THE MOUNT MARKERS ARE INERT IN EVERY CLIP** — checked, not assumed: no marker deviates from
  its rest pose by more than 0.5° anywhere in the file. That matters because **a mount marker's
  rest pose IS the placement**, so a clip that moves one is the weapon moving inside his fist —
  and keying a marker's position in ONE clip writes that pose into every other clip's rest
  fallback, because a channel a clip does not key is left at the node's rest value. `npm run
  clips` flags any marker that starts moving.
- **THE ARMATURE SCALE IS APPLIED TWICE IF YOU CLONE THE WHOLE WEAPON SCENE.** A weapon file is
  `Armature(0.01) > weapon_root_right > mesh`, and the character's mount is ALREADY inside his
  own `Armature(0.01)` — so a naive clone onto the joint comes out at a hundredth of its size,
  which from a phone is indistinguishable from the file never having loaded. `mountWeapon` takes
  only what sits BELOW the file's own mount, with the mesh's transform relative to that mount
  preserved. **And the chip says the size in centimetres**, because "it doesn't show up" is
  three bugs wearing one face — never loaded, loaded at 1/100, or right size and wrong place —
  and only a number tells them apart.
- **A `skins` BLOCK IS NOT A SKINNED MESH.** Both weapon files have one, and neither mesh
  references it (no `JOINTS_0`, no `skin` on the node): Blender writes the armature out beside a
  mesh that is merely PARENTED to it. **The reference ON THE MESH is the fact.** These are rigid
  parents, correctly.
- **MEASURE HIM WITH GEOMETRY BOUNDS, NEVER `Box3.setFromObject`.** A skinned mesh ignores its
  node transform but `setFromObject` applies it anyway — and this armature is scaled 0.01, so
  the box comes back a hundredth of his size. GLTFLoader binds every skin with the IDENTITY
  matrix, so at rest a vertex's geometry position IS its world position and the bounds are
  already metres.
- **A STUCK STICK IS ALWAYS A MISSING `pointerup`**, and there are four ways one goes missing on
  a phone: a second finger on the same pad overwriting the pad's `id`; `setPointerCapture`
  throwing after the pointer has already gone (and it was called AFTER `id` was set, so the
  throw left the pad tracking a dead id); capture lost without `lostpointercapture` reaching us;
  and the app backgrounded mid-touch, which delivers nothing on the way out or back and is the
  one that leaves a stick parked at full deflection with no finger near it. All four are closed.
- **THERE IS NO STICK WATCHDOG AND THERE MUST NOT BE.** A pointer that is not moving generates
  no events, so "no events" and "no thumb" are the same observation and no amount of waiting
  separates them; the browser has no "is this pointer still down" to ask. A test that cannot
  tell its two answers apart is not a test, and its false positive — dropping a hold the player
  is in the middle of, which is what running in a straight line IS — is worse than the bug.
- **A FLICK IS A FAST MOVE *AND THEN A RELEASE*, AND BOTH HALVES ARE THE GATE.** Judged on
  `pointerup` alone it is dead on a pad that is already being held: the time since `pointerdown`
  is always past any window, so the gesture can never once fire. Judged on the pad's own travel
  alone it fires MID-HOLD — every fast correction of a steering thumb is a trick, and a
  press-and-hold cannot be told from a swipe at all. So the TRAVEL arms it and the LIFT fires
  it, if the lift comes inside `FLICK.let` **of the travel, never of the pointerdown**. The
  history is seeded at the CENTRE on pointerdown, because on an absolute pad a thumb slammed
  onto the top edge IS a flick and a delta from where it landed says the stick never moved.
- **`touch-action` IS NOT THE FIX FOR DOUBLE-TAP ZOOM.** iOS Safari has ignored
  `user-scalable=no` since iOS 10 and decides that gesture off the touch stream, so the touch
  stream is where it is refused: the second `touchend` within 400 ms **and** 40 px is cancelled,
  with real controls exempt (cancelling there kills their synthesised click, and Safari does not
  zoom on a target it already treats as interactive). Pinch is a separate non-standard event
  family — `gesturestart`/`gesturechange`/`gestureend` — dispatched AT the element, so those are
  listened for with **capture**, on document as well as window.
- **THE CRASH TRAP IS THE FIRST THING IN THE HEAD**, before the import map and before the
  module, registered with CAPTURE so a subresource that 404s is caught too — that includes a
  module that fails to PARSE and an import that never resolves. A phone has no console, so an
  exception is otherwise a blank screen. It is `z-index: 999`, monospaced and **selectable**, so
  the message can be copied or read out. Both head scripts are plain scripts, not modules: a
  guard that installs when the game finishes loading is absent for the whole of the loading
  screen and absent entirely if the module throws, which is exactly when it is needed.
- **THE BOOT CARD SPEAKS WHEN A LOAD *STARTS*, NOT FROM THE PROGRESS CALLBACK.** `e.total` is
  the `Content-Length`: a response served without one — chunked, which is what a CDN does to a
  big file often enough — produces **no progress call at all** for that whole file, so the card
  keeps whatever text it had. For the first load that is the text it was BORN with, which is
  pixel for pixel what `init()` never running looks like. The two failures most worth telling
  apart were rendering as the same screen.
- **NEVER SCRUB A VELOCITY WITH A BARE `*= k` PER FRAME** — `Math.exp(-k*dt)` or `damp`, always,
  or the half-life depends on the frame rate and a 120 Hz phone plays a different game.
- **SPEEDING UP IS RAMPED; SLOWING DOWN IS NOT.** `accFall` is about how fast he can pick speed
  UP, and slowing down is not accelerating — one sign test. Without it a body carrying speed out
  of a lunge takes many seconds to come back to a walk, which reads as ice.
  **And `accFall` measures against the speed he is ACTUALLY being asked for**, not a fixed
  ceiling: against a fixed one it pins the acceleration at its floor the moment he passes that
  ceiling, so a raised target can never be reached and raising it reads as doing nothing at all.
- **LOCOMOTION IS THREE SEPARATE IDEAS AND THE MOONWALK IS MISSING THE THIRD.** (1) the gather
  lives in `push`, not in the target speed; (2) `heading` is the thumb taken instantly while
  `faceH` is the BODY coming round at `face0`/`face1`, and he is DRAWN at `faceH`; (3) **`plant`**
  — at a walk the legs push where the thumb says, at a run along `faceH`. Without (3) the
  velocity keeps answering the stick while the body has already turned, which *is* the moonwalk.
  `turnBrake` costs him speed through a hard turn, which is what plants the feet rather than
  just pointing them.
- **ONE WRITER ON `cam.az`, ALWAYS.** The right pad drags it and nothing else does; while aiming
  he simply faces wherever the lens is pointed, which is the same number rather than a second
  one to keep in step. Two writers on a camera bearing is a loop that never settles and a
  picture that shakes, and it shows up every single time.
  **AND THE PRICE OF THAT INVARIANT IS THAT THE CAMERA'S SENSITIVITY IS THE AIM'S** — see
  `CAM.deadAim`. It is worth paying; it is not free, and a dead zone is where it gets paid.
- **THE CAMERA COMES IN WHEN SOMETHING IS IN THE WAY, IT DOES NOT CLIMB OVER IT.** Shortening
  the boom keeps the SHOT — a level three-quarter view — while lifting the lens turns it into a
  top-down one, which is a different and much worse shot. **Snap in, ease out:** easing IN is
  time spent inside the wall. And the probe **bisects**: walking in fixed steps and returning
  the last clear one means the answer only ever takes values `probe` apart, so the boom jumps
  half a metre at a time as the shot sways past a wall. A quantised probe is fine for a yes/no
  and wrong the moment something continuous is drawn from it.
- **AN OVERRIDE SPLIT IS ONLY VALID IF BOTH HALVES SHARE A FRAME, AND THE STANCE TURN IS IN THE
  HIPS (m19).** *"As soon as you press left or right he's facing 90 degrees the wrong direction...
  and the blaster aiming is still just very wrong."* One fact, and it is measurable straight off
  the clips -- every one of these poses is a BLADED body, and the turn that blades it lives in the
  Hips rather than in the spine:
      shoot                hips yawed -61.7 deg   barrel -18.3 off his nose
      rifle_run            hips        -34.6      barrel  +0.7  -- dead straight
      weapon_melee_charge  hips        -74.5      (the sideways wind-up, and it reads RIGHT)
      strafe_left / right  hips        -13.6 / +3.4
  Every spine-up track in `shoot` is authored to sit on a hips at -61.7. The split sent the Hips
  DOWN with the legs, so it arrived at the strafe's -13.6 instead -- and the whole upper body,
  gun included, came out **48 degrees round**, the melee charge 61. Standing still (the whole
  clip, no split) it was right; the first step sideways swung it. That is both halves of his
  report and it is one line.
  **The hips ROTATION is the stance and goes UP with the pose built on it; the hips TRANSLATION
  is the body's height and the stride's bounce and stays with the LEGS.** So the filter is on the
  TRACK, not on the bone name -- `isUpper('mixamorig_Hips.quaternion')` is true and
  `...Hips.position` is false. The legs are children of the hips and come round with the blade,
  which is what a bladed stance strafing actually looks like.
- **A PER-BONE EDIT WHOSE OWN EFFECT FEEDS THE THING THAT MEASURES IT HAS NO VERSION THAT IS
  SIMPLY RIGHT (m19).** The spine twist that pointed the gun at the mark was wrong four separate
  ways and is gone. m16 read the parent frame off a SCALED `matrixWorld` (below) so the
  conjugation was a shear and it hunched him. m17 fixed that, and the integrator promptly wound
  up to its own clamp and parked there -- `aimUntwist` + `mixer.update` wipe the edit before
  `barrelH` measures again, so it never once saw its own output. m18 solved it in closed form and
  it STILL swung, because three's world matrices are a frame stale at that point and the reading
  carried the previous frame's correction after all: *"his gun starts out pointing to the right
  and he moves it across his chest all the way to the left."* Every fix was real and every one
  uncovered the next.
  **THE BODY TURNS, NOT THE SPINE.** How far a pose holds the weapon off his nose is a RIGID
  property of that pose, so undoing it is a rigid yaw on the ROOT: one number, no conjugation, no
  bone to unravel, nothing to take off again before the mixer writes, and it cannot shear anything
  because a root yaw is the same turn every bone was already getting.
  **And it is measured with no loop in it.** `barrelH` returns a WORLD bearing and the comp is
  part of the root yaw that produced it, so subtracting the yaw THAT FRAME WAS DRAWN AT
  (`rig.drawnYaw`, stored where it is written) removes the comp exactly. The bias is invariant to
  the comp -- it is the pose's own offset and nothing else, which is the one thing an integrator
  on the spine could never be told.
  **It is gated on `gunOut()`, not on `committed()`**, because the hammer wind-up is a
  deliberately bladed stance he likes and straightening it would be the fix breaking the one pose
  that was right.
  **The chip carries `B<bias>/C<comp>`**: a bias near 0 means the clip is straight and anything
  crooked is elsewhere, a big one means the clip carries it. `mel.POSE.on = 0` turns the whole
  correction off so the raw authored pose can be looked at.
- **`setFromRotationMatrix` ASSUMES AN UNSCALED MATRIX, AND EVERY BONE HERE IS SCALED (m17).**
  *"He's not pointing straight and I'm pretty sure I made that animation straight."* He did. The
  clip was fine and the pipeline was bending him: `aimTwist` extracted the parent's world
  rotation with `TWISTP.setFromRotationMatrix(b.parent.matrixWorld)`, and three's own source
  says that method "assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)".
  These bones live under an `Armature` scaled **0.01** with the model scaled 1.926 on top, so
  that matrix carries a uniform scale of about 0.0193 — and the trace formula fed a scaled
  matrix returns a non-unit, wrong quaternion. The conjugation `P⁻¹ Q P` then stops being a yaw
  and becomes a SKEW: hunched over, gun swung off to the side, in a clip animated straight.
  **`getWorldQuaternion` decomposes and is the only safe way to read a bone's world rotation in
  this file.** Anything that reads a rotation off a `matrixWorld` here has the same bug waiting.
  **And the symptom pointed AWAY from the cause**, which is why it is worth writing down: a
  crooked gun reads as a clip problem or an aim-maths problem, and the hunched SPINE in the same
  screenshot is the tell — no aiming bug bends a man forward.
- **+X IS HIS LEFT.** Forward is `(sin h, cos h)` and his right is `(-fz, fx)`, so facing +Z his
  right is −X and a POSITIVE sine is a strafe to the LEFT. Written down because that argument
  comes out backwards about half the time, and the strafe clips are picked by its sign.
- **A STATE WHOSE LENGTH DISAGREES WITH THE CLIP IT IS PLAYING CAN ONLY EVER CUT THAT CLIP OFF
  (m8).** *"The roll landing is not playing all the way through."* Exactly right, and it was
  arithmetic: `p.land` was `.62` while the clip was scaled to play over `p.land * 1.9` = 1.18 s,
  so the hard landing's state ended with **more than half its clip still to run** and the gait
  took over mid-roll. Worse, the cancel window was `land * .45`, a QUARTER of the clip: one
  nudge of the stick and you never saw it at all. There is one number per landing now
  (`MOVE.landSoft` / `landHard`) and the clip is compressed to exactly it, so the two cannot
  drift apart again.
  **And the weight is held FULL until `landFree`, then given way.** Ramping it down from the
  first frame put the gait at 0.55 through the whole second half, which dilutes exactly the part
  of a hard landing worth watching.
- **HE LOOKED DARK, AND THE ANSWER IS NOT A BIGGER SUN (m8).** Winding the globals up far enough
  to fix a dark character blows out a near-white floor, and he then reads DARKER against it, not
  lighter. Three things instead, each doing a different job: his own base map fed back as
  **emission** (`RIG.emissive`, white `emissive` + `emissiveMap = map`, so what comes back is his
  own colours rather than a wash toward grey, and it lands after the lighting so it brightens
  without making him shiny); a **cool fill from the opposite side** casting nothing, which is
  what actually works on a shadow side; and only a small lift on the hemisphere and the sun,
  with the floor brought down a little to meet him.
- **WHICH HUE GLOWS IS MEASURED OFF THE TEXTURE, NOT PICKED BY EYE (m8).** *"Grab a colour ramp
  of the blaster and make the blueish colour glow, and see if there's a hue or tone on the alien
  to ramp the emission on as well."* So the texture is asked. It is a **saturation-weighted** hue
  histogram and the weighting is the part that matters: a character map is mostly midtones and
  skin, so counting every pixel equally reports the BACKGROUND rather than the accent. Weighted,
  it finds the blue trim on a grey blaster, because the grey has no chroma and does not vote.
  **The centroid is taken on the CIRCLE**, not on the bin index — hue wraps, and red is exactly
  the family that sits across the seam at zero.
  **ONE SHADER SERVES BOTH**, keyed on a hue band times saturation, so a grey or a white can
  never light up however the band is set. `mel.hues()` says what it found and `mel.glow(a, g)` /
  `mel.hue(a, g)` are the live A/B, because how much a colour should glow is a look-at-it
  decision and those belong on the phone.
  **AND THE CHIP CARRIES IT (`H<alien>/<gun>`)**, because there is no console on a phone and a
  measurement nobody can read is a measurement nobody can act on.
  **This cannot be checked offline**: the textures are WebP inside the GLB and there is no
  decoder in this container, so what the histogram will pick is a device question. That is why
  it reports itself.
- **THE BLASTER IS A CHARGE SHOT: THE HOLD WINDS IT UP AND THE RELEASE FIRES IT.** An
  auto-repeating firing loop was the first version and it is a different weapon — nothing about
  it rewards the hold, so the hold stops meaning anything and the reticle has nothing to
  converge over. **The release is the shot, which is why the pad's `onRel` must NOT clear
  `p.aim`**: `stepKit` fires on the edge where the trigger stops being held, so clearing the
  state in the handler would eat every shot in the game. Everything that ends a hold — letting
  go, rolling the thumb back down, sweeping off the arc, backgrounding the app — comes through
  that one edge.
  **And a fumble is not a shot** (`WEAP.minChg`): under a tenth of a charge the release fires
  nothing, or every stray brush of the top of the pad is a bolt.
- **THE RETICLE CONVERGES, AND IT IS ALL CSS.** Four layers of arc at four radii, each spinning
  at its own rate, all approaching scale 1 as the charge fills — so "how loaded is the shot" is
  a SHAPE rather than a bar, and it is legible without looking away from the target. The spin is
  a keyframe animation, so it runs on the compositor and the frame loop writes nothing per frame
  but a position and two custom properties.
  **`transform-box: view-box` is load-bearing** — without it each group spins about its own
  tight bounding box rather than the shared middle, and the layers wobble apart instead of
  turning together. The spin and the convergence are on NESTED elements, or the two transforms
  fight over one property.
  **Locked is a different MARK, not a brighter one**: it goes warm and the brackets stop
  breathing and snap in, so "the gun has something" is a glance rather than a comparison against
  a memory of what it looked like a second ago.
- **THE MARK AND THE SHOT HAVE TO BE ONE ANSWER, AND "BY CONSTRUCTION" IS A CLAIM THAT HAS TO
  BE TRUE (m20).** *"Even though it was locked on and the reticle was locked on, as soon as you
  release it shoots where the camera is pointing and not where the reticle is. I've had this
  exact same problem in other games."* The note that used to sit here said this was impossible:
  `aimPoint` walks from the muzzle along `cam.az`, the reticle is drawn at what it finds and
  `fireBolt` aims at the same point. All true -- **and `paintRetic` drew the mark on the LOCKED
  MAN instead, while `fireBolt` went on calling `aimPoint`, which has never heard of the lock.**
  Two places agreeing about the unlocked case and disagreeing about the locked one is exactly
  what "by construction" is supposed to rule out, so the claim was the bug hiding the bug.
  `aimTarget()` is the one answer now and both call it. **A mark the gun does not keep is worse
  than no assist at all** -- and worse than it sounds, because the lock is what makes you stop
  aiming.
- **A JUMP IN THE WORLD CAN ONLY BE ANSWERED BY A FILTER (m23).** *"I'm charging the shot, I'm
  scanning left to right, and then it clocks a cube that's closer and it jumps to lower down the
  screen. I don't like the jumpy behaviour -- it needs to ease that transition, and the aim
  assist needs to ease to its assisted position too."* Both halves are the same thing and
  neither is a bug in the probe: one frame the walk runs sixty metres to open ground and the
  next it stops at a box eight metres away, and those genuinely ARE two different places. No
  finer bisection removes a discontinuity that is real. Acquiring a lock is the same step, from
  wherever the walk landed onto a man's chest, and it is metres wide however narrow the cone is.
  **THE HEIGHT GETS ITS OWN, SLOWER HALF-LIFE** (`AIM.halfY` .16 against `.075`). The mark's job
  is to say where the shot lands in PLAN; its height is a detail, and it is the only axis a
  camera pitched down turns into visible bobbing -- which is the word he used.
  **SEEDED, NOT EASED, ON THE FIRST FRAME**, or it slides in from wherever the gun was last
  pointed, which reads as the reticle chasing rather than appearing.
  **And it is still ONE answer** -- `aimTarget` eases and both the mark and the bolt read it, so
  m20's invariant survives rather than being re-broken by the fix for the jitter.
- **AN ASSIST'S CONE IS SIZED FOR WHAT IT DELIVERS, NOT FOR WHAT IT DRAWS (m20).** `LOCK.cone`
  was 1.05 rad -- **sixty degrees either side** to acquire, and with `LOCK.keep` **eighty-seven**
  to hold. That is survivable for a mark that only draws and absurd for one the round follows:
  *"I was aiming almost ninety degrees away from one cop and it kept locking onto one further to
  the left."* The subtlety is the cone; the DELIVERY still has to be total, or it is the bullet
  above again.
  **AND `keep` WAS THE STICKY HALF (m27).** *"Two cops a similar distance apart, I was trying to
  aim at one and it kept locking the other, and moving it over still wouldn't get off him."* At
  1.25 the man already locked was judged against a cone **25% wider** than the one he was being
  compared to, so a target the thumb was plainly ON could not win. .19 / .06 / **1.06** -- about
  11 deg to acquire, 3.5 once loaded, and just enough hysteresis to stop a flicker between two
  men shoulder to shoulder. `MELEE.aimCone` went .95 -> .42 with it (54 deg was most of the
  screen) and `aimNear` .35 -> .55, because swinging at two men the NEAR one is what you meant.
- **A RETICLE IS A POINTER, AND AT 146 px IT COVERED A MAN AT TWENTY METRES.** 74. The one thing
  a mark must not do is hide the thing it is marking.
- **A BLOW IS THE LIMB ARRIVING, NOT A RANGE CHECK (m20).** *"The cops are getting hit before the
  swing even happens. It's just sort of: are you within range? did you melee? yes, OK, cop has
  been hit. It's not really actually having a velocity collider effect."* Precisely what it was,
  in two places at once:
    1. `dummyHit` tested a CIRCLE about the player's centre and used `dirH` only to decide which
       way to throw him -- **so there was no direction test at all** and a man standing BEHIND
       him was hit by a punch thrown forwards.
    2. and with a melee lock, the contact fired the moment he was inside `MELEE.reach`, which on
       a nine-metre lunge is well before the arm has begun to move. `MELEE.lockAt` then fired it
       on a timer if he never arrived.
  **So the fist, the boot and the weapon's far end are SWEPT.** Each frame of a strike their
  world positions come off the rig and the segment from last frame to this one is tested against
  the body as a vertical cylinder. Nothing is typed per clip and nothing has to say which strike
  is a punch and which is a kick: whichever limb reaches him is the one that lands.
  **AND THE SPEED IS MEASURED IN HIS OWN FRAME.** A fist carried along by a nine-metre lunge is
  not a punch -- without subtracting the root's own travel every strike connects with everything
  it runs past, which is a range check wearing a sweep's clothes.
  **The sweep runs every frame of the strike even while the window is shut**, because the
  positions it measures against have to stay exactly one frame old; a sweep seeded three frames
  back is a segment across half the room. It is re-seeded at the start of each strike for the
  same reason.
  **`MELEE.at` stops FIRING the blow and only opens the window**, and `MELEE.arrive` came down
  to 1.05 m so the solved lunge lands inside what a swept fist can actually reach. A swing that
  does not reach him now misses, which is the point.
  **The chip marks a connected swing with `!`** (`melee2!`, `swing!`) -- "it hit him before the
  swing" and "it never reached him at all" are opposite bugs and one picture from a phone.
- **THE MUZZLE IS MEASURED; `weapon_tip` IS NOT IT.** On the blaster the mesh runs from +11.7 to
  −38.2 along the mount's X while the tip marker sits at −14.3, about 28% along. The marker pair
  defines the mount's POSITION and AXIS, which is all it is for. The muzzle is the far end of
  the geometry along that axis, which needs no marker and survives a re-model.
- **THE GUN'S BLUE PARTS ARE IN THE TEXTURE, NOT IN A MATERIAL.** The blaster is one mesh on one
  material, so there is no "blue part" to pick out by name — but the map knows which texels are
  blue, so the shader can. Blueness is **blue minus red**, not blue minus the brighter of the
  other two: the accents are CYAN, so green is high there as well and a `max()` test scores them
  near zero and lights up nothing. `b - r` is zero on every grey, white and warm texel and high
  on anything blue or cyan. One uniform, driven by the charge.
  **A material carrying a custom hook needs its own `customProgramCacheKey`** or three can hand
  it a program compiled for something else.
- **A STRIKE TAKES A FIXED BEAT AND THE CLIP IS COMPRESSED TO IT.** The authored melee clips run
  1.0 to 1.75 s, so a three-hit chain at 1× is over four seconds of watching, which reads as lag
  rather than as a combo. `MELEE.beat` is the beat and `playOnce` scales the clip to fit.
  **And he holds his speed before he scrubs it** (`MELEE.carry`): a flat linear bleed averages
  half the launch speed, so every metre of travel has to be bought with a speed spike at the
  front — which reads as a rocket rather than a lunge.
- **THE HOLD HAS TO BUY SOMETHING, AND THE KNOCK-DOWN THRESHOLD SAT AT 23% (m22).** *"Little
  shots just hit them and the cop does the little animation where he takes a punch, but past
  about a half charge he gets launched a little, three-quarter a little further, a full charge
  sends him flying."* A bolt's power was `.45 + chg * .75`, which crosses `DUMMY.hard` (.62) at
  **chg 0.23** -- so the lightest real shot already put a man on his back and everything above
  it was the same event slightly harder. A charge shot whose whole range is above the threshold
  is not a charge shot.
  **`pow0` IS SOLVED, NOT PICKED**: the crossing has to land at half, so
  `pow0 + .5(1 - pow0) = hard` gives .24, and `pow1` is the melee finisher's own 1.0.
  **AND HOW FAR HE FLIES IS GRADED ABOVE THE THRESHOLD, SQUARED.** One `power` deciding both
  whether he goes down and how hard can only ever give one launch, so `DUMMY.fly0` scales the
  EXCESS -- .30 at the threshold itself, full at full power, squared between because a linear
  ramp spends most of its range looking the same and the top is the part worth having:
      chg .25  power .43  stagger        chg .75  power .81  4.0 m/s
      chg .50  power .62  2.6 m/s        chg 1.0  power 1.00 8.5 m/s + 5.4 up
  Melee is untouched: .45 / .52 still stagger and the finisher's 1.0 still gets the full launch.
- **THE CHARGED SWING IS A SOLVED ARC, NOT A FIXED LEAP (m21).** *"If he's much closer he'll
  jump way higher, and if he's farther away he'll jump way farther. Right now it's always the
  same distance, so if he's really close and you try the charge attack he just jumps through
  them."* A constant launch can only do one distance, and every other distance is either short
  or through him. The gap decides the SHAPE:
      apex   lerp(finishHiNear 2.4, finishHiFar 1.1) by how far away he is
      vy     sqrt(2 g h) -- so the apex IS the number being set, not a velocity guessed at
      T      2 vy / g -- the flight time falls out of the arc rather than being typed
      vx     gap / T, which lands him ON the man by construction at any distance
  Full charge, g = 20: gap 0 -> 2.4 m up, 0.98 s, no travel; gap 8 -> 1.45 m, 0.76 s, 10.5 m/s;
  gap 11 (the reach) -> 1.1 m, 0.66 s, 16.6 m/s.
  **AND THE CLIP IS COMPRESSED TO T**, because a state whose length disagrees with the clip it
  plays can only ever cut that clip off -- paid for once already at m8.
  **A LEAP IN THE AIR KEEPS ITS SPEED.** `MELEE.carry`'s bleed is for a grounded lunge; applied
  to a ballistic arc it lands him short of everything it was solved for. The charged swing only
  takes the bleed once his feet are back down, where it is a skid.
  **The chip reads `swing<gap>/<apex>`** and gains `!` when the sweep connects.
- **THE TAIL OF A STRIKE IS CANCELLABLE.** Holding the whole clip makes a chain feel like
  watching rather than playing; past `MELEE.hold` the stick takes him out of the recovery, which
  is what makes each link a decision.

- **A BOX TOP WITHIN `step` OF HIS FEET IS A FLOOR, NOT A WALL** — and the two halves of the
  collider disagreed about that for the first draft. `groundAt` was perfectly happy to put him
  on top of a 40 cm kerb while `resolveBoxes` pushed him off the side of it, because the only
  exemption there was "already above it". The result: he ground to a halt against every low box
  in the world and the step-up was unreachable. **`npm run check:sim` found it on its first
  run**, in two cases at once — "reaches MOVE.max" read 0.00 m/s because he was pressed against
  a kerb for the whole test. Neither the syntax gate nor the boot gate can see this: one parses
  and the other never steps a player.
- **A HARNESS THAT KEEPS DRIVING AFTER THE THING UNDER TEST HAS FINISHED IS MEASURING ITS OWN
  INPUT.** The step-up case held the stick for 2.5 s and read the END state — by which point he
  had walked onto the box, across it and off the far side — so it reported y 0.00 and called a
  working step-up a failure. It records the highest ground he ever stood on instead.
- **AND A CHECK WHOSE PASS MARK IS INVENTED MEASURES THE INVENTION.** The "boxes are solid" case
  asserted he stop past −4.4 when the face is at −4.90 and he is a cylinder of radius 0.34, so
  the correct stop is −4.56 — a clean stop failed a made-up threshold. Derive the pass mark from
  the geometry, never from what looks about right.

- **THE COLUMNS WERE ALL FLOATING, AND "IT PRODUCED BOXES" IS NOT "IT PRODUCED A COLLIDER"
  (m34, `npm run bld`).** *"No. There is no collider on the building whatsoever."* m32 fixed the
  TDZ and the boxes really were reaching `BOXES` after it -- **and every one of them was
  hanging in the air at roof height**, so `resolveBoxes` skipped the lot on
  `p.y + hh < b.miny` and nothing changed on the phone.
  **A GENERATED BUILDING HAS NO VERTICAL FACES.** m26's reading took a triangle's PLANE height
  at the cell centre as both the low and the high mark whenever the face was not exactly
  vertical, and kept the full y span only when it was. That is right for an architectural box
  and meaningless for a Tripo shell, where every triangle is slanted: each cell got ONE number,
  lo == hi, and the whole collider came out as zero-height plates lying on the surface. The
  `flat` branch was the bug and it looked like the careful half of the function.
  **SO IT IS A PARITY VOXELISER NOW, WHICH IS WHAT "INSIDE THE SOLID" MEANS.** Every height at
  which a vertical ray through the cell centre crosses the surface, sorted, paired in-out-in-out.
  A vertical face has no XZ area and a vertical ray cannot cross one, which is correct: the
  crossings come from floors, roofs and slopes, and a canopy is simply a second pair.
  **AND AN ODD COUNT MEANS THE SHELL IS OPEN UNDERNEATH**, which a generated building usually
  is -- a skin with no floor. One crossing on the way up is a roof with nothing below it.
  Closing it at the model's own floor is the honest repair: the solid runs from the ground to
  the surface, which is what a building standing on the ground IS.
  **THE BOUNDING BOX PICKS THE CELLS AND THE TRIANGLE DECIDES**, in XZ now as well -- marking
  every cell in the bbox is the same "a triangle's bounding box is not its shape" error this
  file already had a note about, one axis pair over.
  **AND THERE IS A NET UNDER IT (`bldCols`, `BLD FLAT`).** Walking through a building is
  strictly worse than a boxy collider, so if no column comes within `MOVE.step` of the ground
  the columns are thrown away, the bounding box goes in instead and the chip says so. One
  function does that at build time AND after `mel.bld()` re-sizes, because two copies of the
  decision is two places for the fallback to be missing from.
  **THE CHIP CARRIES `BX<n>`.** Three builds went on this with nothing on screen able to tell a
  builder that threw from a rasteriser that produced boxes nobody can reach, and there is no
  console on a phone. `BX0` is the fault; any number at all is not.
  **A VERTICAL COLUMN CANNOT EXPRESS A DOORWAY THROUGH A ROOFED SHELL**, and that is a stated
  limit rather than an oversight: a ray down through the doorway still hits the roof and the
  floor, so it reads as inside. Overhangs, canopies and setbacks it does express. m26's note
  listed a doorway among the things columns fix; that was never true.
  **`npm run bld` LIFTS THE SHIPPED `solidColumns`** between the `COLS:` markers and runs it
  over shells built in the harness -- no GLB, because the building is draco and nothing here can
  decode it. **Verified by running it against the m33 file**: the slanted no-floor shell comes
  back **8 of 335 boxes touching the ground** against 222 of 236 after.
  **AND ITS FIRST TWO VERSIONS BOTH MEASURED NOTHING.** The shells all had VERTICAL walls, which
  is the one case m33 got right, so it passed the broken code -- a harness whose fixtures avoid
  the failing shape is a harness that measures a different asset. And the canopy assertion asked
  for a box at `minx > 10.5` when a merged run starts on a cell edge at exactly 10, failing a
  correct answer: **derive the pass mark from the geometry, never from what looks about right.**
- **A TOWER IS A TALLER BUILDING, SO IT IS A TABLE AND NOT A SECOND BUILDER (m60, `TOWER`,
  `buildBuildings(g, K)`, `bldSize`).** *"I added a towers folder. Towers are just like much way
  taller buildings, so probably double if not triple the size of the building -- maybe just
  double for now."* Which is `d.K`'s own shape one asset over: the bolt, `resolveBoxes`,
  `groundAt`, the camera boom and the chip's `BX<n>` already reach anything in `BOXES`, so a
  tower needs **no second builder, no second collider path and no second thing to keep in step**
  -- it is a second table handed to the same function.
  **THE BUILDER READ `BLD` IN EIGHT PLACES AND `bldCols` IN TWO.** Every one takes `K` now, and
  `b.K` rides on each placed object so the re-size and the rasteriser read the table their own
  building was built from. **That last part is not cosmetic**: a tower is twice as tall on the
  same `cell`, so it rasterises to roughly twice the columns, and reading the global would have
  handed it the building's `maxCells` -- where the cell silently GROWS to fit rather than the
  mesh being skipped, so the collider would have come out coarser exactly where the building is
  biggest, with nothing on screen to say so. `TOWER.maxCells` is 8192.
  **AND `mel.bld` / `mel.tower` ARE ONE FUNCTION WITH TWO HANDLES.** `bldSize(K, h)` filters
  `BUILDINGS` by table, because `mel.tower(48)` must not re-scale the building and `mel.bld()`
  must not squash the tower -- which is what the old global-reading version would have done to
  both. `mel.tower(48)` is the triple he floated.
  **THE PLACEMENT IS CHECKED AS RECTANGLES, NOT PICKED BY EYE.** A 19.5 m footprint at
  (-28, 30) clears all ten boxes, the building's own plan and every one of the thirteen bodies,
  with its nearest corner 27 m from the spawn. Two of the six candidates I tried did NOT --
  (-28, 18) sits on the box at (-16, 12) -- and a building overlapping a box is the m24 lesson
  exactly: nothing on screen disagrees with anything and the player simply cannot walk there.
  **WHAT IS UNVERIFIED AND WHY.** The tower is draco, so `check:boot` never enters the builder
  (headless every `loadGLB` rejects) and `npm run bld` cannot decode it -- it runs `solidColumns`
  over shells it builds itself. So **whether it stands upright and what its collider comes out
  as are device questions**, and the chip is what answers the second one: `BX<n>` is the total,
  and `TOWER FLAT` is the bounding-box fallback firing. The arithmetic that CAN be checked here
  -- the world span, the scale, the footprint and the clearance -- is above and was.

- **PUNCH IS ENERGY IN THE FIRST FEW MILLISECONDS, AND IT IS THE FRONT OF THE FILE THAT IS IN
  THE WAY (m59, `SFX.punch`, `snd`'s `cut`/`att`/`dec`, `PUNCH`).** *"The explosion noise we were
  using was way too punchy and these ones are way too soft, so I don't really know how we could
  maybe change the waveform somehow to make it punchier."* **The waveform is fine.** Every
  recording in the bank climbs for 34 to 111 ms before it reaches its own peak, and `SFX.edge`
  opens at a QUARTER of that peak with 30 ms of run-up kept -- which is exactly right for a
  swoosh and is the wrong end of the file for an impact. **A sound that takes a tenth of a second
  to arrive is a swell, not a hit.** Measured over the first 25 ms of what is actually played:
      played from the ONSET        rms .0006 to .034     <- "way too soft", and that IS nothing
      played from the 90% POINT    rms .148 to .282      <- x5 to x259, per file
      explosion_small, for scale   rms .527              <- "way too punchy"
  So the target sits squarely BETWEEN the two he named, it is reached rather than guessed, and
  **no sample is touched**: `cut` is a different start offset and nothing else. `e.p` is stored
  on every edge record at load, so the scan is paid once per file per session.
  **AND `dec` IS THE OTHER HALF.** An impact is a transient and a short tail; held flat, a file
  with a long loud body reads as a TONE however hard it starts -- which is what `explosion_small`
  got wrong from the far side (it hits at .527 and then keeps going for 1.2 s). `att` is
  milliseconds up and **never zero, because a gain that steps is a click**, then
  `setTargetAtTime` down with a time constant of `dec/3`, so it is ~95% gone by `dec` and ~99%
  by the stop at `dec * 1.6`. `dur`'s linear tail stands down when `dec` is set: two envelopes
  on one gain is two writers on one number.
  **AND `npm run sfx` MEASURES THE RATIO NOW**, per file, as `skip / raw25 / cut25 / punch` --
  so "how punchy is this recording" has an answer before it is ever heard on a phone, and the
  next bank he cuts can be judged the same way. It reads `SFX.punch` out of `index.html` with
  the other two constants and exits 1 rather than guessing.
  **WHAT THIS SAYS ABOUT THE NEXT RECORDING** is the part worth keeping: a punchy impact starts
  AT its peak. If the export has a fade-in on it, the game can throw that away for free -- but
  nothing can add an attack that was never recorded, and `cut` is the whole of what is available
  from this side.
- **THE SHOT WENT BACK AND THE BANK MOVED TO THE IMPACT (m59).** *"I actually liked the noise we
  were using for the plasma shot before, it was punchier -- I kind of wanna revert it to that.
  Maybe we use those plasma noises for the hit sounds, and they're random or something."*
  Both halves in one build, and m58's line is restored byte for byte: `blaster_sound_01/02` on
  an ordinary release and rapid-fire round, `plasma_canon` past a .82 charge.
  **THE SOFTNESS THAT MADE THEM WRONG FOR A SHOT IS ANSWERABLE AT AN IMPACT**, which is the
  whole reason this is not simply a revert: a shot LEAVES and an impact ARRIVES, and `cut`/`dec`
  only mean anything for the second. The same files he rejected in one slot are the right files
  in the other once the run-up comes off the front.
  **`plasma_hit` IS IN THE BANK RATHER THAN BESIDE IT.** It is one more impact recording; a
  second key for one file is a second thing to keep in step, and `splat` is gone. Ranked by the
  same measurement it lands sixth of seven (score .0801), and **`npm run sfx`'s own ranking was
  widened to include it** -- it keyed on `plasma_\d`, so the tool would have gone on printing a
  six-file order that disagreed with the shipped seven-file list, which is precisely the drift
  this repo keeps paying for.
  **THE CHARGE STILL PICKS THE WINDOW**, so a full charge lands with a heavier recording and it
  is still random inside it -- which is what *"random or something"* asks for and keeps m58's
  measurement doing work. At `PLASMA.span` 3 of 7:
      chg 0.00   06:33% 04:34% 03:33%                         chg 0.50   03:33% 05:33% 02:34%
      chg 1.00                            02:33% hit:34% 01:33%
  `mel.PLASMA.span = 7` makes it flat; `mel.PUNCH.dec = 0` plays a file whole, which is the A/B
  back to what he heard.

- **HIS PLASMA BANK, AND THE FILES WERE ASKED RATHER THAN RANKED BY EAR (m58, `npm run sfx`,
  `plasmaPick`).** *"There's five or six plasma shot sounds and then one plasma hit... maybe run
  a little test and gauge the intensity of each of the waveforms, and then you could map that for
  the charge so that when it charges more it plays a more intense one -- or you could just
  randomly select one and make whatever one you select stronger for that specific charge."*
  **BOTH, AND THEY ARE NOT ALTERNATIVES: the FILE gives the character and the GAIN gives the
  charge.** Each alone has a failure the other does not:
      ranked only   a full charge is the SAME recording every time, which is exactly the "it
                    always does the same thing" this file has already paid for twice
      random only   a fumble can draw the heaviest file and the charge stops reading in the
                    sound at all -- the one thing he asked the ranking for
  So the charge picks a WINDOW in the ranked bank and rolls inside it (`PLASMA.span` 3 of 6),
  and the gain and rate ride on top. Measured over the shipped arithmetic:
      chg 0.00   06:33%  04:33%  03:33%   --   --   --
      chg 0.50    --     04:17%  03:34%  05:33%  02:17%   --
      chg 1.00    --      --      --     05:33%  02:34%  01:33%
      auto       every file 17%, flat
  **RAPID FIRE IS A FLAT ROLL, which is his instruction and is also right.** `autoChg` is .16, so
  a windowed pick would pin every round to the light end for ever; eight shots a second need
  variety rather than weight. And `SFX.gap` .045 is under `autoRate` .11, so every round is heard
  rather than every other one being refused.
  **`npm run sfx` MEASURES THE WINDOW THE GAME WILL ACTUALLY PLAY**, by lifting the shipped
  `sfxEdge` between the new `EDGE:` markers -- a tool with its own copy of the rule is this
  repo's oldest mistake. Its own constants (`SFX.hit`, `SFX.pre`) are parsed out of `index.html`
  too, and it exits 1 rather than guessing if it cannot find them.
      plasma_06  0.47s  rms .099  body .30  score .0494   <- lightest, and the shortest
      plasma_04  0.65   rms .121  body .09        .0562
      plasma_03  0.89   rms .113  body .08        .0597
      plasma_05  0.60   rms .138  body .12        .0636
      plasma_02  0.86   rms .117  body .21        .0729   (a 100 ms lead-in and a slow swell)
      plasma_01  0.84   rms .188  body .30        .1363   <- heaviest, x2.76 over the lightest
  **PEAK IS NOT INTENSITY AND THAT IS THE WHOLE REASON THE TOOL EXISTS.** Every one of these is
  at or near normalised (0.46 to 0.91), so ranking on peak puts the entire bank in a dead heat.
  What separates them is ENERGY in the played window, how long it runs, and how much of it is
  loud. Peak is still printed, because a file that is NOT normalised would otherwise hide.
  **RE-RUN IT AFTER ANY RE-EXPORT AND RE-ORDER `SFX.files.plasma`** -- `plasmaPick` depends on
  that list being lightest-first and has no way to know if it is not.
  **AN ID3v2 TAG IS NOT AUDIO, AND IT COST THE FIRST TWO RUNS.** Every file here carries one and
  his plasma exports carry **10 KB of it on a 30 KB file** -- a third of the bytes. Fed from byte
  zero, mpg123's streaming decode returns `MPG123_ERR` on every frame and allocates until node
  dies of an OOM, which reads exactly like a corrupt recording and is nothing of the sort. **The
  browser's `decodeAudioData` handles the tag perfectly well**, so this is a harness concern and
  there is nothing to fix in the asset. The syncsafe length is at bytes 6-9. And a FRESH decoder
  per file: `reset()` is async and leaves `ready` already settled, so reusing one across a bank
  is the other half of that OOM.
  **`audio/plasma_sounds` HAD TO GO INTO `bump.mjs`'s `DIRS`.** `readdirSync` is not recursive,
  so a new asset folder is a new entry there or every file in it goes stale silently -- the
  standing tax, and the third time it has been paid across these repos.
- **THE BOLT'S IMPACT IS HIS FILE NOW, AND THE `dur` CAP WENT WITH THE STAND-IN (m58).** *"The
  plasma hit, I think, is the sound that'll play when it actually hits a character."*
  **THE CAP EXISTED FOR THE STAND-IN AND WOULD HAVE CHOPPED THE RECORDING.** m55 pointed `splat`
  at `electricity_beam_01.mp3` -- a SEVEN-SECOND beam -- and `dur: .12 + chg * .10` is what made
  that an instant. `plasma_hit` is 0.89 s with a 92 ms attack and IS an impact, so the same cap
  would now be cutting his own file off a tenth of a second in. `SFX.edge` still trims the
  silence, which is all the trimming a real recording wants. **A number that exists to rescue a
  stand-in has to go when the stand-in does**, or the fix for one file becomes a bug in the next.
  **AND A MAN IS NOT TARMAC.** The blast lands wherever the bolt dies and a near miss into the
  wall behind him must not be silent -- that is what an area weapon IS (m56) -- but landing ON
  somebody is a different event, so it comes in fuller and lower. **`b.onMan` is set where the
  flight test actually caught a body**, not inferred afterwards from the blast.
  **AND THE FIRST VERSION READ `hitBodies` IN ITS TEMPORAL DEAD ZONE.** The sound went above the
  blast call it reads from -- a `ReferenceError` on **every bolt death**, and invisible to both
  gates: `check:syntax` parses, and `check:boot` never fires a bolt. Ninth time across these
  repos, caught by reading rather than by running, which is not a method to rely on.

- **A DISGUISE IS THE SAME SCALE AS THE MAN IT IS A DISGUISE FOR, AND I COULD NOT FIND A CODE
  PATH THAT MAKES IT BIGGER (m132, `drawnH`).** *"When I transform into the characters I'm
  actually a bigger version of themselves -- I should match them. I don't wanna be bigger than
  anything smaller but same size is probably good."*
  **THE TWO SCALES ARE PROVABLY ONE LINE, WHICH IS WHY THIS BUILD IS A MEASUREMENT AND NOT A
  FIX.** Read straight off both paths:
      bodySpawn   model.scale.setScalar(P.scale)              P.scale = K.h / authored
      mphSkin     model.scale.setScalar(P.scale * h / K.h)    h = MORPH.tall ? K.h : RIG.height
      MORPH.tall is 1, so `h` IS `K.h`, so the second reduces to the first EXACTLY
  Both clone the same `K.P.proto`, so `authored` is the same bounding box; `mphWear` only swaps
  which model hangs off `rig.root`; and **nothing anywhere in the file writes `rig.root.scale` or
  `rig.model.scale`** -- grepped, not assumed. So there is no scale to be wrong.
  **SAYING THAT WITHOUT A NUMBER ON SCREEN IS AN ARGUMENT, NOT AN ANSWER**, and he is the one
  watching it move. The chip carries his DRAWN height and the nearest NPC of that kind's, in
  centimetres: `DNA WARRIOR 185/185`. Equal means the size is right and what is left is the SHOT;
  unequal names its own fault and I was wrong. `--` means no body of that kind is near enough.
  **AND THE HONEST CANDIDATE, STATED AS ONE: `CAM.dist` IS 5.0 AND DOES NOT SCALE WITH THE BODY.**
  At a five-metre boom an NPC standing two metres further back reads **5/7 = 0.71** -- the near
  body is 40% bigger for no other reason than depth -- and in both screenshots the NPC is behind
  and to one side, feet higher on screen. m122 already scales `CAM.look` by `bodyK()` and
  deliberately leaves `dist` alone, so a 1.85 m disguise also fills 48% more of the frame than
  zap's 1.25 m body does. Scaling the boom by `bodyK()` would flatten both (7.4 m puts that ratio
  at 0.79) and is the change to reach for IF the chip reads equal. **It is NOT shipped here**,
  because a build that changes the lens and the diagnostic at once is a build neither of which
  can be judged.
  **`setFromObject` IS THE RIGHT TOOL FOR THIS ONE QUESTION AND THE STANDING RULE SAYS IT IS
  NOT.** That rule is about AUTHORED height -- a skinned mesh ignores its node transform at bind,
  so applying it there gives a hundredth of his size. Drawn height is the opposite question:
  geometry bounds WITH the chain applied, which is exactly what that function computes. And
  measuring off the PROTO instead would be a tautology -- both paths share one proto, so it would
  report agreement by construction and could never catch a disagreement, which is `normGeo`'s own
  mistake wearing a tape measure.
  **WHAT IS UNVERIFIED AND WHY:** `p.mphK` is never set headless, so neither gate executes the
  new branch -- what they cover is that the module still evaluates and the line parses. Both pass.

- **HIS OWN FOOTSTEPS, AND THE FILENAMES CARRY THE FOOT (m136, `SFX.files.foot`, `footSnd`).**
  *"I added two new footsteps, one for left foot one for right foot... I just can't stand the
  current footsteps so we're gonna use these footsteps instead."*
  **m68 PROMISED THIS WOULD BE ONE LINE AND IT VERY NEARLY WAS.** That note stood the key up on
  its own so the swap would cost nothing (*"drop real footstep files at this key, `npm run bump`,
  and nothing else in the file moves"*) -- and what did have to move is the three numbers that
  only ever existed to rescue the stand-in, which is m63's rule and is the half a bare path swap
  would have got wrong.
  **THE STAND-IN WAS A BODY IMPACT, SO EVERY NUMBER ROUND IT WAS LIFTING ONE.** `hit_sound_gound_01`
  is a man arriving flat; three constants were bending it into a foot, and every one of them is
  now bending a foot:
      cut/att/dec   `dec` .09 stops the voice at `dec * 1.6` = **144 ms**. Measured off the real
                    files (an mp3 frame walk, which is a file read and not a probe): his are
                    **0.264 s and 0.288 s**, so the envelope was about to cut his recording in
                    HALF. Gone -- `SFX.edge` still trims the silence off the front, which is the
                    only trimming a real recording wants (m58's own sentence about `plasma_hit`)
      r0/r1 1.34 -> 1.12   a 34% pitch-up at a walk, on a file that IS a foot: a chipmunk boot.
                    **The IDEA is kept and the OFFSET goes** -- the same 1.20 ratio re-centred on
                    1, so heavier-is-lower still reads across his speed range and the middle of
                    that range is his own pitch. 1.09 -> .91
      alt .07       a shade of pitch standing in for a left foot and a right foot on ONE
                    recording. **There are two recordings.** 0, and `jit` stays, because two LEFT
                    steps in a row still must not be identical
  **AND WHICH FOOT PICKS THE FILE, WHICH IS THE WHOLE REASON THERE ARE TWO.** `p.stepL` and
  `d.stepL` have alternated since m64 and were only ever shading the RATE; `snd` has taken an
  explicit `o.i` since m58's `plasmaPick`, so the foot is an index and the bank is ordered
  [left, right]. **Keep it in that order** -- that ordering is the only thing saying which is
  which, exactly as `SFX.files.plasma` is lightest-first.
  **AND A ONE-BUFFER BANK FALLS BACK TO A RANDOM ROLL RATHER THAN SILENCING EVERY RIGHT FOOT.**
  `snd` does `const b = list[i]; if (!b) return 1;` -- so a failed decode, or a future single
  recording, would drop half his steps with nothing on screen to say so. The length is read off
  `SFX.buf.foot`, which is **the exact list `snd` indexes**, so it is not a second source of
  truth; and `SFX.buf` is `{}` at module scope, so this is safe long before audio is up.
  **AND `audio/footsteps` HAD TO GO INTO `bump.mjs`'s `DIRS`** -- `readdirSync` is not recursive,
  so a new asset folder is a new entry there or every file in it goes stale silently. **TENTH
  time** across these repos, after `models/buildings`, `audio/plasma_sounds`, `models/towers`,
  `audio/alien_orc_grunt_sounds`, `audio/creature_noises`, `models/vehicles`, `models/streets`
  and Shredworld's own. The tell is always the same: the game asks for a path whose hash nobody
  wrote, so it fetches whatever that URL had before.
  **8.8 KB OF EACH 15 KB FILE IS ID3 TAG**, which is m58's finding arriving on a second bank and
  is worth nothing more than a sentence: the browser's `decodeAudioData` handles it perfectly
  well and there is nothing to fix in the asset. It is only `npm run sfx` (mpg123) that has to
  skip it, and it already does.
  **THE SURFACES ARE A STATED GAP, NOT A HOOK (m136).** *"I'm thinking about adding a few
  variations so walking on grass would sound different than walking on street would sound
  different than walking on something metal like a car."* That is a second axis on this bank and
  the honest blocker is that **nothing in this game records what he is standing on**: `groundAt`
  returns a HEIGHT, `triAdd` keeps a triangle and throws its source mesh's name away, and
  `resolveBoxes` answers about a box rather than about a material. Weirdport's collider has the
  names (`ground_asphalt_col`, the grass, the ramps) and the test site is a white floor with no
  answer at all. So the build is: carry a surface tag on the triangle and on the box, return it
  beside the height, and key the bank on it -- and **no line of it is written here**, because
  m95 is the build where a branch written for an empty hook short-circuited the good path the
  moment the clip landed. A branch that cannot fire yet is not a branch that works.
  **WHAT IS UNVERIFIED:** whether his two recordings read as a stride at six a second, and
  whether `cut` should come back (it plays a file from its own 90% peak, which is right for an
  impact and would throw away a scuff on a recording that has one). `mel.STEP` is live --
  `r0`/`r1`, `g0`/`g1` and `jit` are the dials, and `mel.STEP.on = 0` is still the one word off.

- **THE WHITE THING IN THE BACKGROUND IS THE SUN SHAFTS, AND ALL THREE REASONS ONLY BECAME TRUE
  AT m138 (m139, `SHAFT.ahead`).** *"I don't know what this white thing we introduced is in the
  background."* Nine additive cards, and every one of the faults is a number nobody had ever been
  in a position to look at:
  1. **`gain` HAD NEVER ONCE DRAWN AT A VISIBLE OPACITY.** m130 typed .26 against a 57 deg sun,
     where `pow(camFwd . sunDir, 3.2)` tops out at .35 and the material therefore drew at
     **opacity 0.009** -- m135's own measurement, written down and not acted on. m133 brought the
     sun into the visible band and **m138 is the first build where the LIGHT agreed with it**, so
     the first frame in which .26 meant anything is the one in his screenshot. At the 12 deg
     sun's best case (.191), nine cards deep, the seam adds about **.4 linear on a sky already
     near .65** and it clips to white.
  2. **THE SET WAS CENTRED ON HIM AND EACH CARD IS 64 m LONG.** At a high sun that is right --
     the cards stand UP and you look through them. At 12 deg they LIE DOWN, so a card reaches
     ~32 m *behind* him past a lens only `CAM.dist` back: **a card through the near plane is a
     full-screen wash**, and nine of them converging on the sun's vanishing point is a bright
     wedge rising off the horizon, which is the shape in the shot. `ahead` 46 pushes the whole
     set along the sun axis (nearest card end at +3 m with `oy`'s own +/-12.8 spent), which is
     also what makes them read as light in the middle distance rather than as an object.
  3. **AND `toneMapped: false` MEANT THEY COULD NOT SHARE THE SKY'S HEADROOM.** Everything else
     rolls off through `NeutralToneMapping`; this alone went straight to the framebuffer, so it
     clipped exactly where the sky it sits on cannot. **That is the DUST's own m137 correction
     one effect over** -- additive against a bright sky has nowhere to go -- and it had been
     sitting in the shaft material since m130 unnoticed because the shafts were never visible.
  `gain` .12 with tone mapping on. **The SHAFTS key is the A/B** and it is what settles this in
  one tap, which is the whole reason m135 exists.
- **AND m137's DARK MOTE WAS MY CALL AND HE HAS TURNED IT DOWN (m139).** *"The little floating
  dust look like little football balls. I thought they would be white. They're like dark, just
  kind of odd."* Both halves are mine: the colour is m137's headroom argument (a mote DARKER than
  a bright sky is the one value that reads against both halves of this world) and the size is
  m138's answer to their being invisible at 1.2 px. **The argument is still sound and it is not
  what he wants to look at, which settles it** -- what a speck should look like is a taste
  question and those are his, which is this file's oldest standing rule about the settings panel.
  0xe9e2d4, size [.026, .062] (about 3 to 7 CSS px at 13 m -- specks, and still well over m99's
  threshold), alpha [.16, .50], `back` 2.2 -> 1.6 because a NEAR-WHITE mote taken to alpha 1 is a
  glare rather than a catch.
- **HIS OWN SKY IS IN, AND WHAT IT COSTS IS SAID RATHER THAN HIDDEN (m139, `SKY.src`).** *"Cost
  out the HDRI swap... I do wanna see that sky in there, the gray sky is just not very
  appealing."* `images/hdri_game.png` is **1774 x 887, 8-bit RGB, 2.3 MB on the wire and about
  8.4 MB resident** as RGBA with mips, against the generated gradient's 512 x 256 half-float:
  1 MB and **zero asset bytes**. Beside a 22 MB trim sheet neither is what costs frames, so the
  price is not memory:
  1. **AN 8-BIT SKY HAS NO SUN IN ITS IBL.** `sunK` puts the generated disc at **7x white** and
     the prefilter integrates that, which is what makes `scene.environment` a DIRECTION to bounce
     from. A PNG clamps at 1.0 -- **his brightest texel measures 0.999** -- so the IBL becomes a
     flat coloured dome. The directional `sun` does all the shaping and `envInt` is only .35 of
     bounce, so what is lost is small; it is lost all the same and **cannot be recovered from
     this side.** A real .hdr or .exr is the fix, and it is his to export.
  2. **THE EXPOSURE BELONGS TO THE IMAGE AND WAS MEASURED, NOT GUESSED** -- Shredworld's
     `npm run sky` rule, and this repo has no equivalent tool, so the PNG was decoded here
     (zlib + an un-filter pass) and integrated over the only band this camera can see. His sky
     reads **mean linear 0.336** across the horizon-to-16.4-deg band, warm pink at the horizon
     (.53 .27 .43) going deep blue overhead (.21 .19 .60) -- a dusk sky. The generated one reads
     **0.46** across that same band, so **`imgK` 1.35** lands it exactly where the fog, the
     palette and every other number were tuned. **Re-measure on every re-upload**: he repaints
     under the same filename and the exposure moves with it.
  3. **`colorSpace` GOES ON BEFORE `fromEquirectangular`, NEVER AFTER.** `TextureLoader` hands
     one back tagged linear and the prefilter reads the texture as it finds it, so every sRGB
     value would go in undecoded -- invisible on a dark sky and a white reflection on everything
     under a bright one. Shredworld's own landmine, first time it has been reachable here.
  **THE FOG'S COLOUR IS SAMPLED OFF THE PICTURE, NOT TYPED BESIDE IT.** `SKY.fog`'s whole
  argument is that a sky and the haze in front of it are ONE colour; with a gradient that is
  `SKY.hor` by construction and with a photograph it is a measurement -- **and it is averaged in
  LINEAR**, because an sRGB mean of a band running from bright sky to dark land lands a stop
  light and takes the saturation with it (the Portland vertex-colour lesson, one buffer over).
  **AND THE GRADIENT GOES UP FIRST, EVERY TIME.** 2.3 MB is not something to hold the first frame
  on and a session whose fetch fails still has to have a sky, so `skyBake` puts the generated one
  up at module scope and `skyLoad` re-bakes when the file lands -- the splash's own rule.
  **`skyApply` IS ONE PLACE, because the backdrop, the prefilter, the exposure and the fog are
  four things that must describe ONE sky** and two branches each doing all four is four chances
  for them to describe two. The exposure reaches `environmentIntensity` as well for exactly that
  reason: a picture and the light it casts must not be two different skies.
  **AND THE HDRI KEY READS WHETHER HIS SKY IS UP, NOT WHETHER IT WAS ASKED FOR** -- `src` is the
  request and `skyImg` is the file, so it is unlit while the fetch is out and unlit for ever if
  it never arrives, plus `NO SKY IMG` in the chip. *"Is that his sky"* stops being a comparison
  against a memory of the gradient. `mel.hdri(0)` is the same switch for a laptop.
- **THE METALLIC TAP IS ONE FILE, AND IT IS IN THE PAIR HE PREFERS (m139, `SFX.skipMax`).**
  *"There's this metallic tap dance noise... it's like every other one, like maybe it's one of
  the samples."* It is one of the samples and it is a LEFT one, which is what "every other"
  names. m138 evened the bank's gains and brought `footstep_2_l` down only **x0.718 (-2.9 dB)**,
  which was the loudness half; the other half is LENGTH and no gain can reach it.
  **`SFX.hit` .25 IS AN ONSET GATE FITTED AT m59 FOR IMPACTS**, where the quiet climb in front of
  the peak is a delay bolted onto a hit. On a recording whose peak is a sharp transient the
  reverse is true: a quarter of that peak sits WELL into the file, and the soft scuff in front of
  it -- which is the sound of a foot -- is thrown away. Measured at m138:
      footstep_2_l   opens at **0.144 s of 0.312** -- 46% discarded, 168 ms played
      the other three                                9-13% discarded, 230-262 ms played
  Loudest AND shortest is a TAP by construction. The cap is a fraction of the file's own length,
  so it **names nothing and is self-disarming**: it catches that one and is a no-op on every
  other file in the game. `SFX.skipMax` 0 is m138 exactly.
  **AND DROPPING THE FIRST PAIR WOULD NOT HAVE HELPED**, which is worth saying because he offered
  to: *"Do you wanna try the second ones that I did I uploaded instead."* **The outlier is in the
  second pair.** The first pair measures clean.
  **`npm run sfx` HAD TO BE TAUGHT THE NEW CONSTANT.** It lifts `sfxEdge` between the `EDGE:`
  markers and parses `SFX.hit`/`pre`/`punch` out of `index.html`; a key it does not know about
  arrives `undefined`, the cap never fires, and the tool measures a rule the game does not have.
  **This repo's oldest mistake, and the markers exist to prevent exactly it.**

- **THE SUN HAD TWO WRITERS AND THE OLDER ONE WON EVERY FRAME FOR FOURTEEN BUILDS (m138,
  `stepSun`).** Twenty-two lines below the call to `stepSun`, at the bottom of `frame()` and two
  statements above `renderer.render`, sat the ORIGINAL follow:
      sun.position.set(player.pos.x + 7, player.pos.y + 14, player.pos.z + 6);
  unconditional, in both worlds, every frame. `atan2(14, hypot(7, 6))` is **56.6 degrees** -- so
  m124 added `stepSun` for Weirdport and left the line it replaced, and from that build on the
  light has been pinned where it was.
  **WHAT IT COST IS m133 ENTIRELY.** That build dropped the sun 56.9 -> 12 degrees to put the
  disc inside the **16.4 degrees** of sky this camera can see, and it moved `_sunOff`, which is
  what `skyBake` and `stepShafts` read -- so the DISC came down, the SHAFTS came down and **the
  light and every shadow in the game stayed at 56.6**. Its own stated consequence, *"a low sun
  is long shadows, 5.9 m against 0.81"*, never once happened; m137's sky was then recoloured and
  judged against shading that disagreed with it by forty-five degrees.
  **AND `mel.sun(deg)` HAS BEEN HALF-CONNECTED SINCE IT WAS WRITTEN** -- it moved the picture of
  the sun and not the light, so every A/B offered on it answered half the question.
  **FOURTH TIME FOR THIS SHAPE**, after `cam.az`, `KIT.on` and `p.rHold`: two writers on one
  value and whichever runs last wins. This one hid for fourteen builds because the thing it
  broke is invisible unless you already know where the sun is supposed to be -- which is an
  argument for m129's "all three read `_sunOff`" being worth MORE than it looked, not less: it
  was right, and the fourth writer was simply not counted.
- **AND THE SHADOW CAMERA SNAPS TO WHOLE MAP TEXELS NOW (m138, `SHADOW.snap`).** *"There's some
  weird artifact happening on this brick texture, like when you move it glitches."* A 44 m box
  across a 2048 map is **21.5 mm per texel**, and the camera was placed at his exact continuous
  position every frame -- so every surface re-sampled at a different sub-texel offset on every
  frame and the quantisation boundary of every shadow edge CRAWLED. Still when you stand,
  swimming when you walk.
  **THE SNAP IS IN THE LIGHT'S OWN FRAME, NEVER IN WORLD SPACE.** The map's texel grid lies
  along the shadow camera's axes, so rounding world x and z pins it to a grid the map has not
  got unless the sun happens to lie down an axis. Only the two LATERAL components are snapped;
  the along-light one stays exact, because that is depth and `near`/`far` still have to bracket
  him. **And the reference vector must not be parallel to the light** -- at `mel.sun(89)`
  `cross(dir, up)` is zero-length and a normalised zero is NaN in every position the shadow
  camera is handed from then on, which is not a wrong shadow but no shadow at all.
  **THIS IS NOT THE BRICK AND THAT IS STATED RATHER THAN DRESSED UP.** `WP.cast` is 0 -- the
  city receives shadows and does not cast them -- so the only casters near that wall are the
  player and the bodies, and the stepped blocks in his shot are metres across. The snap is a
  real fault in the shadows that DO exist and it is not the artifact he circled. Nothing in this
  container has a GPU, so the remaining candidates (z-fighting between two coplanar faces in his
  export; the trim sheet's filtering at a grazing angle) cannot be told apart from here -- which
  is what the SUN key is for.
- **A BANK IS ONLY AS EVEN AS ITS LOUDEST FILE, AND NOTHING IN `snd` EVENED IT (m138,
  `SFX.even`, `sfxEven`).** *"There's like a tap too... I don't know why one of them sounds like
  this weird tap. The second footsteps is soft and sounds right, but there's just annoying tap
  thing."* Measured with `npm run sfx` over his own four, peak of the window the game plays:
      footstep_2_l **0.829**   footstep_l 0.601   footstep_2_r 0.589   footstep_r **0.368**
  a **7 dB** spread inside one bank -- and `STEP.g0/g1` is ONE gain for all four, so the loud
  one arrives 2.25x the quiet one every time it is drawn, which is every other left foot.
  **AND `footstep_2_l` IS ALSO THE SHORTEST BY HALF.** `sfxEdge` opens it at **0.144 s** of a
  0.312 s file -- 144 ms of lead-in sits under a quarter of its own (hot) peak -- so the game
  plays 168 ms of it where the other three play 230 to 262. Loudest and shortest is a TAP by
  construction, and that half is in the recording rather than in the code.
  **THE PEAK OF A RECORDING IS NOT A DECISION ANYBODY MADE ABOUT THE GAME.** It is where the
  file happened to land when it was cut. Files in one bank are ALTERNATIVES FOR ONE EVENT: they
  are meant to differ in character, and how loud the event is belongs to the caller -- the speed
  ramp, the mood table, the charge, the power -- which is how every one of these systems is
  already designed. So each file is scaled to its bank's own MEDIAN peak, capped on the way up
  (`evenMax`) because a nearly-silent file would otherwise be handed a huge multiplier and
  amplify its own noise floor.
  **IT IS SELF-DISARMING, WHICH IS WHAT MAKES IT SAFE TO APPLY EVERYWHERE** rather than to a
  list somebody has to keep in step. Measured over all nine banks:
      drop   x1.00..x1.00   swoosh x0.96..x1.05   clang    x0.98..x1.23
      pbody  x0.99..x1.01   hit    x1.00..x1.24   grunt    x0.99..x1.43
      plasma x0.75..x1.48   foot   x0.72..x1.60   creature x0.65..x1.60
  **The one it genuinely changes is `plasma`**: m58 ranks that bank lightest-first and
  `plasmaPick` takes a window in it by charge, so plasma_06 coming up 1.48x narrows the score
  spread from x2.76 to about x1.9. That is the right trade by m58's own sentence (*"the FILE
  gives the character and the GAIN gives the charge"*) -- the length, the body and the spectrum
  still differ, and what it stops giving is a few free decibels from how a file was cut.
  `creature_noise_04` is the worst spread in the game at x2.84 and nobody had noticed, because a
  creature noise has no rhythm to be out of. `mel.SFX.even = 0` is the one word back.
- **THE SUN IS A KEY NOW, AND IT IS THE ONLY INSTRUMENT THERE IS FOR A LOOK QUESTION (m138,
  `SUNC`, `sunCycle`).** m133 chose 12 degrees and `mel.sun(57)` has been the stated A/B ever
  since -- **on a phone, which has no console**, which is m135's own finding walked straight past
  for three builds running. 12 / 30 / 57 on the FX row, and **the LABEL is the state**: a
  lit/unlit segment would have to decide which elevation counts as "on", which is a decision
  nobody made.
  **`sunSet` AND `sunElev` ARE LIFTED OUT OF `mel.sun` SO THERE IS ONE COPY.** The key and the
  console handle ask the identical question, and a second copy of that arithmetic is a second
  place for the disc, the shafts and the shading to drift apart -- which is the bug three notes
  up, in miniature.
- **THE FLOATIES, AND THE BOX WAS WHY HE COULD NOT FIND THEM (m138, `DUST.back`).** *"I don't
  wanna do like a render pass because it would be expensive, but I do think putting in some of
  the floaties, those like dragonfly looking points, would be nice."* Right on the first half:
  real volumetric rays and a bloom both need this game's FIRST render target, which m130
  declined for a phone already at 27 fps. **Specks need none of it** -- one `Points`, one draw
  call -- which is why they are the one thing on that list that ports for nothing.
  **THE DENSITY IS MATCHED TO HIS OWN STUDY RATHER THAN GUESSED.** Kasumigawa's petal field is
  1800 motes in a 90 x 30 x 120 m box = **0.0056 per cubic metre**; 520 in a 44 m cube is 0.0061.
  m130's 220 in a 26 m cube was **denser** at 0.0125 and invisible anyway, because the box was
  13 m across and the edge fade starts at .72 of that: **every mote in the game lived within
  9.4 m of the lens.** A field you have to stand inside is not an atmosphere.
  **AND A MOTE BETWEEN YOU AND THE SUN CATCHES IT.** That back-lit term is what separates a
  speck from noise over there -- its petals carry `pow(max(dot(V, sun), 0), 4)`.
  **IT IS ALPHA AND NOT BRIGHTNESS, WHICH IS m137's CORRECTION HOLDING**: against a bright sky a
  whitened or additive mote has no headroom and washes out, so catching the light means being
  more THERE rather than being paler. **And it is per mote on the CPU, not in the shader**,
  because `puffPool` is shared with the smoke and a back-lit term on a cigarette plume is wrong.
  520 dot products a frame against a second material and a second draw call.
  **It reads `_sunOff`**, so a mote cannot catch a sun the sky has not got -- and since the note
  three up, that vector is finally the one the shading uses too.
- **A SECOND PAIR OF FOOTSTEPS IS VARIETY, NOT A SECOND FOOT (m137).** He pushed
  `footstep_2_l.mp3` / `footstep_2_r.mp3` beside m136's pair, and the index m136 wrote was the
  FOOT itself (`left ? 0 : 1`) -- so four files would have played as two and **his two new
  recordings would have been hashed, downloaded and never once heard.** The list is whole
  [left, right] PAIRS now and `footSnd` rolls which pair per footfall, so a left foot is always
  a left recording and two consecutive left feet are not the same file. A third pair is two more
  entries and no code change.
  **AND THE PAIR IS ROLLED OVER WHAT HAS DECODED.** `SFX.buf[k][i] = b` leaves a SPARSE array
  while the bank is still arriving, and `snd` returns on `!list[i]` -- so a pair picked before
  its file lands is a silent footfall. A **reservoir pick** is one pass and allocates nothing,
  which matters six times a second, and with nothing decoded for that foot the index stays
  `undefined` and `snd`'s own random roll takes over: m136's fallback generalised rather than a
  second rule.
  **THE ORDERING IS THE ONLY THING SAYING WHICH FILE IS WHICH FOOT**, exactly as
  `SFX.files.plasma` is lightest-first. Keep it in pairs and keep each pair [left, right].

- **THE WORLD IS WHITE AND EVERY ATMOSPHERIC EFFECT IN IT WAS ALSO WHITE (m137).** *"I don't see
  what shaft does and I don't see what dust does. I still just see a white background -- do you
  need me to add an HDRI? You can't see the sun at all because there's just a white haze in the
  far distant background. It doesn't look like fog at all, it just looks like a grayish white
  background. There used to be fog you could actually see and that's how we'd see the sunrise."*
  **FOUR SYMPTOMS, ONE CAUSE, AND NO, HE DOES NOT NEED TO ADD AN HDRI.** m129's argument stands
  whole: a generated gradient serves the backdrop AND the IBL at **zero asset bytes**, its
  exposure is known by construction because it is built from linear numbers, and there is no
  `t.colorSpace` to get backwards. A 2K panorama would be ~22 MB resident and would re-open every
  one of those. **The sky he already has was deliberately coloured to be indistinguishable from
  the flat background it replaced**, and its halo is wider than the whole 16.4 degrees of sky this
  camera can see. Measured through the shipped `NeutralToneMapping` at exposure 1:
      hor 0xe7edf5  ->  rgb(223, 229, 237)     `SKY.fog` hands the FOG that same colour
      top of band   ->  rgb(180, 203, 231)     near-white to near-white across the whole sky
      sun disc      ->  rgb(254, 249, 241)     about **20 points** of contrast. On white.
      the HALO      **.38 rad = 21.8 deg against a 16.4 deg band -- 1.33x the visible sky.**
                    At the horizon under the sun it is +0.872 linear on a sky already near 0.8,
                    so looking anywhere near the sun the WHOLE band blew out, and 90 degrees
                    away it is exactly 0. m133 moved the sun into the band and nobody re-checked
                    the halo's width against the band it had just been moved into.
      the SHAFTS    additive `col` 0xffe9c0 x .35 x opacity .192 = about rgb(75, 68, 55) added
                    onto rgb(223, 229, 237). **They ARE drawing; they saturate.**
      the DUST      0xfff4de at alpha .16, NormalBlending, on a near-white sky and a white
                    floor -- invisible by construction -- and `size` .020 m at 13 m is **1.2
                    CSS px**, under the threshold of being an effect (m99's own rule).
  **SO ONE CHANGE ANSWERS ALL FOUR: GIVE THE SKY REAL COLOUR AND THE ATMOSPHERE ROOM TO READ
  AGAINST IT.** After, through the same tone map:
      hor 0xd9bf9d  ->  rgb(211, 184, 148)   a warm sand haze, and **this IS the fog**
      zen 0x3b8fd9, bend .45  ->  top of band rgb(146, 158, 187)
      sunGlow .12 (6.9 deg, inside the band with room)  ->  disc rgb(254, 247, 238) against
                    rgb(146..211) -- **about 90 points of contrast against about 20**
      DUST  col 0xa89572, alpha [.25, .70], size [.028, .075]
  **THE FOG COMES BACK FOR FREE AND THAT IS THE POINT.** `SKY.fog` has handed the fog the horizon
  colour since m129 (*"a blue sky behind pale fog is two horizons"*), so warming the horizon warms
  the haze with it -- one number, and the thing he misses arrives as a consequence rather than as
  a second edit. **The fog RANGE is untouched** (m125's 70..320, which a 280 m city needs); only
  its colour moved, which is one variable.
  **AND THE SHAFT NUMBERS ARE UNTOUCHED, DELIBERATELY.** Killing the halo and colouring the sky
  restores their headroom by themselves, so this build moves the sky and finds out what the shafts
  look like against it -- rather than moving two things neither of which could then be judged.
  **THE STATED COST: `scene.environment` IS BAKED FROM THIS SAME TEXTURE.** At `envInt` .35 a
  warmer horizon warms the whole city's bounce, and he said the IBL is nice -- so that is a real
  consequence of this line and not a side effect to be hidden. `mel.ibl(0)` is the A/B and
  `mel.sky({ hor: 0xe7edf5, zen: 0x6ea8de, bend: .60, sunGlow: .38 })` is m136 exactly.
  **AND m130's OWN NOTE HAD THE DUST POLARITY INVERTED**, corrected here rather than quietly
  edited: it says *"alpha motes read on a dark road and additive ones read against a bright sky"*.
  **Backwards.** Additive against a bright sky has almost no headroom left before it clips; what
  reads against a bright backdrop is something DARKER, which is why the mote is a warm mid-tone
  and stays on `NormalBlending`.
  **WHAT IS UNVERIFIED AND WHY:** there is no GPU here, so whether a sand horizon reads as a
  sunrise or as dust, whether the shafts are now visible, and whether the warmed IBL is an
  improvement are all device questions -- which is the whole reason m135's four keys exist.
  Both gates pass, and `skyBake` still self-checks at **sun dot 1.000**.

- **I HANDED HIM FOUR CONSOLE COMMANDS AND HE PLAYS ON A PHONE (m135, `#fxKey`, `fxSet`).**
  *"I have no idea what this means or how to try it."* `mel.tint(1)`, `mel.shafts(0)`,
  `mel.ibl(0)`, `mel.dust(0)` -- four A/Bs shipped across m126..m133 and every one of them is a
  CONSOLE HANDLE. **There is no console on a phone**, which is m128's own sentence about
  `mel.boxes()`, written after Shredworld was asked three times for a collider view; I wrote it
  down, built a key for that one, and then spent four builds handing him things he cannot type.
  **A control he cannot find is a control that does not exist**, and an A/B he cannot reach is
  a build wasted, because the question every one of them asks is a DEVICE question -- nothing
  in this container has a GPU or a touchscreen, so his phone is the only instrument there is.
  **AND A FRAME-RATE HUNT IS THE CASE THAT MOST NEEDS THEM.** 37 fps at m128 and 24 now, across
  a span that added an IBL (m129), the dust and the shafts (m130) and moved the sun (m133) --
  so the answer is one of four things and the only way to learn which is to move ONE VARIABLE
  at a time on the device. That is why it is four switches and not one "effects" toggle.
      SHAFTS   nine additive quads near the lens -- fill by definition
      IBL      an env lookup per fragment on every PBR surface in the city
      DUST     220 points, one draw call. Almost certainly not it; the control that rules a
               suspect OUT is worth as much as the one that catches it
      TINT     the m126 colour space, lit = sRGB. Weirdport only
  **AND THE SHAFTS' COST MOVED AT m133 WITH NOTHING SAYING SO.** Alpha is free -- the fragment
  blends either way -- so those quads always paid their fill whenever they drew, and what m133
  changed is HOW OFTEN. `stepShafts` bails under `a < .004`, which is a cone about the sun's
  bearing, and lowering the sun widened it:
      sun 56.9   drew within +/-31 deg of the sun's bearing   17% of a turn, at opacity .009
      sun 12.0   draws within +/-71 deg                       39% of a turn, at opacity .192
  **More than twice as often, and now actually filling.** That is a real cost this side put in
  at m133 and did not cost, and it is the first thing the SHAFTS key is there to settle.
  **NOTHING IN THE KEYS RESTATES A RULE.** Each moves the same field its console handle moves
  and calls the same rebuild -- `dustDrop` and `shaftDrop` came OUT of `mel.dust`/`mel.shafts`
  for exactly that reason, because two callers and two copies of "how do you take this pool
  down" is `setBoxes`' own ONE-PLACE rule one pool over.
  **AND THEY ARE REPAINTED WHEN THE STATE MOVES, NOT WHEN ONE IS PRESSED** -- one packed
  compare a frame, so a key can never read `off` over an effect that is plainly running, which
  is the disagreement m128 built `bvLit` to prevent.
  **THE TINT SEGMENT HIDES OUTSIDE WEIRDPORT** (`paintKit`'s rule): the vertex tint is that
  world's, so on the test site it would be a switch that does nothing, which is worse than no
  switch. **And `pointer-events` is on the SEGMENTS, not on the row** -- a thumb landing in a
  gap must do nothing rather than the nearer thing.
  **THE IBL PRESS HITCHES AND THAT IS STATED RATHER THAN HIDDEN.** `skyBake` re-prefilters and
  three recompiles every material, so the frame it is pressed on is expensive -- which, at the
  one moment he is counting frames, reads as the thing he just switched OFF costing more.
  **VERIFIED THE m130 WAY**: a throw put inside `fxKeys` makes `check:boot` fail out of
  `frame()`, so the gate genuinely reaches it -- then removed and the file diffed. A gate that
  is green because the code never ran is the thing that discipline exists to catch.
  **WHAT IS UNVERIFIED:** which switch moves the number. That is the whole point of shipping
  them rather than guessing, and it is his to read off the chip.

- **THE SUN WAS 40 DEGREES ABOVE THE TOP OF THE FRAME, AND THAT IS WHY NOTHING LOOKED DIFFERENT
  (m133).** *"I'm on 129 and I don't really see any changes. Did you put in the sun or the
  background? I'm wondering if the fog is just covering up the background."* **It is not the fog
  -- `scene.fog` applies to MESHES and `scene.background` is never fogged**, so that hypothesis
  can be ruled out outright. The sky was in, the IBL was in, and all three of the things built on
  them were invisible by construction. `CAM.fov` is 58 and **`CAM.el` is a CONSTANT .22 rad of
  DOWNWARD pitch**, so the only sky on screen is the band from the horizon to `fov/2 - el` =
  **16.4 degrees**, at every bearing, for ever -- and (6, 12, 5) put the sun at
  asin(12/14.32) = **56.9**:
      the DISC      **40 degrees above the top of the screen**. `SKY.sun`, `sunSize`, `sunGlow`
                    and `sunK` have never once been on screen, at any camera bearing
      the SHAFTS    `stepShafts` keys on `camFwd . sunDir`, whose best case is
                    cos(56.9 + 12.6) = **.350**, so `gain * pow(k, 3.2)` = .26 x .035 =
                    **opacity 0.009**. It clears the `a < .004` cutoff and draws at under ONE
                    PER CENT -- **m130 has never been visible either**
      the GRADIENT  `bend` 1.35 is a power on sin(elevation), so at the top of the band it
                    returned t = **0.181**: the sky ran #e7edf5 to **#d7e2f1**, a 6% shift, and
                    `SKY.hor` is by m129's own deliberate choice the exact colour the game
                    already had. So the gradient was genuinely there and genuinely
                    indistinguishable from the flat background it replaced
  **ONE FACT -- WHERE THE SUN IS -- AND m129'S "ALL THREE READ `_sunOff`" IS WHAT MAKES IT ONE
  EDIT.** That note was written so the disc, the shading and the rays could not drift apart; this
  is the first time it has been collected on, and it is the difference between one line and three
  numbers to keep in step. Same BEARING and same length (14.32), elevation 56.9 -> **12.0**:
      the disc (3.2 deg of angular radius) lands at 8.8..15.2, squarely inside the band
      the shafts go to **.192 -- 21x** what they have ever drawn at
      `bend` .60 puts t = 0.468 at the top of the band: #e7edf5 -> **#b5cfeb**
  **THE SHADING MOVES WITH IT AND THAT IS THE POINT RATHER THAN A SIDE EFFECT.** A sun you can
  SEE is a low sun, and a low sun is long shadows: a 1.25 m body casts 0.81 m at 57 degrees and
  **5.9 m** at 12, well inside the 44 m shadow box either way. `sun.shadow.normalBias` 0.04 goes
  with it as insurance against grazing-angle acne -- **that one cannot be measured here** (no
  GPU) and is shipped as a predictable consequence of the line above rather than as a fix for
  something seen. `mel.sun(57)` is the whole A/B back, `mel.sun()` says where it is.
  **AND THE LESSON IS THE CAMERA, NOT THE SKY.** Anything meant to be SEEN in this game has to be
  placed in the FRAME'S terms -- 0 to 16.4 degrees of elevation -- and never in world terms that
  look reasonable in a viewer. That is Shredworld's *"a cloud is placed in ANGLE, never in
  metres"* arriving here, and it cost two builds of effects nobody could see.

- **AND HIS "WEIRD COLLIDE ON PARK BENCHES" IS THE BOX HE AUTHORED, NOT THE QUERY (m133).**
  *"Would it be really computationally expensive to just do raycasting for collisions, because
  I'm going up against everything like park benches and they all just have weird collide."*
  **RAYCASTING WOULD CHANGE NOTHING, BECAUSE THESE ALREADY ARE BOXES.** Measured off the real
  collision file (plain glTF, m131) -- every street prop is **12 triangles**, `boxSkew` **1.00**,
  so each one is an honestly axis-aligned box and a ray against its own triangles returns exactly
  the surface `resolveBoxes` already tests. What is wrong is the SIZE:
      prop_bench_parkblock_col   1.37 x 1.62 x **1.47 m**   a bench is ~1.7 x 0.6 x 0.85
                                 -> 2.7x the plan area, and 1.47 m is CHEST HEIGHT on a 1.25 m
                                    body, so it is cover rather than something you step over
      prop_lamp_*_col            0.40 x 0.40 x **5.20 m**   a lamp post is ~0.15 across -> 7x
      prop_bollard_inst_col      0.40 x 0.40 x 0.95         a bollard is ~0.20 across -> 4x
      prop_parkingmeter_inst_col 0.40 x 0.40 x 1.45         a meter post is ~0.10 across
      prop_hydrant_inst_col      0.40 x 0.40 x 0.90
      prop_tree_*_col            0.70 x 0.70 x 3.00         his own stated convention, and fine
  **So a 1.5 m cube round every bench is the collider working exactly as exported.** The fix is
  a smaller box in his Blender file, one number per prop, and it needs no code change here at all.
  **AND THE 5.2 m LAMP IS ALSO THE m128 LEDGE CANDIDATE** -- over `LEDGE.tall`, its top edge is in
  `BOXES`, and its box is 40 cm where the post is 15 -- which ties *"weird collider geometry I'm
  floating on"* to the same table.
  **WHAT RAYCASTING WOULD COST, SINCE HE ASKED:** the existing test is an AABB overlap behind
  `BGRID`/`boxesNear`, which m124 measured at a mean of **9.8 boxes per query** out of 4,086.
  Sweeping a capsule against triangles means a BVH over Weirdport's 13,762 collision triangles
  plus a segment-triangle test per candidate -- strictly more work per frame, on a phone already
  at 37 fps, to get the same answer about a shape that is a box either way. **It is the right
  tool for a world whose collider is a real mesh and the wrong one for a world whose collider is
  boxes somebody authored.**
  **THE ONE REAL COLLIDER FAULT ON THIS SIDE IS STILL THE 55 VEHICLES** (m129/m131): axis-aligned
  boxes of ROTATED cars, mean plan inflation x1.28 and worst x2.13. `boxSkew` correctly passes
  them because they genuinely are axis-aligned now; recovering the yaw means pairing each to its
  visual instance by position and carrying `b.yaw` into `resolveBoxes`. That is the next build.

- **THE 12-TRIANGLE SHORTCUT WAS THE WHOLE VEHICLE-COLLIDER FAULT, AND MY FIRST DIAGNOSIS OF THE
  OTHER HALF WAS WRONG (m131, `boxSkew`, `WP.cols.skew`).** *"The colliders for the cars in
  general are pretty big. The van's one is like skewed cockeye offset."*
  **IT IS NOT SKEW, IT IS THE AXIS-ALIGNED BOX OF A ROTATED CAR.** Measured off the real
  collision file: 55 vehicles, mean plan-area inflation **x1.28**, worst **x2.13**. A car parked
  square gets 2.25 x 4.00; the same model at an angle gets a near-SQUARE 4.79 x 5.92, which is
  why it reads as cockeyed rather than merely big -- the box is not turned with the car, it is
  the smallest upright box containing it. **Proved by pairing**: `inst_car_1_i_2` is at 64.8 deg
  at (74, 36) in the visual file, a 2.84 x 5.20 car at that yaw has an axis-aligned footprint of
  5.91 x 4.79, and `prop_car_1_i_col2` at that exact position measures 4.79 x 5.92.
  **AND I TOLD HIM THE BUILDINGS WERE A SECOND, SEPARATE FAULT OF MINE. THEY ARE NOT.** I said 62
  of 202 `solid_`/`bld_` meshes have an AABB bigger than their geometry and that `solidColumns`
  was collapsing them to it. The first half is true; the second is not -- run through the SHIPPED
  function over the real file, only 21 meshes collapse at all, the biggest resulting box is a
  legitimate 676 m2 building plan, and **exactly 4 meshes both collapse AND are inflated**, three
  of them by 7-18% on plan areas of 1 to 5 m2. Raising `fill` from .5 to .8 moves 3737 boxes to
  3752 and changes nothing that matters. **The collapse test is fine and the fix I was about to
  ship for it would have done nothing.** The rasteriser follows the true shape; that was the
  point of it.
  **SO THE WHOLE FAULT IS IN ONE PLACE: the 12-triangle shortcut.** m124's claim -- *"a box and
  its AABB is exact"* -- holds for 347 of the 349 twelve-triangle solids and fails for the two
  turned 45 degrees: `prop_plaza_ledge_iron_a/b_col` are 14.51 x 0.06 m rails whose bounds are
  10.30 x 10.30, so each was a **106 m2 invisible slab** across a plaza, **x121.86** its own area.
  Diverted to the rasteriser they come out as ten boxes of 1 m2, and the whole change costs the
  city **eighteen boxes**.
  **AND THE OBVIOUS TEST IS WRONG, WHICH THE VERIFICATION IS WHAT CAUGHT.** My first version asked
  whether every vertex sits on one of the two extremes in X and in Z -- exact for a box, and
  **true of these rails**, because a 6 cm bar running corner to corner has all eight vertices
  bunched at two OPPOSITE corners of its own bounding box. It diverted them offline only by
  accident of a 2 cm tolerance and diverted **nothing** at the 45 cm one it shipped with. I found
  that by re-running the measurement with the SHIPPED function instead of with the copy I had
  tested -- which is this account's oldest rule finally being applied to my own fix rather than
  to somebody else's harness. **A tolerance in metres cannot separate a 6 cm bar from a 10 m box
  anyway.** `boxSkew` sweeps the footprint for the tightest rectangle and returns the area ratio,
  which is scale-free: an axis-aligned box reads exactly **1.000** and needs no tolerance, and the
  rails read 121.86. One degree of sweep resolution costs under 2% of area, well inside `skew`.
  **IT IS STRUCTURAL AND SELF-DISARMING.** Nothing is named: a future export that rotates
  something else is caught by the same line, and one that stops rotating these stops matching, one
  mesh at a time.
  **STILL NOT FIXED: THE 55 VEHICLES.** Their orientation is *already gone* from the collision
  export -- every node is at identity and the boxes are baked axis-aligned -- so `boxSkew`
  correctly passes them, because they ARE axis-aligned now. Recovering them means pairing each one
  to its visual instance by position for the yaw and carrying `b.yaw` into `resolveBoxes`,
  Shredworld's oriented-box answer. That is a real build and it is next. The other way is his
  export emitting the rotated box, after which `boxSkew` picks it up with no code change at all.
- **AND THE COLLISION GLB IS NOT DRACO, WHICH WAS STATED WRONGLY TWICE (m131).**
  `weirdport_slice_collision.glb` is plain glTF -- only the VISUAL file is compressed. m124 and
  m127 both say otherwise and both are wrong. Every collider vertex is readable here in a second
  with `fs.readFileSync` and a 20-line GLB chunk walk, which is how all of the above was measured,
  and `npm run bld`'s own note that it must use synthetic shells is now only true of the building
  and the tower. **Anything about the Weirdport collider is measurable offline against the real
  asset and should be measured rather than reasoned about.**
  **AND THE FIRST PROBE MEASURED THE WRONG SET**, which nearly produced a second wrong finding: it
  filtered `/^(solid|bld|ground|ramp)_/` where the game's `WP.solid` is `/^(bld|solid|prop)_/`, so
  it fed the ROAD SURFACE to the rasteriser and duly reported a 62,675 m2 box the game does not
  have. Use the game's own regexes.
- **THE AIR: DUST THAT GLIMMERS AND SHAFTS OFF THE SUN (m130, `DUST`, `SHAFT`).** *"The sun makes
  these like nice rays... and there's like these little dust kind of particle things that kind of
  glimmer and float around."* Two switches, because they are two different costs and neither can
  be judged while the other is moving.
  **THE DUST HAS ITS OWN POOL, NOT `SPK`.** That one is 560 and m118 measured the morph taking
  about 190 of them at once; a field that lives FOR EVER would sit in it permanently and starve
  every impact in the game. One more `Points` is one more draw call and no shared state -- and it
  reuses `puffPool`/`puffFlush`, so `gl_PointSize = aSize * uPx / -mv.z` with `uPx` derived from
  the framebuffer comes with it and a mote is N world METRES at any lens.
  **AND IT IS A LOCAL FIELD THAT WRAPS.** City's cloud rule: a box kept round the lens, and a mote
  that leaves it comes back in the far side. So 220 points cover a 280 m city exactly as well as a
  white room, nothing is spawned as he walks, and the count is a constant rather than a density.
  **ROUND THE CAMERA, NOT ROUND HIM** -- on a boom several metres behind him those are different
  boxes, and what you see is what is near the LENS.
  **AND FADED AT THE EDGE**, or the wrap is a mote blinking out of one corner and into another.
  **THE GLIMMER IS ITS OWN RATE AND ITS OWN PHASE PER MOTE.** One shared clock is 220 motes
  pulsing together, which is a strobe and not dust -- the smoke plumes' rule (m41), one effect
  over.
  **THE SHAFTS ARE BILLBOARD CARDS, NOT A POST PASS, AND THAT IS THE WHOLE DECISION.** Real
  volumetric rays are an occlusion buffer plus a radial blur, which means rendering the scene to a
  texture -- and **there is no post chain in this game at all**: one `renderer.render(scene,
  camera)`, no `EffectComposer`, no render targets. Adding one for this puts a full-screen blur on
  a phone already at 37 fps, which is the fill cost m128 named as the likely reason it is at 37.
  **They are still overdraw and that is stated rather than hidden**: long additive quads near the
  lens are fill by definition, and `SHAFT.n` (9) is the dial.
  **THEY ONLY DRAW WHEN YOU ARE LOOKING TOWARD THE SUN.** `pow(max(0, camFwd . sunDir), 3.2)` --
  which is what makes it read as sun rays rather than as slabs of fog standing in the street, and
  is also most of what makes it cheap: pointed away it returns before drawing anything.
  **THE CARDS ROLL ABOUT THE SUN AXIS, NOT ABOUT THE CAMERA.** A shaft is a cylinder of light, so
  the card standing in for it keeps its long axis ON the sun and turns about THAT; a full
  billboard would swing it off the sun and stop it being a shaft. The basis is built directly
  (`Y` = sun, `Z` = the part of camera-minus-player across it, `X` = `Y x Z`) rather than as two
  chained rotations.
  **AND THE DEGENERATE CASE IS EXACTLY WHEN IT IS BRIGHTEST.** Looking straight down the sun makes
  `Z` zero-length, and normalising that is a NaN quaternion and a black hole where the effect was.
  It falls back to any perpendicular.
  **THE FALLOFF IS IN THE VERTEX COLOUR AND THE BLENDING IS ADDITIVE**, so a card's intensity IS
  its colour and no custom shader is needed -- three's `vertexColors` on a `MeshBasicMaterial`
  does it. Both ends go to black, which under additive is invisible, so a shaft fades out rather
  than stopping at an edge. **And the light is down the MIDDLE**, which a single quad cannot say:
  six vertices can only put brightness at corners, so each card is split lengthways into two
  halves sharing a bright seam.
  **THE SUN IS `_sunOff` IN ALL THREE PLACES** -- the directional light, m129's sky disc, and
  these -- so they agree by construction rather than by three numbers being kept in step.
  **AND THE GATE GENUINELY REACHES BOTH, WHICH WAS CHECKED RATHER THAN ASSUMED.**
  `requestAnimationFrame` is stubbed to a no-op and `frame()` is called once at module scope, so
  the first frame really does run -- verified the c167 way, by putting a throw in `stepDust` and
  watching `check:boot` exit 1 with it, and a log in `stepShafts` and watching it print. Both were
  then removed and the file diffed to confirm no residue. **A gate that is green because the code
  never ran is the thing that discipline exists to catch.**
  **WHAT IS UNVERIFIED:** there is no GPU here, so whether the motes read as glimmer rather than
  as noise, whether 9 cards is rays or haze, and what either costs in frames are device questions.
  `mel.dust(0)` and `mel.shafts(0)` are the switches; `mel.dust({add:1})` is the additive A/B,
  which matters because alpha motes read on a dark road and additive ones read against a bright
  sky, and this world has both. **-- THAT POLARITY IS BACKWARDS AND m137 CORRECTS IT:** additive
  against a bright sky has almost no headroom before it clips, and what reads against a bright
  backdrop is something DARKER. Left in place rather than edited, because the claim is what cost
  a build.
- **THERE WAS NO SKY AND NO IMAGE-BASED LIGHTING AT ALL, AND THE FIX IS GENERATED RATHER THAN A
  FILE (m129, `SKY`, `skyBake`).** *"Right now we don't actually have like any background sky or
  HDRI that I know of."* Right, and worse: `scene.background` was a flat `0xe7edf5` and
  **`scene.environment` was never set anywhere in the file**, so every surface in the city was
  lit by three lights and had nothing whatever to reflect.
  **ONE GRADIENT SERVES BOTH JOBS, WHICH IS THE WHOLE DESIGN.** It is baked into a small equirect
  and that one texture is the visible backdrop AND, through `PMREMGenerator`, the IBL -- so the
  sky and the light coming off it cannot disagree about what colour the sky is. **Zero asset
  bytes**, nothing on the wire, about a megabyte resident against the ~22 MB a 2K panorama wants.
  **AND IT DELETES A WHOLE CLASS OF BUG THIS ACCOUNT HAS PAID FOR REPEATEDLY.** Shredworld has
  `npm run sky` because *"two skies four stops apart both look fine in a viewer and only one looks
  like a sky in here"* -- the exposure belongs to the IMAGE, must be measured, and must be
  re-measured every time he repaints under the same filename. Here the image is made out of
  numbers already in linear working space, so its exposure is known by construction and there is
  nothing to measure. Same for the colour space: the data is HALF FLOAT and therefore linear, so
  there is no `t.colorSpace` to set before the prefilter and no way to get it backwards -- which
  is a landmine that repo has a paragraph about.
  **HALF FLOAT RATHER THAN BYTES, BECAUSE A 256-STEP GRADIENT BANDS** across a phone screen; and
  rather than FULL float, because linear filtering of a float texture needs
  `OES_texture_float_linear`, which is not universal on mobile, while half-float filtering is core
  in WebGL2. `THREE.DataUtils.toHalfFloat` is three's own converter and is exported from the
  vendored build (checked, along with `PMREMGenerator` and `scene.environmentIntensity`, before a
  line was written).
  **THE ROW MAPPING IS THREE'S OWN `equirectUv`, INVERTED, NOT GUESSED.** That function is
  `v = 0.5 + asin(dir.y) / PI`, and a `DataTexture` is `flipY = false` -- so row 0 is v = 0 is the
  NADIR and the last row is the zenith. Get it backwards and the ground colour is in the sky,
  which looks deliberate and is not.
  **SO THE BAKE CHECKS ITSELF, AND THE CHECK IS THE SUN AND NOT THE GRADIENT.** The brightest
  texel is the disc, so its direction dotted against the light's own has to be **1.000** and a
  flipped `v` would put it near the negative of that. It reads 1.000. **The two row luminances are
  printed and are deliberately NOT an assertion**: the default ground is a pale warm grey and the
  zenith a mid blue, so nadir legitimately reads BRIGHTER (0.426 against 0.366) -- a check written
  on that ordering would fire on a sky that is perfectly correct, which is the wrong-claim-in-a-
  comment mistake this file keeps paying for. I wrote that check, watched it be wrong, and
  replaced it rather than shipping it.
  **THE SUN IS THE SAME VECTOR THE LIGHT USES.** `_sunOff` is the directional light's own offset,
  so the disc in the sky, the shading and (when the shafts land) the rays all come off ONE
  direction rather than three numbers that drift apart -- and `sun dot` is what proves it.
  **THE DEFAULT HORIZON IS THE COLOUR THE GAME ALREADY HAD**, on purpose: switching the sky on
  should ADD a gradient and some bounce, not wrench the palette out from under the city he is
  about to paint. The zenith, the ground and the disc are the new part.
  **AND THE GROUND IS NEVER BLACK.** Below the horizon is a warm neutral, because in an IBL
  everything facing down reflects it -- and a black lower hemisphere is every underside in the
  city going dead.
  **ONE COLOUR IN THE DISTANCE (`SKY.fog`).** Weirdport keeps its own fog RANGE (m125's 70..320,
  which a 280 m city needs) and gives up its fog COLOUR to the horizon, because a blue sky behind
  pale fog is two horizons and the eye reads the seam long before it reads either.
  **THE OLD PMREM TARGET IS DISPOSED ON EVERY RE-BAKE.** `mel.sky({...})` re-bakes live, and a
  PMREM target is a cubemap with a full mip chain -- leaking one per tweak is how a live dial
  turns into a memory bug that only shows after twenty presses.
  **AND THE IBL IS ON ITS OWN SWITCH BECAUSE IT IS THE PART THAT COSTS FRAMES.** `scene.environment`
  is an env lookup per fragment on every PBR surface in the city, on a game already at 37 fps.
  `mel.ibl(0)` keeps the backdrop and drops the lighting, which is the honest A/B. **It forces a
  shader recompile on every material**, so expect a hitch on the toggle itself -- that is the
  toggle, not the feature.
  **WHAT IS UNVERIFIED:** there is no GPU here, so whether it reads as a sky, whether `envInt`
  .35 is bounce or a wash, and whether the IBL is affordable at all are device questions. What
  IS checked, every boot, is the line above. `SKY.on = 0` is the flat colour exactly as it was.
- **AND THE ORDER MATTERS FOR THE PAINTING.** Colours picked against a flat `#e7edf5` background
  read differently once there is a sky and IBL behind them, so the sky went in BEFORE the city is
  painted rather than after -- otherwise they get chosen twice.
- **A SCREENSHOT CANNOT TELL A COLLIDER BOX FROM A HOLE IN THE ART, SO THE GAME DRAWS THEM NOW
  (m128, `BOXV`, `stepBoxView`, the `COLLIDERS` key).** *"There's like these weird collider
  geometry, visible geometry that I'm just like floating on -- I can't tell if it's the vehicle
  or what's going on there. Do I need to edit that in Blender?"*
  **THE CHIP IN THAT SHOT ALREADY SAID WHAT IT WAS: `LEDGE`, AND `0.0 m/s`.** He was not floating
  ON anything, he was HANGING off it -- m102's ledge grab, which searches `BOXES` for the top edge
  of anything over `LEDGE.tall`. That feature was built against TEN boxes on a white floor plus a
  stack put there on purpose; Weirdport is **4,086 boxes** rasterised out of his collision meshes
  by `solidColumns`, so every column-run top edge in the city is a candidate lip. And it is the
  one world where the picture and the thing you walk into are two separate meshes by his own
  design, so a lip can sit where nothing is drawn.
  **BUT WHICH BOX IS NOT ANSWERABLE FROM A PHOTOGRAPH, BY EITHER OF US** -- and shipping a
  `LEDGE.tall` nudge at a box nobody has seen is guessing dressed as a fix. Shredworld earned this
  lesson after being asked three times (*"I need to see the collider"*) and wrote down the other
  half of it: **a debug view that disagrees with the thing it draws is worse than none**, because
  it is a second thing to be wrong. So every number here is read off the SAME fields the resolver
  reads -- `b.minx..maxy` through `boxesNear`, the collider's own broad phase; `K.r`; `p.r`/`p.hh`
  -- and nothing is restated.
  **NOT DEPTH TESTED, AND THAT IS THE WHOLE POINT.** The question it exists to answer is *there is
  a collider where there is no picture*, so a view the picture can hide is a view that cannot
  answer it.
  **A BODY IS TWO RINGS AND NOT A BOX**, because `pushBodies` tests `r + d.K.r` in PLAN with **no
  height term at all** -- so what a body actually is to the collider is an infinite vertical
  cylinder, and a wire box round a man would be drawing a rule the game has not got. His own
  cylinder is drawn in its own colour beside them, so the two can be COMPARED rather than one of
  them described.
  **AND WHATEVER HAS HOLD OF HIM IS DRAWN LAST, IN ITS OWN COLOUR.** `ledgeFind` and `wallFind`
  carry the box they picked (`best.b`, one field, read here and nowhere else) -- because
  recovering it afterwards from the grip point would be a SECOND search that could disagree with
  the first, which is the whole failure this view exists not to become.
  **ONLY THE BOXES ROUND HIM (`BOXV.r` 20 m, `max` 700).** A buffer holding all 4,086 is a buffer
  nobody can read anyway, and the question is always about the one he is standing on.
  **ONE `LineSegments`, ALLOCATED ONCE, REBUILT ONLY WHILE IT IS ON** -- a fresh `BufferGeometry`
  every frame is garbage on the one frame something is already happening, and `setDrawRange` over
  a fixed buffer costs nothing. `frustumCulled = false`, because the buffer holds WORLD positions
  and a bounding sphere computed from them would cull the whole view the moment he walked away.
  **THE CONTROL IS A KEY, NOT A CONSOLE HANDLE.** There is no settings panel in this game and no
  console on a phone, so `mel.boxes()` alone is a control he cannot find, which is a control that
  does not exist. It sits under the world key in the top-left DIAGNOSTIC gutter -- out of the play
  area, so it takes no thumb -- and it says which state it is in by being lit, so it is not a mode
  you can be in without knowing it. **And the badge tap was NOT taken**: that one is m104's pad
  toggle, and the stats line beside it is deliberately `pointer-events: none` so it cannot eat a
  thumb.
  **THE KEY IS REPAINTED WHEN THE STATE MOVES, NOT WHEN THE KEY IS PRESSED.** `BOXV` is on the
  `mel` handle, so `mel.BOXV.on = 1` from a laptop is a second owner -- and a key reading `off`
  over a screen full of wire boxes is exactly the disagreement this must not have. One tracked
  value in `stepBoxView`, so it is a DOM write when something changes and nothing per frame.
  **AND THE CHIP SAYS `· COLLIDERS`**, because "did the toggle take" must not be something he
  infers from whether boxes appeared -- that is the very question the view is here to settle, and
  a diagnostic you have to diagnose is not one.
  **WHAT IS UNVERIFIED:** there is no GPU in this container, so whether the wires read at all is a
  device question. Both gates pass in both worlds.
- **THE CHIP HAS BEEN CRYING WOLF ABOUT A DELIBERATE GAP SINCE m54 (m128).** `NO CLIP ,` in his
  screenshot -- a comma with nothing either side of it -- is `CLIPS.turnL` and `CLIPS.turnR`, which
  are `''` ON PURPOSE: he has no turn clips and m54 wired the hook for the day he draws them.
  **m88 put exactly this guard on the NPC table check and never on the player's own**, so the two
  have disagreed for forty builds. It is the same one word (`n &&`), and what it buys is not
  tidiness: a real missing clip was hiding behind a false one, and a missing clip leaves a bone at
  zero total weight, which is the T-pose exactly.
- **THE CHIP IS THE ONE HUD ELEMENT THAT GROWS, AND THE KEYS UNDER IT HAD A TYPED `top` (m128).**
  In his m127 screenshot the WEIRDPORT key is sitting **ON TOP of the chip's second line**, over
  the very numbers this file keeps telling him to read -- because `#worldKey`'s `top: 56px` was
  right for a one-line chip and is wrong the moment `missing()` has anything to say. That is
  Shredworld's `hudGutter` finding one gutter over: **a constant somebody has to remember to update
  when a line is added is not a mechanism.** `--gut`/`--gut2` come off the chip's measured height.
  **MEASURED ONLY WHEN THE TEXT CHANGES**, because `offsetHeight` forces a layout and this runs
  inside the frame -- a few reads a second when something actually moved, never one per frame. A
  zero rect (hidden, or mid-orientation-change) leaves the last good value rather than stacking
  every key back on the chip.
- **WEIRDPORT HAS PEOPLE IN IT, AND THE WHOLE BUILD IS THE SWEEP THAT MAKES A COORDINATE HONEST
  (m127, `WP.crowd`, `WPSPOT`, `wpStand`, `wpPool`, `wpSpread`, `wpLoop`, `wpPopulate`).** *"Let's
  populate the world with the other characters. Eventually they will have different jobs,
  different behaviors -- the police and like human character got scared of you unless you look
  like a human -- eventually they'll have different zones. But right now we can just put them in
  kind of really randomly just to get a feel of it."*
  **m124 LEFT THEM OUT FOR ONE STATED REASON AND THIS IS THAT REASON ANSWERED.** *"Every warrior,
  drunk, skater, biker and Clancy is placed at a coordinate chosen against the TEST SITE, and a
  body spawned inside a tower is the m24 lesson."* So none of this is a builder: `buildFoes`,
  `buildHicks` and the rest still loop `K.at` and **never learn which world they are in** --
  `wpPopulate` rewrites every one of those tables after the collider and before a single body is
  fetched, which is the only window where both halves are true (the ground exists, and nothing has
  been placed on it yet). `d.K`'s own dividend, one table further out.
  **NOTHING IN THE SWEEP RESTATES A RULE.** The ground is `triGround` and the clearance is
  `resolveBoxes` -- **the PLAYER'S OWN resolver** -- so a spot this accepts is a spot his body
  agrees it can occupy, and there is no second answer to keep in step. A harness with its own copy
  of a rule measures a game that does not exist, and this is that sentence applied to a placer.
  **AND IT IS `triGround`, NEVER `groundAt`.** That one takes a BOX TOP as ground, which is right
  for a man walking onto a roof and exactly wrong for a spawn: it would stand somebody on a bench,
  on a parapet, on the hull of a parked car. The triangles are the deck and nothing else.
  **ONE CEILING KEEPS THEM OFF THE ROOFS AND IT IS A NUMBER, NOT A LIST.** The I-405 deck is at
  9.2 m and every roof in the slice is higher, so `WPSPOT.top` 8 is "the street, the park, the
  plaza and the lower hill" with **not one coordinate typed** to say so.
  **A SPOT IS LEVEL ACROSS HIS OWN WIDTH, NOT AT A POINT.** Four probes at `WPSPOT.r` .50 -- the
  warrior's .46 and a little -- and **one sweep serves every kind**, because a patch clear for the
  widest body is clear for a .28 m sidekick. `hh` 1.7 means the resolver is asked about his HEAD
  and not only his feet.
  **FARTHEST-POINT, NOT THE FIRST N (m80's rule).** The darts are random, so the first thirty of
  them are a random scatter -- and a random scatter CLUMPS. Taking the one furthest from
  everything already taken spreads them over the whole slice by construction, which is what makes
  three of a kind read as three streets rather than as a queue.
  **AND THEY ARE DEALT ROUND-ROBIN, NEVER SLICED.** The spread returns them furthest-first, so a
  slice hands one kind the far edge of the city and another the middle. One to each in turn means
  every kind is spread over the whole slice -- the half of "randomly" a spread alone does not buy.
  **THE SAME CITY EVERY RELOAD (`WPSPOT.seed`).** A coin per body is a different street each time,
  so a coordinate stops being quotable and *"he is stuck at -40, 88"* stops being a bug report --
  Shredworld's `TRAF.share` rule, one roster over. **And the pool excludes `near` 14 m of the
  spawn**: you are not born inside a crowd.
  **THE SIDEKICK IS THE ONE THING NOT SCATTERED, WHICH IS WHAT HE IS FOR.** `foeWander`'s leash
  would walk him back across the city from wherever he was dropped, so he takes the nearest clear
  spot to the spawn -- a ring search outward from 2.5 m, which is the one question the pool cannot
  answer because `near` deliberately excludes that ground.
  **AND SHE IS THE ONE CHARACTER WITH NO COLLIDER AT ALL.** `stepShe` writes `p.x`/`p.z` straight
  and only snaps `p.y`, so a circuit made of clear POINTS is a woman walking through a wall. Every
  SEGMENT is sampled at `WPSPOT.r` (`wpWalk`) and **the last leg back to the first has to be clear
  too** -- a loop with one bad leg is a loop she walks into a building once per lap for ever. No
  loop and she is simply not loaded, with `WP NO CIRCUIT` in the chip.
  **THE CIRCUIT SEARCH IS SORTED AND BUDGETED, WHICH IS WHAT KEEPS IT OFF THE BOOT PATH.** The
  obvious version asks `wpWalk` about every candidate nearer than the best so far, and `wpWalk` is
  about seventy `wpStand` calls on a long leg -- five triangle lookups and a `resolveBoxes` each.
  Sorted by distance and broken on the first clear one, the typical leg costs ONE of them;
  unsorted and unlucky it is one per candidate, per leg, per restart -- millions of grid lookups
  while the card sits there. `WPSPOT.legs` 900 is the backstop under it, because **a bound you can
  reason about beats a shape you hope is fast**.
  **AND `bodySpawn` ASKED `groundAt(x, z, 0)`, WHICH BURIES A BODY ON A HILL.** That function
  answers *the highest surface at or a step above `y`*, so asking at 0 on Weirdport's 17 m terrain
  returns the 0 floor and puts a man twelve metres under the ground he was placed on. It takes the
  spot's own height as a third column now -- and **absent it is provably the line it always was**,
  so every test-site table is untouched. `foeMove` tracks the slope from wherever he starts, so
  the start is the whole of it. `buildShe` had the identical fault and the identical fix.
  **THE BODIES MOVED OUT OF THE TEST SITE'S BRANCH, WHICH IS THE CHANGE THAT ACTUALLY RUNS ANY OF
  THIS.** They were inside the `else`, so Weirdport was a city with nobody in it however good the
  placer was -- the fourth time across these repos that a feature did nothing because of WHERE it
  was called rather than what it did. `BLD`, `TOWER` and `MOTO` stay test-site-only.
  **AND THE MOTORCYCLE IS A STATED GAP RATHER THAN AN OVERSIGHT.** `MOTO.ring` was swept clear
  against ten boxes on a white floor (m107), and a fixed-radius circuit through a real city has to
  be SEARCHED the way the crowd's spots are -- which is its own build. With no bike `MOTO.up` is 0
  and `buildBikers` correctly leaves its rider on foot, with no case of its own.
  **`PROG.total` WAS 4 AGAINST A TEST SITE THAT LOADS FIFTEEN FILES**, so the bar was home before
  half the city had arrived -- and the old fix set it INSIDE the world branch, which makes the bar
  RETREAT from 100% the moment the branch is reached. A bar that retreats reads as a failure. It
  is the real count, decided at the top of `init()` before anything is fetched.
  **AND `wpPopulate` IS IN A TRY, because a crowd is not worth a boot that hangs.** Every other
  line in that branch is `side()`-wrapped for exactly that reason and `init()` is called bare, so
  a throw there is `rig.ready` never set and a card stuck for ever on the text it was born with --
  the one failure he cannot look at and correct.
  **THE CHIP CARRIES `WPCROWD<n>`**, because *"the street is empty"* is three bugs and one picture
  from a phone: the sweep found nothing, it found spots and the GLBs never arrived, or they
  arrived and are somewhere he has not walked to. Only the first has a number and this is it;
  `WP NO SPOTS`, `WP CROWD n/m` and `WP CROWD FAILED` carry the rest.
  **WHAT IS UNVERIFIED AND WHY:** the collision GLB is draco and nothing in this container can
  decode a mesh, so **the sweep has never run outside a browser** -- whether 27 bodies read as a
  populated city, whether they land on pavements rather than in the middle of the freeway, and
  whether her circuit closes at all are device questions. Both gates pass in both worlds
  (`MEL_WORLD=weirdport npm run check:boot`), and headless the sweep correctly finds nothing and
  says `WP NO SPOTS` rather than throwing. `mel.WP.crowd` is live and wants a reload.
  **NOT DONE, AND EACH BECAUSE HE SAID SO:** different jobs, different behaviours, zones, and the
  rule that humans are afraid of you unless you look like one. That last is `foeTarget`'s aggro
  rule and has been a stated gap since m112; it is the same sentence pointed at a city rather than
  at a test site.
- **THE BUILDING TINT IS IN `COLOR_1`, AND THREE NEVER READS THAT ATTRIBUTE (m126, `wpTintSet`,
  `WP.tint`).** *"I meant tints. The roads are building. The buildings and roads aren't tinted."*
  Two faults and m125 only answered one: the ROADS were the forty-one colourless materials, and
  the BUILDINGS are this -- **the City_Trim tint has never once been drawn, and could not have
  been.** His exporter wrote a flat white `COLOR_0` and put the real per-building colour in a
  SECOND colour set; `GLTFLoader`'s `ATTRIBUTES` map has a row for `COLOR_0` and none for
  `COLOR_1`, so it falls through to `gltfAttributeName.toLowerCase()` and lands as
  `geometry.attributes.color_1` -- **a name three has never heard of.** `vColor` was therefore
  white on every vertex and `mix(d, d * vColor, mask)` is an exact no-op on every texel of every
  building. Decoded out of the draco geometry rather than argued:
      COLOR_0   1.000, 1.000, 1.000 on **100% of 43,310 vertices** -- ONE distinct value
      COLOR_1   33 distinct colours -- periwinkle .447/.447/.890 (11.4%), brick .478/.216/.133
                (7.2%), dark red (4.2%), near-black (3.3%), mint, teal: the CITY
  **AND THE OTHER TWELVE CITY_TRIM GEOMETRIES ARE CORRECTLY FLAT, WHICH IS WHAT SAYS THIS IS AN
  EXPORT FAULT AND NOT A GUESS.** Of the 13: **0 have a varying COLOR_0**, exactly **1 has a
  varying COLOR_1** (`vis_city_trim`, 43,310 of 45,578 verts, **95%**), and the twelve props --
  AC fans, garden beds -- are white in both sets, which is right, because a prop keeps its
  painted texture untinted. **His own reference shader says the tint lives in `COLOR_0`**
  (`models/portland/three/weirdportCity.js`, line 2), so this is the export disagreeing with his
  own note rather than a convention anybody chose.
  **THE TEST IS STRUCTURAL AND SELF-DISARMING**, `WP.paint`'s rule one attribute over: a geometry
  is promoted only when it HAS a `color_1` that varies AND its `color` is absent or flat white.
  A re-export that puts the tint back in `COLOR_0` stops matching **one geometry at a time**,
  with nothing here to remove and no material name to keep in step -- `stripPoses`' own test
  (the property that makes the thing what it is, never a name).
  **ONCE PER GEOMETRY, NEVER ONCE PER NODE.** 368 of the 510 visual nodes share 40 meshes, so a
  per-node pass would scan the same 43,310 vertices over and over; deduped by `geometry.uuid` it
  is one scan at load. **`getX` DENORMALIZES in r180**, so the ushort-normalized attribute reads
  back 0..1 and "is it flat white" is the same question either way; itemSize 4 defines
  `USE_COLOR_ALPHA` and makes `vColor` a vec4, which the splice already reads as `.rgb`.
  **AND THE COLOUR SPACE IS AN OPEN QUESTION, SO IT IS A SWITCH RATHER THAN A DECISION.** glTF
  says `COLOR_n` is LINEAR and his reference shader multiplies it raw, which is what ships --
  but .447 is 114/255 and the palette reads like sRGB bytes an eye picked. `mel.tint(1)` puts
  `pow(c, 2.2)` in front of it. **A uniform, not a define**, so it is an A/B on the phone with
  no recompile, no rebuild and no push: a look-at-it decision belongs where he can look at it,
  which is this file's oldest standing rule about taste.
  **AND THE CHIP SAYS WHICH OF THE TWO BUGS IT IS.** *"The buildings aren't tinted"* is the
  material never getting the mask OR getting it and `vColor` being white, and those are one
  picture from a phone: `WP NO TRIM MAT` answers the first and **`WP NO TINT`** the second, with
  `WPTINT<n>` counting the geometries promoted. It goes quiet the day a re-export makes it
  unnecessary, which is `rollREC`'s rule -- the silence IS the confirmation.
  **WHAT IS UNVERIFIED AND WHY:** the GLB is draco and there is no GPU here, so **whether the
  city now reads as tinted is a device question**, and so is which colour space is right. What
  CAN be checked here was: the attribute names, the 13 geometries' colour sets, the distinct
  values in each, and that both gates pass in both worlds. `mel.WP.tint = 0` is m125 exactly.
- **FORTY-ONE MATERIALS CARRY NO BASE COLOUR AT ALL, AND glTF'S DEFAULT IS WHITE (m125,
  `WP.paint`).** *"None of the roads or buildings are coming in. Is that something we're missing?
  Everything else looks good so far as I can tell."* They are all there and they are all
  `#ffffff`, against a background and a fog of `0xe7edf5` -- which is exactly what a road you
  cannot see looks like. Read straight out of `weirdport_slice_visual_draco.glb`:
      150 materials   7 with a baseColorTexture   102 with a baseColorFactor   **41 with NEITHER**
      and every one of those 41 has a roughness and/or a metalness set
  **SO IT IS AN EXPORT FAULT AND NOT A DESIGN, WHICH IS WHAT THE ROUGHNESS SAYS.** Somebody set
  the surface and the colour did not survive the write. His own note says the ground materials
  *"export as flat colors for now until baked to textures"*; they do not export as flat colours,
  they export with none -- so the one thing he believed was already true is the thing that was
  missing, which is why the report reads as geometry rather than as paint.
  **AND THE SPLIT IS EXACTLY WHAT HE CAN AND CANNOT SEE.** What is textured is the 368 `inst_`
  nodes -- trees, cars, benches, street assets, tree wells -- plus every `vis_` material that did
  keep a factor (the neon, the murals, the lit glass). What is colourless is Asphalt, Sidewalk,
  Lot/DIY/Seawall concrete, both grasses, Soil, Riverbank_Dirt, the pavers and the steps,
  Brick_Red, both stuccos, both roofs, Timber, Stone_Trim, both window frames, the awnings and
  the five food carts. **The roads and the low-rise buildings, and nothing else.**
  **THE TEST IS STRUCTURAL AND IT HAS NO FALSE POSITIVES**, measured rather than assumed: **not
  one material in the file carries an explicit white `baseColorFactor`**, so "no map and the
  colour is exactly white" names those 41 and nothing else -- 41 rows against 41 materials,
  checked both ways round. `stripPoses`' rule (the property that makes the thing what it is,
  never a name) applied to a material.
  **AND IT IS SELF-DISARMING, WHICH IS WHY IT IS SAFE TO SHIP A STAND-IN AT ALL.** The day he
  re-exports with real colours a material stops matching, **one material at a time**, with
  nothing here to remove and no second source of truth to keep in step -- `weapFit`'s rule, one
  asset along. **The chip says `WPPAINT<n>` while any of it is in use and goes quiet the moment
  it is not**, so the silence IS the confirmation that the export landed (`rollREC`'s rule).
  **THE HEXES ARE READ OFF HIS OWN NAMES, NOT ART-DIRECTED FROM HERE** -- `Brick_Red`,
  `Stucco_Lavender`, `Tile_Mint`, `Portland_Green_Metal` -- and a colourless material with no row
  takes `paint0`, so nothing can ever be left blown out. `setHex` decodes sRGB into working
  space, which is what an eye-picked hex wants (the Portland repo's own vertex-colour lesson).
  `mel.WP.paint = null` is the one word back to what he is looking at now.
- **AND THE HAZE WAS TUNED FOR A TEST SITE YOU CAN SEE ACROSS (m125, `WP.fog`).** 40 m to fully
  opaque at 150 is right for a white floor and ten boxes and hides half of a 280 x 250 m city:
  the far edge of the slice is 140 m from the spawn and downtown is further. 70 to 320 leaves
  the far edge at 21% and 200 m out at 39%, which is depth rather than a wall. **`camera.far` is
  already 400 and needed nothing.**
  **IT IS A SECOND AND SEPARATE FAULT AND IS CHANGED AS ITS OWN VARIABLE**, because a build that
  moves two things at once is a build neither of which can be judged -- and with a white city he
  could not have judged the fog anyway. `mel.WP.fog = null` keeps the test site's range.
- **WEIRDPORT: A SECOND WORLD, AND THE FIRST THING IN THIS GAME A BOX COLLIDER CANNOT EXPRESS
  (m124, `WORLD`, `WP`, `TRI`, `BGRID`, `buildWpCollision`, `buildWpVisual`).** *"There's a
  folder called Portland. It's a slice of a map I've been creating in Blender... let's make a
  separate mode you can choose like the main mode. This will just be a new test mode you can
  jack into. We want to set up the environment first and get all that right. But basically, you
  can just have my character in there and make him able to walk around."*
  **AND THE FILES WERE ON `origin` AND NOT IN MY CLONE.** `git log` said the last three commits
  were mine; `git fetch` brought down six of his, including two that DELETE a first, misplaced
  copy at `models/portland/*.glb`. The real ones are under `slice_downtown/`. m107's lesson,
  paid a second time: **`git log` answers a question about the LOCAL clone, and after a push of
  your own the local head is exactly as far behind as it was before.** Fetch before concluding
  a file never arrived.
- **THE CHOICE IS MADE AT BOOT AND IT RELOADS, WHICH IS NOT A SHORTCUT (m124).** The test site
  is built at MODULE SCOPE and Weirdport is ten megabytes of GLB, so the two cannot both be
  standing and tearing one down to raise the other is a second build path to keep in step with
  the first. A reload is one path. The key sits under the build chip -- out of the play area, in
  the same gutter, one tap, with the world's NAME on it -- which is `actB`'s rule that a prompt
  drawn on the control performing it cannot be a mode you are in without knowing it. `?w=test`
  is the way back if a world ever fails to boot: **a link can be sent where a gesture has to be
  explained**, which is `?fresh`'s own argument one repo over. `mel.world('weirdport')` on a
  desktop.
- **A BOX TOP IS FLAT, SO A BOX COLLIDER CANNOT EXPRESS A RAMP (m124, `TRI`).** Every collider
  in this game until now has been an AABB, which is right for a test site of cubes and cannot
  describe five DIY banks at 34 degrees, terrain climbing to 17 m or a freeway deck at 9.2. So
  Weirdport's walkable surfaces go in as TRIANGLES -- world space, a 4 m XZ grid,
  point-in-triangle -- and `groundAt` asks both stores and takes the higher.
  **ANYTHING STEEPER THAN `TRI.up` IS THROWN AWAY, WHICH DOES THREE JOBS AT ONCE.** A ramp's
  SIDE WALLS are not in the collider, so meet one side-on and you pass through it and roll at it
  up the slope and you ride it -- **a ramp is a floor, not a solid**, which is the alternative
  to a box you stop dead against. The same line drops every UNDERSIDE, because these meshes are
  closed solids: **3,132 of their 13,762 triangles face DOWN** and 6,850 more are the kerbs and
  retaining walls at the slabs' edges. 3,684 survive, and they are exactly the deck.
  **AND IT RETURNS TWO ANSWERS BY CONSTRUCTION, WHICH IS WHY A DECK NEEDED NO CASE.** The
  highest surface at or a step above his feet: measured at one point under the I-405, standing
  at y 0 it answers **0.00** and standing at y 11 it answers **11.00**.
  **VERIFIED AGAINST EVERY TRIANGLE IT WAS BUILT FROM**, by lifting the shipped text between the
  `TRICOL:` markers and driving it with the real file -- a harness with its own copy of the rule
  measures a game that does not exist, and this repo has made that mistake more than any other.
  Standing at each of the 3,684 centroids and asking for the ground: **3,290 exact, 394
  overlapped by something higher, 0 wrong or missing.** Walkable slopes run to 58.2 degrees, and
  every one of the five ramps rises continuously from its foot to its lip
  (`ramp_diy_bank_a` 0.22 -> 2.42 in even steps).
  **AND MY FIRST TWO PROBES OF THOSE RAMPS BOTH MEASURED MY OWN SAMPLING.** One asked for the
  ground with a step of 6 m and got the freeway deck at 11 (the DIY spot is UNDER the I-405);
  the other walked across a bank along the axis it is flat in and read 0.22 the whole way. Both
  read as the collider failing and neither was. **The question that cannot be aimed wrongly is
  "does it reproduce what it was built from"**, which is the one above.
- **A BOUNDING BOX IS NOT A BUILDING, AND HERE IT IS NOT A MATTER OF DEGREE (m124).**
  `solid_freeway_piers_col` is ONE node -- a row of separate piers under the I-405 -- whose
  bounding box is **155 x 229 m and 9 m tall**. As an AABB that is a solid block over most of
  the slice from the ground up and **the player could not have moved at all.** So `solid_` and
  `bld_` go through `solidColumns`, m26's own rasteriser, and it costs 77 ms for 179 meshes.
  **A 12-TRIANGLE MESH IS A BOX AND ITS AABB IS EXACT, so it skips the rasteriser** -- and that
  is a STRUCTURAL test rather than a test on `prop_`. 329 of his 333 props really are boxes (his
  note: *"props are simple boxes; trees are 0.7 m trunk boxes 3 m tall"*) and the four that are
  not go through with the buildings, which is what a name test would have got wrong in both
  directions. `stripPoses`' rule, one asset along.
- **AND `full` ALONE SAYS A BEAM IS ITS OWN BOUNDING BOX (m124, `cfg.fill`).** The collapse test
  asks whether the OCCUPIED columns are full height and quietly assumes the footprint is
  occupied -- which is true of every closed building shell it has ever been handed and false of
  a beam, a row of piers or a fence. `solid_freeway_girder_col` is 276 x 250 m and 1.8 m thick,
  so every column it has spans its whole height, `boxy / used` is 1, and **it collapsed into a
  SLAB OVER THE ENTIRE MAP at 9.2 m** -- an invisible floor that a man on a roof, on a ledge or
  on the hill lands on. `fill` is the other half of the question. Measured over the whole slice:
      fill 0     4003 boxes, 26 collapsed, biggest box **68,885 m2**  (the girder)
      fill .5    4086 boxes, 21 collapsed, biggest box **676 m2**     (a real building plan)
  **ABSENT IT IS PROVABLY THE OLD RULE** -- `cfg.fill || 0` and `used >= 1` by the `if (!used)`
  three lines above -- so `BLD` and `TOWER`, which name no `fill`, are untouched.
- **FIVE FUNCTIONS SCANNED `BOXES` LINEARLY, WHICH IS RIGHT FOR TEN AND NOT FOR 4,086 (m124,
  `BGRID`, `boxesNear`).** `groundAt`, `resolveBoxes`, `wallFind`, `ledgeFind` and `camHit` all
  walked the whole list, several times a frame. They read a grid BUCKET now and **the loop
  bodies are untouched**: this is a broad phase and nothing else, the way a car's AABB is the
  broad phase for its oriented box one repo over. Measured over 40,000 random queries against
  the real 4,086: **0 boxes missed**, and the scan drops from 4,086 to a mean of **9.8** -- 0.24%
  of the list, worst case 235.
  **IT IS OFF UNDER `BGRID.min`, so the test site is byte-for-byte what it was.** A grid over
  ten boxes is slower than scanning ten boxes, and the world that already works must not change.
  **EACH CALL SITE OWNS ITS OWN BUFFER, AND THAT IS NOT TIDINESS.** `ledgeFind` calls `camHit`
  INSIDE its own loop over the boxes, so one shared scratch array would be emptied under it half
  way through and the ledge search would silently stop after its first candidate. A pool sized
  by counting the nesting is a thing to get wrong later; five named arrays cannot alias.
  **AND `resolveBoxes`'s QUERY IS PADDED, because that loop MOVES `p` as it goes.** The pad is
  sized to the PUSH rather than to the worst case -- the worst case is 13 m, half the plan of the
  widest building, reachable only from its exact centre -- and past it the failure is ONE FRAME
  of not being shoved out of a SECOND box, which the next frame resolves from his new position.
  A pad of a whole grid cell scans 40.8 boxes a query where 2 m scans 13.0, for a margin nothing
  ever uses.
- **THE SPAWN IS SEARCHED, NEVER TYPED -- AND THE ORIGIN IS INSIDE A BUILDING (m124).** (0, 0)
  is inside `bld_dt_18_col`, so the one coordinate anybody would have picked by eye puts him in
  a tower. Swept against the real collider for the widest patch of clear level ground within
  60 m of the middle: **(-6, 6) on `ground_asphalt_col`, y 0.00, 14 m of clearance in every
  direction** -- the hero intersection. `npm run spots`' rule one repo over, and here it is the
  difference between a world and a man in a wall.
  **AND IT IS SET IN `init()`, NOT AT MODULE SCOPE**, because the ground he is about to stand on
  does not exist until the collider does.
- **HIS EXPORTER PUT THE TINT MASK IN THE BASE COLOUR SLOT AND LEFT THE PAINTED SHEET OUT
  (m124).** Read off the file: `City_Trim`'s `baseColorTexture` is `weirdport_trim_tintmask`, and
  `weirdport_trim_basecolor.png` -- the 2048 his manifest says the window tiles need -- **is not
  embedded at all**. Loaded as it stands, every building in the city is shaded with a black and
  white mask. The mask is exactly what the shader wants, just not where the shader wants it: it
  is kept AS the mask and `map` becomes the real sheet, fetched beside the picture so a 2048
  that does not arrive costs the buildings their paint rather than the whole city.
  **THE MASK IS THE EMBEDDED ONE, so there is no second fetch and no second failure mode on the
  boot path.** `textures/weirdport_trim_tintmask.png` is the lossless 1024 copy if the JPEG's
  ringing ever shows at a window frame.
  **AND HIS REFERENCE SHADER TESTS `City_Trim_Export` WHILE THIS EXPORT CALLS THE MATERIAL
  `City_Trim`** -- so on this file it would have matched nothing at all. The shader itself is
  his (`models/portland/three/weirdportCity.js`) and is otherwise used as written.
  **`#ifdef USE_COLOR` FIRES FOR A VEC4 COLOUR TOO**, checked in the vendored source rather than
  assumed: three defines `USE_COLOR` whenever `vertexColors` is true and adds `USE_COLOR_ALPHA`
  on top, and `vColor.rgb` is valid on both the vec3 and the vec4.
  **THE TRIM SHEET IS THE BIGGEST THING IN THE SLICE** -- 5.8 MB on the wire and about **22 MB
  resident** with its mips. `gltf-transform uastc` to KTX2 takes that to about 5.6 the day the
  count makes it matter; it is one texture today.
- **368 OF THE 510 VISUAL NODES ARE INSTANCES AND THE EXPORTER DID NOT SAY SO (m124).** No
  `EXT_mesh_gpu_instancing`, so 368 trees, cars, benches and lamp banners arrive as separate
  nodes sharing **40 meshes** -- 368 draw calls for 40 distinct things, and draw calls are the
  first thing that costs anything on a phone. They are merged into one `InstancedMesh` each.
  **GROUPED BY GEOMETRY *AND* MATERIAL**, because two nodes sharing a mesh but not a material
  are not one draw call.
  **THE MATERIAL PASS RUNS BEFORE THE BATCH, AND THAT IS NOT AN ORDERING PREFERENCE.** The batch
  REMOVES the nodes it merges, so a pass after it never sees them -- and `G_PF_Garden_Bed` and
  `G_PF_Garden_Bush` are instanced AND are **City_Trim**. Run the other way round, a third of
  the city misses the trim sheet, the tint mask, the anisotropy and its shadow flags, and
  nothing on screen says which third. Caught reading the diff, not running it.
  **AND THE INSTANCED MESH CARRIES ITS SOURCE'S SHADOW FLAGS AND ITS OWN BOUNDS**, because it is
  a NEW object: a tree pack spread over the slice never leaves the frustum and loses nothing by
  being tested, while twelve garden bushes in one plaza are a tight sphere and cull everywhere
  else in the city.
- **A 44 METRE SHADOW CAMERA IN A 280 METRE CITY WORKS IN ONE CORNER OF IT (m124, `stepSun`).**
  Fixed at the origin it covers about two and a half per cent of Weirdport, so his own shadow --
  the thing that grounds him -- would simply stop existing a few steps from the spawn. It
  follows him, which keeps the 2048 map at **46 texels per metre** rather than spreading it over
  a district at four. **The offset is the sun's own direction**, so the light keeps its bearing
  and only the box it covers moves; writing a position without moving the target swings the sun
  round the sky as he walks.
  **THE CITY RECEIVES SHADOWS AND DOES NOT CAST THEM (`WP.cast`).** 182 casting meshes is a
  shadow pass of 182 more draws, and an InstancedMesh's bounds span the slice so most of them
  would never cull out of it. His own shadow still lands on the street, which is the half that
  matters. `mel.WP.cast = 1` is the A/B.
- **AND THE BOOT GATE CAN BE POINTED AT EITHER WORLD (m124, `MEL_WORLD`).** The Weirdport branch
  is a path no gate had ever evaluated -- and a `const` read above its own declaration in there
  is a blank page exactly as it is anywhere else, which is this file's oldest landmine and the
  one `check:boot` exists for. `MEL_WORLD=weirdport npm run check:boot`. Empty is the test site,
  so `npm run check` is unchanged.
  **WHAT NO GATE HERE CAN REACH IS EITHER BUILDER**, because headless every `loadGLB` rejects --
  so `buildWpCollision` and `buildWpVisual` have never run outside a browser. What IS measured
  is everything they hand to: the shipped `triAdd`/`triBuild`/`triGround` over the real file, the
  shipped `solidColumns` over the real solids, and the shipped `boxGrid`/`boxesNear` over the
  real 4,086 boxes. The classification, the traverse and the draco decode are device questions.
  **THE CHIP CARRIES `WP<tris>t/<boxes>b`**, because *"the city never loaded"*, *"it loaded and
  I fall through the road"* and *"it loaded and I cannot move"* are three bugs and one picture
  from a phone, and only those two numbers tell them apart. Expect **WP3684t/4086b**.
- **NOT IN WEIRDPORT, AND EACH FOR A REASON (m124).** No NPCs: every warrior, drunk, skater,
  biker and Clancy is placed at a coordinate chosen against the TEST SITE, and a body spawned
  inside a tower is the m24 lesson (nothing on screen disagrees with anything and the player
  simply cannot walk there). Placing them wants the same sweep the spawn got, and it is its own
  build. **No grind rails**: his ten handrails, ledge irons and coping are found and counted
  (`WP.rails`, keyed on the `metal` MATERIAL, which is the one thing separating them from the
  concrete they are bolted to) and **this game has no grind mechanic at all**, so they are a
  hook and nothing reads them. **No ground textures**: his own note says the asphalt, sidewalk
  and grass export as flat colours until he bakes them, which is the first thing anybody will
  notice and is his export rather than this code.
  **AND THE PICTURE AND THE THING YOU WALK INTO ARE TWO DIFFERENT MESHES HERE, BY HIS DESIGN.**
  Every other solid in this game pushes its own footprint into `BOXES`, so there is one
  description of the world; this one has two, and the collision file is the one that is true. If
  he reports walking into nothing, that is the gap -- and it is his export to close rather than
  this code's to paper over.
- **A THUMB LIFTING OFF THE GLASS IS NOT A SWIPE, AND NO WINDOW CAN SAY OTHERWISE (m104, `FLICK`).**
  *"I'll press and hold in one direction and then when I release it thinks I've done a swipe
  gesture -- he keeps rolling out of the way when I'm not meaning to. It needs to be both the press
  forward AND the release within a certain timing to make sure that it's a swipe."*
  **THE ARM-THEN-LIFT SHAPE WAS RIGHT AND THE NUMBERS WERE NOT.** A finger leaving the screen drags
  its contact centroid as the patch shrinks -- twenty to forty pixels of it, routinely -- and on a
  52 px radius that is up to **.77 of the pad, arriving fast and followed immediately by the up**.
  That is geometrically the SAME EVENT as a flick: a quick move and then a lift. **So no timing
  window separates them**, however tight, and the two he asked for (`within` for the sweep, `let`
  for the lift) already existed and were never going to be enough on their own.
  **WHAT IS LEFT IS MAGNITUDE.** `at` .70 is 36 px of travel, which a lift-off produces; .95 is
  49 px, a deliberate sweep across most of the pad, which it does not. The two windows come down
  with it (`within` .28 -> .16, `let` .26 -> .14) so the gesture as a whole has to be quick, which
  is his sentence -- but the number that does the work is the distance.
  **A FLICK STILL FIRES OUT OF A HELD POSITION**, which is the thing that must not be lost: the
  delta is measured over a moving window rather than from the pad's centre, so a thumb four seconds
  into a steering hold still flicks. What it now has to do is cross the pad to do it.
  **AND THE COST IS STATED**: a roll in the direction you are ALREADY holding has less pad left to
  sweep across, so it is harder to ask for than a roll to one side. `mel.FLICK.at` is the dial and
  this is a device question -- nothing in this container has a touchscreen.
- **THE PADS FLOAT, OPTIONALLY -- AND WHEN THEY DO NOT THEY ARE BIGGER (m104, `STICK`, the zones).**
  *"Did we make it so you can have the option of the dynamic stick control, so they move around --
  so you don't have to be super precise with where you're pressing and swiping. And when they're
  not dynamic I think they should be a little bit bigger."* **m49 and m98 both wrote the floating
  pad down as the real fix for missing one and both shipped something else**; m98's own note ends
  *"a pad that appears where the thumb lands makes this question disappear rather than widening its
  answer."*
  **THE ZONE IS THE TARGET AND THE PAD IS THE PICTURE.** Half the screen each, and the pad is moved
  to the touch on the way down -- so `set()` measures the same rect it always did and **every
  gesture below it is unchanged**. The zone is not an ancestor of the arc rows, the chip or any
  key, so a press on one of those never reaches it; and the move/up handlers are registered on the
  zone as well as the pad, because the floating pad is `pointer-events: none` and capture is not a
  guarantee.
  **THE FLICK HISTORY IS SEEDED DIFFERENTLY ON A FLOATING PAD**, which is the one thing that could
  not be shared. On an absolute pad a thumb slammed onto the top edge genuinely IS a flick (m49)
  and the centre seed is what catches it; on a floating pad the thumb IS the centre, and seeding
  from the centre would arm a flick out of the edge clamp on every touch near a screen edge.
  **AND `RAD` IS MEASURED NOW RATHER THAN TYPED.** It was 52 against a 132 px pad, so `--pad` could
  not move without every gesture threshold quietly meaning something else -- which is the whole
  point of making the fixed pads bigger. One ratio, read off the element, and `--pad` 148 fixed /
  132 floating is the only number.
  **AND IT IS A TAP ON THE BUILD BADGE**, because there is no settings panel in this game and a
  phone has no console -- *"the option"* is a look-at-it decision and those belong on the phone
  (`city.opt`'s rule). Only the NUMBER takes the tap, so the state line beside it cannot eat a
  thumb, and it is out of the play area. **It is not a hidden mode**: the pads say which one it is
  in by floating or not, and the chip carries `· FLOAT`.
  **CHECKED AS GEOMETRY, NOT BY EYE (m184's rule).** At `--pad` 148 on a 390 px phone the two pads
  span x 20..168 and 222..370 -- **54 px between them** -- and everything downstream reads
  `--padr`, so the arc rows move with the pad rather than being positioned a second time.
- **ONE ARC-ROW BUILDER, TWO ROWS -- AND CENTRING THEM IS WHAT STOPPED THEM COLLIDING (m104,
  `buildArcRow`, `PALROW`).** *"In the same way that we have the buttons above the right stick, I
  wanna make the equivalent of those on the left stick."* m53's whole geometry was already a
  function of `MODES` and a table, so the left row is the same call with a mirrored bearing and a
  THIRD row tomorrow is another one.
  **AND `MODES.mid` 115 HAD TO GO, WHICH WAS A MEASUREMENT AND NOT A PREFERENCE.** It was up and a
  little INWARD because at `--pad` 132 the right pad's centre sits 86 px from the edge of a 390 px
  phone and a set centred on vertical put its outer tip 2.5 px inside it. The pad is 148 now, that
  centre is at 296, and the same tip lands 11 px clear -- **and the lean is what made the two rows
  meet**, because both of them leant toward the middle:
      mid 115 / 65   right row's inner tip x **194**, left row's **196** -- OVERLAPPING, at the
                     same height, by two pixels
      mid 90 both    right's inner tip 212.5, left's 177.5 -- **35 px of air**
  with the outer tips at 379 and 10.5, both on screen at 132 as well as at 148. The left row is
  written as `180 - MODES.mid` rather than as 90, so moving one moves the other and they can never
  lean toward each other again.
  **AND A ROW WEARS ITS OWN STICK'S HUE**, for the reason the pads do (m49): they are different
  controls, and a row in the other pad's colour reads as belonging to the other pad.
- **CLANCY RIDES THE BACKPACK (m104, `PACK`, `packGo`, `stepPack`).** *"One of them is gonna be to
  control Clancy -- I want to push a button and he's gonna run and jump onto my backpack and just
  sit on it. One for him roaming and one that's like a backpack."*
  **NEARLY ALL OF IT WAS ALREADY BUILT, WHICH IS `d.K`'S DIVIDEND AGAIN.** The run over is the
  leash's own catch-up with the ring's centre moved from "beside you" to "you"; the leap is
  `bodyFly`, the integrator every hop and knock-down already uses; the pose is one clip name; and
  the two modes are a table the arc row builds itself off. What is actually new is where he SITS
  and the state that holds him there.
  **HE RIDES A BONE, NOT A POINT BESIDE THE PLAYER.** `rig.bones` is already a name map (the aim
  pose reads Spine1/Spine2 out of it), so hanging him off the spine means he takes the walk's bob,
  the turn and every crouch for free -- where an offset from `player.pos` is a small man sliding
  along in the air behind a body moving under him. Found by PATTERN, the jetpack's rule one repo
  over. **And he is WRITTEN, never parented**: the armature is scaled 0.01 and a child of it comes
  out at a hundredth of its size (m26), and this needs no parent anyway because it is a position
  and a facing. `seat.up`/`seat.back` are fractions of `RIG.height`, so a change to how big the
  player is moves the seat with him (m52).
  **THE LEAP IS SOLVED FOR THE SEAT, NOT FOR AN APEX SOMEBODY TYPED.** At `leap` .30 s and g 20,
  `vy = (dy + g T^2 / 2) / T` puts him at the seat's height exactly at T -- which on these numbers
  is also the top of his arc, so he arrives at the top of his own leap, which is what landing on a
  back is. `leapDrag` 0 is what keeps the horizontal exact (m74).
  **AND ONE PREDICATE ANSWERS BOTH HALVES (`packOK`).** The ride reads it to decide whether to HOLD
  him and the approach reads it to decide whether to GO -- so without `player.knock` in the SAME
  test the knock-down threw him off and `foeWander` put him straight back on the next frame, which
  is a man bouncing off your back rather than coming off it. The probe read it exactly:
  `after a knock-down: st=ride`.
  **A PASSENGER HAS NO BRAIN**, so the pack runs above every other state rather than inside
  `foeAI`: no gait, no dive, no target, and nothing to be separated from. And he is out of
  `pushBodies` and `bodySep` while he rides -- without that he is a solid held 21 cm in front of
  your own chest shoving you backwards every frame, which reads as walking into an invisible box
  and is the same thing m96's carry had to skip.
  **A BLOW STILL TAKES HIM OFF AND THAT NEEDED NO CASE**: `dummyBlow` sets `st` to `hit` or `down`
  and the ride only holds on `ride`, so shooting the passenger drops him.
  Driven through the shipped `stepDummies` over the real collider:
      PACK from 6 m    runs in, leaps, **aboard at 2.50 s**, y 1.13 against a seat of 1.13,
                       0.21 m behind you in plan
      you walk 12 m    he is at 11.77 with dy 1.13 -- still seated, still behind
      ROAM             down on the ground, y 0.35 against a ground of 0.35
      PACK again       aboard
      a knock-down     **off**, and he re-boards once you are up
  **THE THROW IS DELIBERATELY NOT HERE.** *"And then I'll be able to like throw him -- but for now
  one for roaming and one that's like a backpack."* m99 deleted the whole carry because *"the
  hybrid animations look like trash, the hips rotation has been stripped, he's leaning forward and
  the throw mechanics are bad -- we need to rebuild all that"*, and none of that has been redrawn.
  `hold_item` and `throw_item` are still in the player's export and still cost nothing unnamed
  (m35's rule), so the throw is a build on top of this one.
  **AND THE ROW IS ON THE LEFT STICK**, which is what the sentence opens with -- *"the equivalent
  of those on the left stick"* -- rather than the "above the right stick" it ends with. Stated
  because it is a reading, not a measurement.
- **THE FAT BIKER AND HIS MOTORCYCLE, AND HIS C4D QUESTION IS GIMBAL LOCK IN THE DISPLAY (m107,
  `BIKER`, `MOTO`, `buildMoto`, `stepMoto`, `stepRide`).** *"I added a guy called fat biker 02 and
  his motorcycle... the motorcycle has its wheels rigged to a bone each and can be driven
  procedurally, and its handlebars rigged to 'turn' I think, and it needs to procedurally have its
  turn driven to 20 degrees each direction. The weird thing about the joint is that when I rotate
  the blue axis it changes R.B, when I rotate the red axis it changes R.P, but when I spin the
  green axis -- the one that turns the steering -- ALL THREE change. It makes no sense?"*
  **THE RIG IS FINE AND THE DISPLAY IS WHAT IS LYING.** C4D's HPB applies H about Y, then P about
  X, then B about Z, in that order -- and the `steering` joint's rest carries **P = -28.5 deg**,
  which is the fork RAKE he modelled. So the joint's own local Y is tilted 28.5 degrees back from
  the parent's Y, a turn about the fork is not a pure H in the parent's frame, and the solver has
  to spread it across all three fields. It is the degenerate case of an Euler triple, not a broken
  joint. **And none of it survives the export: glTF stores QUATERNIONS**, so the game never reads
  a Euler at all and there is nothing here to work around.
  **AND THE STEERING AXIS IS MEASURED RATHER THAN TYPED, WHICH IS WHY THE RAKE COSTS NOTHING.**
  `front_wheel` hangs off `steering` at local (-1.7, -28.3, +3.2) -- almost pure **-Y** -- so the
  fork runs down that joint's own local Y and that is the axis. The rest quaternion is captured at
  build time and the turn rides ON TOP of it (`rest * Ry(d)`, which is exactly a rotation about
  the axis the rest pose puts Y on), so the 28.5 degrees is the export's business. `barPlace`'s
  rule: read the rest pose, never restate it.
  **HE BUILT MORE INTO IT THAN HE REMEMBERED.** 8 nodes, one skin: `root > steering > front_wheel`,
  `back_wheel`, and **`mixamorig_hips` -- a rider SEAT MARKER already in the file.** The steering
  joint is called `steering` and not `turn`, so every joint is found BY PATTERN and either
  spelling lands with no code change -- `weapFit`'s rule.
  **EVERY NUMBER IS DERIVED, AND A REAL-WORLD FACT IS THE CHECK THAT THEY ARE RIGHT.** The bike
  and the biker came out of the same scene, so at `MOTO.len` 2.20 m the geometry gives x2.021
  against the biker's own x2.026 -- and then:
      wheelbase   0.793 authored -> **1.602 m**
      wheel r     0.136           -> **0.275 m**   a Fat Boy's front tyre is 0.28
      seat        0.323           -> **0.652 m**   a Fat Boy's seat is 0.66
  Two independent real-world facts land within a centimetre, which is what says the scale is right
  rather than plausible.
  **THE STEER ANGLE FALLS OUT OF THE WHEELBASE.** A single-track vehicle turning at yaw rate w
  while doing v has a turn radius v/w, so `delta = atan(L*w/v)` -- the handlebars answer the corner
  rather than a mapping somebody invented, and **`lock` is his 20 degrees as a CLAMP** rather than
  as a target. At the shipped ring that is 6.5 deg; `mel.MOTO.ring.r = 6` takes it to 15.0 and at
  4.4 m it reaches the lock. The wheels are distance over the measured radius about each bone's
  own local X -- the axle, because the mesh is 1.089 long in Z against 0.648 wide in X -- and the
  front wheel inherits the steering for free by being its CHILD in the file.
  **THE CIRCUIT WAS SWEPT, NOT CHOSEN, AND THE ANSWER WAS NEARLY "THERE IS NO ROOM".** A path here
  has to clear fourteen boxes, two buildings and seventeen bodies. The largest clear ring within
  reach of the spawn is **14 m at (-29, -3)**, worst clearance 2.02 m, nearest point 15 m from
  where he stands; the only clear OVAL is 64 m across with its nearest point 37 m away, which is a
  motorcycle you cannot see. **The path is parameterised by angle rather than integrated**, so it
  cannot drift into anything however long it runs.
  **AND THE RIDER IS `stepPack` ONE VEHICLE OVER.** `'ride'` is a state `pushBodies` and `bodySep`
  ALREADY skip, so reusing it is what makes a passenger weightless for free; he is written to the
  seat BONE every frame with no offset, and the three driving clips blend by how hard it is
  steering, summing to exactly 1. **`stepMoto` runs ABOVE `stepDummies`**, because the rider reads
  the seat bone's world position and a bike stepped after him leaves him a frame behind it --
  `stepShip`'s ordering rule.
  **AND `packOff`'s LOOP WAS NOT GATED ON THE PAL, WHICH THIS EXPOSED.** `if (!packWant()) for
  (const d of DUMMIES) if (d.st === 'ride') packOff(d)` walks EVERY body, so pressing the pal row
  would have thrown a biker off his bike. Latent until there was a second thing that rides.
  **WHAT IS UNVERIFIED AND WHY:** the motorcycle is draco and nothing in this container can decode
  a mesh or build a skin, so `buildMoto` has never run outside a browser -- whether it stands the
  right way up, whether the wheels spin about the axis the arithmetic says, and which way it heels
  are device questions. The arithmetic that CAN be checked -- the scale, the wheelbase, the radius,
  the seat, the steer angles and the ring's clearances -- is above and was. The chip carries
  `MOTO<deg>` plus `MOTO NO STEER` / `NO WHEEL` / `NO SEAT` if a re-export renames a joint, because
  "the wheels don't turn", "the bars don't turn" and "it never loaded" are one picture from a phone.
  **`models/vehicles` HAD TO GO INTO `bump.mjs`'s `DIRS`** -- `readdirSync` is not recursive, so a
  new asset folder is a new entry there or every file in it goes stale silently. **Seventh time.**

- **AN EARLY-RETURN BRANCH NEEDS SOMEBODY TO CALL THE FUNCTION AGAIN (m123, `stepMorph`).** *"It
  puts you into a mode as though you're disarmed and yet it shows it like you're holding the
  weapon... your gun is out but it thinks you're in disarmed mode, and then you have to take out
  your gun even though you already have it out."* Both halves of that are one call that never
  happened.
  **`paintKit` IS CALLED FROM `mphWear`, WHICH RUNS AT THE SWAP -- WITH `p.mphSt` STILL SET.** So
  it took m122's transform branch, which blanks the label, blanks the hint, dims the mode row,
  drops `ready` from the pad and **returns before the visibility loop**. That return is why the
  gun stayed drawn: its `visible` was never touched, so the model kept whatever it had while every
  readout beside it said he was carrying nothing. And **nothing called `paintKit` again when the
  flash ended** -- `p.mphSt = ''` sits in a branch that clears five fields, disposes the blob and
  returns -- so the HUD stayed in the transform's state for the WHOLE disguise, until a tap
  happened to repaint it. *"You have to take out your gun even though you already have it out"* is
  that tap, described exactly.
  **THE BRANCH IS RIGHT AND THE GAP IS STRUCTURAL.** A state that suppresses a repaint is only
  half a rule; the other half is repainting when it stops, and the one place that knows the
  transform is over is where it ends. This is the class to check whenever a `paintKit`-shaped
  function grows a guard: **who calls it when the guard goes false.**
- **AND A TRANSFORM ENDS IN A MODE YOU CAN FIRE (m123).** *"Rather than putting you in DNA -- the
  tendency would be, if it shoots you into DNA gun then you're just gonna shoot somebody right
  away and then transform into them even though you just transformed into somebody else."*
  He is describing a loop and it is real: the gun that put you in this body is still the gun in
  your hand, so the very next release puts you in a different one. **The mode a transform lands in
  has to be one whose trigger does not undo the transform**, which is the DNA mode and nothing
  else -- so **AUTO is deliberately left alone**: rapid fire is a perfectly good thing to be
  holding and firing it changes nobody's body.
  **THE SLOT AND THE MODE ARE BOTH FOUND, NEVER TYPED** (`q.aim`, `!q.dna && !q.auto`), which is
  m52's own rule that a fourth weapon or a fourth mode is a row in a table and the line still
  reads. **The slot half is a no-op on every path a player can take** -- you cannot fire the DNA
  gun without the blaster already out, and `cycleKit` refuses while `p.mphSt` is set -- so what it
  actually covers is `mel.dna('hobo')` from the console and whatever a future sample-and-return
  path does. Stated as such rather than dressed up as a fix.
  **AND IT IS GATED ON `p.mphNext`, so only putting a disguise ON moves anything.** A REVERT keeps
  whatever you were carrying, which is what the same rule says pointed the other way: nothing about
  taking a body off is a reason to change the kit.
- **THE LEDGE HANG WAS MEASURED ON ZAP AND DRAWN ON SOMEBODY ELSE (m122, `bodyK`).** *"For some
  reason, all of the characters do the ledge hang too high, like from their hips it seems."*
  Exactly that, and it is one ratio. `LEDGE.hang` .861 and `LEDGE.out` .170 are fractions of
  `RIG.height` **measured off zap's own hang clip** -- his hands sit 1.076 m above his root -- and
  `MORPH.tall` draws a disguise at the KIND's own height while the collider, the speeds and
  `MOVE.step` stay his. So the root went to `lip - 1.076` on a body whose hands are `k` times
  further up than that, and the whole difference hung over the lip:
      zap      h 1.25  k 1.000   hands at the lip  +0.000   the lip at **86%** of him
      skater   h 1.68  k 1.344                     +0.370               64%   <- his screenshot
      hick     h 1.78  k 1.424                     +0.456               60%
      warrior  h 1.85  k 1.480                     +0.517               58%
      clancy   h 0.62  k 0.496                     **-0.542**          174%   <- over his head
  86% of a body is his hands; 60% is his hips, which is the word he used. Scaled, it is 0.000 at
  every height and Clancy stops hanging off a lip half a metre above his own crown.
  **AND THE CATCH BAND HAD TO MOVE WITH IT.** `ledgeFind` centres the window on where his hands
  END UP -- *"the placement number IS the acquire number and the two cannot drift"* -- so scaling
  only `ledgeAt` would have left the window where zap's hands would be while the pose put the
  skater's 37 cm higher, which is the two halves of one rule disagreeing.
  **IT IS NOT `rig.gaitK`, AND FOLDING IT IN WOULD HAVE BEEN THE `chargeGoH` BUG (m27).** That
  one is set only when the clip BORROW succeeds, because a refused borrow plays the kind's own
  clips at the kind's own reference speeds and the gait must divide by nothing -- and the body is
  drawn just as tall either way. Two facts, two numbers.
  **AND IT WAS ALREADY BEING COMPUTED INLINE.** `stepCam` has scaled its look point by
  `(p.mphH || RIG.height) / RIG.height` since m112; `bodyK()` is that expression with a name, and
  three readers rather than three copies. **A function, not a const** -- `ledgeFind` sits four
  thousand lines above `player` and a const read from up there is a temporal dead zone, which
  this file has paid for eight times.
  **`WALL` IS DELIBERATELY NOT THIS.** `tall`, `chest` and `stand` are a THRESHOLD ("does this box
  hide me") and a standoff measured against his own radius, and the cover pose is a STANDING pose
  -- there is no placement offset to get wrong, so a taller disguise against a wall is still
  against the wall. One variable moved. The same goes for `LEDGE.inset`, `reach` and `hop`, which
  are plan positions against a collider that stays zap's.
- **A DISGUISE CARRIES HIS WEAPONS, ON ITS OWN HAND (m122, `mphMounts`).** *"I can't swap through
  the weapons. I'm wondering if we can just have the characters map the weapon to their hand joint
  since I don't have weapon joints for most of them... we can just map it to their hands until I
  can re-export them with weapon joints."* Read out of the files before a line was written, and
  the reason it works at all is in the first row:
      zap        weapon_root_right  parent **mixamorig_RightHand**  t 3.858, 7.971, -1.553
                 weapon_tip_2       parent weapon_root_right        t -14.310, 0, 0
      warrior    weapon_root        parent mixamorig_RightHand      -- the MACE's, tip +Z 36.18
      hick / hobo / clancy / skater / female     **no weapon nodes at all**
      and every one of the seven has `mixamorig_RightHand`
  Zap's mount is a plain child of his hand with a constant local transform, so copying that
  transform onto another rig's hand puts the gun where he holds it -- and **proportional to the
  wearer**, because the bone chain carries the armature's 0.01 and the model's own scale. That is
  this file's "as authored means proportional" rule one mount over, and on the skater it comes out
  1.22x his, which is right for a body 1.34x his height.
  **THE WARRIOR'S OWN JOINT IS NOT USED, DELIBERATELY.** It is spelt `weapon_root` rather than
  `weapon_root_right`, so the name lookup never asks for it -- and it is the MACE's: its tip is at
  (0, 0, 36.18) against the blaster file's (-14.31, 0, 0), a different axis and a different
  length, so parenting the blaster there would point the barrel sideways.
  **A RIG THAT HAS THE RIGHT JOINT USES THE JOINT**, which is `weapFit`'s rule: `mphMounts`
  collects any `/^weapon_root/` on the skin first, so the day one of these exports carries
  `weapon_root_right` it lands with **no code change here at all**.
  **AND THE TIP COMES WITH IT.** `mountWeapon` reads the barrel AXIS off a `tip` child of the host
  and `barrelH` reads the same pair every frame for the pose correction -- so a mount with no tip
  is a gun with no direction, and `poseBias` would have returned null for the whole disguise.
  **WHICH HAND IS READ OFF ZAP'S OWN MOUNT, NEVER TYPED.** His right one hangs off
  `mixamorig_RightHand` and his left off the left, so one lookup serves both and dual wield needs
  nothing added. The local transform is read LIVE rather than captured, which is safe for the
  reason m35 checked: no mount marker deviates from its rest pose by more than 0.5 deg anywhere in
  the file, and `normaliseClips` has already stripped every non-Hips position track.
  **AND `mountWeapon` RUNS ONCE AT LOAD, WHICH IS THE OTHER HALF.** It parents the group to a bone
  PERMANENTLY -- zap's -- so before this every disguise left both weapons hanging off a skeleton
  no longer in the scene, which from a phone is indistinguishable from the kit being switched off.
  `mphWear` re-hosts them by `w.root`, because it is the one place that knows which body is drawn.
  `w.axis` and `w.muzzle` are MOUNT-LOCAL and the synthesised mount carries zap's own transform, so
  neither is re-measured; `w.host` is, because `muzzleWorld` and `barrelH` read it every frame.
  **WHAT THIS CANNOT DO is fit a hand it was not measured on.** Zap's wrist-to-grip offset is his,
  so on a rig whose hands are proportionally a different shape the gun sits a little off -- which
  is exactly the gap his re-export closes, and is why this is a stand-in rather than an answer.
- **AND THE KIT IS LIVE AGAIN WHILE HE IS SOMEBODY ELSE (m122).** *"We need to still be able to
  swap through the weapons when you're like the NPC characters, which the buttons don't show up."*
  Three gates, all written when a disguise genuinely had nothing to play, and all now answered:
      `stepKit`'s early return was `mphOn()` -- wearing ANYBODY -- on the argument that every
      branch below ends in a pose he has not got. That stopped being true at m119, when
      `mphBorrow` put zap's whole pool on the skin: the aim pose, both strafes and the shoot clip
      are all there. It is `mphBare()` now, the same predicate the six verbs took, and it still
      means what it always meant -- no pool to do it with, plus the transform itself.
      `cycleKit`'s m121 inert tap is gone, so the tap means exactly one thing in every state --
      which is the whole point of a control map. REVERT keeps its own button on the left wheel, so
      there is no conflict left to resolve.
      `paintKit`'s disguise branch gave the label line to the character's NAME, because with bare
      hands it was the only thing that line had to say. There is a weapon in his fist now and the
      label is what changes as he taps; WHO he is, is on screen twice already (the chip reads
      `DNA <NAME>` and REVERT is lit), so nothing was lost by giving the line back to the kit.
  **Only the TRANSFORM ITSELF still blanks it**, because for that second there is no body to be
  carrying anything and the ring must not read armed.
  **AND THE CHIP SAYS `NOHAND`** when a disguise's mount was never made -- "the mount is missing",
  "it is there and the gun is in the wrong place" and "the kit is switched off" are three bugs and
  one picture from a phone, and only the host answers the first. Silent on every rig in the repo.
- **A BONE COUNT IS A PROXY FOR A STRUCTURE, AND IT FAILED ON THE ONE RIG WITH NO FINGERS
  (m121, `MORPH.needs`).** *"For some reason the animations aren't working on Clancy. I tried
  the homeless guy, the warrior alien -- they worked on those, but they didn't work on Clancy,
  and you can transform into Clancy."* m119 gated the borrow on `borrowMin` **30 shared bones**
  and Clancy has **25**. Read out of his file, his 27 joints are:
      Hips, both UpLeg/Leg/Foot/ToeBase/Toe_End, Spine, Spine1, Spine2, both
      Shoulder/Arm/ForeArm/Hand, Neck, Head, HeadTop_End
  **A complete body, missing nothing a locomotion clip drives** -- what he has not got is
  FINGERS, and zap's 32 finger bones are most of the difference between 62 and 27.
  **THE TEST IS A SPINE, TWO ARMS, TWO LEGS AND A HEAD.** Twenty named joints, matched on the
  SUFFIX so a rig with another prefix still lands (and `LeftUpLeg` does not end with `LeftLeg`,
  nor `LeftHandPinky1` with `LeftHand`, so each names one joint and only one). Checked against
  every rig in the repo: **all nine carry all twenty**, Clancy at 27 joints and the female at
  193 alike. `stripPoses`' own rule -- the test is what the thing IS, never a name or a tally --
  and `dnaOK`'s, which is why the officer is still refused and for the right reason (no walk,
  no run, so no animation set).
  **AND IT NAMES WHAT IS MISSING WHEN IT REFUSES**, which the count could not: "has no
  LeftForeArm" is a fact about an export and "only 25 shared bones, needs 30" is a fact about a
  threshold somebody picked.
- **THE REVERT HAD STOLEN THE ONLY GESTURE THAT CHANGES WEAPONS (m121, `paintPalRow`).** *"Since
  you have the tap on the left stick changing the character back to the alien, I can't change my
  weapons or anything... we need a more clever way to switch back. Maybe a dedicated button pops
  up on the left stick -- you know you have those wheel buttons."*
  m112 spent that tap on the revert on the argument that the kit is bare hands for the whole
  disguise so the gesture was free. **It is not free**, because it is the ONLY way to change
  weapons and a disguise is a state you spend real time in -- so the tap meant a different thing
  depending on a state you were in, which is a gesture you cannot rely on. That is the
  `KIT.on`-with-three-owners shape one control over.
  **SO THE WAY BACK GETS A CONTROL OF ITS OWN, ON A WHEEL THAT ALREADY EXISTS.** `buildArcRow`
  has been a function of a table since m104, so REVERT is a one-row table and the arc simply
  divides once instead of twice -- no new geometry, no new element, nothing in the DOM written
  a second time.
  **IT REPLACES THE PAL ROW RATHER THAN JOINING IT.** ROAM/PACK is a two-state TOGGLE and REVERT
  is an ACTION; a row that mixes them is a row you have to READ rather than glance at, which is
  `optStore`'s "two rows, not a mode" pointed the other way. And while you are wearing somebody
  else, which of the two Clancy is doing is not what needs the screen -- getting back is. It
  comes back the moment you do, with whatever it was still set.
  **AND IT IS BUILT IN `paintPalRow` RATHER THAN IN `buildClancy`**, which is not a tidy-up: a
  session where his GLB never arrived would otherwise have no wheel at all, and therefore no way
  out of a disguise but the console. The row still only shows where it MEANS something
  (`paintKit`'s rule); it is just that "a disguise to get out of" is now one of the things it
  can mean.
  **AND THE TAP IS INERT WHILE DISGUISED RATHER THAN MEANING SOMETHING ELSE.** Cycling into a
  slot `stepKit` refuses to fire would put a weapon in his hand that does nothing, so it simply
  does not cycle -- and the gesture means exactly one thing everywhere, which is the whole point.
  **THE WEAPON SELECTION WANTS ITS OWN BUTTON EVENTUALLY** -- *"they'll probably be a dedicated
  button, but it's fine for now"* -- and when it lands, the left tap frees up entirely.
- **A BODY'S ROOT IS AT ITS SOLES, SO WRITING IT TO A SEAT PUTS HIS FEET ON THE BACKPACK
  (m120, `P.hipY`).** *"This also shows how Clancy sits so far above the backpack."* -- with a
  screenshot of him riding at head height. Measured off the two files rather than nudged a third
  time, composing each rig's bind chain out of the GLB JSON:
      zap     `mixamorig_Spine2` at **0.742 m**, 59% of his 1.25 m   crown 1.25, head bone 0.910
      Clancy  hips **0.156 m** above his own root, head bone 0.337, crown 0.62
      seat    0.742 + RIG.height * .22 = **1.017 m**, and his ROOT went there
      so      his crown landed at **1.64 m** -- 0.39 m OVER zap's own head
  **EVERY NUDGE TO `up` WAS MOVING A NUMBER THAT COULD NOT BE RIGHT**, because the error is the
  rider's own HEIGHT and not an offset: m105 wrote .30 and called the seat a guess, m116 took it
  to .22 and called it a nudge, and neither could ever have closed 39 cm without burying him in
  zap's spine. `packSeat` returns where his ROOT goes now, with his HIPS landing on the seat and
  `P.hipY` saying how far that is -- measured off the proto, which is provably at its bind pose
  because nothing ever animates it, so a bigger sidekick lands right with nothing edited.
  `buildBoard`'s rule one body over: read where the joint actually is and slide the root by the
  difference.
  **AND `up` IS SMALL AND NEGATIVE NOW, WHICH IS WHAT THE MEASUREMENT SAYS.** Spine2 is already
  at 59% of his height, so a rider's hips belong a touch UNDER it rather than a quarter of a
  body above: -.034 puts Clancy's hips at 0.700, his root at 0.544 and his own head at **0.881
  against zap's 0.910** -- a creature on his back rather than one hovering over it. He drops
  **0.47 m**.
  **AND A NAMED JOINT TAKES THE CORRECTION TOO**, which is a change from m105's note: a joint
  marks a point ON THE BACKPACK, and that is still where his hips belong rather than where his
  feet do. The export decides the PLACE and this decides which part of him arrives at it -- which
  is the only reading that makes `PACK.mark` drop in with nothing to re-tune.
  **THE POSE IS STILL A STAND-IN AND IS STILL HIS.** `stand_to_cover` is a man taking cover, not
  a man holding on, and it is why he reads as standing to attention on a moving back. `PACK.clips
  .ride` is an ordered list, so drawing one and exporting it as `pack_ride` is the whole change.
- **A BORROWED SKIN WEARS HIS WHOLE MOVESET NOW, ROTATION-ONLY (m119, `mphBorrow`, `mphBare`).**
  *"Once you transform, obviously the new characters don't have all of the same things my hero
  does -- but we could just implement a rotation based borrow of the animation so you can still
  do all of the same stuff. Ignore weapons for now. The general dynamics doesn't even work: you
  can't run, you can't even rotate. I have many times in the past just taken animation, rotation
  only, from one character and applied it to two others -- they're all rigged with Mixamo."*
  **HE IS RIGHT, AND THE FILES SAY HOW RIGHT.** Read out of the GLBs' own JSON chunk (animation
  samplers and node transforms are never draco compressed, so this is measurable here even
  though nothing in this container can decode a MESH). Against zap's 62 bones:
      hick / hobo / skater   57 shared   mean rest offset 1.58 deg   **1 bone over 5 deg**
      alien_warrior          50 (index fingers)          1.80        1
      clancy                 25 (all fingers)            3.61        1
      alien_female_purple    50                          **0.00**    **0**
  **Every rig shares zap's bind pose to 0.00 degrees on every single bone except the Hips**, and
  the five missing on a clean rig are `root` and the four weapon markers -- nothing a locomotion
  clip drives, and nobody sees a finger curl at eight metres.
  **AND THE ONE BONE THAT DIFFERS IS EXACTLY 90.0 DEGREES, STRUCTURALLY.** zap's chain is
  `Armature(+90 X) > root(-90 X) > Hips`; theirs is `Armature(+90 X) > Hips(-90 X)` -- the same
  net world rotation with the turn in a different NODE. **The female is the control that proves
  it**: she HAS a `root` and reads 0.00 at the Hips; the five that have not read 90.0. So the
  whole difference between these rigs is ONE CONSTANT ROTATION at the top of the chain.
  **SO THE DELTA IS APPLIED AT THE HIPS AND NOWHERE ELSE, AND THAT MUST NOT BE RE-DERIVED PER
  BONE.** Shredworld shipped the per-bone form `q_T = q_restT * inv(q_restS) * q_animS`, A/B'd it
  and turned it **off**: per bone it ignores the PARENT-CHAIN term, so the correction compounds
  down each limb -- it splayed Moussa bow-legged and took his arm divergence from 4.6 deg to 33.
  Here there is nothing to compound, because every other bone is 0.00 and the Hips' parent is the
  armature itself, so the chain term above it is the identity and the delta is EXACT rather than
  approximate. `MORPH.restTol` is the guard, not a fudge: the day an export arrives whose elbow
  is twenty degrees off zap's, this is the wrong tool and it refuses and says so.
  **ONE DELTA SERVES THE ROTATION AND THE TRANSLATION, AND THAT IS NOT A COINCIDENCE.** A bone's
  local rotation composes with its parent's WORLD rotation and its local translation is expressed
  in that same parent frame, so with `D = inv(parentWorld_T) * parentWorld_S`:
      quaternion   q' = D * q                             the world rotation is preserved
      position     p' = t_restT + k * (D * (p - t_restS))  re-expressed in the target's frame
  Verified numerically off the files rather than argued: **`D * zapBindHips` lands on each rig's
  own bind hips to 0.000 degrees, on all six.**
  **AND THE TRANSLATION IS A DELTA FROM REST, NOT A SCALED ABSOLUTE -- WHICH THE MEASUREMENT IS
  WHAT CAUGHT.** `k * (D * p)` is right about the axis that is his HEIGHT (-37.31 against his own
  -37.30 on the hick) and wrong about where the artist put his pelvis relative to the armature
  origin, which is a free choice per export: 2.5 units of 37 off on the hick and **11.5 of 25.6
  on Clancy**, which at his scale is a fifth of a metre of body floating. Taken as a departure
  from rest it is exact at the bind pose on every rig by construction and proportional everywhere
  else -- a 10-unit crouch in zap becomes a 9.30-unit crouch on the hick, which is `10 * k`.
  **AND THE HIPS POSITION IS KEPT RATHER THAN DROPPED, WHICH IS THE ONE PLACE "ROTATION ONLY" IS
  WRONG.** That track is the body's HEIGHT OFF THE GROUND and every crouch, landing, roll and
  fall in the set uses it; dropped, the legs fold and the soles hang in the air, which is a bug
  `tools/melee.mjs` paid for one repo over. Every OTHER position track really is a bone LENGTH
  and `normaliseClips` has already thrown those away at load along with every scale track.
  **THE NON-HIPS TRACKS ARE SHARED, NOT COPIED.** A `KeyframeTrack` is immutable data and
  `createInterpolant` allocates a fresh result buffer per action, so one track object backs two
  clips on two skeletons -- which is what makes 50-odd clips per kind cost two small arrays
  rather than a copy of the whole animation set. `normaliseClips` has already cloned every
  `times` array (the worst landmine in this class of file) and nothing mutates one after load.
  **AND THE BIND POSE IS CAPTURED BEFORE THE MIXER EXISTS, COMPOSED UP TO THE MODEL.** A mixer
  overwrites a bone's local transform every frame, so a rest pose cannot be read back off a posed
  skeleton -- and `getWorldQuaternion` would fold in whatever the model is PARENTED to, which the
  two sides of this are not alike in: zap's is already under `rig.root`, whose yaw is written
  every frame, while a freshly cloned skin is under nothing at all. Measuring the two in different
  frames would have been silent and is only not happening today by accident of ordering.
  **AND THEN `rigAnim` IS THE ORDINARY PATH, WHICH IS MOST OF THE RETURN.** `morphAnim` is the
  three clips a kind carries of its own; once zap's pool is on the skin every name in `CLIPS`
  resolves and there is nothing left for a second animation path to do -- the gait, the strafes,
  the backpedal, the landings, the turn hook and the knock-down all arrive at once, and the six
  verbs m112 switched off (`meleeGo`, `rollGo`, `wallGo`, `ledgeGo`, `slamGo`, `backGo`) come back
  by reading `mphBare()` instead of `mphOn()`. **The KIT stays on `mphOn()`**, because a borrowed
  rig genuinely has no weapon mount -- his own *"we could like ignore weapons for now"*.
  **AND THE GAIT HAS TO BE TOLD HOW BIG HE IS (`rig.gaitK`).** A reference speed is how fast the
  PLANTED FOOT slides, which is authored travel TIMES the scale the model is drawn at -- so zap's
  run clip on a hick 42% taller covers 42% more ground per cycle and the feet slide at the same
  world speed. One ratio through `add`'s own `setScale`, and the stride table with it. **That is
  also the best candidate for "you can't run"**: at `MORPH.tall` the hick is drawn 1.42x and his
  own `runRef` is 2.00, so a 7 m/s sprint clamped his walk cycle at `tsHi` and what was on screen
  was a body sliding with its legs barely moving.
  **WHAT I COULD NOT REPRODUCE BY READING IS THE ROTATION.** `rig.root.rotation.y` is written
  every frame from `player.faceH` with no morph gate anywhere near it, and `faceOff` measures ~0
  on every one of these rigs -- so *"the character doesn't rotate against the camera"* has no
  cause I can find in the code, and it is stated as unexplained rather than dressed up as fixed.
  What the borrow does is make the question moot: standing and turning he now has zap's idle, and
  moving he has the whole four-clip gait and both strafes.
  **WHAT IS UNVERIFIED AND WHY:** nothing in this container can build a skin (draco wants a
  Worker) and there is no GPU, so **whether he stands up in the borrowed clips is a device
  question** -- the arithmetic that CAN be checked here is above and was. The chip carries
  `DNA HICK SKINNY+54` (how many of zap's clips he is actually wearing) or `NOBORROW`, because
  "the borrow refused", "it ran and the pose is wrong" and "it never transformed" are three bugs
  and one picture from a phone. `mel.MORPH.borrow = 0` is m112..m118 exactly, live.
- **THE BODY WAS HIDDEN BEFORE THE BLOB WAS THERE, AND THE COMMENT ABOVE IT CLAIMED THE
  OPPOSITE (m118, `MORPH.hide`, `MORPH.fade`, `MORPH.swell0`).** *"The character disappears
  before the blob shows up -- you shoot him, the character just disappears, then the blob shows
  up, then the new character's in its place. The blob needs to subsume and consume the character
  before the mesh disappears. Does that make sense? And same thing on the other end."*
  **HIS READING IS THE ARITHMETIC EXACTLY, AND m113's OWN NOTE SAID IT WAS THE OTHER WAY ROUND.**
  That note (and the line in this file) called `hide` *"strictly INSIDE the blob's own full
  window"*. `fade` is [.30, .70] and `hide` was [.27, .73], so it is strictly OUTSIDE it at both
  ends -- computed off the shipped `smooth` over a 0.90 s transform:
      m113   the body went  **0.027 s BEFORE** the blob reached full weight
             and came back  **0.027 s AFTER** it had already begun to leave
      m118   full blob over a VISIBLE body   0.189 s going in, 0.171 s coming out
  **A behaviour asserted only in a comment is not a behaviour** -- fifth time in this account,
  after `blast0`, the 40 cm cube, `CLIPS.block` and `packOff`, and the tell is the same every
  time: the sentence is in the imperative and the line under it is doing something else. The
  old line is left in place with the correction on it rather than quietly edited, because the
  claim is what made this cost five builds.
  **AND `hide` MUST SPAN THE SWAP, WHICH IS NOT THE MIDDLE.** The swap lands at
  `(out + hold) / tot` = **.622**, so the window is skewed late by construction and must not be
  made symmetric -- [.32, .72] leaves 0.088 s after the swap before the new body is drawn.
  Widening `hide` is therefore not free at the top end and `fade[1]` is what has to move.
  **AND THE SHELL INFLATES OVER HIM (`MORPH.swell0`).** A weight ramp alone is a thing fading up
  in FRONT of a body; *"subsume and consume"* is a thing CLOSING over one. It rides `w`, so it
  cannot disagree with the fade, needs no window of its own, and is symmetric for free -- the
  far end is the blob shrinking onto the new body and being absorbed rather than switched off.
  `.94 -> 1.16`, and `pad` .035 means it encloses at every radius a body actually has even at
  the bottom of that range, so it can never end up inside him and occluded by his own depth.
- **AND A LOW-POLY LUMP IS NOT A SWIRL (m118, `MORPH.flow`, the resolution, `SPK.n`).** *"We
  just need to add more detail to the blob. It's just kind of like not a very particle or
  swirling blob, it's just very like low poly mesh."* Three separate things, and the first is
  the one that actually answers the word he used:
  **THE SURFACE FLOWS.** Two counter-winding helices -- three ribbons up one way and five down
  the other, interfering into a moving lattice -- for one `sin`/`cos` pair a fragment. A static
  surface with a rim and some contour lines on it is a mesh whatever its triangle count; what
  makes it a SWIRL is that what is on it moves.
  **AND IT IS WRITTEN AS `cos(k*theta - phase)` EXPANDED IN (cos, sin), NEVER FROM AN `atan`.**
  An angle has a seam at +/-pi and the ONE quad that straddles it interpolates the whole way
  back round: a bright band welded to the blob for ever, in one place, which is exactly the
  class of fault nothing in this container can see. A DIRECTION vector has no seam, and the
  Chebyshev form of cos(3t)/sin(3t) in its components is continuous by construction -- which is
  also why the harmonics have to be INTEGERS. Checked numerically rather than argued: the
  identity holds to 2.6e-15 over the whole circle and to 5.6e-16 across the seam quad itself.
  **AND ITS CLOCK IS RESET PER TRANSFORM.** `MPH.t` only ever grew, and a phase in the thousands
  is where a fragment float stops resolving one frame from the next -- a moving pattern that
  quietly stops moving after an hour of play. A transform is under a second.
  **THE MESH IS 30 x 36 RATHER THAN 20 x 24**, 2160 triangles in the same one draw call, because
  24 facets round a torso read as facets. **And `lines` is PINNED at 20** rather than tracking
  `rings`: how many contour rings there are is a LOOK and how many rows the hull has is a
  RESOLUTION, and moving both at once means neither can be judged.
  **AND `mphProf`'s PASS COUNTS ARE DERIVED FROM THE GRID, NOT TYPED.** A fill pass reaches one
  CELL, so at 36 segments four of them cover two thirds of the arc they used to and the gap
  between the legs stops closing -- a spike of nothing exactly where the silhouette matters.
  Derived rather than given its own constant, **because `npm run hull` lifts that text and reads
  `MORPH` by name**: a key it does not know about arrives `undefined`, the loop runs zero times,
  and the gate reports a broken profile on a profile that is fine.
  **AND `mphFill` TOOK THE SWELL AS AN OPTIONAL EIGHTH ARGUMENT** for the same reason -- hull
  calls it with seven and measures the SHAPE rather than the ramp, so it defaults to
  `MORPH.swell` and that harness is unchanged.
  **THE SWARM IS ROUGHLY TWICE AS DENSE AND THE MOTES ARE SMALLER**, because "particle" reads as
  many small things rather than few big ones: `every`/`rushEvery` .012/.010 -> .0055, `spkSize`
  .10 -> .075, `blowN` 26 -> 44. At m115's rates about 92 were alive round him at once, which is
  a drift; at these it is nearer 190, so `SPK.n` went 360 -> 560 -- a pool that recycles out
  from under every other effect on screen during a one-second transform is worse than a bigger
  buffer, and a `Points` buffer is nothing.
  **AND THE MOTES GET A SIGNED RADIAL DRIFT, WHICH IS NOT THE SPIN'S RULE.** One sign of SPIN is
  what makes a swirl rather than a scramble (m115) and it stands; mixed signs on the RADIUS are
  a different axis -- some motes closing while others open is the cloud CHURNING, where one sign
  there would be a shell breathing in and out together.
  **WHAT IS UNVERIFIED AND WHY:** there is no GPU in this container and nothing here can build a
  skin, so **whether any of it looks better is a device question** -- that is stated rather than
  dressed up, and it is the same gap m115 ended on. What CAN be checked here is arithmetic and
  was: the two windows, the swap falling inside `hide`, and the seam. `npm run hull` is the one
  tool that covers the higher-resolution profile and it was NOT run. `mel.MORPH.flow = 0` is the
  m115 shader exactly, and `swell0`, `fade`, `hide`, `rings`, `seg` and every rate are live.
- **THE WARRIOR WAS SQUARED UP THE WHOLE TIME AND THE REFERENCE BEARING WAS WRONG (m117,
  `npm run sim` case 14).** *"yeah run it"* -- and it came back `1 FAILED`, on a row that has
  been red since **m112** with nobody looking. Not a regression from m116: bisected across five
  commits, and the DNA gun is where it turns.
  **IT IS THE THIRD INVENTED PASS MARK IN THIS ONE CASE, AND THE COMMENT ABOVE IT ALREADY
  RECORDS THE OTHER TWO.** The facing was `|wrap(d.h - PI)|` -- his heading against a HARD-CODED
  pi, which is the bearing to the player only while he stands on the +Z axis he spawned on. He
  CIRCLES (m36), so he does not. m112 shifted the seeded stream, he drew a different `nerve`,
  ended the fight at **(0.24, 0.21)** rather than dead ahead, and a correct fight failed for a
  third distinct reason. Measured honestly against the bearing to the player:
      at the closest frame   pos (-0.25, -0.22)   h 49 deg   bearing to player 49 deg
      TRUE min off-bearing   **0.0 deg**  -- he was squared up, and the REFERENCE was wrong
  **A MINIMUM OVER A WINDOW DOES NOT RESCUE A WRONG REFERENCE**, which is what m40's fix here
  stopped at: it made the SAMPLING honest and left the thing being compared against alone.
  **AND THE BEARING IS NOT SAMPLED ON TOP OF THE PLAYER.** He reaches 0.00 m in this harness --
  the player is never stepped, so `pushBodies` (which moves the PLAYER, not the body) never runs
  and nothing shoves him off -- and at zero gap the reference is `atan2(0, 0)`, which is noise.
  `copFly`'s rule one system over: a direction recovered from geometry where the two things
  coincide is not a direction. Sampled from `axis` .25 m out.
  **VERIFIED BY BREAKING THE RULE IN A COPY**, which is the only thing that proves an assertion
  is an assertion: bend the approach's `faceTo` by 1.2 rad and the row reads **75 deg off** and
  fails. The fixed version is a gate, not a row that cannot go red.
  **AND THE 0.00 m IS A STATED GAP RATHER THAN A FAULT.** This case pins the player on purpose so
  the warrior's approach is measured against a fixed point, which is right for testing a BRAIN --
  in the game he stops around `hold` 1.7 m. The row asserts `< hitR` 1.9 and passes honestly
  either way.

- **HE TELEPORTED OFF YOUR BACK, AND THE NOTE ABOVE THE LINE CLAIMED HE DID NOT (m116,
  `packOff`).** *"When you tell him to go back to roam he just like teleports down to the ground.
  I want him to literally jump off your backpack."* Exactly what it did. `packOff` set
  `st = 'idle'` -- and `idle` is the BRAIN: `foeWander` ends in `foeMove`, which SNAPS `P.y` to
  the ground on the very next frame. So he was on your back and then he was standing on the
  road, in one frame, with no flight in between.
  **AND THE COMMENT SAID "A DROP, NOT A TELEPORT."** Fourth time in this account that a comment
  has described an intent the code does not have (after `blast0`, the 40 cm cube and `CLIPS.block`)
  -- and the tell each time is the same: the sentence is in the imperative and the line under it
  is doing something else. **A behaviour asserted only in a comment is not a behaviour.**
  **THE MACHINERY WAS ALREADY THERE AND IT IS THE HOP.** `'hop'` owns nothing but a velocity and
  hands the whole arc to `bodyFly`, so the fall, the wall bounce, the ground stop and the landing
  thump come with it; it sits ABOVE `foeWander` so nothing snaps him down; and it holds
  `clips.air` (`falling_idle`, which he has) while he is off the ground and lets go the moment he
  is not. What this adds is a velocity and the arithmetic to choose it.
  **THE APEX IS THE NUMBER AND `vy` FALLS OUT OF IT**, m21/m74's rule: `offApex` is how far he
  rises ABOVE the seat, so leaving is a PUSH off your back rather than a step off a kerb. The
  flight time is then solved for the whole arc down to the real ground under him -- not typed,
  because how high the seat is depends on how tall YOU are and what is under you can be a box
  top -- and the travel falls out of that, so he lands `offGap` away however high he started.
  `leapDrag` 0 on his table is what keeps that exact.
  **AND `hopT` IS LEFT ALONE.** That is the STUCK-hop's cooldown and this is not one of those;
  clearing it would let a body that jumped off also hop on the next frame it snagged.
  **THE SEAT IS STILL A GUESS AND THE EXPORT IS STILL THE ANSWER.** *"I should probably put a
  joint in for where he goes -- I wanted him to be kind of hanging onto your backpack."* m105
  wired exactly that and it needs no code change on the day it lands: name a joint matching
  `PACK.mark` in the PLAYER's skin and it IS the seat, with no offset applied at all (`_exact`).
  Until then `seat.up` came .30 -> .22 and `back` .17 -> .21, which is lower and further onto
  his back -- a nudge to a number nothing in the file can measure, and said as one.

- **A SMOOTH GLOWING LUMP IS THE THING THAT READS AS NOTHING (m115).** *"I still would just love
  like a better particle effect. It just doesn't look that great -- I just wanna do a few passes
  to make the transition look way cooler."* m113 and m114 were both about the SHAPE being right,
  and the shape being right is not the same as the effect being good. What it had was one colour,
  one smooth surface, one population of particles all doing the same thing, and **no moment in
  it** -- a continuous ramp from nothing to nothing.
  **THE BEAM IS THE BIGGEST SINGLE THING.** One pass up the body across the whole effect, with a
  DIFFERENT COLOUR behind it from in front -- deep violet ahead, green behind -- so the shot
  literally travels across him turning one man into the other. It is the same `u` the wrap runs
  on, so the beam and the shape change are one event rather than two.
  **AND THE CONTOUR RINGS SAY WHAT THE THING IS MADE OF.** Thin bright rings at the hull's OWN
  slice spacing (`uLines` takes `MORPH.rings`), so it reads as something constructed out of
  measurements rather than as a blob. That is the honest picture as well as the better one.
  **THREE SPARK POPULATIONS, BECAUSE ONE IS A DRIFT.** Motes hang about him throughout, STREAKS
  rush IN over the first half, EMBERS blow OUT at the swap -- and the only new idea underneath
  all three is **`rv`, a rate on a follower's own radius**. `spark.rad` had been computed and
  never read since m39; a radius that can close is what turns an orbit into a GATHER, which is
  the one thing a transformation effect cannot do without. **`rv` defaults to 0, so every caller
  before this one is byte-for-byte the orbit it always had**, and it stays one pool and one
  draw call.
  **IT CONVERGES ON A FLOOR RATHER THAN THROUGH ZERO**, or a spark rushing in turns round and
  comes back out the far side, which reads as a bug and not as a gather.
  **AND THE RUSH IS THE FIRST HALF ONLY.** Past the swap there is nothing left to gather, and
  streaks still closing on a body that has already changed read as the effect running on.
  **THE SWAP IS THE ONE BEAT IN HERE, SO IT IS WHERE ALL THE PUNCTUATION GOES** -- the sound, a
  lens knock (`camShake`, m99's), a shockwave ring on the floor, the embers and the old burst,
  four things on one frame. **A ground ring is what gives an event a place and a size**, and it
  is its OWN mesh rather than `markRing`, which belongs to the guard lock: one owner per object.
  **AND IT OUTLIVES THE TRANSFORM**, so it is stepped from the frame loop rather than from
  `stepMorph`, which has returned by then.
  `SPK.n` went 260 -> 360, because three populations over 0.9 s would otherwise recycle the
  pool out from under every other effect on screen.
  **WHAT IS STILL UNVERIFIED IS EVERYTHING THAT MATTERS HERE**, and it is worth saying plainly:
  there is no GPU in this container, so no tool in this repo can say whether any of it looks
  good. `npm run hull` says the SHAPE is a body; nothing says the picture is worth watching.
  **THE ANSWER TO THAT IS NOT A WORKER** (see m114) -- it is a headless Chromium, which is
  installed here and which has a Worker of its own, so draco and the whole game just run. That
  is the thing to build the next time a look has to be judged more than once.

- **A LATHE IS A BODY OF REVOLUTION AND A PERSON IS NOT (m114, `npm run hull`).** *"It's sort of
  just like random, it doesn't look great. We could probably fake it better."* He is right and
  the cause is structural rather than a matter of taste: m113 measured ONE radius per height
  band, so a shoulder became a BARREL and both ends of the wrap were a lumpy pillar rather than
  the two people. **A body of revolution pins the widest sector of a row to its narrowest at
  exactly 1.00, by construction** -- which is a number, and it is the one the tool now prints.
  **THE SAME MEASUREMENT PASS GIVES A 2D FIELD FOR NOTHING.** Bucket by ANGLE as well as height
  and what comes out is a star-shaped hull -- arms out to the sides are two spikes at +/-90
  rather than a drum. Measured through the shipped `mphProf` over a synthetic body:
      ARM ROW   widest sector at **270 deg**, where the arms are, ratio **3.81**
      LEG ROW   ratio 1.99 -- two legs and the air between them, not a post
      the lathe 1.00 at every row, and the widest sector wherever the loop happened to start
  **AND THE RAW MAX IS ONE STRAY VERTEX PER SECTOR** -- an antenna, a fingertip, a hair chain --
  so the field is hole-filled from whatever neighbours have geometry and then smoothed, wrapping
  in angle and clamped in height. A hull built off raw maxima is spiky in exactly the way that
  reads as noise rather than as a body, which was the other half of "random".
  **THE WOBBLE WAS THE REST OF IT.** .17 at about 1 Hz on an 18-row lathe is a boil, and a boil
  on a shape whose whole job is to be recognisable IS the word he used. .07, and low frequency
  in both axes, so it breathes.
  **AND IT HAS TO BE TURNED WITH HIM NOW**, which a lathe never did: an arm is at an ANGLE, so
  the profile is measured with the skin's own `faceOff` baked in (one canonical frame for every
  body) and the blob carries `drawnYaw - faceOff`.
  **THE NORMAL COMES OFF THE GRID** -- the two tangents along the row and the column, crossed --
  rather than the lathe's closed form. The material is double sided and the rim reads `abs(dot)`,
  so which way round it comes out cannot show; what WOULD show is the zero at the poles, where
  the row tangent is nothing, and that is the one case guarded.
  **`npm run hull` IS THE GATE AND IT NEEDS NO ASSET AND NO GPU, WHICH IS THE WHOLE POINT.**
  Every character GLB is draco and `DRACOLoader` decodes on a Worker built from a Blob URL,
  which node has not got -- **but the question here is not about the export.** It is whether the
  measurement, the hole fill, the smoothing and the wrap turn a cloud of vertices into a
  recognisable silhouette, and a SYNTHETIC body answers that exactly and in 80 ms. It lifts the
  shipped text between the `PROF:` markers and reads `MORPH` out of `index.html`, because a tool
  with its own copy of the rule is this account's oldest mistake.
  **VERIFIED BY PUTTING THE LATHE BACK IN A COPY** -- `widest at 0 deg, ratio 1.00`, three rows
  red -- which is the only thing that proves a gate is a gate.
  **AND NO, A WORKER IS NOT THE ANSWER TO THE DECODE EITHER.** Shredworld already solved it a
  better way: decompress the GLB ONCE offline with gltf-transform and serve the plain copy in
  its place -- same geometry, same names, same graph, and no Worker to fake. Worth doing the day
  a measurement on the REAL mesh would settle something; it would not have settled this, and it
  cannot settle how anything looks, because there is no GPU here either.

- **TWO SKINS HAVE NO CORRESPONDENCE TO INTERPOLATE, BUT THEIR SILHOUETTES DO (m113, `mphProf`,

  `mphMesh`, `mphFill`, `mphBlob`).** *"Some sort of blob that makes the transition look like the
  collider actually transforming to each other -- a proxy mesh that morphs and wraps from one mesh
  to the other, and some weird kind of particle effect swirling and glowing around it. Not super
  long, but something so it's not just like a jump."*
  **A REAL VERTEX MORPH IS NOT AVAILABLE HERE AND NEVER WILL BE**, which is the whole reason m112
  was a model SWAP: two characters share no topology, no vertex count and no skeleton, so there is
  no pair of vertices to lerp between. **What every body DOES have, and has the same number of, is
  a RADIUS PER HEIGHT BAND** -- so the blob is a hull of `rings` x `seg` cells whose radii travel from one
  body's field to the other's, and at its two ends it genuinely IS the two shapes.
  **AND THE PROFILE IS MEASURED OFF THE MESH, NOT AUTHORED.** GLTFLoader binds every skin with the
  IDENTITY matrix, so at rest a skinned vertex's GEOMETRY position is its position in the model's
  own space -- the same fact `measureHeight` is built on, and what makes a silhouette readable at
  runtime with no tool and nothing typed. Once per kind, cached on the skin beside its clips, and
  a re-export at any size lands right because the model's own scale is what it is multiplied by.
  **THE BODY IS NOT DRAWN WHILE THE BLOB HAS IT (`MORPH.hide`), AND THAT IS THE FIX.** m112 drew
  one body and then the other with a white flash over the seam -- and **a flash over a cut is
  still a cut**, which is his sentence exactly. Hidden through the middle, the only thing on
  screen at the swap is a shape travelling from one silhouette to the other.
  **`visible = false` RATHER THAN A FADE**, because a transparent skin sorts against itself (m30,
  m31) and because it costs nothing: no program recompile, no sorting, no second path. It is set
  in ONE place and restored in one (`mphBlobOff`, plus the outgoing model at the swap) -- **a skin
  left invisible is a skin that is invisible the next time it is worn**, and every exit goes
  through there.
  **ONE `u` ACROSS THE WHOLE THING, so the blob runs continuously THROUGH the swap** rather than
  restarting at it. The phases still own the white tint; `u` owns everything drawn, and the
  windows are its own fractions rather than being tied to a phase boundary:
      fade .30-.70   the blob at full weight, ramped either side
      hide .27-.73   the body not drawn -- **and this line CLAIMED it was strictly inside the
                     blob's own full window and it was the exact inverse. See m118.**
      wrap .14-.86   the silhouette travelling, so it is settled on the right shape at both ends
      the swap lands at u .62, by which point the blob is 74% of the way to the new body
  **A FRESNEL RIM IS WHAT MAKES A SILHOUETTE READ AS A VOLUME.** Flat, an additive lathe is a
  green cut-out of a man; hot at the grazing angle it has an inside. 21 rows x 24 segments is 504
  vertices and 960 triangles, rebuilt each frame, in **one draw call**.
  **THE SWIRL IS THE EXISTING SPARK POOL**, one more draw call and no second system: m39's
  `follow` so the sparks ride him rather than being left behind, and **ONE SIGN of spin, because
  a random sign per spark is a scramble and not a swirl.** `spk` gained an optional 11th argument
  for that; absent, it is the random tumble every impact has always had, so no caller moved.
  **AND THEY ARE EMITTED AROUND `rig.root`, NOT AROUND `player.pos`.** `spk` stores the offset
  against the root it is handed, and `stepMorph` runs BEFORE `rig.root.position.copy(player.pos)`
  -- so taking the centre from the root is what makes the offset exactly the one intended, and
  `stepSparks` then draws them at the current position with no lag at all.
  **THE RATE RIDES THE WEIGHT**, so the swirl thickens into the wrap and thins out of it -- the
  jetpack's own rule (`JET.every`), that a run of particles coming faster is a machine winding up.
  **AND THE TIMING BARELY MOVED, because he said "not super long".** .42/.10/.40 -> .34/.22/.34,
  which is 0.92 s to **0.90 s** -- what changed is that the middle is now long enough for a wrap
  to happen in rather than being a seam.
  **WHAT IS UNVERIFIED AND WHY:** every character GLB is draco and `DRACOLoader` wants a Worker,
  so **nothing in this container can build a skin** -- the profile has never been measured off a
  real mesh outside a browser, and whether the blob reads as a morph, whether `swell` 1.18 plainly
  encloses him, and whether the boil reads as weird or as broken are device questions. The gates
  cover the throw class and nothing else here can. `mel.MORPH.blob = 0` is the one word back to
  m112, and `swell` / `pad` / `wob` / `rim` / `fade` / `hide` / `wrap` / `spin` / `every` are
  all live.
- **THE DNA GUN, AND THE TRANSFORM IS A MODEL SWAP INSIDE `rig.root` (m112, `MORPH`, `morphGo`,
  `mphWear`, `morphAnim`).** *"The alien has some sort of DNA gun -- you shoot one of the NPCs and
  the character transforms into them. How about we do a third gun mode which is the DNA thing. We
  don't have all of the animations for the player that we do for the NPCs, so if you transform
  into them you could only do basic locomotion, you wouldn't be holding a gun any more -- but
  since those characters have walk and idle and run we could just try it. My original thought was
  sculpting a single base mesh around every character so it's a literal mesh transform, but we
  could just cheat it: the character mesh glows and turns white, then you blend them, and it turns
  from white to the new character's colour. Just as a test, and then a little button to transform
  back."*
  **NEARLY ALL OF IT WAS ALREADY BUILT, AND THAT IS `d.K`'S DIVIDEND FOR THE NINTH TIME.** `rig`
  is the player's DRAWN BODY and nothing more -- a model, a mixer, an action table, a clip table,
  a damped weight table, a bone map, a facing offset and a mount map. Every one of those is a
  FIELD, so wearing somebody else is repointing them at a clone of that kind's proto and putting
  his own set aside in `rig.base`. **`stepPlayer`, the collider, the camera, the heading, the
  bolts and the whole of the physics never learn it happened.** The kinds already carry a measured
  proto; `bodyProto` stashing it on `K.P` is the one line that made it reachable, and a proto that
  exists only as a local inside a builder is a proto nothing else can reach.
  **AND THE THIRD MODE IS WHAT m52 SAID IT WOULD BE.** *"A third mode is a row in that table and
  the arc simply divides three ways."* One row in `WEAP.modes`, one `dnaNow()` beside `autoNow()`,
  and the arc row, the lit segment, the hint and the hysteresis all came with it.
  **THE SAMPLE ROUND IS NOT A WEAPON, WHICH IS WHY IT BRANCHES RATHER THAN TAKING A FLAG.** It
  never goes through `dummyHit` at all: no cone, no power, no damage, no blast, no knock-down, no
  `d.cool`. `dnaCatch` is the nearest body it can actually be WORN as, and nothing else in the
  game reads it -- threading a "this one does nothing" flag through six arguments of the weapon
  path would be one function pretending to be two.
  **WHO CAN BE SAMPLED IS STRUCTURAL, NOT A LIST.** A body you can wear has to stand, walk and run,
  because those three ARE the morphed gait -- so `dnaOK` is `K.clips.idle && walk && run` and the
  officer (an idle and nothing else) is refused by what he IS rather than by name. `stripPoses`'
  own rule, one table over. Everybody else on the street qualifies.
  **HE IS DRAWN AT THE KIND'S OWN HEIGHT, AND THE GAIT REFERENCES ARE THE ARGUMENT.** A disguise
  that stands a head shorter than the men it is a disguise for is not one -- and `K.walkRef` /
  `K.runRef` are how fast the planted foot slides AT THAT KIND'S OWN SCALE (m52), so drawing him
  at `K.h` is what lets the clips be played at their own numbers with nothing re-derived.
  **THE COLLIDER DOES NOT FOLLOW**: `p.r`, `p.hh`, `MOVE.step` and every speed stay his, because
  changing a body's size mid-game is m52's whole build and this is a test. **One term does have
  to follow, and it is the camera's look point** -- `CAM.look` is chest height on HIM, which on a
  1.78 m drunk is the man's waist and frames him low. `MORPH.tall = 0` draws him at his own height
  for the A/B.
  **AND THE GAIT IS THE HONEST LIMIT, STATED RATHER THAN HIDDEN.** `K.runRef` on a drunk is 1.8 to
  2.0 m/s and the player sprints at 7.2, so past a run the clip clamps at that kind's own `tsHi`
  and the feet slide. That is *"you could only do like basic locomotion"* said as a number. The
  fix is a faster clip or a slower disguise and neither is this build.
  **THE FLASH IS AN EMISSIVE RAMP AND THE SWAP HAPPENS AT THE TOP OF IT**, which is his cheat
  exactly: the body you are TAKING OFF goes white, the mesh is exchanged while nothing is
  readable, and the new one comes up out of the white. Both halves matter -- whiten only the
  arrival and what you see is one body vanishing and another appearing.
  **A 1x1 WHITE TEXTURE RATHER THAN `emissiveMap = null`.** `USE_EMISSIVEMAP` is a #define, so
  swapping a map for NOTHING is a program compile and link in the middle of the one second the
  effect is on screen; texture to texture is not. Every material's own colour, emissive, map and
  intensity are stashed on it the first time it is tinted and put back exactly, so a body that has
  been worn is byte-for-byte what it was afterwards -- which is what lets it be worn again.
  **AND THE WORN SKIN'S MATERIALS ARE ITS OWN.** `skeletonClone` SHARES them, so without the clone
  the flash would whiten every copy of that kind standing in the street -- m39's `bodyFlash`
  lesson, one body over.
  **THE SKIN IS BUILT WHEN THE SHOT LANDS AND KEPT ON THE KIND.** A transform that clones a mesh,
  a skeleton and a mixer on the frame it fires is a hitch on exactly the frame something is
  happening, and wearing the same man twice is the common case.
  **AND THE SWAP SEEDS THE NEW SKIN AT ITS IDLE.** `skinWeights` damps in over `.055`, so a fresh
  `cw` leaves every bone at a total weight of nothing for a frame or two -- which is the mixer
  blending back to BIND, **which is the T-pose exactly**. It is masked by the white, and a flash
  of T-pose is not a thing to leave to luck.
  **`stepMorph` RUNS ABOVE `rigAnim` FOR THE SAME REASON.** Run after it, the frame's weights are
  set on the body that has just been taken off and the new one spends a frame at zero.
  **AND `rigAnim` NEEDED ONE EARLY RETURN, NOT A BRANCH PER STATE.** Every clip name below that
  line is zap's, and a table naming none of the actions a borrowed skin has takes `skinWeights`'
  own T-pose escape hatch **and lands in the thing it exists to prevent** -- because the fallback
  is `CLIPS.idle`, which this skin has never heard of either. `morphAnim` builds its table out of
  the KIND's clips and passes the KIND's idle as the fallback, which closes that hole completely.
  **THE VERBS ARE OFF BECAUSE THERE ARE NO CLIPS FOR THEM, NOT BECAUSE THE STATES WOULD BREAK.**
  A strike, a roll, a dash, a slam, a backflip, wall cover and a ledge hang all end in a pose a
  borrowed skin has not got, which is a body sliding about in its walk cycle. `mphOn()` is the one
  predicate all of them read, and `stepKit` is a single early return that CLEARS rather than skips
  -- a thumb that was on the pad when the shot landed must not arrive still armed.
  **AND HE LETS GO OF THE WALL**, through `wallDrop`/`ledgeDrop` rather than by clearing the
  fields, because those two states have their own exits and a pinned man in a walk pose is the one
  thing this cannot leave behind.
  **THE FOOTSTEPS FOLLOW THE BODY.** `STEP.clip` is `{ d, r }` per band (m68), so the morph carries
  its own measured pair and `strideNow` works the distance out at the speed he is going -- without
  it the feet are a drunk's and the sound is zap's stride.
  **AND THE SEAT BONE IS INVALIDATED.** `PACK._b` is looked up once and cached, which is right and
  is exactly what a swapped model breaks -- a stale one is Clancy riding a bone that is no longer
  in the scene.
  **THE WAY BACK IS A GESTURE THAT ALREADY EXISTS.** *"A little button to transform back."* The
  left pad's tap is already "change what you are carrying", the kit is forced to bare hands for the
  whole disguise, so there is nothing to cycle to -- and the weapon label says `tap left pad ·
  revert`, which is the prompt drawn on the control that performs it. `actB`'s rule, and it is what
  stops a re-used gesture being a hidden mode.
  **AND THE `zap` SAMPLE IS FINALLY THE SOUND OF THE THING IT IS A RECORDING OF.** m27 took it off
  the blaster as a duplicate and it has been loaded and unused since; an electrical sample beam is
  what it always was.
  **WHAT IS UNVERIFIED AND WHY:** every character GLB here is draco and `DRACOLoader` wants a
  Worker, so **nothing in this container can build a skin** -- whether the white reads as a
  transform, whether a drunk's walk at 7 m/s reads as a slide or as a bug, and whether a 1.78 m
  body on a 1.25 m collider reads wrong are all device questions. The chip is what answers the
  first half of any report: `DNA HICK SKINNY` is who he is wearing and `DNAOUT0.21` is the flash
  running, because "the shot did nothing", "it fired and he never changed" and "he changed into the
  wrong one" are three bugs and one picture from a phone. `mel.dna('hobo')` wears the nearest
  matching kind with no shot fired, `mel.dna()` puts him back, and `mel.MORPH` is live.
  **NOT DONE, AND EACH FOR A REASON:** nobody REACTS to the disguise -- *"when the game is fully
  built you're in a human city and you're an alien, so if people see you they get afraid of you,
  if cops see you they shoot at you, but if you transform into one of them they don't think
  anything of it"* -- and that is `foeTarget`'s own aggro rule rather than a rider on this. There
  is no sample-and-return, no DNA the gun HOLDS and no menu of what you have collected; the shot
  transforms you on the spot, which is his *"we don't need to get so detailed with that whole
  thing"*. And the literal mesh transform wants the one base mesh he described, which is an ASSET
  decision: the moment every character shares a topology, this same swap becomes a morph-target
  blend with `mphWear` doing the same job.
- **THE SWAP IS TWO EVENTS NOW, AND BOTH CROSSINGS ARE MEASURED (m111, `SWAP.hide`/`SWAP.show`).**
  *"The weapon switches before he looks like the first weapon goes into the backpack -- his arm
  reaches into the backpack and then comes back to rest out of it. The weapon needs to switch like
  halfway through, or the first one needs to go away when he goes into the backpack and the second
  one needs to come."*
  **HIS SECOND SENTENCE IS THE BETTER DESIGN AND IT IS WHAT SHIPPED.** "Switch halfway" is ONE
  event -- a weapon visibly turning into another weapon, at a better moment. Two crossings mean
  **you never see a weapon change at all**: one goes away behind his back, his hands are empty in
  the bag, and a different one comes out. m91 wrote `SWAP.at` as a single fraction and said out
  loud that **.48 was a guess** (*"a strike has an authored contact frame to measure against and a
  reach does not"*); this is that guess replaced by a measurement, and the fraction was never the
  thing that was wrong.
  **THE BAG IS WHERE THE MOUNT GOES BEHIND HIM, AND THAT IS READABLE OFF THE SAMPLERS.** Forward
  kinematics over `weapon_swap`'s real tracks, reading `weapon_root_right` in the HIPS' frame --
  animation samplers are never draco compressed, so the clip is measurable here even though the
  mesh is not:
      u .00 .. .31   the hand swings up and FORWARD, mount z +5 -> +17
      u .313         it crosses BEHIND the plane of his hips          <- `hide`
      u .508         deepest, z -12.5 -- the hand is over his shoulder, in the bag
      u .576         it comes back out in front                       <- `show`
      u .58 .. 1.0   presented out in front at z +24, then down to rest
  **AND `.48` WAS ALREADY INSIDE THAT WINDOW**, at 0.408 s of a 0.85 s state -- which is why
  *"almost immediately"* could not be reproduced by reading the code, and that is stated rather
  than dressed up as a found bug. What a single event at mid-reach looks like is the weapon
  changing in a fist that is out of sight, so the NEXT thing you see is the new one already in
  hand; the first one never visibly went anywhere. Two crossings are what fixes that whether or
  not the old number was late.
  **REVERSED, THE CROSSINGS MIRROR *AND EXCHANGE ROLES*.** A stow plays the clip backwards (m96),
  so the hand ENTERS the bag at `1 - show` and LEAVES it at `1 - hide`. Mirroring one and not the
  other, or mirroring both without swapping them, puts the hide AFTER the show -- which is a
  weapon that appears and then vanishes.
  **AND `swapStop` HAS TO CLEAR `p.swapHid` BEFORE `applySlot`, OR A CANCELLED SWAP STRANDS HIM
  EMPTY-HANDED FOR EVER.** Five things cancel a reach (`meleeGo`, `rollGo`, `slamGo`, `wallGo`, the
  knock-down) and every one of them still DELIVERS the slot -- m91's own rule, that an input given
  must not be lost to a collision -- so the one new way to get it wrong is to deliver a slot whose
  model is still hidden. `paintKit` reads the flag, so clearing it first is the whole fix.
  **THE HANDS-EMPTY WINDOW IS 0.223 s AT `dur` .85**, about six frames at 30 fps. That is the dial
  if two events still read as one: widening it means lengthening `dur`, which is the beat of the
  whole reach and is deliberately NOT moved here, so this build changes one variable.
  `mel.SWAP.hide = 0; mel.SWAP.show = .48` is m110 exactly.
- **THE STREETS ARE THE LAYOUT, AND THEY ARE PAINT (m110, `STREET`, `buildStreets`).** *"Yes I
  think you should try to build some procedural streets, I'll make some more buildings and we
  can populate it."* What he needs first is the ARMATURE -- where a road runs and where a
  building can stand -- so the whole generator is two lists of centrelines and one rule.
  **A PLOT IS A ROAD GRID'S ONLY REAL OBJECT.** The slab drawn for each plot is the plot
  INFLATED by the pavement, so the carriageway is simply the gap between slabs: a junction
  needs no case of its own and the corners fall out of the arithmetic rather than being built.
  Four merged meshes, **4 draw calls and 520 triangles for the whole city**, whatever the grid
  grows to.
  **THE TEST SITE IS THE PLAZA.** `skip` leaves one plot unpainted, and the white floor, both
  grid helpers, the fourteen boxes, the ledge stack, the motorcycle ring and every body spawn
  are inside it, untouched. It gets a 2.5 m RIM rather than a slab, so the four roads round it
  have a kerb to stop against and nothing underneath is buried.
  **AND IT IS FLAT ON PURPOSE -- A RAISED KERB WOULD EAT EVERY CHARGED SHOT.** The obvious
  build is a 15 cm pavement pushed into `BOXES`, and `BOXES` is not only the collider: the BOLT
  dies on it too, through `camHit(b.pos.x, b.pos.y, b.pos.z, WEAP.boltR)`. A full charge ball
  is 1.9 m across and leaves a muzzle under a metre up aimed at a point on the GROUND, so it is
  under `0.15 + boltR` for its whole flight -- **every charged shot fired over a pavement would
  detonate on the frame it left the barrel.** A kerb is not a wall, which is the same sentence
  `wallFind` and `ledgeFind` already say (*"a kerb is cover for nobody"*, *"a kerb is not a
  ledge"*), and `camHit` is the one place that has never been told. **Give it a minimum height
  and the relief -- kerbs, lamps, crossings -- becomes a build**; until then the street is a
  PICTURE, the collider is untouched, and nothing here had to be checked against nine other
  systems. That is also why there are no lamp posts: a post is either in `BOXES` (and stops
  bolts across the whole map, and offers wall cover behind an 18 cm pole) or it is not (and he
  walks through it), and both answers want the `camHit` change first.
  **CHECKED AS RECTANGLES, NEVER PLACED BY EYE** (m60's rule): every slab and all sixteen
  carriageway strips against the fourteen boxes, the building's plan, the tower's, the bike's
  ring and all nineteen body spawns plus the spawn point -- **0 overlaps, tightest clearance
  5.00 m** (the road at x=-52 against the motorcycle's ring). Plots come out 36 x 36 at the
  corners and 84 x 36 / 36 x 80 on the sides; his building is 20.9 m across, so the smallest
  plot holds one with 7.5 m of pavement either side.
  **THE Z-RUNNING ROADS RUN THE WHOLE LENGTH AND THE X-RUNNING ONES ARE CUT AT EACH JUNCTION.**
  Drawing both full length puts two quads at the same height on the same square metre at every
  crossing, which is a z-fight; cutting one family is a loop bound and nothing else. **And the
  four coats are 12 mm apart rather than 3**, because these are 36 m quads and a depth buffer a
  hundred metres out does not separate three millimetres.
  **`mel.streets(0)` takes the whole layout away and `mel.STREET` is live**, so where the grid
  sits is a thing to move on the phone rather than a thing to push.

- **AND HIS STREETS KIT CANNOT BE ASSEMBLED FROM THIS SIDE, WHICH IS A FACT ABOUT THE FILE AND
  NOT ABOUT THE IDEA (m110).** `models/streets/modular_streets_kit.glb` was read before a line
  was written: **321 nodes, 198,528 triangles, 2 materials, 2 images** (`modularkit`, a 1401 KB
  WebP; the second is 0 KB and belongs to a plain grey material used by exactly ONE primitive),
  draco + `EXT_texture_webp` + specular + ior, 0 skins, 0 animations, and both materials
  `doubleSided: true` -- which has to be forced to `FrontSide` the day anything loads it, the
  standing rule for every generated asset here.
  **IT IS A CATALOGUE, NOT A SCENE.** The one primitive on the grey material is `Rectangle001`,
  a 132 x 208 m flat plane -- a BACKDROP -- and 244 pieces are laid out on it in a regular
  field, 69% of a 190 x 210 m area occupied. In one corner (x -90..-32, z 125..175) sit 75
  pieces assembled into something, with geometry up to 20 m above the road plane.
  **AND EVERY HANDLE FOR TELLING ONE PIECE FROM ANOTHER IS MISSING:**
      names      all 321 are `modular kit00` .. `modular kit320`. Nothing semantic at all.
      UVs        `TEXCOORD_0` accessors carry no min/max (draco), so which patch of the atlas
                 a piece samples -- the one honest way to tell tarmac from brick -- is unreadable
      geometry   draco, and nothing in this container can decode a mesh
      shapes     263 DISTINCT footprints. The road-plane family is not a tile set: it is big
                 irregular slabs 7 to 26 m across in GRADED SERIES (0.18 x 6.03, 0.32 x 6.34,
                 0.48 x 6.63 ... 1.90 x 7.99), which is a swept curve discretised, not a grid
  So all I have per piece is an axis-aligned bounding box and a triangle count, and **a kerb, a
  bench, a wall and a road slab are the same box from here.** Any layout built on that is
  placing art by eye, which is the one thing this account's rules say over and over not to do.
  **WHAT WOULD MAKE IT USABLE, cheapest first:** name the pieces by kind in the export (`road_*`,
  `kerb_*`, `lamp_*` -- `weapFit`'s rule, a named thing IS the placement); or export the
  assembled corner on its own as one GLB, which drops in as a prop with nothing guessed; or
  export a handful of SQUARE tiles on one module size, which tiles with no classification at
  all. Until one of those, m110's grid is generated geometry and the kit is in `bump.mjs`'s
  `DIRS` waiting (**eighth time** that tax has been paid).

- **THE BIKE IN THE GROUND AND THE RIDER AT "PROPER HEIGHT" ARE ONE ARITHMETIC ERROR, TWICE
  (m109, `motoLow`, `stepRide`'s drop).** *"He rides the motorcycle but the motorcycle is in the
  ground. He has proper height but the motorcycle doesn't."*
  **BOTH HALVES ARE A ROOT BEING TREATED AS A FLOOR, AND EACH ONE HID THE OTHER.** Measured off
  the two files:
      the bike   its root is the AXLE, 0.138 authored above the lowest geometry -> **0.279 m**
                 scaled, and `stepMoto` put that root ON the ground -- so the tyres were buried
                 a quarter of a metre and **the seat, and therefore the rider, went down with
                 them**. That is exactly why a sunken bike read as a rider at the right height:
                 he was correctly seated on a seat that was underground.
      the rider  `driving_idle` sits his hips **0.373 m** above his own root (0.608 standing,
                 and all three driving clips agree to four decimals), and `stepRide` wrote the
                 ROOT to the seat -- so he stood in the air 37 cm over it.
  Together those nearly cancel in the PICTURE and not in the world, which is the whole reason
  the report named only one of them. **`buildShip`'s rule one vehicle over: sit a model on its
  own measured bounds, never on its node origin.** Seat 0.652 m above the ground now, his hips
  on it, his lowest foot at 0.381 -- a Fat Boy's peg is 0.30 to 0.38.
  **AND THE OFFSET IS READ OFF THE POSED SKELETON RATHER THAN TYPED.** It is a property of
  whichever driving clip is up, so it follows a re-export AND follows the blend -- and reading it
  a frame late is EXACT, because the offset is a fact about the POSE and does not move with the
  position it is measured against. **The bike's own marker is called `mixamorig_hips`**: he put a
  HIPS where the rider's hips go, so hips-to-hips is the export saying what to do rather than
  this code having an opinion, which is `weapFit`'s rule.
  **A BOUNDING BOX IS NOT A SHAPE, AND THAT IS WHY `motoLow` TAKES A HULL.** Upright the box's
  lowest corner IS the lowest vertex, so 0.279 is exact -- but rolled onto its side the lowest
  CORNER is empty air beside the wheel at bar width, and a bike resting on it hovers. The convex
  hull of the real (x, y) is a dozen points, exact at every roll, and computed once at load.
  So **upright and on its side are ONE formula** rather than two numbers to keep in step.
- **A RIDERLESS MOTORCYCLE RIDES A LITTLE AND THEN FALLS OVER (m109, `MOTO.st`).** *"And the
  motorcycle drives without him even when I shoot him off. It should ride a little and then fall
  over."* It did: `stepMoto` drove the ring on its own clock and had never heard of the rider.
      ride -> coast -> fall -> down -> rise -> ride
  **THE WHOLE MACHINE TURNS ON ONE READ, AND IT IS READ OFF THE MAN.** `manned` is
  `rider.st === 'ride'`, and `dummyBlow` already takes him out of that state when he is shot --
  so being blasted off, knocked down, fleeing and coming back are ONE fact with nothing to keep
  in step and no flag for a future blow to forget to clear. `d.K`'s own dividend, one vehicle over.
  **AND IT COASTS ALONG THE RING, NOT OFF DOWN THE TANGENT.** That is not a detail: the m107
  circle is the only path here swept clear of fourteen boxes, two buildings and every body, so a
  bike that leaves it is a bike that can come to rest **inside** something -- the m24 lesson,
  where nothing on screen disagrees with anything and the player simply cannot walk there.
  **THE STEER ANGLE IS UNCHANGED BY THE COAST, WHICH IS THE ARITHMETIC AGREEING WITH ITSELF.**
  `delta = atan(L*w/v)` with `w = v/r` reduces to `atan(L/r)` -- independent of speed, which is
  what a fixed-radius corner actually demands. So the bars hold their 6.5 degrees as it slows,
  and the wheels alone wind down.
  **IT GOES OVER INTO THE CORNER IT WAS ALREADY LEANING INTO**, the sign READ off the lean rather
  than typed -- which is what a bike running out of speed mid-turn does -- and the topple is the
  SAME `roll` the lean is, so the height cannot disagree with the picture and an interrupted rise
  cannot jump.
- **AND HE GOES BACK FOR IT (m109, `motoSeek`).** *"Then he should go try to find it again."*
  It runs in the same line as `stepRide` and ABOVE the brain, `stepPack`'s own rule: a man walking
  back to his own bike has no roam, no fight and nothing to be separated from. **`d.ride` is what
  makes it HIS** -- set at build, survives being shot off -- so nothing has to be remembered
  anywhere else and no second body can take it.
  **AND `d.fleeT` IS WHY HE DOES NOT TURN ROUND MID-PANIC.** m38's pacifist runs when he is hit,
  so a biker blasted off his bike flees FIRST and collects it afterwards, which is the order that
  reads. One clause rather than a state.
  **THE PICK-UP IS A STAND-IN AND IS MARKED AS ONE.** *"I don't have him picking it up animation
  but I'll make one eventually."* So it rights itself over `riseDur` with him aboard from the
  first frame -- name a clip and `motoSeek`'s board branch is the one line it goes on, which is
  `CLIPS.block`'s pattern. Until then he sits upright while the hull rolls up under him for 0.9 s.
  **AND `buildMoto` CALLS `stepMoto(0)` BEFORE `buildBikers` EXISTS**, so on that one frame there
  is no rider and the coast would be entered from a standing start and never left. The clause
  that closes it -- a coasting bike with somebody on it drives again -- is also the real case of
  getting back onto a bike still rolling, which is why it is a transition rather than a guard.
  **THE CHIP CARRIES THE STATE** (`MOTO12` riding, else `MOTOcoast` / `fall` / `down` / `rise`),
  because *"it never fell over"*, *"it fell and he never went back for it"* and *"he got there and
  it did not come up"* are three bugs and one picture from a phone.
  **WHAT IS UNVERIFIED AND WHY:** the motorcycle is draco and nothing in this container can decode
  a mesh or build a skin, so the HULL has never been computed outside a browser -- what is checked
  here is that at roll 0 it provably equals the bounding-box minimum, which is the 0.279 m that
  answers his report. Whether 77 degrees reads as fallen, whether 0.9 s of self-righting reads as
  a man picking a bike up, and whether the coast is the right length are device questions.
  `mel.MOTO.on = 0` parks the whole thing and `mel.MOTO.st` is live.

- **I CLAIMED HIS `run_fwd` WAS AUTHORED BACKWARDS AND IT IS NOT (m108).** *"What are you
  talking about, I just checked the file, it looks normal."* He is right, and the fault is that
  **I asked a measurement a question it was never fitted to answer.**
  `npm run gait`'s `travel` column derives its bearing by SUMMING the raw per-frame displacement
  over every frame where the toe sits in the lower half of its range -- which on a run is the
  stance phase plus most of the swing, and the swing travels forward fast. **That is the exact
  net-displacement-over-low-frames measure a control had already killed one hour earlier**, on
  zap's own `run_fwd`, and I wrote that lesson down and then quoted a second tool doing the same
  arithmetic. The SPEED beside it is a median over frames within 60 degrees of that bearing and
  is sound; the speed is the only thing that column was fitted for.
  **AND "BOTH FEET AGREEING" WAS A MISREADING OF THE FLAG.** `spread` compares `per[0]` against
  `per[1]` -- the two feet's SPEEDS. The two DIRECTIONS are summed into a single bearing and
  never compared to each other, so there is no direction agreement check in that tool at all. I
  cited the absence of a flag as corroboration for the one thing the flag says nothing about.
  **THE TELL WAS IN THE SAME ROW I READ THE CLAIM OFF.** 5 and 6 stance frames of 18, against
  zap's 8/9 and the hick's 8/8 -- the fewest of any run clip in the repo, so the most float, so
  the least reliable sum. **A derived quantity with fewer samples behind it than every control
  is not a finding**, and the control that disagrees with it is the one to believe.
  So `run` and `flee` name `run_fwd` with its own measured reference (1.694 authored, **3.43 m/s**
  at his x2.026) and he runs at 2.8 and flees at 3.2 -- a little under the reference, because he
  is heavy, which puts the clip at ts .82 rather than scrambling it.
  **AND THE LESSON IS NOT "THAT TOOL IS BAD".** It is that a column fitted for one quantity can
  print a second one beside it that nothing ever validated -- `travel` was added at m35 to tell a
  strafe from a backpedal, where the stance phase dominates and it works. **Ask what a column was
  fitted to answer before quoting it about something else.**

- **AND THE FILES WERE IN THE REPO THE WHOLE TIME -- MY CLONE WAS STALE (m107).** `git log` showed
  only my own three commits and `ls models/` had no biker and no bike, which is m80's *"the file is
  somewhere else"* and m58's *"four of his five pushes never left his machine"* wearing one face.
  It was neither: `git fetch` brought down `e3d365c added fat biker 02` and `7dbd65a added vehicles
  folder and motorcycle`, both sitting on `origin/main`. **`git log` answers a question about the
  LOCAL clone**, and after a push of my own the local head is exactly as far behind as it was
  before. Fetch before concluding a file never arrived.

- **THE LEDGE HOP WAS THE ONE STATE THAT ENTERED A `ONCE` CLIP WITHOUT `playOnce` (m106).**
  *"When you're hanging on the side of a ledge and you push left or right it plays the side hop
  animation only once -- it doesn't do it for every movement. It needs to be segmented, so when
  you push over to the side he hops over to the side to match the animation, and it goes once,
  some distance over per animation."*
  **THE MECHANIC WAS ALREADY DISCRETE AND THE ANIMATION WAS NOT.** m102 built the shimmy as one
  hop per press on purpose (*"the shimmy is DISCRETE here, because the clips are HOPS"*), and
  the state machine really does fire a fresh hop on every frame the thumb is still held. What
  did not happen is the CLIP: both hops are in `ONCE` and **nothing in the file ever called
  `playOnce` for them** -- the weight table merely named one, and `skinWeights` rewinds an action
  only once its damped weight has decayed. So the first hop played, the second arrived with the
  action still PAUSED on its last frame, and he slid sideways holding that pose. **This file's
  oldest landmine, written down twice, in the one state that entered a one-shot without the
  function written for it** -- `wallGo` does it correctly one surface down, which is what makes
  this an omission rather than a design.
  **AND THE DURATION WAS TYPED WITH NO REFERENCE TO THE EXPORT.** Measured off the samplers:
      ledge_hang_hop_left   1.542 s   hips XZ **0.000** -- in place; the CODE drives the travel
      ledge_hang_hop_right  1.708 s   hips XZ  0.000     y range 21.5 / 23.5 armature units,
                                                         which is 0.30 m of real vertical arc:
                                                         he pulls up, moves, and drops back on
      ledge_hang_to_get_up_over_ledge  1.208 s   ledge_hang_to_jump_away 1.333 s
  `hopDur` .50 played those at **x3.08 and x3.42** -- a blur with no pose in it, and two
  DIFFERENT blurs, because one number cannot fit two clips. The duration is the clip's own over
  `hopRate`, which is **1.75 = `MELEE.rate`**: m95 fitted that to the band this file already
  judges a one-shot readable at, over clips of exactly this length. 0.88 s and 0.98 s.
  **AND THE DISTANCE GOES UP WITH THE TIME, or matching the clip just halves his traversal.**
  `hop` .85 -> 1.05 of `SZ` is 0.75 m, about six tenths of his own height -- *"a little bit over
  to the side"* -- and it keeps him crossing a ledge at 0.85 m/s against m102's intended 1.21,
  with every hop now a whole animation.
  **AND TWO MORE CLIPS WERE PLAYING AT 1.0 IN STATES THAT ARE NOT THEIR LENGTH.** m102's own note
  says the mantle *"is the 1.208 s clip compressed to (x1.55)"* and **nothing ever set a rate**,
  so it ran at 1.0 over a 0.78 s state and **the last 0.43 s of the climb was never shown** --
  the m8 landmine, live and written up as though it had been done. The push-off is the same:
  1.333 s over `awayDur` .55, so 41% of it. Both are compressed where the state is entered.
  **A NOTE THAT DESCRIBES A RATE IS NOT A RATE**, which is this file's own sentence about a
  comment describing an intent the code does not have, for the fourth time.

- **THE CHARGED DASH WAS THE ONE STRIKE IN THE FILE THAT NEVER STORED ITS OWN BEARING (m105,
  `chargeRelease`).** *"Sometimes I'll have my weapon out and I'll swing at them, I'll launch and
  hit them, and they go off like to the side -- the trajectory doesn't look right, it feels like
  they should go the direction of my body vector."*
  **m97 FIXED THIS AND THIS FUNCTION WAS NOT IN THE FIX.** `strikeSweep` launches along `p.melH`,
  and `meleeGo` and `kickGo` both write it beside `p.faceH`; `chargeRelease` writes `p.faceH`,
  `p.heading` and `p.camWant` and **not `p.melH`** -- so a charged dash launched its man along
  whatever bearing the LAST ORDINARY PUNCH was thrown at, and that value is never cleared, so it
  is stale for the rest of the session after the first flick. Aimed at one man, launched toward
  another, every time.
  **IT IS THE m97 BUG WEARING ITS OTHER FACE.** There the bearing was RECOVERED FROM GEOMETRY
  (the limb's instantaneous delta, which at the contact frame is mostly tangential); here it was
  simply NOT STORED, and both come out as *"they go off to the side"*. **When a direction is
  already decided, store it where it is decided** -- `p.melH` is written on the same line as
  `p.faceH` in all three places now, so the lens, his nose and the launch are one answer rather
  than three that can disagree.
  **AND THE SLAM IS CORRECTLY NOT THIS.** `slamLand` throws each man radially OUTWARD from where
  it landed, which is one bearing PER BODY -- a single `melH` would be the wrong answer for it.

- **THE LUNGE WAS FEEDING THE TACKLE GATE, AND THE FINISHER ALONE ARMED IT (m105, `p.runT`).**
  *"I'll just be swiping melee melee melee and then all of a sudden he launches past the
  character quite a distance... it's almost like when there's a guy in front of you he only goes
  a short distance, which I like, but then if you melee and it doesn't clock that there's a guy
  in his trajectory it launches far."* His reading of the symptom is exactly right and the cause
  is one line:
      if (p.grounded && p.speed > MELEE.slideAt) p.runT += dt; else p.runT = 0;
  **`stepMelee` REWRITES THE VELOCITY FROM `melV` EVERY FRAME**, so a strike's own lunge is
  counted here as running. Tabled against the shipped constants, time spent over `slideAt` 4.2
  against a `slideT` of .45:
      link 1  lunge 7.0  beat .62  free travel 3.15 m   over 4.2 for 0.42 s   no
      link 2        6.5       .68               3.20            0.44          no
      link 3        9.0       .82               4.60            **0.61 s**    **YES**
  **So throwing the finisher was by itself enough to arm the tackle** -- and a three-punch chain
  ENDS on the finisher, so the very next fresh flick after any completed chain was a slide.
  Against a locked jab at a man 2 m off (1.25 m of travel) a 6.20 m free tackle is **five times**
  the distance, which is his "two or three times" if anything understated.
  **AND IT IS WHY HE COULD NOT SEE A PATTERN**: nothing about the second flick is different --
  the difference was made by the strike BEFORE it.
  **THE GATE MEANS "DID HE ARRIVE AT THIS FLICK RUNNING", AND A MAN ARRIVING OUT OF HIS OWN LAST
  PUNCH IS NOT RUNNING, HE IS FIGHTING.** So the clock does not tick while a move owns the body
  (`p.melee || p.chargeGo || p.roll`). **HELD, NOT CLEARED**: a man genuinely sprinting who
  throws one punch on the way in still has his run time when it ends, and between strikes in a
  standing fight he is under 4.2 anyway so it resets by itself.
  **THIS IS `p.rHold` ONE REPO OVER** -- a shared quantity accumulated in a state where it does
  not mean what its name says. m88 wrote the gate, m97 fixed the DISTANCE half of the same
  complaint and explicitly left the trigger; this is the trigger.
  **THE DISTANCES ARE UNTOUCHED, DELIBERATELY.** With the trigger honest, a tackle only happens
  when he really did run at somebody, which is when a long slide is wanted -- and moving two
  variables at once means neither can be judged. `mel.MELEE.slideT` is the dial.

- **A BLOCK IS NOT A HIT, AND IT WAS PLAYING THE SOUND OF BEING ONE (m105, `BLOCK.ping`).**
  *"When we do a block animation it needs to make a different noise than the noise that it makes
  when you're hit -- so like the clang or clink or something, like a parry noise."* `playerHurt`
  ends with `snd('thud')` unconditionally, and `thud` is `box_break_01` -- **HIS being hit**. So a
  guarded blow played the hit sound with the block's own ring under it, which is m27's duplicate
  with the two halves describing different events.
      guard    the ring alone, `fxRing * .6` -- steel absorbing it
      deflect  the ring at full, plus `metal_ping_01` on top -- turned aside
  **THE PING IS PLAYED FROM ITS OWN PEAK (`cut`)**, which is what makes a bright short file read
  as an ARRIVAL rather than as a swell -- m59's mechanism, and `HCHG.snd`'s own trick one event
  over. Two layers and one event, which is m64's argument: the ring is what the blow lands ON.
  **AND THE RED FLASH GOES WITH THE DAMAGE, NOT WITH THE CONTACT.** A deflect is `cutHard` 0, so
  flashing the screen told him he was hurt when he was not. A partial guard still costs him a
  quarter and still flashes.

- **CLANCY FLOATS BECAUSE NOTHING IN THE FILE KNOWS WHERE HIS BACK IS (m105, `PACK.mark`).**
  *"I'm wondering if it would be helpful for me to put in a root or a joint where Clancy should
  go, because he just sort of looks like he's standing floating slightly above the backpack. I
  want him to be holding onto the backpack, and I need to put in a custom animation for him."*
  **BOTH HALVES ARE HIS AND BOTH ARE THE RIGHT CALL**, and the code is written to take each the
  moment it exists rather than waiting for a build.
  **THE SEAT.** m104 found the spine by pattern and hung him off it by two fractions of
  `RIG.height` -- which is the honest answer when there is no marker, and is a GUESS by
  construction: nothing about the geometry of a backpack is in this file. `PACK.mark` is tried
  first, and **a named joint IS the placement: no offset, no rotation, nothing typed.** That is
  `weapFit`'s rule, and it is why the weapon mounts needed no code change when his export grew
  them. **It has to be IN THE SKIN to arrive as a Bone** -- `buildRig` collects `o.isBone`, which
  is what GLTFLoader makes of a node a skin lists as a joint -- so exporting it the way he
  exported `weapon_root` is the whole of it.
  **THE POSE.** `stand_to_cover` is a stand-in and it is exactly why he reads as standing: it is
  a man taking COVER, not a man holding on. `PACK.clips.ride` is an ordered list now and the
  first name the body actually has wins, so drawing one and calling it `pack_ride` needs no code
  change -- `CLIPS.block`'s pattern and `BAR.mark`'s.
  **AND THE CHIP SAYS WHICH SEAT IT IS USING.** `· PACK` is the joint and `· PACK?` is the guess,
  because *"he floats above the backpack"* and *"the joint never arrived"* are one picture from a
  phone. Silent about it once the joint is there, `rollREC`'s rule.

- **THE GUARD ARMED PERFECTLY AND HE WAS FACING THE WRONG WAY (m103, `findLock`'s guard hold).**
  *"When I'm blocking and the Warriors hit me it doesn't block their attack -- I think I'm still
  just getting hit. And you should be able to block in any of the three modes: disarmed, with the
  weapon or with the blaster."*
  **THE SECOND HALF WAS ALREADY TRUE AND THE FIRST WAS NOT THE BLOCK.** Driven through the shipped
  `stepKit`, `p.block` arms on a down-hold in **all three slots** (m37 never gated it on one and
  m39's `bare` handling covers the unarmed pose), and `playerHurt`'s tiers fire correctly against a
  blow from dead ahead. What the probe found instead, against a REAL warrior over 25 s with the
  guard held the whole time:
      block=1 on every blow, and **off 2.30 and 2.67 radians** -- 132 and 153 degrees off
      so `BLOCK.arc` 1.25 could never once apply, and every mace landed in full
  **THE CONE IS MEASURED OFF `cam.az` AND THE GUARD THUMB CANNOT MOVE THE CAMERA.** Acquiring
  inside 45 degrees of 12 o'clock is his own spec and is right; KEEPING it there is not, because
  `foePlan` circles -- and the right pad is held DOWN, so there is no way to turn the lens after
  him. The man leaves the cone, the lock drops, `faceTgt` falls back to a frozen `cam.az`, and the
  guard is pointed at nothing while he is hit from behind.
  **SO THE GUARD LOCK IS A COMMITMENT: in range and on his feet, he stays yours.** Nothing steals
  him, so there is nothing to flicker -- and it is what *"it locks on them and then you can kind of
  rotate around them"* asks for literally. The cost is that you cannot switch targets without
  letting go of the guard; that is the trade rather than an oversight.
  **AND A BLOCKED BLOW WAS KNOCKING THE GUARD OFF, WHICH IS THE FIX BREAKING ITSELF.** The shove
  branch ran `if (p.grounded && !p.knock) { p.vel.y = up; p.grounded = false; }` -- and a guard
  sets `up` to ZERO, so it took his feet off the floor with no velocity to show for it. The
  guard's own `busy` reads that as airborne: `p.block` to 0, `p.lock` with it, and the NEXT swing
  arrived with him facing wherever the frozen camera pointed. One clause (`up > 0`), and the probe
  reads the difference exactly:
      before the commitment   guard held, 3 parried and the 4th full at off 2.30
      commitment only         3 parried, the 4th full at off 3.07 with `lock=n`
      and with `up > 0`       **7 swings, 7 parried, off 0.00 on every one**
      no guard, same fight    3 swings, 3 full hits, 12 damage each
- **THE MACE REACHED A METRE OF THIN AIR AND ARRIVED 108 ms LATE (m103, `FOE.swingAt`, `hitR`).**
  *"He did this uppercut swing and the swing didn't hit me, but then when he brought his bat back
  down to rest, then it hit me -- it just looked wrong, the swing needs to hit me."* Both halves
  are real, both were numbers nobody had ever measured, and forward kinematics over the real
  samplers answers both in a second (the tip is `weapon_root` + its own local (0, 0, 36.1845), the
  pair `npm run rig` already reads; 120 samples per clip):
      horizontal  tip furthest forward **u 0.39**, **1.64 m** from the root   peak speed u 0.41
      downward                          u 0.38      1.64                      u 0.38
      backhand                          u 0.34      1.48                      u 0.33
      360_low                           u 0.40      1.44                      u 0.40
  **THE BLOW FIRED AT u 0.45**, which on a 1.35 s beat is up to 108 ms after the arc had gone
  past -- his sentence exactly. **AND `hitR` 2.6 plus your own .24 is a hit out to 2.84 m** against
  a tip that gets to 1.64, with `reach` 2.0 as the distance he stops at to throw it: **the mace
  stopped a third of a metre short of you on every swing and connected anyway.** That is the m56
  phantom one body over -- a number that was never taken off the model.
  `swingAt` **.37**, `hitR` **1.9**, and `reach`/`hold` down to 1.45/1.7 with it, because
  `foePlan` clamps both inside `hitR` and **a distance he cannot attack from is not a distance to
  stand at**. He fights from about a metre now, which is what a mace fight is.
- **THE BOLT DIED ON THE SIDEKICK (m103, `WEAP.palThru`).** *"We'll keep it so that the blaster
  still shoots Clancy, but instead of the bullet stopping -- that's the biggest hangup. He still
  goes flying, he gets zapped, whatever, but it doesn't stop the bullet."* The flight test kills
  the bolt on whoever it catches, and the one body in this game you did not aim at is the one
  walking in front of you. **It is the BOLT that changes, not the blow**: he goes through the same
  `dummyHit` as everybody, and what he stops doing is ENDING the shot. `d.cool` is what makes that
  safe with no second test -- he is skipped for the rest of the flight, so one round cannot hit him
  twice on the way past -- and he does not spend `b.onMan` either, or the impact bank, the ring and
  the blast budget would all be spent on somebody the shot was never for.
- **THE KNOCK-DOWN GOES FLATTER AND FURTHER (m103, `HURT.hi`, `HURT.back`).** *"I want when I go
  flying in the air to go in the direction they hit me, and I wanna go kind of horizontal."* The
  DIRECTION was already his -- `dirH` is the way the blow travels and the launch has been built on
  it since m67 -- so what was missing is the SHAPE: 1.60 m of apex against 8.7 m of travel is 5:1,
  which is a lob. **And it cannot be bought by lowering the apex**, because the hang time is what
  the fall clip's rate is solved against (m96): at an apex of 1.0 the flight is 0.63 s and the rate
  wants x2.51 at k 1 and **x2.95 at the bottom of `vary`**, which runs off `rateMax` and puts the
  pose back where m96 found it. So the apex comes down a little and `back` does the work:
      k .85   vy 6.25   apex 0.98 m   air 0.62 s    9.0 m   clip x2.54
      k 1.0   vy 7.35   apex 1.35     air 0.74     12.1 m   clip x2.16
      k 1.20  vy 8.82   apex 1.94     air 0.88     17.1 m   clip x1.80
  Nine to one rather than five, every rate still inside the band, and the hang untouched.
- **`npm run sim` HAD BEEN DYING AT CASE 13 SINCE m52, AND EVERYTHING BELOW IT WAS UNRUN (m103).**
  The charged-dash case set `p.slot = 3` from when rapid fire was its own slot; m52 made it a MODE
  and the roster came down to three, so `slotNow()` returned `undefined` and the next `stepKit`
  threw `Cannot read properties of undefined (reading 'aim')`. **A crash is not a red row** --
  nothing reports it and the output simply stops, so eight whole cases have been invisible for
  fifty builds. The slot is FOUND now (`WEAP.slots.findIndex(s => s.charge)`), in all six places
  that typed it.
  **AND IT WAS HIDING TWO SHIPPED BUGS, WHICH IS WHAT A SUITE IS FOR:**
  1. **`FOE` HAD TWO KEYS CALLED `knock` AND THE LAST ONE WON.** `knock: 4.2` is how hard a blow
     SHOVES a warrior (m37/m71); m91 added `knock: 1` forty lines below it for the chance his mace
     puts YOU on the floor. A duplicate key in an object literal is silent in every gate there is,
     and **every blow on a warrior has shoved him at 1 rather than 4.2 since m91**: a fist reads
     0.45 m/s and 0.18 m where m71 sized it at 1.89 and 0.86 -- back under the threshold of being
     an effect, which is the whole of what m71 was about. It is `hitKnock` now.
  2. **AND `chargeRelease` THREW THE HOLD AWAY BEFORE ASKING WHAT IT WAS WORTH.** `p.chargeT` is
     zeroed four lines above the `chargeAim()` call, and that function defaults to reading it --
     so since m51 every charged hammer swing has been aimed and solved at `chg01` **0**: `want`
     5.75 m whatever the thumb did, and `acq` with it. Measured through the shipped function, a
     FULL hold and a HALF hold both read `goGap 5.75, melV 36.31` -- identical to the hundredth,
     with `chargeGoK` correctly 1.000 against .725 beside them, which is the tell. `chargeAim(t0)`.
     After: 11.00 m full, 8.38 half, and a man inside the reach sets the distance.
  **AND FIVE ROWS WERE ASSERTING RULES THE GAME NO LONGER HAS**, every one of them a build that
  changed a rule and could not change its case because the case was unreachable: the step-up asked
  for the 0.40 m box that stopped being walkable at m57 (`MOVE.step` is `.5 * SZ` and came down to
  0.357 with him); two dash rows asked for m43's "goes through him" that m51 deliberately replaced;
  two aim rows asked for m48's .34 dead zone that m50 deliberately narrowed to .20. **When a rule
  changes, its case changes in the same commit** is the sentence at the top of that very block.
  **`reset()` ALSO CARRIED STATE BETWEEN CASES.** The solid-boxes case drives him into a tower with
  the stick held INTO it, which is exactly how `wallGo` latches -- and nothing let go, so the roll
  and the lunge cases were measuring a man in wall cover and reported the previous case's position
  to the centimetre. It clears the wall, the ledge, the knock-down, the guard and the slot now.
  **AND ONE ROW WAS A COIN FLIP ON A SEEDED STREAM.** "He blocks and circles too" reads ONE body,
  and `foeRoll` gives each his own `guard` out of `.22 x [.4, 1.5]` -- so about one man in four
  never guards across a fight, and the row passed only while the seed happened to land right. It
  measures four bodies now, which is what the seeded harness was for: **the spread, not the draw.**
  `npm run sim` is green end to end for the first time since m52.
- **THE LEDGE, AND m89 HAD ALREADY BUILT HALF OF IT (m102, `LEDGE`, `ledgeFind`, `stepLedge`).**
  *"I do want to build the ledge system, hangs on the ledge and get up, and maybe I'll design
  buildings in a way where they always have levels so you can jump, hang, climb up, jump, hang,
  climb up to get up to higher levels."*
  **m88 NAMED THE MISSING PIECE AND m89 SHIPPED IT WITHOUT SAYING SO.** *"Both need something this
  game has never had -- a test for is there a wall/lip near me, and which way does it face."*
  `wallFind` IS that test: the closest point on a box's FOOTPRINT gives the distance to the face
  AND its outward normal in one `clamp` per axis, right whichever side he comes at, and returning
  nothing when he is INSIDE the footprint -- which is exactly what stops him grabbing the roof he
  is standing on. m89's own note says the ledge build wanted that function and that is why the
  wall went first. **So what is actually new here is a HEIGHT TEST and a MANTLE.**
  **A LEDGE IS FOUND, NEVER AUTHORED.** It is the TOP EDGE of the same box, so every roof,
  parapet and setback in `BOXES` is climbable the moment it is placed -- which is what makes
  *"design buildings with levels"* a thing he does in the world builder rather than a second list
  to keep in step. The rails' and the bars' rule, one repo over.
  **AND WHERE HE HANGS IS MEASURED OFF THE CLIP, NOT TYPED.** Walked forward through the real rig
  in `zap.glb` -- each bone's animated rotation where the clip keys one, its rest transform where
  it does not -- and read at `mixamorig_Left/RightHand`:
      ledge_hang_idle   2.375 s   hands **1.076 m above the root**, **0.212 m in front of it**,
                                  hips 0.578, head 0.922, toes 0.415 (he is TUCKED) -- and it
                                  HOLDS: identical to a millimetre at t 0.00 and t 1.20
      ledge_hang_to_get_up_over_ledge  1.208 s, hips XZ **0.000** -- IN PLACE, mantle included
      ledge_hang_to_jump_away 1.333   ledge_hang_hop_left/right 1.54 / 1.71
  **THE TWO PLACEMENT NUMBERS ARE FRACTIONS OF `RIG.height`**, so they survive a re-export at any
  authored size and another change to how tall he is; only a change to the POSE moves them, which
  is the one thing that should. And **the catch band is centred on the SAME offset**, because the
  question is not "how high is the wall" but "is the lip where his hands are" -- so the placement
  number IS the acquire number and the two cannot drift.
  **AND THE HANDS MEASURE TO LOCAL +Z, SO THIS CLIP CARRIES NO HALF TURN.** The wall-cover clip
  does (m99), and that one fact is the whole reason the hop's sign comes out the OPPOSITE way
  round: facing `-n` his right is `(nz, -nx)`, so the tangent `(-nz, nx)` the move is taken along
  is his **LEFT** here and his RIGHT on the wall. Two surfaces, two answers, one derivation each
  -- and this file gets handedness backwards about half the time when it argues instead.
  **THE CONTROLS ARE THE WALL'S, DELIBERATELY.** Left pad is the BODY on both surfaces: into it
  climbs, away lets go (harder than into, with the same grace clock), sideways hops, and the
  right pad's tap jumps off. A man who has learnt cover has learnt this. **And the CATCH has no
  gesture at all** -- he is airborne, his hands are level with an edge, he takes it. Catching one
  while RISING is deliberate: jumping at a fire escape and being caught on the way up is the move.
  **THE SHIMMY IS DISCRETE HERE, WHICH IS THE ONE PLACE IT DOES NOT COPY THE WALL** -- because
  `ledge_hang_hop_left/right` are HOPS and the wall's are a slide. The clips decide.
  **UP FIRST, THEN IN.** Lerping straight to the mantle target drags him diagonally THROUGH the
  parapet he is climbing over, which is not a mantle. And the target's height is ASKED
  (`groundAt`) rather than assumed to be the lip, because a mantle onto a stack lands on whichever
  box is highest.
  **HEADROOM IS CHECKED BEFORE THE GRAB, NOT AFTER.** A lip with a wall on top of it is a lip he
  would climb INTO, and there is no graceful way out of that once he is committed.
  **AND IF HE IS GOING TO CLEAR IT, HE LANDS ON IT.** A lip is always at least half a metre above
  his feet (the band is centred on his HANDS), so nothing would have stopped the catch firing at
  the bottom of a jump onto a 1.15 m box -- turning a step-up that has always worked into a hang,
  which is m74's 40 cm cube pointed the other way. Whether this jump clears it is KNOWABLE rather
  than a threshold: the apex from here against the lip, plus `clears` so a jump that only just
  makes it is not a coin toss.
  **THIS IS THE ONE PLACE IT IS CALLED, AND THAT IS THE THING TO CHECK FIRST IF IT EVER DOES
  NOTHING.** Shredworld spent a whole build on a ledge grab that was correct and reachable only by
  being hit by a car, because `ledgeGrab` was called from the knock-down integrator and nowhere
  else. This sits in the ordinary air path, above the gait, where a man who has jumped passes.
  **AND THE TEST SITE GETS SOMETHING TO CLIMB**, because a ledge system shipped with nothing in
  the world to catch is a system he cannot judge. Four levels three metres apart, spiralling round
  a 12 x 12 m block at (20..32, -25..-13). **Three metres is not a taste number, it is what one
  plain jump reaches:**
      from  0.0 -> lip  3.0   hands sweep  1.08.. 3.89   lip band  2.45.. 3.55   CATCH
      from  3.0 -> lip  6.0                4.08.. 6.89             5.45.. 6.55   CATCH
      from  6.0 -> lip  9.0                7.08.. 9.89             8.45.. 9.55   CATCH
      from  9.0 -> lip 12.0               10.08..12.89            11.45..12.55   CATCH
  The double jump and the backflip are needed for NONE of it, which is the point: the ordinary
  jump is the climb. **Checked as rectangles** (m60's rule) against all ten boxes, both buildings
  and all seventeen body spawns; nearest corner 24 m from the spawn.
  **WHAT IS UNVERIFIED AND WHY:** nothing in this container has a GPU or can pose a skin at
  runtime, so whether his hands actually sit on the lip, whether the mantle reads and whether the
  hop lands where the clip says are device questions. The arithmetic -- the hand offsets, the
  reach table, the clearances -- is above and was measured. `mel.LEDGE` is live and
  `mel.LEDGE.on = 0` takes the whole thing off.
- **AND HE WAS STANDING TOO FAR OFF THE WALL (m102, `WALL.stand`).** *"The leaning on the wall
  system is fine but he is a little bit far away from the wall."* Measured rather than eyeballed:
  that number is his CENTRE's clearance ON TOP of his own radius, so what he is looking at is the
  gap behind his back.
      stand .30 * SZ = .214   centre .457 off the face  ->  **21 cm of air behind him**
      stand .09 * SZ = .064   centre .307               ->  **6 cm**, which is a man leaning
  It cannot go much under that: `p.r` is .243, so a standoff inside his own radius is a man whose
  collider is in the brick -- harmless while `stepWall` owns him, and `resolveBoxes` shoves him
  back out on the first frame after he lets go, but not a thing to lean on.

- **THE GUARD TOOK THE LOCK BACK, AND EVERY LINE OF IT WAS ALREADY BUILT (m101, `LOCK.block`,
  `findLock`).** *"I think we used to have the lock where once you pushed forward it would lock on
  them and you would basically be rotating around them. We're gonna use the block as that -- if
  somebody is within 45 degrees of your 12 o'clock and you press and hold down on the right stick,
  it sort of locks on them and then you can kind of rotate around them."*
  **HE IS REMEMBERING m20, AND IT HAS BEEN SITTING INTACT AND SWITCHED OFF SINCE m36.**
  `findLock`, `lockH`, `stickLocked`'s orbit, `faceTgt` reading `p.lock`, `stepCam`'s come-round
  and the acquire chirp are all there; **m36's own note is why** -- *"nothing is deleted, which is
  what makes this a decision rather than a rewrite."* So this build is a SECOND SWITCH and a
  second cone, not a second system, and it is the first time that sentence has actually been
  collected on.
  **AND THE REASON IT WAS TURNED OFF DOES NOT REACH THE GUARD.** m36: *"a mark that moves where
  you are POINTING takes the aim off your thumb, so you stop aiming."* **A guard has no aim to
  take.** This moves his BODY and the LENS and nothing else, which is m51's own line -- he has
  turned down two assists that moved his AIM and kept the one that only moves his BODY -- and the
  melee lunge is the third thing on the keep side of it. `LOCK.on` (the blaster's) and
  `LOCK.block` are two switches and must stay two.
  **THE ORBIT IS `stickLocked` AND IT NEEDED NOTHING.** *"You can kind of rotate around them."*
  That function reads the left stick in the TARGET's frame -- up and down close or open the range,
  left and right run along the tangent, and because the tangent is recomputed every frame a
  straight step along it IS a circle. `MOVE.blockSp` 2.4 caps him, so it is a circling shuffle
  rather than a sprint round a post.
  **45 DEGREES IS HIS NUMBER AND IT IS FOUR TIMES THE BLASTER'S ON PURPOSE.** `LOCK.cone` is .19
  (11 deg) because m20/m27 sized it for what a BULLET must deliver; `blockCone` .79 only has to
  notice who is in front of you. `blockRange` 10 rather than 24: a mace reaches 2.6 m, and a lock
  on a man across the street swings the lens off the fight you are in.
  **AND A MAN ON THE FLOOR IS NOT SOMETHING TO GUARD AGAINST** -- `palFoe`'s rule (m75) one state
  over, on the GUARD path only. A downed man is still a perfectly good thing to shoot, so the aim
  lock must not gain it.
- **AND IT ACTUALLY BLOCKS NOW -- WHICH IS A SECOND ARC, NOT A BIGGER NUMBER (m101,
  `BLOCK.perfect`, `blockFx`).** *"We need to make the block actually block and deflect or parry
  or whatever... and if they swing it blocks, and we have an animation for block react."*
  **THE REACT HAS PLAYED SINCE m95** (`HURT.hits` is `weapon_block_reaction`, and with `FOE.knock`
  at 1 a raised guard is the only way to reach it), so that half was already true. What was
  missing is that a guard cost him a flat quarter of the blow from ANYWHERE inside 72 degrees --
  **there was nothing to do well and nothing to do badly.**
      perfect .55   31 deg either side -- DEFLECTED, and it costs nothing
      arc    1.25   72 either side -- the partial guard it has always been
      outside       not blocked at all, exactly as before
  **SO THE LOCK DOES NOT MAKE THE BLOCK STRONGER; IT MAKES IT POSSIBLE TO KEEP IT POINTED.**
  `faceTgt` reads `p.lock` and comes round at `LOCK.face` 9, so a locked guard sits at about zero
  off and parries by construction, while an unlocked one is steered by the left stick and is luck.
  **That is an assist paying in the one currency this file trusts** -- a thing you were going to do
  anyway, done reliably -- rather than in a damage multiplier nobody can see.
  **AND A BLOCK THAT MAKES NO NOISE IS A NUMBER.** `blockFx` puts the contact in front of his
  chest, back down the blow (`dirH` is the direction the blow TRAVELS, so the man who threw it is
  at `dirH + PI`), as a spark burst plus **m64's ring layer** -- which is what a blow lands ON, and
  here it lands on a raised guard, the most literal reading that layer has ever had. A deflect is
  hotter, louder and knocks the lens; **only a deflect knocks it**, because a shake on every
  guarded blow is a shake on most of a fight and m99's own note is that it has to read as ONE
  thump.
  **AND THE RING UNDER HIS FEET IS m51's, BORROWED.** A lock you cannot see is a lock you cannot
  trust, and `markRing` is already the right idiom: a mark ON a man is a lock you stop playing
  around, one on the FLOOR under him is a fact about the world. Steady rather than breathing --
  there is nothing filling, so a closing ring would be drawing a number that does not exist.
  **THE CHIP SAYS `PARRY` OR `BLOCK`**, because *"it didn't block"* and *"it blocked and I still
  took it"* are the two bugs this build could have, and `· LOCK` above says whether it had anybody.
- **AND THE GUARD HAD BEEN RUNNING ON THE NARROW CAMERA DEAD ZONE SINCE m37 (m101).** m48's
  argument is about the residual x a HELD thumb carries, and that is the same whichever way it is
  held -- so a block has been drifting the lens at up to 45 deg/s under a thumb asking for nothing.
  It matters now the guard LOCKS, because the drift fights the come-round and the two settle at
  `drift / LOCK.cam` of permanent error:
      x .30 residual, dead .06     ->  0.71 rad/s  ->  the lock parks **17 deg** off his nose
                      deadAim .12  ->  0.53        ->  **12.7 deg**
  Both hold (`blockCone` is 45 and `perfect` 31), so this is steadiness rather than a fix for
  something broken -- but 17 degrees of permanent lean is half the parry window.
  **WHAT IS UNVERIFIED AND WHY:** nothing in this container has a GPU or can build a skin, so
  whether 45 degrees is too eager, whether the orbit reads as circling him, and whether the parry
  spark reads as a deflect are device questions. `mel.LOCK.block = 0` is the one word back to m100,
  `mel.BLOCK.perfect = 0` turns the deflect off alone, and `mel.MARK.on = 0` drops the ring.

- **THE PUSH GETS ITS OWN RATE, AND m97 STRETCHED THE ONE SEGMENT NOBODY WANTED STRETCHED
  (m100, `AIR.pushRate`, `flipAirRate`).** *"Once you release the backflip it like slows, you're
  just like on the ground for a bit -- the portion from being down released to then jumping is too
  long. Are we able to speed up just a segment of it so that he jumps sooner after release?"*
  **ONE RATE WAS FITTED TO THE WHOLE CLIP, SO SLOWING THE AIR SLOWED THE LEGS WITH IT.** m92 found
  that `backflip` spends **0.333 s PUSHING on the floor** after its crouch and held him down for
  it, which was right; m97 then fitted the rate to the hang, and because that rate divides the
  push as well, **the bigger the jump the longer he stood there before it**:
      charge 0.00   air rate 0.965   push 0.333 / 0.965 = **0.345 s** on the floor after the lift
      charge 0.50             0.788                      0.423
      charge 1.00             0.682                      **0.488 s**
  m97 wrote that up as a feature -- *"a deeper crouch for a bigger jump"* -- and named the second
  rate as the thing it was avoiding. **Half a second between the thumb leaving the pad and the
  body leaving the floor is not a crouch, it is latency you can feel**, which is the one thing
  `SLAM.hang` gets to spend and a release does not.
  **THE DELAY IS WHAT HAS TO BE CONSTANT, WHICH IS WHY IT IS AN ABSOLUTE RATE AND NOT A
  MULTIPLIER.** The thumb is judging the gap between its own lift and the jump, and that gap
  should not be a function of how long it was held. Every charge now leaves the ground **0.151 s**
  after the release and **the air rate is untouched at m97's own numbers**, so the rotation still
  fills the trip exactly as it did -- one variable moved.
  **IT MAY ONLY EVER SPEED THE PUSH UP** (`max(airRate, pushRate)`): on a short hang the air rate
  is already over 1, and a typed 2.2 there would be the fix RE-BREAKING the case it is here for,
  one sign over. A clip with no wind-up (`front_flip`, `off` 0.000) has no push to speed up and
  keeps one rate end to end, with no case of its own.
  **AND THE SPLIT THAT LOOKS HONEST IS THE ONE m97 ALREADY REJECTED.** Fitting the air SEGMENT
  (`air - off`, 0.792 s of clip) to the hang gives 0.792 / 1.649 = **0.48x**, which is the slow
  motion that note turned down. So the air keeps reading `M.air / T`, which spans the push as well
  and is deliberately an approximation: the clip's LANDING frame arrives a little before he does,
  and the TAKE-OFF frame -- the one being complained about -- now arrives exactly when he leaves.
  **THE RATE IS WRITTEN WITH `timeScale`, NEVER A REPLAY.** The mixer reads it every update, so it
  moves the clock from that frame on and leaves the clip where the push left it; `reset()` or a
  second `playOnce` rewinds to the crouch and plays the wind-up again in mid-air, which is exactly
  the fault m92 removed. It is written at the launch frame in `stepPlayer` and in `backGo`'s own
  no-hang branch, so a clip that somehow has no push cannot be left running at the wrong rate.
  **AND `backGo` STOPPED INVERTING `flipDur` TO RECOVER THE HANG.** With two rates there is
  nothing to invert: the function that CHOSE how fast the wind-up plays is the function that knows
  how long it takes (`p.flipPush`), and a second derivation is a second place for the clip and the
  physics to drift apart.
  **The chip already said `PUSH<t>`** (m92), so this is one glance to confirm: `PUSH0.15` at every
  charge, where it used to read 0.35 to 0.49. `mel.AIR.pushRate = 0` is the one word back to m97,
  because it floors at the air rate.

- **THE CLIP ALREADY CONTAINED THE HALF TURN, SO THE ROOT MUST NOT (m99).** *"The wall cover is
  backwards. The animations has the face away from wall built in, but you rotated him so now he
  faces the wall."* Exactly that, and it is one sign. m89 pointed the root along **+normal** and
  wrote `// belly AWAY from the wall` beside it -- true of the ROOT and false of the body, because
  the clip turns him 180 on top of it. Two half turns compose into a man with his nose in the
  brick. `atan2(-W.nx, -W.nz)`: the root faces the wall and the clip's own turn puts the belly out.
  **AND THE SHIMMY'S SIGN CAME RIGHT WITH IT, which is worth writing down rather than
  re-deriving.** `side` is measured along `(-nz, nx)`. Under m89's facing that tangent was the
  ROOT's right and therefore the DRAWN body's LEFT, so `wallShimmy`'s `side > 0 -> R` was picking
  the wrong clip as well -- invisible, because the facing was already wrong in the same direction.
  Facing the wall, the drawn body's right IS that tangent and the pick is correct by construction.
  **A COMMENT DESCRIBING AN INTENT THE CODE NO LONGER HAS IS THE TELL**, which is this file's own
  sentence about the 40 cm cube (m74) and `blast0` (m56), for the third time.

- **THE PICK-UP IS GONE, AND `bodyLaunch` IS NOT A LEFTOVER (m99).** *"We're gonna need to remove
  the Clancy pick up because the UI button looks horrible. It's way too big. The hybrid animations
  look like trash. The hips rotation has been stripped. He's leaning forward and the throw
  mechanics are bad. We needs to rebuild all that."* So the whole of m96's carry goes: `#grabRing`
  and its keyframes, the face SVG on the knob, `GRAB`, `grabScan`, `grabGo`, `grabRide`, `tossGo`,
  `tossFire`, `grabDrop`, `stepGrab`, `p.carry`/`p.toss`/`p.wind`/`p.grabNear`, `d.held`,
  `CLIPS.hold`/`toss`, their entries in `SPLIT.up` and `ONCE`, CLANCY's `lift`/`tint`, the guards
  in `pushBodies`/`bodySep`/`cycleKit`, the `'held'` branch in `stepDummies` and the chip line.
  **The right pad's tap is the jump again and nothing else.**
  **`hold_item` AND `throw_item` COST NOTHING NOW THEY ARE UNNAMED**, which is m35's rule: the
  mixer builds an action per clip either way and nothing plays one nobody names. They are there
  for the rebuild.
  **WHAT SURVIVES IS `bodyLaunch`, AND DELETING IT WOULD HAVE BEEN THE MISTAKE.** m96 EXTRACTED it
  from `dummyBlow` -- the tumble, the whoosh, the fall clip, the per-body beat and the two get-up
  rolls -- and `dummyBlow` is still its caller. Removing the feature that motivated an extraction
  is not a reason to put the extraction back inline.
  **AND THE `SPLIT.up` PRIORITY COLLAPSES BACK TO ONE ARM.** m96 made `upNm` a three-way because
  three things wanted the top half; with two of them gone it is `p.swap ? CLIPS.swap : ''` again.

- **THE DIVE WAS FINE AND IT COULD NOT BE REACHED (m99, `palDive`).** *"Clancy is still constantly
  in my way. I feel like if I shoot or charge he need to run or dive out of the way IMMEDIATELY.
  No long. Right stick = get the fuck out of the way."*
  **THREE BUILDS TUNED THE TRIGGER AND THE PROBLEM WAS ITS ADDRESS.** m76 moved it onto `p.armT`
  (the frame the thumb ARRIVES, which is the earliest thing there is to know) and m81 solved the
  distance off the wedge -- both real and both shipped, and both sitting inside `foeWander`, which
  `foeAI` reaches **only after three committed-state returns.** A pounce swing is `swingDur` .85 s
  of a body that cannot dive, and the pounce is live precisely while the trigger is (m75: a mark
  is a body you just hit). **So the one moment he is nearest the muzzle was the one moment the
  reflex was switched off** -- which is his sentence exactly, and it is why m81's habit fix helped
  and did not finish the job.
  **FOURTH TIME ACROSS THESE REPOS: WHEN A FEATURE DOES NOT FIRE, CHECK WHERE IT IS CALLED BEFORE
  WHAT IT DOES** -- after `barCatch` under the collider, `colinAnim` skipped on the bar and
  `stepFeet` above the branch that owns the body (m70). It is the FIRST thing `foeAI` asks now, so
  a punch is abandoned mid-arc.
  **A HOP AND A DIVE ARE THE TWO IT MUST NOT INTERRUPT**, because both hand the body to `bodyFly`:
  cutting a hop in mid-air drops him, and re-diving mid-dive is a stutter rather than a scramble.
  **AND ABANDONING A SWING HAS TO LEAVE NOTHING BEHIND** -- `d.combo` would otherwise carry an
  unfinished chain into the next fight and `d.sfoe` a target that has moved.
  **THE NUMBERS ARE THE REST OF THE SENTENCE.** `dur` .55 -> .45 (x4.17 on a 1.875 s roll, the fast
  end of what a clip can sell), `vMax` 7.5 -> 11.5 so one dive covers 5.18 m of wedge rather than
  4.13, `cool` .25 -> .12 so a second may start 0.57 s after the first rather than 0.80, and
  `cone` .52 -> .60 with `clear` 1.30 -> **1.20**. That last pair is not two independent dials:
  they MULTIPLY into the distance he has to cover, so widening the cone without narrowing the
  clear is a wider wedge he can no longer leave, which is m81's whole finding. Measured through
  the shipped solve, dead on the line: 3 m -> one dive at 5.9 m/s; 5 m -> one at 9.8; 11 m -> two,
  1.02 s in total.

- **THE GROUND FEELS THE SLAM, AND THE SLASH WAS UNDER THE THRESHOLD OF BEING AN EFFECT (m99,
  `slamFx`, `camShake`, `MFX.slam`).** *"When he does the earth slam from melees down from in the
  air we needs to make the ground feels it like a particles effects or debris or shake or slashes
  -- oh by the way we needs to put in the slashes for all the melees stuff."*
  **A SHOCKWAVE IS A RING AND `spkBurst` THROWS A SPHERE**, which is right for a fist arriving at a
  man's chest and wrong for a body arriving at the floor: everything that moves goes OUTWARD and
  low. So it is its own loop -- an EVEN fan of bearings, jittered (a purely random set clumps and
  reads as a spray; an exactly even one reads as a cog) -- and **two rings rather than one**: a
  fast bright grit and a slow dim dust behind it, which is m39's "an impact is three things"
  pointed at the ground. **It is sized off `SLAM.r`**, the radius the blow actually catches, so the
  debris says how far it reached rather than being a number nobody can check.
  **THE SHAKE IS A DECAYING SINE, NOT PER-FRAME NOISE.** A random offset every frame is a BUZZ and
  its character changes with the frame rate; two out-of-phase sinusoids on a half-life read as one
  thump and are identical at 30 Hz and at 120 -- `Math.exp(-k*dt)`'s own argument applied to a
  picture. **AND IT LANDS ON `camera.position`, NEVER ON `cam.pos`**: that one is a DAMPED state,
  so a wobble written into it feeds back through the damper for the rest of the session, which is
  the Verlet constraint banking its correction as velocity one system over. The look point is
  untouched, so the subject stays centred and the WORLD swings.
  **AND THE SLAM HAD NO SLASH BECAUSE `strikeSweep` HAS EXACTLY ONE CALL SITE** -- inside
  `p.roll || p.melee || p.chargeGo`, and a slam is none of the three. `slamGo` has seeded the sweep
  (`p.swPrev = null`) since m81, which says it was always meant to run. It is called with **`live`
  false**: the slam's damage is RADIAL and `slamLand` deals it, so a swept limb counting a second
  blow on the way down would be two descriptions of one event.
  **THE TRAIL ITSELF WAS REAL AND INVISIBLE.** Every strike has drawn one since m94 -- three 10 cm
  sparks with a 0.12 s life, which is not something you can see at ten metres on a phone. 6 at
  .155 over .19 s. **The mechanism was right and the numbers were under the threshold of being an
  effect**, which is m71's own finding: a distance you can see and a duration you can see are the
  same number in disguise. `mel.MFX.per = 3` is the way back.
  **AND THE CHIP'S `!` ON A SLAM IS SET BY THE RADIAL BLOW**, because the sweep cannot answer it
  any more -- it is not `live`. `mel.slamfx()` fires the whole thing where he stands and
  `mel.shake(.5)` is the knock alone, so the two can be judged apart.
  **WHAT IS UNVERIFIED AND WHY:** nothing in this container has a GPU or a skin, so whether the
  ring reads as debris, whether 0.55 m of lens knock is a thump or a lurch, and whether a six-spark
  ribbon reads as a slash are all device questions. `mel.MFX.slam` and `mel.CAM.shake` are live.

- **A TAP WAS A THUMB NEAR THE MIDDLE, AND THE MIDDLE IS ELEVEN PER CENT OF THE PAD (m98,
  `MOVE.tapMove`).** *"It feels really tough to hit the exact middle of the stick sometimes --
  like 75 per cent of the time when I'm running and I try to jump I miss, and I don't know if
  that's just because of the size of the sticks."* **It is not the size of the sticks.** Read
  straight off `bindStick`:
      if (!fired && onTap && far < MOVE.tapR && held < MOVE.tapT) onTap();
  `far` is the high-water DEFLECTION from the pad's CENTRE, seeded on `pointerdown` and maxed on
  every move -- so `tapR` .42 against `RAD` 52 means **a thumb landing more than 21.8 px from the
  middle of a 132 px pad could never be a tap, however briefly it was there.**
      the tap disc   r 21.8 px      the pad   r 66 px      -> **11.0% of its area**
  And the 89% that was dead is exactly where a thumb reaching across from a running grip lands:
  low and outward. His three quarters is, if anything, generous.
  **WHERE HE LANDED SAYS NOTHING ABOUT WHETHER IT WAS A TAP -- WHAT HE DID NEXT DOES.** So the
  test is TRAVEL from the landing point, and the radius did not change: it is the same 21.8 px,
  measured from where the thumb arrived instead of from the middle of the pad. A drag is tens of
  pixels and a flick is caught first (`fired` eats the tap), so nothing that already meant
  something else becomes a tap.
  **AND IT IS ITS OWN CONSTANT, NOT A SECOND JOB FOR `tapR`.** `far` still means "near the
  centre" and `onRel`/`backGo` and the duck's own `R.far < tapR` still read it that way -- which
  is correct there, because m87's duck IS a hold at rest and one sweep anywhere in the hold has
  to kill it. Two facts, two numbers, which is this file's own rule about `chargeGoH`.
  **THE ONE CASE THAT CHANGES BEHAVIOUR, SAID OUT LOUD:** a thumb that lands at the TOP of the
  pad and lifts inside `tapT` .30 now also jumps. That gesture fired nothing before -- it is
  under `armT` on the way in and under `WEAP.minChg` on the way out -- so what it buys is a jump
  where there was silence, which is the right answer for a tap.
  **AND THE TWO PADS CANNOT CROSS-TALK**, which was his third hypothesis (*"maybe the jump isn't
  registering because I'm also holding the other stick"*): each pad is its own element with its
  own listeners and its own closed-over `id`, every handler opens `if (e.pointerId !== id)
  return`, and the window-level catcher matches by id before handing an up to a pad. **And the
  double-tap guard cannot eat it either** -- that one cancels a `touchend`, and the pads run on
  POINTER events, which are not the compatibility layer it fires in.
  **WHAT IS STILL NOT DONE IS THE FLOATING PAD** -- m49 wrote it down and it is still the real
  fix for missing a stick: *"since we don't have the whole adjusting joystick thing on, which
  maybe we should think about in the future"*. A pad that appears where the thumb lands makes
  this question disappear rather than widening its answer.

- **A WEAPON THAT HAS NEVER BEEN DRAWN HAS NEVER BEEN COMPILED (m98).** *"There is sometimes this
  delay in the animation between switching weapons or something -- it's subtle, but it feels like
  there is a slight hang every so often."*
  **THE SWAP ITSELF ALLOCATES NOTHING, WHICH IS WHAT MADE THIS WORTH LOOKING PAST.** `mountWeapon`
  runs once at LOAD -- the clone, the bounds, `measureHue`, `hueGlow` -- and `applySlot` is three
  assignments and `paintKit`, whose entire scene-side effect is `w.group.visible = (key === s.key)`.
  Nothing is created, nothing is disposed, no geometry is touched.
  **BUT THREE COMPILES AND LINKS A PROGRAM THE FIRST TIME A MATERIAL IS ACTUALLY DRAWN**, and both
  weapons are mounted with `visible = false`. Slot 0 is unarmed, so **neither the blaster nor the
  hammer has a program until the first swap TO it** -- a GLSL compile and link mid-frame, once per
  weapon per session, which is 10 to 80 ms on a mobile GPU. That is "sometimes" said exactly: it
  happens, it stops happening, and it happens again on the next reload -- and he reloads for every
  build.
  **`renderer.compile` TRAVERSES WITH `traverse`, NOT `traverseVisible`** -- checked in the
  vendored source rather than assumed, because the lights half of that same function DOES use
  `traverseVisible` and the two are one call apart. So one line at the end of `init()` warms every
  material in the scene, the two hidden ones included.
  **IT IS A CANDIDATE WITH A MECHANISM, NOT A DIAGNOSIS.** Nothing in this container has a GPU, so
  whether a program compile is what he is feeling cannot be answered here. It is in a `try` and it
  is a no-op for anything already up, so the cost of being wrong is nothing.
  **AND THE OTHER CANDIDATE IS NOT SHIPPED WITH IT, DELIBERATELY.** `#modeRow` and `#grabRing` both
  flip `display` between `none` and shown on a swap, which forces a layout and restarts the ring's
  infinite keyframe animation; `visibility` + `opacity` would make that a paint. **Each toggle has
  to move one variable** or neither can be judged, and that one has no mechanism that reaches tens
  of milliseconds. It is the next thing to try if this changes nothing.

- **THE ZIP WAS THE TACKLE, AND IT IS m93 OVER-CORRECTED (m97, `MELEE.slideThru`/`slideMin`).**
  *"There's this thing that happens when you're meleeing where he's hitting the guys and then all
  of a sudden he zips past them by a long distance and I can't figure out why."*
  **EVERY ORDINARY STRIKE IS CAPPED AND SOLVES DOWN TO THE MAN**, which is what made this hard to
  see -- tabled from the shipped constants before anything was touched:
      link 1  melee_01  dur 1.26  v 5.03  travel **4.60 m**   (`lungeMax`)
      link 2  melee_02  dur 0.88  v 6.50         4.15
      link 3  melee_03  dur 0.79  v 8.08         4.60
      locked on a man 5.6 m off -- all three end **1.05 m from him**, by construction
      TACKLE                                     **6.20 m, whoever is in front of him**
  **THE TACKLE IS THE ONE THING IN THE FILE WHOSE DISTANCE STOPPED ANSWERING TO ANYBODY.** m93's
  complaint was the opposite -- the solve CUT IT SHORT (6.20 m free, 1.25 m against a man at 2 m)
  -- and `slideFree` answered it by making the solve a floor-only raise. That is one step too far:
  a floor that is never beaten is not a floor, it is a constant.
  **AND IT FIRES MID-FIGHT, WHICH IS WHY IT READS AS A GLITCH RATHER THAN AS A MOVE.** `tackle`
  needs only `!cont` and `runT >= slideT` .45, so a chain that lapses (`window` 1.05 s) while he
  is moving turns the very next flick into a slide and he leaves the fight he was in. **He never
  asked for a tackle at that moment and there is nothing on screen that says he is about to get
  one**, which is the whole of *"I can't figure out why"*.
  **THE ANSWER IS A TARGET, NOT A FLOOR: HE SLIDES THROUGH HIM AND OUT THE OTHER SIDE.**
      nobody      6.20 m, unchanged -- the "nice long slide tackle" m93 was actually about
      man at 1.0  3.60 m  (`slideMin`; a slide has to be a slide)   2.60 m past him
      man at 2.0  4.20                                              2.20 past
      man at 3.5  5.70                                              2.20 past
      man at 6.0  7.50  (`slideMax`)                                1.50 past
  `hitAll` and the swept limb still catch everyone he passes, which is what m93 was right about
  and is untouched. `mel.MELEE.slideThru = 99` is the one word back.
  **AND THE ACQUIRE RADIUS HAD TO COME DOWN WITH IT, WHICH IS THE HALF THAT IS EASY TO MISS.** An
  ordinary strike stops `arrive` SHORT of the man, so it may acquire one that much further off; a
  tackle goes THROUGH, so the furthest it can deliver is exactly `slideMax`. At `maxD + arrive`
  a man at 8 m was acquired and the slide stopped **0.5 m short of him** -- m20's rule (an
  assist's range is sized for what it DELIVERS, not for what it draws), which the aim-through
  shape quietly moved.
  **THE FLYING KICK KEEPS ITS FLOOR AND THAT IS A STATED GAP.** It has the same shape -- a kick at
  a man 1 m off still carries 5.85 m -- and it is left alone because he named the ground melee and
  because a kick thrown across the air that overshoots lands you on your feet rather than in the
  middle of nowhere. `airMax` is the dial if it turns out to read the same way.

- **A FIST TRAVELS IN AN ARC, SO ITS DELTA AT CONTACT IS ACROSS THE SWING (m97, `p.melH`).**
  *"The melees send the guys but they don't really get sent in the direction that you swing -- it
  feels like they shoot at an angle away from his swing, where I want them to go the direction I
  swing."* Exactly right, and the mechanism is precise. `strikeSweep` launched him along
      const bh = Math.atan2(_sw.x - q.x, _sw.z - q.z);
  which is the limb's **instantaneous world delta** on the contact frame. A punch is a rotation
  about the shoulder, so at the moment the fist arrives most of that delta is TANGENTIAL -- across
  his body -- and a blow thrown straight ahead sent the man sideways. A hook sent him nearly
  perpendicular to the hook. **It has been that way since m20** and only became visible once blows
  started launching people properly (m91's always-knock, m93's tackle, m96's arc).
  **WHEN A DIRECTION IS ALREADY STORED, DO NOT RECOVER IT FROM GEOMETRY** -- `copFly`'s rule one
  repo over, and the second time this file has paid for it. `p.melH` is the bearing the strike was
  actually thrown at, AFTER `meleeLock` has had its say, stored in the two places it is decided
  (`meleeGo` and `kickGo`) beside the facing and the camera want -- so the lens, his nose and the
  launch are ONE answer rather than three that can disagree.
  **AND IT SERVES THE BODY MOVES WITH NO SECOND CASE**, because on a tackle or a flying kick the
  direction he is TRAVELLING is the direction he aimed. The slam is untouched: it throws each man
  radially OUTWARD from where it landed, which is one bearing per body and correctly not this one.
  `mel.MELEE.limbDir = 1` puts the tangent back for an A/B.

- **THE FLIP FILLS THE WHOLE TRIP, AND THE FLOOR OF 1 WAS THE WHOLE BUG (m97, `AIR.rateLo`).**
  *"The backflip finishes when he's still in the air, so we need to map the animation to the whole
  air trip."* m87 wrote the rate as `max(1, M.air / (T * fill))` on the argument that stretching a
  clip to fill a long hang is slow motion -- a real concern, and not what was happening:
      the clip is **1.125 s** from its crouch to its landing
      a FULL-charge backflip is 0.333 s of push + **1.649 s** of air = 1.982 s
      the ideal rate is 1.125 / 1.649 = **0.682**, and the floor clamped it to 1.00
      so the flip was over at 1.458 s and the last **0.52 s** was `in_air`
  At `fill` 1 and `rateLo` .62 the trip is covered exactly, at every charge:
      charge 0.00   apex 3.40   air 1.17   rate 0.965   push 0.35   **0.00 s left over**
      charge 0.50        5.10       1.43        0.788        0.42        0.00
      charge 1.00        6.80       1.65        0.682        0.49        0.00
  **AND THE PUSH STRETCHES WITH IT, WHICH IS A DECISION RATHER THAN AN OVERSIGHT.** `backGo`
  derives the hang back out of the same rate, so a full charge winds up for 0.49 s against 0.33 --
  a deeper crouch for a bigger jump. Holding the push at 1x and slowing only the air was the
  alternative and it is worse twice over: it needs a second rate written onto the action mid-clip,
  and it puts the air at **0.48x** rather than 0.68x.
  **IT APPLIES TO THE FRONT FLIP TOO**, because it is the same fault -- `front_flip`'s 0.667 s
  against a double jump's ~1.0 s of air was ending a third of the way early as well. He named the
  backflip because it is the one that hangs longest. `mel.AIR.rateLo = 1` is the one word back.

- **AND THE GET-UP IS QUICKER (m97, `HURT.upBeat` 2.20 -> 1.55).** *"We need to make his get up
  animation quicker."* 2.708 s authored, so 2.20 was **x1.23** -- barely compressed, and it is the
  half of a knock-down you wait through rather than watch. x1.75 stands him up in 1.55 s and is
  still well inside the band m37's rule cares about. With m96's derived fall the whole knock-down
  is now **2.43 to 2.79 s** against m96's 3.08-3.44 and m90's 3.55.

- **THE CLIP HAS TO HAVE HIM ON THE FLOOR BEFORE HE GETS THERE, AND IT IS ONE MEASUREMENT AND ONE
  DIVISION (m96, `fallMark`, `HURT.mark`).** *"The thing that makes the warrior aliens look so
  good when they fly through the air is that when I blast them full, the animation is them laying
  on the ground BY THE TIME they hit the ground -- that's the key. The problem with mine is I
  either don't go far enough, don't have enough hang time, or the animation plays too slow. We
  could map the duration of the animation to the amount of hang time I get."*
  **HIS DIAGNOSIS IS ALL THREE AT ONCE AND THE ARITHMETIC AGREES WITH EVERY PART OF IT.** Measured
  off the Hips track of `take_damage_and_fall_down`:
      the clip puts him on the floor at **1.458 s** of its own time  (u 0.714 of 2.042 s)
      m90 played it at a FIXED x1.51, so the pose arrived at **0.964 s**
      the flight was **0.56 s**
      -> he landed **0.40 s before the animation did**, every single time
  **SO THE RATE IS SOLVED RATHER THAN TYPED**: `mark / (air * lead)`, where `air` is `2*vy/g` --
  the arc that was set two lines earlier -- and `lead` .92 is *"on the ground BEFORE you hit the
  ground"* said as a number. `HURT.beat` survives only as the fallback for a clip with no hips
  track, and nothing else reads it.
  **AND THE LANDMARK IS FOUND, NOT TRIMMED BY HAND** -- `flipMarks`' own method one clip over, so
  a re-export at any length moves it. **"Stays below the gate for ever" is the WRONG test** and it
  reported nothing at any threshold: this clip bottoms out at -1.11 and then SETTLES back up to
  +3.6, which is the body relaxing. First ARRIVAL within `gate` .08 of its own floor is the honest
  question, and it is stable across the band (.05 -> 1.500, .12 -> 1.375).
  **THE RATE FIX ALONE WOULD HAVE BEEN WRONG, WHICH IS THE OTHER TWO THIRDS OF HIS SENTENCE.** At
  a 0.56 s hang the solve just plays the fall at x2.83 -- correct, and still a stumble. `hi`
  .78 -> **1.60** and `back` 7.6 -> **12**.
  **AND ONE ROLL DRIVES BOTH, SO A HARDER BLOW IS HIGHER *AND* FARTHER.** *"Sometimes they hit you
  and you go farther and sometimes shorter."* Two independent rolls give a high short launch and a
  low long one, which is nobody's idea of a harder hit -- and because the hang comes out of the
  same number, the CLIP follows it for free with nothing to keep in step:
      k      vy    apex    air    dist    rate    pose on the floor at
      .85   6.80   1.16   0.68    6.4    x2.33         0.63 s   <- before 0.68
      1.00  8.00   1.60   0.80    8.7    x1.98         0.74     <- before 0.80
      1.20  9.60   2.30   0.96   12.3    x1.65         0.88     <- before 0.96
      m90   5.59   0.78   0.56    4.0    x1.51         0.96     <- **0.40 LATE**
  Grounded before impact at every power, BY CONSTRUCTION rather than by two numbers being tuned
  toward each other. **And the whole knock-down got SHORTER** (3.08-3.44 s against 3.55) while
  going two to three times as far, because the fall no longer has to play out after he lands.
  **`rateMin`/`rateMax` ARE FITTED TO THE ONE HE SAYS LOOKS GOOD**, not picked: the warrior's own
  fall runs x1.6 to x2.5 (`downBeat` 1.5 on a 3.0 s clip, times `downVary`).
  **AND THE STATE READS THE LENGTH THE CLIP WAS SCALED BY** (`p.knockDur`), which is the m8
  landmine and is exactly what a per-launch rate walks into.

- **PUTTING A WEAPON AWAY IS THE SAME REACH, BACKWARDS (m96).** *"The animation for swapping
  weapons, when he goes from having a weapon to no weapon -- I think it's just playing in one
  direction for every switch, but for that one we should probably play it in reverse."* He is
  right and it was: there is ONE `weapon_swap` and it is a hand going INTO a bag and coming out
  with something. Forward it is a draw; backwards it is a stow.
  **A NEGATIVE `timeScale` IS THE OTHER DIRECTION** -- m89's rule for the wall shimmy, and it
  needs no second clip because only one direction is ever live at a time. **This is the first
  place it is used on a ONE-SHOT, and `reset()` is why that needed a line**: it puts the action at
  time 0, which is where a reversed clip FINISHES, so without starting it at the clip's end it
  clamps on its first frame and nothing moves. three's `LoopOnce` handles both ends of
  `_updateTime`, so `clampWhenFinished` holds frame 0 exactly as it holds the last one forward.
  **AND `SWAP.at` MIRRORS WITH IT, WHICH IS THE HALF THAT IS EASY TO MISS.** Forward the weapon
  APPEARS when the hand comes back out at u .48; reversed the hand goes IN at `1 - .48`, and that
  is when it has to leave. Reading the same .48 either way drops the weapon out of his fist before
  the hand has got anywhere near the bag.
  **THE TEST IS THE TARGET, NOT THE PAIR.** `to` naming a slot with no `file` IS "to no weapon",
  which is his sentence exactly. Blaster -> hammer is a stow AND a draw and stays forward, because
  the reach that matters there is the one that ends holding something.

- **PICK HIM UP AND THROW HIM (m96, `GRAB`, `grabScan`, `grabRide`, `tossGo`, `bodyLaunch`).**
  *"You just pick him up by being within radius of him. The right stick -- there'll be a ring
  around it that's the colour of Clancy, so like orange, a rotating ring, and I know you won't be
  able to see that it's rotating unless there's pieces of it cut out. And a little icon of his
  face on the stick so it shows that you can tap to pick him up. You pull the stick up to wind up
  and then let go to release."*
  **NEARLY ALL OF IT WAS ALREADY BUILT, WHICH IS `d.K`'S DIVIDEND FOR THE EIGHTH TIME.** A thrown
  body is a body with a velocity: `bodyFly` is the integrator (the arc, the wall bounce, the
  ground stop, the landing thump), `FLYHIT` (m63) makes him bowl over whoever he lands on, and his
  own `falling_to_roll` / `cover_to_stand` have been wired as a knock-down since m73. **So the
  throw is `bodyLaunch` -- the same function a mace calls -- and what is actually new is the
  CARRY.** Every throw clears `FLYHIT.at` 6, so he is a skittle at any wind-up:
      wind  0.00   9.0 m/s out, 3.2 up   0.32 s of air    2.4 m
      wind  0.50  16.5          5.3      0.53             6.5
      wind  1.00  24.0          7.5      0.75            11.9
  **`bodyLaunch` IS AN EXTRACTION AND THAT IS THE POINT.** The tumble, the whoosh, the fall clip,
  the per-body beat and the two get-up rolls are what a body leaving the ground IS -- they were
  inline in `dummyBlow`, and a second caller is exactly when that stops being acceptable.
  **AND THE GESTURE COST NOTHING, BECAUSE A PROMPT IS WHAT MAKES A TAP MEAN SOMETHING ELSE.** The
  right pad's tap is the jump; while the ring is lit it is the pick-up instead, and that is not a
  hidden mode because **the ring and the glyph ARE the state** (m52's own answer to m36). Carrying,
  the up-hold is the wind-up rather than the trigger -- free, because a man with his hands full is
  not aiming -- and it is `padUp`'s same four gates, shared rather than re-derived (m46).
  **THE PROMPT IS DRAWN ON THE CONTROL THAT PERFORMS IT**, which is `actB`'s lesson one repo over:
  a prompt on the pad cannot be somewhere the thumb is not, and it costs no HUD element in the
  play area. Centred on the pad's OWN insets, the way `#modeRow` is, so it cannot drift off on a
  notched phone; inside `#padR::after`'s radius so the aim ring and it never overlap (they cannot
  both be live anyway). **The cut-outs are the whole point** -- a solid ring turning is a ring
  standing still -- and the spin is a CSS keyframe, so it runs on the compositor and the loop
  writes one class and two custom properties.
  **THE WIND-UP IS A RING THAT CLOSES IN, NOT A BAR**, the reticle's rule: how loaded something is
  should be a SHAPE you can read without looking away from the fight.
  **THE CARRY IS A `SPLIT.up` POSE AND THE THROW IS TOO.** `hold_item` is 3.333 s with five
  degrees of drift across the whole of it -- a held pose -- so it goes over the gait's `__legs`
  and he walks about with somebody in his arms, which is `weapon_swap`'s own shape (m91). The
  throw is the same, which keeps him mobile: being unable to move is the least fun state in any
  game, and this file says so twice already. **Three things now want the top half, so they are ONE
  override with a priority** rather than three branches each having to know about the other two.
  **HE IS WRITTEN TO THE PLAYER'S HANDS EVERY FRAME, NOT PARENTED TO A BONE.** The armature is
  scaled 0.01 and a child of it comes out at a hundredth of its size, which is m26's weapon lesson
  -- and this needs no bone anyway, because it is a position and a facing.
  **AND A CARRIED BODY IS OUT OF `bodySep` AND `pushBodies`.** Without that he is a solid in the
  player's own resolver being held 32 cm in front of the player's chest, which pushes him
  backwards every frame and reads as walking into an invisible box.
  **`lift` AND `tint` ARE ON THE KIND**, m38's empty-field pattern: the orcs, the drunks, the
  skater and the officer never reach any of it, and a second pal tomorrow brings his own colour
  with nothing typed in the HUD.
  **A FUMBLE IS NOT A THROW** (`minWind`) -- a stray brush of the top of the pad must not launch
  him, which is `WEAP.minChg`'s argument one verb over. And the charge is BANKED at the release
  (`p.tossK`), because the clip fires the launch `GRAB.at` of the way through and the thumb is
  long gone by then: the picture and its consequence have to be ONE event.
  **AND HE IS SET DOWN RATHER THAN DROPPED THROUGH THE FLOOR** wherever the carry ends for a
  reason that is not a throw -- a knock-down, a roll, latching to a wall.
  **STATED GAPS.** `GRAB.at` .38 is a **guess**, the taunt beats' own position (m65): a strike has
  an authored contact frame and a throw does not, and nothing in this container can pose a skin --
  so the chip reports `TOSS<t>` and `mel.GRAB.at` is the dial. **The face is a STAND-IN and is
  marked as one**: there is no artwork for him in this repo, so it is a drawn mark in his colour,
  and a PNG is what replaces it. The WEAPON MODEL is still in his hand while he carries somebody,
  which is odd and is not fixed here. There is **no desktop binding** -- m79 spends the left
  button on melee and right click on the kit cycle, so the pick-up wants a key and it is his call
  which. And **no gate in this repo executes `stepGrab`**: `check:syntax` parses and `check:boot`
  stops at `init()`, so the whole state machine is a device question. Every symbol it names was
  checked to exist, which is reading rather than running and is not the same thing.

- **A RE-EXPORT RENAMED A CLIP AND TOOK A WHOLE FEATURE WITH IT (m95, `backflip`).** *"I pushed a
  new zap model, new animations, way more melees, I put in a hold item and throw, I put in a block
  and block react."* One file, replaced in place: 45 clips to 54, and **`Backflip` came back as
  `backflip`**. It is a NAME in three places and `CLIPS.flipBack` was still spelling it the old
  way, so the backflip, the charged duck and the whole of m87 were **gone** the moment he pushed.
  **AND THE ONLY THING THAT WOULD HAVE SAID SO IS ONE WORD IN THE CHIP.** `NO CLIP Backflip`,
  which is m88's table check doing its job -- and *"the backflip stopped working"* and *"the
  backflip never worked"* are one picture from a phone. **Read the export before playing it.**
  **AND THREE OF THE FOUR MOVES ARE RENAMES, MATCHED BY DATA RATHER THAN BY NAME** -- m86's rule,
  per-bone rotation travel against the old file, and the second time it has paid here:
      backflip         == old `Backflip`          cos **1.0000**  (next best .9585)
      melee_extra      == old `melee_01`          cos **1.0000**  (next best .8499)
      weapon_melee_02  == old `weapon_melee_01`   cos **1.0000**  (next best .8928)
      melee_01         genuinely NEW -- best match .9496, which is nothing
      weapon_melee_01  genuinely NEW -- best match .9301
      the old `weapon_melee_02` (1.667 s, hips .156) is simply GONE
  Duration, key count, moving-bone count and hips travel all agree to the digit on each pair.
  **`MELEE.clip`'s 360 OVERRIDE STILL POINTS AT THE SAME ANIMATION** (`weapon_melee_04`, 1.0000
  with itself), so m94's numbers survived the re-export -- checked, not assumed.

- **`hurricane_kick` IS BROKEN IN THE EXPORT AND IS NOT WIRED (m95).** 62 rotation channels and
  **61 of them have ZERO travel**: only `mixamorig_Hips` moves, 1440 degrees of it. That is a man
  in a fixed pose rotating about his hips, not a kick. `npm run clips` flags it as **1 moving
  bone** against 44 on every other melee, which is the tell -- and it is the one case where a
  metric that asks *"does this track change"* is exactly the right question, because the answer
  is no on every limb. Nothing else in the file has it. **It wants a re-export; wiring it would
  put a spinning statue in the chain.**

- **THE CHAIN IS A LENGTH AND THE CLIPS ARE DEALT OUT OF A POOL (m95, `MELEE.links`,
  `p.meleeRoll`).** *"way more melees"* -- six unarmed now and four armed. Letting the chain BE
  the pool is the obvious move and it is wrong twice over: six links at a readable rate is about
  five seconds of watching, which is m36's *"a chain is not a film"*; and `power` is graded across
  the chain, so a six-link chain puts a man over on every SIXTH blow where today it is every
  third. **The tempo and the strength belong to the CHAIN; the clips belong to the POOL.**
  Three links, dealt in order, advanced by a WHOLE chain each time -- so consecutive chains share
  no clip and nothing comes round again until the pool is spent. Six unarmed clips are exactly
  two chains; four armed ones walk round every time:
      CHAIN 1  melee_01 melee_02 melee_03      2.93 s      ARMED 1  01 02 03
      CHAIN 2  melee_04 melee_05 melee_extra   2.29 s      ARMED 2  04 01 02
  **Advancing by ONE would make the second and third blows of a chain the first and second of the
  next**, which reads as repetition rather than as variety.
  **AND THE SEED IS NEGATIVE, SO THE DEAL IS NORMALISED.** `meleeRoll` starts at `-MELEE.links` so
  the first fresh chain advances onto clip 0 rather than past it, and JS `%` keeps the sign -- a
  bare `pool[(roll + ix) % len]` is `pool[-1]`, which is `undefined`, which is `NO CLIP undefined`.

- **THE BEAT COMES OFF THE CLIP'S OWN LENGTH (m95, `MELEE.rate`, `melBeat`).** m94 wrote the
  sentence -- *a beat belongs to the clip, not to a chain position* -- and typed ONE entry for the
  360. With ten melee clips, typing ten is a constant somebody has to remember, which is not a
  mechanism. `MELEE.clip` stays as the override; everything else is `duration / rate`.
  **AND `rate` IS FITTED TO THE BAND THE SHIPPED CLIPS ARE ALREADY JUDGED AT, NOT PICKED.** Today
  `melee_extra` runs at x1.55 and `melee_03` at x2.02; m36 threw out 3x as *"a blur with no pose
  in it"*; m94 chose x1.37 for the 360 because x2.13 was *"slow that one down"*. So the honest
  window is about 1.4 to 2.0 and 1.75 is the middle of it.
  **THE NUMBER TO WATCH IS THE CHAIN'S LENGTH IN SECONDS, AND IT IS WHY 1.5 WAS WRONG.** My first
  pass used 1.5 and a three-punch chain came to **3.24 s** -- longer than the 2.3 s m36 threw out
  as watching rather than playing, because his new clips are long (2.208 s and 1.917 s against the
  old pool's 0.958). Caught by running the arithmetic before shipping it, not by reading it.
  **`melee_01` IS TWICE THE LENGTH OF ANYTHING ELSE IN THE POOL**, and whether it reads as an
  OPENER is a device question -- nothing in this container can pose a skin. Moving it down the
  pool is one edit if it turns out to be the heavy one.

- **AND `power` WAS A THREE-SLOT ARRAY ON A CHAIN THAT HAD ALREADY OUTGROWN IT (m95, `melPower`).**
  It was read `[Math.min(ix, len - 1)]` exactly as `beat` and `lunge` were before m94 -- so every
  link past the third inherited the finisher's 1.0, and 1.0 clears every kind's `fling`, which is
  a LAUNCH. **That was already live and nobody had looked**: the armed pool has been four long
  since m86, so links 3 AND 4 have both been finishers for nine builds. At six unarmed it would
  have been four of them, and the chain would never once have reached link 5.
  **THE FINISHER IS THE LAST BLOW, WHICH IS A FACT ABOUT POSITION RELATIVE TO LENGTH**, so the
  three entries are read as what they are -- open / build / finish -- and everything between the
  first and the last is graded. **It is a NO-OP on a three-link chain**, which is the check that
  says it cannot have disturbed what is already tuned:
      n = 3   .450  .520  1.000          <- byte for byte the old array
      n = 6   .450  .468  .485  .503  .520  1.000
  and every real `fling` is .55 or over, so only the last one puts a man over.

- **THE GUARD HAS A CLIP, AND THE LINE WRITTEN FOR IT WAS THE ONE THAT WOULD HAVE BROKEN IT
  (m95, `CLIPS.block`).** *"I put in a block and block react."* m37 wrote `CLIPS.block: ''` as a
  hook and this is what it was for -- `weapon_block` is a held pose (1.833 s, 20 degrees of drift)
  and `weapon_block_reaction` is a real react (left arm and forearm absorbing, 162 and 153 of
  travel). Naming them is nearly the whole change. **Nearly.**
  **A LINE SAT IN `rigAnim` THAT PLAYED THE BLOCK CLIP WHOLE AND RETURNED** -- written when the
  name was empty, so it could never fire, so it cost nothing and looked right. The moment the clip
  landed it would have short-circuited the committed branch sixty lines down, which is the one
  built for exactly this: a `SPLIT.up` pose over strafing `__legs`. What that gets you is a statue
  sliding sideways, with the good path sitting right there unreachable. **m19's shape -- two
  places answering one question, and the one that runs is the worse one.**
  **A BRANCH THAT CANNOT FIRE YET IS NOT A BRANCH THAT WORKS**, and naming a clip is exactly when
  it stops being free. The line is gone and `'block'` is in `SPLIT.up`, so the guard composes the
  way every other committed pose does.
  **`HURT.hits` IS THE REACT NOW, AND m91 SAID IT WOULD BE.** With `FOE.knock` at 1 every
  unblocked blow launches him, so `hits` is ONLY ever reached through a raised guard -- which
  means a guard react is literally what that field is. `stagger` .80 -> **.95**, because the clip
  is 1.333 s and .80 is x1.67: m37's rule, a blow too fast to read is the same blow every time.
  The two `take_damage_*` clips stay in the file and are one word from coming back.
  **AND IT IS THE ARMED PAIR STANDING IN FOR THE UNARMED GUARD.** There is one block clip and one
  react, and a man with his fists up is not a man with a hammer up -- but a guard that reads
  slightly wrong beats a guard that reads as the idle, which is what he had. Drawing an unarmed
  pair is two strings and no branch.

- **THE CHIP SAYS WHICH CLIP, NOT ONLY WHICH LINK (m95).** The chain is dealt out of a pool now,
  so the link number no longer identifies the animation -- and *"that one connects at the wrong
  part of the swing"* is a sentence about a CLIP. `melee2/05@0.62!` is link two, playing
  `melee_05`, blow fired at u 0.62, connected. m94's `@u` half and this half together turn a
  report about an animation into two numbers.

- **NOT DONE, AND EACH FOR A REASON (m95).** `hold_item` (3.333 s, 5 degrees of drift -- a HELD
  pose) and `throw_item` (2.042 s, right arm leading at 487 of travel -- a real throw) are a new
  VERB PAIR, and there is no item in this game to hold or throw: no pickup, no carried entity, no
  slot for one. **That is a build, not a rider on this one**, and the open question is the
  GESTURE -- the control map is full (left pad the body, right pad the verb; tap, hold, flick and
  drag all spent), so the honest candidates are a left-pad hold-in-place, which is the one
  unassigned thing on either pad, or a kit slot. `driving` (5.000 s, 8 bones, 13 degrees) is a
  seated pose with no vehicle, and `hurricane_kick` is broken at source, above.

- **A BLOW YOU CAN SEE LAND, AND THE SWEEP HAD KNOWN EXACTLY WHERE SINCE m20 (m94, `MFX`,
  `meleeHit`, the limb trail).** *"The sound adds a lot to the illusion of melee connection, but
  with the sound off, when I'm swinging my gun on the melee stick it doesn't feel like you're
  connecting with them visually -- there's something missing. There needs to be something where
  the collider connects with the character and there's a physical visual aid at the connection
  point, because right now it just does not feel or look like you're actually hitting anything.
  And I want the slashes on all of them no matter what you're holding: if he's punching it's the
  fist, if it's the hammer it's the tip of the hammer, if it's the gun it's part of the gun, if
  he's doing a kick it's his feet."*
  **HIS LIST IS ONE MECHANISM, AND IT WAS ALREADY BUILT.** m20's sweep tests a SEGMENT from each
  limb's last world position to this one -- both hands, both feet and the weapon's far end -- so
  *"the fist / the hammer tip / part of the gun / his feet"* is not four cases to write: **it is
  what the collider is already MADE of.** `segBody` solved the closest approach along that segment
  and returned a boolean; it fills `_hitP` now, on HIS SURFACE at the limb's own height rather
  than at the limb's centre, because a spark inside a man's chest is a glow and one on the face
  the blow came in by is an impact. **The blow and the mark it leaves cannot disagree about where
  they were, because there is one answer.**
  **AND THE MARK IS THREE THINGS, WHICH IS m39'S OWN SPLIT** -- a core FLASH that GROWS as it
  fades (one that only dims reads as a light being turned down; one that expands reads as
  something ARRIVING), a radial BURST that says how hard, and **the body lighting up**, which is
  what makes it something happening TO him rather than particles that happened nearby. That last
  one is m71's own stated gap: *"a melee hit does not flash the body -- `bodyFlash` is called
  from exactly one place, the bolt's impact swarm, so a shot lights the mesh up and a punch does
  not. One line in `dummyBlow` would do it, and it is left out here so the kickback can be judged
  on its own."* This is the build it belongs to, and it went where the CONTACT is rather than in
  `dummyBlow`, so it lands with the spark instead of a frame apart from it.
  **THE WHOLE THING SCALES WITH `power`**, so a jab sparks and the finisher is an event -- the
  ball's own rule (m36), where one number drives the picture and the consequence together.
- **AND THE SLASH IS THE LIMB'S OWN PATH, NOT A CARD (m94, `MFX.trail`).** Shredworld draws a
  camera-facing sprite for this and spent **three builds** on its orientation alone -- c91 built
  it as a `Sprite`, c153 rolled it to the blow's screen angle, c160 found that *"a billboard is
  camera-facing BY DEFINITION, so every fix after it was choosing which way a flat sticker lay on
  the GLASS"* and had to lay it flat in the world instead.
  **THERE IS NOTHING TO ORIENT HERE.** Sparks dropped along `q -> _sw` with no velocity and a
  0.12 s life ARE the arc the weapon actually swept, in the world, from whichever limb swept it
  -- which is the bolt's own streak (m39) pointed at a fist. It is right by construction for
  every weapon, every clip and every clip not drawn yet, it needs no per-clip constant, and **it
  costs no second draw call because the pool is one.**
  **IT FOLLOWS THE FASTEST LIMB AND ONLY THAT ONE.** Every bone over a threshold is four streaks
  and a smear; a slash is ONE stroke, and the limb doing the striking is by definition the one
  moving quickest through his own frame -- a number the sweep computes per bone anyway. **So the
  speed test moved OUT of the window**: `MFX.swing` .8 is well under `STRIKE.swing` 2.4, because
  a trail that only appeared once a blow could count would start half way through the swing it is
  drawing.
  **AND A FLASH CARRIES ITS OWN STACK NOW.** `stepFlashes` had `[2.6, 4.2, 6.4]` written into it
  as a literal -- the BOLT's three sprites -- so a fist landing would have been drawn at the
  plasma impact's proportions whatever size it asked for. A record names its own multipliers and
  the bolt's are the default: **a second producer reading the first one's constants is the same
  fault as two places answering one question**, one table down.
- **A BEAT, A CONTACT FRAME AND A LUNGE BELONG TO THE CLIP, NOT TO A CHAIN POSITION (m94,
  `MELEE.clip`, `clipOf`).** *"There's a spinning melee, and the actual arc of the spin where he's
  doing the attack -- they don't usually even react to it. It's like once he's settled and he kind
  of spins back, that's when they hit. I think we might need to slow that one down, and also we
  need to make sure the right part of that animation is connecting."*
  **`beat`, `at`, `lunge` AND `power` ARE ALL READ `[Math.min(ix, len - 1)]`**, which m86 wrote
  down as costing nothing -- *"a four-link chain needs nothing: the fourth link inherits the
  finisher's numbers"* -- and that is true of `power` and false of the other three the moment the
  fourth clip is not a fourth punch. `weapon_melee_04` is the renamed
  `Standing_Melee_Attack_360_High`, and a 360 is not a jab with a different index:
      beat    .82 on a **1.750 s** clip -> **x2.13**, which is his "slow that one down" exactly
      lunge   the finisher's 9.0, capped by `lungeMax` to **4.6 m of travel** -- a spin thrown
              ON THE SPOT was crossing four and a half metres mid-arc, so where he IS when the
              swing passes is different every time. That is a real candidate for the reaction
              not lining up with the arc, and it is stated as a candidate rather than as the
              diagnosis.
      at      .32, a fraction authored for a punch
  1.25 / .55 / 2.2 / 2.6, so the clip plays at **x1.40** and the spin covers about 1.6 m.
  **`at` .55 IS A GUESS AND IS MARKED AS ONE**, the taunt beats' rule (m65): a jab has an obvious
  contact frame and a full turn does not, and **nothing in this container can pose a skin** to
  measure one -- every character GLB is draco and `DRACOLoader` wants a Worker.
  **SO THE CHIP REPORTS THE `u` THE BLOW ACTUALLY FIRED AT.** `melee4@0.62!` -- `MELEE.at` says
  where the WINDOW OPENS and the sweep says where the limb actually ARRIVED, so a swing whose arc
  is at 0.45 and whose blow reads `@0.88` names its own fault, and *"it connects at the wrong part
  of the animation"* stops being a sentence and becomes a number. That is the honest shape of the
  half of this build I cannot measure from here.
  **WHAT IS UNVERIFIED AND WHY:** whether the spark reads as a connection, whether the trail reads
  as a slash or as fairy dust, and where in `weapon_melee_04` the arc really passes are all device
  questions for the reason above. `mel.MFX` is live (`trail = 0` and `on = 0` are the two A/Bs),
  and `mel.MELEE.clip` is the 360's four numbers.

- **THE TACKLE WAS SOLVED SHORT AND THEN COULD NOT CONNECT, AND BOTH ARE ONE WORD: IT IS NOT A
  SWING (m93, `MELEE.slideFree`, `STRIKE.bodyAt`/`bodyR`/`bodyFrom`).** *"When I'm running and I
  melee, if you're far away from an enemy he does a nice long slide tackle -- but when I'm closer
  to them it seems to cut it short, and it's also not hitting them very well. I've managed to hit
  them a little bit but most of the time I just slide a short distance to them and it doesn't even
  hurt them. Maybe we need to put bigger collide on his hands or feet."* Three faults, and his
  three sentences name them in order.
  **1. THE DISTANCE WAS THE MAN'S, NOT THE MOVE'S -- WHICH IS m51 DOING EXACTLY WHAT m51 IS FOR.**
  The lock inverts `v * dur * carryAvg` so a swing lands ON him, and that is why a man at arm's
  length gets a JAB thrown on the spot. Read straight off the shipped line:
      nobody in front   melV 9.00   travel **6.20 m**   <- the "nice long" one
      a man at 3 m      melV 3.27   travel **2.25 m**
      a man at 2 m      melV 1.81   travel **1.25 m**
      a man at 8 m      melV 10.53  travel  7.25 m
  **A jab on the spot is right and a SLIDE on the spot is not a slide.** So the solve may only
  ever LENGTHEN this one: the floor is its own `slideV` and the lock reaches further, never
  nearer. Sliding THROUGH him is what a slide tackle IS, and `hitAll` plus the swept limb already
  catch everybody he passes -- m43's own argument about the dash, one move over.
  **2. AND `STRIKE.swing` IS WHY IT BARELY CONNECTED.** That gate asks whether the limb is moving
  **in HIS OWN FRAME** -- the root's travel deliberately taken back out, which is the whole test
  for a swung arm against a carried one, and which m20 was right to build. `slide_kick` extends
  the leg ONCE and then holds it out while the body slides, so for nearly all of the move the
  boot's own-frame speed is near zero and **the sweep never counted at all.** `flying_kick` is the
  same shape: a held pose thrown across the air.
  **SO THE QUESTION BRANCHES RATHER THAN THE THRESHOLD MOVING** -- these two are the BODY
  arriving, which is m45's own sentence about the dash. `STRIKE.bodyAt` reads the ROOT's speed
  instead: live from u .08 to u **.87** of the tackle, which is nearly all of the travel, and it
  shuts by itself as the bleed runs out, which is the slide ending.
  **3. AND THE CONTACT IS HIS LEG, NOT HIS KNUCKLE**, which is the "bigger collide" he asked for.
  `STRIKE.r` is 18.6 cm on a 1.25 m body; `bodyR` is 44 cm -- and **because the sweep is a SPHERE,
  the same number widens the HEIGHT margin**, which is what lets a kick thrown from above reach a
  man's head. One constant, all three axes, by construction rather than as a special case.
  **AND A BODY MOVE'S WINDOW STAYS LIVE RATHER THAN CLOSING ON THE FIRST MAN.** `p.melFired` gates
  an ordinary strike to one connect, which is right for a swing and wrong for a six-metre slide
  through a line of men -- `d.cool` already stops any one of them being hit twice, so he takes
  them one at a time as he reaches each.
  **IT TRIPS THEM NOW (`slidePow` .78).** *"I'm thinking I'm gonna maybe have it trip them and
  have them fall over -- at very least it should deliver some damage."* It took `power[0]` .45,
  under every kind's `fling` (.70 on the warrior, .55 on the rest), so it could only ever stagger.
  .78 clears all of them and `dummyBlow` grades the launch from `fly0` across `fling..1` SQUARED:
      warrior   k .489  ->  **11.7 m/s out, 4.2 up**   against the finisher's 24 / 8.5
      the drunks and the skater  k .594  ->  15.4 out   -- a skinny man goes further, which is right
  **AND THE DAMAGE STAYS MODEST, WHICH IS HIS OWN SENTENCE.** *"Maybe a disarmed melee is just not
  that strong, which it probably shouldn't be."* `slideDmg` 1.1 against a fist's .8 and the
  finisher's 3.2 -- it costs more than a punch because you had to run at him for it.
- **AND THE FLYING KICK HAD NO LOCK AT ALL (m93, `MELEE.airMax`).** *"I want the flying kick to
  sort of aim assist -- even if you're up in the air and you're a little bit above them, if you
  flick the melee stick more or less towards them I want it to target them and I want to hit
  them."* `kickGo` set `p.melTgt = null` and never called `meleeLock`, so **the one move thrown
  from furthest away was the one with no assist on it.**
  **IT NEEDED NO VERTICAL TERM, WHICH IS WORTH SAYING BECAUSE IT IS THE OBVIOUS THING TO ADD.**
  `aimAt` is purely horizontal, so being above him does not change his bearing and the cone was
  never the problem up there. What was missing is the SWEEP's own height margin, and `bodyR`
  widens it as a side effect of being a sphere.
  Same reach-is-what-it-delivers rule as everything else here (m20, m72): the acquire radius is
  `airMax + arrive`, so a man past what the kick can cover is refused rather than aimed at and
  fallen short of -- and the solve is a FLOOR here too, doubly so, because a kick that shortens
  itself lands him on the floor beside the man. Floor 5.85 m, out to 8.50 at the acquire edge.
  **AND THE CHIP CARRIES THE TRAVEL** (`TACKLE6.2!`, `KICK5.9`). *"It seems to cut it short"* is a
  MEASUREMENT, and it is the one thing that tells "the solve shortened it" from "it travelled and
  went through him" apart from a phone. `!` is still the connect.
  **WHAT IS UNVERIFIED AND WHY:** nothing in this container can build a skin, so whether a 44 cm
  sweep radius reads as generous or as a phantom hit, and whether 6.2 m is the right floor for a
  slide, are device questions. The arithmetic -- the travels, the windows, the launch `k` and the
  damage -- is above and was. `mel.MELEE.slideFree = 0` is the one word back to m88, and
  `mel.STRIKE.bodyR` / `mel.MELEE.slidePow` are the two dials.

- **THE BACKFLIP LAUNCHED ON THE FRAME OF THE RELEASE AND THE CLIP LEAVES THE GROUND A THIRD OF
  A SECOND LATER (m92, `flipMarks`'s `off`, `p.bkHang`).** *"The backflip charge is cool and works
  mostly right. The problem is when you release to do the backflip, the upward velocity starts way
  before the backflip animation gets to its jump point. So I'm not sure how to rectify that --
  either speed up the backflip, or have him freeze frame later in the sequence, or something."*
  **HE IS DESCRIBING A MEASUREMENT AND IT COMES STRAIGHT OFF THE HIPS.** m87 found three landmarks
  in a flip clip -- the crouch, the apex and the landing -- and the one it did not look for is the
  one that matters here: **a standing flip does not leave the ground at the bottom of its crouch,
  it PUSHES first, and that push happens on the FLOOR.**
      Backflip     standing hips 38.4   crouch t+0.000 (28.3)   TAKE-OFF t+0.333 (38.5)
                                        apex   t+0.500 (45.4)   landing  t+1.125 (31.9)
      front_flip   standing hips 33.4   crouch t+0.000          TAKE-OFF t+0.000
  So m87 had him **rising through 0.333 s of leg extension -- 29% of the smallest flip's entire
  airtime.** `front_flip` reads 0.000 and leaves on its first frame, which is why the air double
  was already right and is byte-for-byte unchanged by this.
  **THE TAKE-OFF NEEDS NO THRESHOLD EITHER**, which is what lets one function serve both clips: it
  is the first key at or after the crouch where the hips are back to the height they were STANDING
  at (key 0), because that is where his legs have finished extending. On a clip with no wind-up
  the crouch IS key 0 and it comes out zero with no case of its own -- the same shape as `from`.
  **AND OF HIS THREE SUGGESTIONS THE ANSWER IS THE FOURTH ONE: HOLD HIM DOWN FOR THE PUSH.**
  Speeding the clip up makes the rotation wrong everywhere else; freezing later loses the push
  entirely and snaps the held crouch straight into mid-air, which is a jump cut. Holding him on
  the floor for exactly `off` and launching at the end of it makes **the clip and the physics
  agree BY CONSTRUCTION** rather than by two numbers being tuned toward each other.
  **IT IS NOT LATENCY, IT IS THE PUSH** -- `SLAM.hang`'s own argument, and unlike that one this
  is MEASURED off the clip rather than typed, so a re-export moves it.
      charge 0.00   apex 3.40 m   airtime 1.17s   rate x1.12   push 0.30s
      charge 1.00   apex 6.80 m   airtime 1.65s   rate x1.00   push 0.33s
  **THREE THINGS HAD TO MOVE WITH IT, AND EACH WOULD HAVE BEEN A BUG.**
  1. **`rigAnim`'s flip branch moved ABOVE the air test.** The first third of a second is spent
     ON THE FLOOR, so below it the gait takes that half and the flip only appears once he has
     already left -- which is the fault this build exists to remove, moved one frame later.
  2. **`p.flip`'s clear could not read `grounded` alone.** During the hang he is deliberately on
     the floor with the flip clip running, and `|| p.grounded` kills it on the first frame.
  3. **`flipDur` covers the push as well as the air.** Started at the launch, the clip's push
     half plays under a table not asking for it and the rotation is cut short by exactly `off`.
  **THE CHIP SAYS `PUSH0.28`** between `DUCK` and `FLIPback`, so the three beats of the move each
  name themselves -- "it never launched", "it launched early" and "the rotation is wrong" are
  three bugs and one picture from a phone.

- **HE REACHES INTO HIS BACKPACK, AND IT IS AN UPPER-BODY OVERRIDE OVER THE ORDINARY GAIT (m91,
  `SWAP`, `swapGo`, `applySlot`).** *"I now have an animation where he reaches into his backpack,
  so we need to use this every time he swaps weapons or takes one out or puts one away."*
  **A REACH IS SOMETHING YOU DO WHILE WALKING, so it must not own the body.** Every other
  one-shot here does -- a strike, a roll, a slam -- and each of those is a move you deliberately
  spend. A kit change is a TAP on the left pad, and half a second of not being able to move in a
  fight because you changed weapons is the wrong trade. So `weapon_swap` goes into `SPLIT.up` and
  the four gait clips drop to their `__legs` halves underneath it: **between them every bone is
  claimed exactly once, so they COMPOSE rather than average.**
  **THE TWO AT FULL `rest` SUMMING TO 2 IS CORRECT HERE AND ONLY HERE**, which is worth saying
  out loud next to this file's standing "the table must sum to 1" rule: that rule is about clips
  that claim the SAME bones, and these two are disjoint by construction. The committed branch has
  done the same thing since m19 for the same reason. **Averaging two clips that both key an arm
  gives a shrug**, and m19 is the build that paid for it.
  **AND THE WEAPON ARRIVES PART-WAY THROUGH THE REACH, NOT ON THE FRAME OF THE TAP** (`SWAP.at`).
  `MELEE.at`'s rule: the picture and its consequence have to be ONE event, and a weapon that pops
  into his hand on the input frame makes the whole animation a thing that happens afterwards for
  no reason. `applySlot` is the old `cycleKit` body, deferred -- and fired on the CROSSING rather
  than every frame past it, which is `p.gotUp`'s own shape one state over.
  **`.48` IS A GUESS AND IS MARKED AS ONE**, the taunt beats' own position (m65): a strike has an
  authored contact frame to measure against and a reach does not. `mel.SWAP.at` is the dial.
  **IT FALLS STRAIGHT THROUGH IF THE CLIP IS NOT THERE** -- `swapGo` applies the slot instantly
  and returns 0 -- so there is no branch to add the day it is re-exported under another name and
  none to remove if it goes. `CLIPS.block`'s pattern.
  **AND ANYTHING THAT OWNS THE BODY CANCELS IT, TAKING THE WEAPON WITH IT** (`swapStop`): a punch
  thrown mid-reach is the arms doing two things, and a swap you have to wait out is a swap nobody
  uses in a fight. The five callers are `meleeGo`, `rollGo`, `slamGo`, `wallGo` and the
  knock-down -- **and every one of them DELIVERS the slot rather than discarding it**, because the
  input was given and losing it to a collision is a tap that did nothing.
  **THE CHIP SAYS `SWAP0.31` THEN `SWAP✓`**, because "the reach never played", "it played and the
  weapon was already in his hand" and "it played and the weapon never arrived" are three bugs with
  one picture from a phone, and the tick is the half only `swapDone` knows.
- **AND THE WARRIORS ALWAYS SEND HIM FLYING NOW (m91, `FOE.knock` .35 -> 1).** *"Let's just make
  it right now so that the warrior aliens send him flying if they hit me. Period, end of story.
  Unless I block it. But I don't have the animations yet, so they just send him flying. He lands
  on the ground and gets up."*
  **m88 MADE IT A CHANCE FOR A REAL REASON AND HE HAS ANSWERED IT.** That concern was that three
  seconds of floor per hit is "being unable to move is the least fun state in any game" taken to
  its conclusion -- and two things make it fine now: **the fall actually reads** (m90 put the fall
  clip on from the blow rather than blending into a held pose), and **`HURT.again` 1.1 is what
  keeps three orcs from holding him down**, since a blow inside that window still hurts and still
  shoves but does not re-launch. That stays, and it is the only deviation from "period, end of
  story" -- stated rather than quietly kept.
  **AND `HURT.hits` IS NOW ONLY REACHED THROUGH A BLOCK**, which is right and is where those two
  clips belong: a blocked blow is the one that leaves him on his feet, so `take_damage_head` and
  `take_damage_body` are the block reaction until there is a block clip drawn.

- **THE WARRIORS HAD THE RIGHT SEQUENCE ALL ALONG, AND IT IS ONE LINE OF `bodyAnim` (m90).**
  *"The warrior aliens fly through the air and land perfectly on the ground, and they're playing
  one of the same animations I have on Zap -- I named it something like take damage and fall
  down. The problem with our hero is when he's hit through the air and then eventually lands, the
  momentum already stops and he's not laying down, and then he blends to a lay position and it
  looks horrible."*
  **HE IS DESCRIBING A STRUCTURAL DIFFERENCE, NOT A TUNING ONE, AND IT IS VISIBLE IN ONE LINE:**
      t[air && K.clips.air ? K.clips.air : d.cur] = 1;        // bodyAnim, line 7654
  **`FOE.clips` HAS NO `air` FIELD**, so a warrior plays his FALL clip (`Shoulder_Hit_And_Fall`)
  for the whole flight AND the landing -- one continuous animation started at the moment of the
  blow. That is the sequence he likes and it has been there since m35 without anybody writing
  down that the absence of a field is what makes it work.
  **m88 GAVE THE PLAYER THE OPPOSITE, IN BOTH HALVES.** `in_air` is a FLOAT LOOP, so the body
  looks static while it travels -- which is the *"momentum already stops"* -- and `laying_down`
  is ONE KEY. **A held pose is not an arrival**: nothing draws him going down, so the weight
  table drags him into the pose over a few frames, and that drag IS *"it blends to a lay
  position"*. There was never a fall in it at all.
  **SO THE FALL STARTS AT THE BLOW AND RUNS THROUGH THE GROUND.** `take_damage_and_fall_down`
  was sitting in the export unused since m85; it is `HURT.down` now, played from `playerHurt`
  rather than from the landing, and **the knock-down branch in `rigAnim` had to move ABOVE the
  air branch** -- left below it, `in_air` takes the whole flight and the fall only begins once he
  has already landed, which is precisely the shape being complained about.
  **AND THE CLOCK MOVED OFF `p.land` ONTO `p.knockT`.** The fall begins in the air, so a clock
  that starts at the landing is a clock that starts after most of what it is timing -- and a
  knock-down no longer enters a landing state at all, because a `landing_hard` on top of a fall
  clip is the second event that made the old one read as a blend. `HURT.land` is deleted rather
  than left: a constant nobody reads is indistinguishable from one that is broken.
      the flight     vy 5.59 m/s, 0.56 s, 3.96 m, arriving at 6.61 m/s
      the fall clip  2.042 s over a 1.35 s beat -> x1.51, and the flight is 41% of it, so the
                     rest is the landing -- the warrior's own shape (3.0 s over a 1.5 s beat)
      the get-up     2.708 s over 2.20 -> x1.23
      total down     3.55 s, against the warrior's 3.30
  **`laying_down` IS OUT OF THE SEQUENCE**, which is m41's rule (one fall and one get-up, so the
  pair cannot disagree) and this pair agrees: the fall ENDS lying down and `lay_to_get_up` STARTS
  lying down. `clampWhenFinished` holds the fall's last frame, so the lie is its own tail and
  needs no second clip. Naming it as a held tail is one word if the lie should ever outlast it.
  **AND A BODY ON THE FLOOR SCRUBS LIKE A BODY, NOT LIKE A MAN BRAKING (`HURT.skid`).** This is a
  second, separate bug found on the way and it is stated as one: the player's stop branch reads
  `MOVE.drag`, whose time constant is **2.11 s**, so landing at 6.61 m/s he had **13.9 m of
  slide** still to come, on his back. The warrior has had `knockDrag` 5.5 for exactly this since
  m37 and the player was simply reading the locomotion number. 5.5 is **1.20 m** and 0.18 s.
  **THE CHIP SAYS `FALL0.42` THEN `getup`**, because "the fall never played", "it played and the
  landing is wrong" and "the get-up is the bit that reads badly" are three bugs with one picture
  from a phone -- and the number is the clock both halves are cut from.

- **WALL COVER, AND THE WHOLE THING RESTS ON A FACT THIS GAME HAD NEVER ASKED FOR (m89, `WALL`,
  `wallFind`, `wallGo`, `stepWall`).** *"We have the animation from standing to wall. I only put
  in one standing-to-wall animation, so he'll always land in the equivalent of wall cover right --
  wall cover left and right are just him with his belly facing away from the wall, so he's
  flipped 180 back against it. Any sort of shimmy left and shimmy right. When you become close to
  a wall, if you're just pressing and holding the locomotion stick toward the wall, he'll
  naturally go into cover. You can use the locomotion stick to go left and go right, and then if
  you push away from the wall -- we'll have a little bit of a grace period for the moving left and
  right, and you really have to press directly away from the wall to get off of it. Or jump."*
  **WHERE IS A WALL AND WHICH WAY DOES IT FACE.** `resolveBoxes` pushes him OUT of things and
  `groundAt` reads tops; nothing here has ever been able to name a FACE. `BOXES` is axis-aligned
  -- m24 keeps every placement on a quarter turn for exactly this class of reason -- so **the
  closest point on a box's FOOTPRINT gives the distance to the face AND its outward normal in one
  step**: `clamp` per axis, then the vector from that point to him. No per-face tests, right
  whichever side he comes at, and **being INSIDE the footprint returns nothing**, which is what
  stops him latching onto the roof he is standing on. Shredworld's `ledgeGrab` rule, and **the
  LEDGE build wants this same function** -- which is the real reason this one went first.
  **NO BUTTON AND NO SECOND GESTURE.** The thumb that walks him at a wall is the thumb that
  latches him to it, which is why `into` is a DOT and not a distance: running ALONG a wall does
  not stick to it and walking AT it does.
  **AND LETTING GO IS A HOLD, NOT A FRAME.** `off` .62 is deliberately harder than `into` .45 --
  *"you really have to press directly away"* -- and `grace` .30 is the clock on top, which is
  what lets a diagonal shimmy overshoot for a moment without dropping him. The jump is tested
  FIRST, because it is the one exit that must never be eaten by the grace period.
  **FOUR OF THE NUMBERS SCALE WITH HIM (m52's rule) AND ONE DELIBERATELY DOES NOT.** How tall a
  thing has to be to hide you, where your chest is, how far your back sits off a wall and how
  close is close enough are all facts about his BODY -- and a typed 1.2 m is cover for a 1.75 m
  man and a wall a 1.25 m man cannot use. Measured over the test site, `SZ` .714:
      tall 0.857   chest 0.679   latch 0.636 m off the face   standoff 0.457 m
      typed        6 of 10 boxes were cover
      x SZ         **8 of 10** -- the 1.15 m and the 1.00 m blocks come in, and both are over
                   his chest, which is what cover MEANS. The 0.40 and 0.35 kerbs stay out.
      the 14 x 1.2 m slab at (0,-18) is 9.3 s of shimmy end to end at `speed` 1.5
  `speed` is NOT scaled: m53 is the build where he chose to keep his world speed at a smaller size.
  **THE SHIMMY RE-FINDS THE FACE EVERY FRAME RATHER THAN CLAMPING TO THE LATCHED BOX**, because a
  building's wall is a RUN of merged column boxes (m34) and sliding along it has to carry across
  them. A face whose normal disagrees with the one he latched is a DIFFERENT wall, so at the end
  of a run there is nothing to find and he simply stops -- which IS the end of the cover, with no
  edge test written. And the move is the stick's component ALONG the face and nothing else, so
  pushing into the wall does nothing and a diagonal is just its sideways part.
  **THE ENTRY CLIP'S LAST FRAME IS THE COVER IDLE, FOR FREE.** `clampWhenFinished` holds it, so a
  pose nobody drew costs nothing and the shimmy blends over it and back. And the entry animates
  IN PLACE (hips XZ 0.000 on all five wall clips), so **the STEP to the wall is code** -- he is
  lerped onto the standoff across `inDur`, which is what makes it read as an approach rather than
  as a snap with an animation over it.
  **AND THERE IS NO UNARMED `wall_cover_move_right`, SO IT IS THE LEFT ONE PLAYED BACKWARDS.** A
  shimmy is a symmetrical slide, so a negative `timeScale` IS the other direction -- and unlike
  Shredworld's `aimBack` this needs **no clone**, because only one direction is ever live at a
  time and there is nothing to weight against itself. The RIFLE set has both drawn and uses them,
  picked off `slotNow().aim`.
  **`+side` IS HIS RIGHT, AND THE SIGN CANNOT DISAGREE WITH THE MOTION** because the clip picker
  and the move read the same tangent: he faces along the normal, his right is `(-fz, fx)`, and
  with `f = (nx, nz)` that is `(-nz, nx)`.
  **THE TWO TRANSITIONS ARE IN `ONCE` AND THE TWO SHIMMIES MUST NOT BE** -- a looped stand-up is
  a man getting up for ever, and a one-shot shimmy stops after one cycle.
  **STATED GAPS.** `WALL.ref` 1.2 is a **guess, not a measurement**: the shimmy clip animates in
  place, so there is no authored travel to read the way `npm run gait` reads a walk, and `mel.WALL
  .ref` is the dial if his feet slide. There is **no desktop binding needed** (this is the LEFT
  pad, which the keys already drive) but **no corner turn**: he stops at the end of a face rather
  than rounding it, which is honest and is what the clips support. And nothing in this container
  can build a skin, so whether the entry reads at x1.9 and whether the belly-out pose lines up
  with the face are device questions -- `mel.WALL` is live. The chip says
  `WALL(down/up/left/right/dot)`.

- **THREE OF HIS FOUR ASKS WERE ALREADY MACHINERY WITH EMPTY HOOKS (m88).** *"That slide tackle
  can now be if you're running and you melee -- it becomes the first link in the melee sequence,
  but I want it to only trigger if you've actually got a few steps in, not just if you're holding
  a direction. Flying kick is if you jumped in the air and you melee. I want the orcs to hit me
  and me to play the take damage animation, but I also want them to be able to swing and send me
  flying... when I get sent through the air I don't land on my feet, I always land on my back
  laying down and then I get up."*
  **NOT ONE OF THEM NEEDED A NEW STATE**, which is the whole return on `p.melee` being a clip, a
  beat and a solved velocity rather than three hard-coded moves, and on m67 writing `HURT.down`
  and `HURT.up` as `''` and running the states regardless.
      the tackle      a strike with `slide_kick`, `slideDur` and `slideV`
      the flying kick a strike with `flying_kick`, `airDur` and `airV`, ended by the GROUND
      being hit       `HURT.hits` named; `down`/`up` filled
  **"A FEW STEPS IN" IS `p.runT`, AND `p.goT` IS EXACTLY THE THING HE RULED OUT.** `goT` is how
  long he has been ASKING to move -- a thumb held -- which is his own sentence for what must not
  trigger it. `runT` is how long he has actually BEEN over `slideAt`, and it is read from LAST
  frame's speed, which is the right one: the question is whether he ARRIVED at this flick
  running. At 4.2 m/s a stride is about 1.3 m, so `slideT` .45 is three of them.
  **AND IT IS AN OPENING, NOT A FOURTH STRIKE** -- running at somebody and hitting melee is one
  move, not two decisions. `p.meleeIx` stays 0, so the next flick takes link two and the chain
  reads on from it exactly as it would have. It gets its own `slideMax` 7.5 m because
  `lungeMax` 4.6 is the cap for a standing lunge and a tackle is supposed to cross ground.
  **THE FLYING KICK ENDS WHEN HE MEETS THE GROUND, WHICH IS THE OPPOSITE OF EVERY OTHER
  STRIKE** -- they all end when he LEAVES it -- so that test BRANCHES rather than gaining a
  clause, `slamGo`'s own rule. `p.meleeT > .1` is what stops it cancelling on the frame it
  began, because he can be one frame off the floor when it fires. It keeps its drive in the air
  for `chargeGo`'s reason (there is no ground to scrub against, and a kick that bleeds to
  nothing mid-flight drops straight down), and **it does not touch `vel.y`**: he is already
  ballistic, and driving the vertical would make it a second slam. One per airtime
  (`p.airKick`, cleared beside `p.jumps`), or it is a flutter kick across the street.
  **`FOE.knock` IS A CHANCE NOW, NOT A FLAG.** *"Maybe like a few swings -- I'm not sure if they
  have a big swing versus a small swing; if they don't, that's fine, we can just have it be
  random."* There is one swing pool and no big/small in the export, so **the variety is in what
  the blow DOES rather than in which clip threw it**. At 1 every mace hit put him on his back,
  and with the lie and the get-up that is nearly three seconds of floor per blow -- which is
  "being unable to move is the least fun state in any game" taken to its conclusion. At .35 most
  swings stagger and about a third launch. `mel.hurt()` passes 1 and still always launches.
  **A ONE-KEY CLIP IS A POSE, AND `normaliseClips` WAS DROPPING IT.** `laying_down` is 1 key and
  0 bones moving, so `resetDuration()` returns 0 and the guard threw it away with
  `CLIP laying_down duration 0` in the chip. That guard is for a NEGATIVE duration -- the
  shared-`times` landmine -- and zero is a different thing entirely: this file already derives
  `aimPose` as a one-key clip at duration .1 for exactly this reason. Negative still reports and
  drops; zero is kept at .1, which it has to be because a clip of duration 0 on repeat divides
  by its own length.
  **AND THE GET-UP IS FIRED ON THE CROSSING, NOT EVERY FRAME PAST IT (`p.gotUp`).** Without the
  edge, `playOnce` rewinds the clip on every frame of the get-up and he never stands -- the same
  shape as the `ONCE` rewind landmine, one level up.
  **THE KNOCK-DOWN HOLDS FULL WEIGHT THROUGH BOTH HALVES**, rather than giving way at
  `landFree` the way an ordinary landing does. That is `landFree`'s own rule pointed the other
  way: it exists so a landing does not cost you a step you were already taking, and a get-up you
  can nudge out of is a get-up nobody ever sees. One `p.land` clock carries the lie AND the
  get-up, which is what keeps `wantSp = 0`, the not-cancellable test and the chip line unchanged.
  **AND `rest` IS `1 - everything already claimed`, NOT `1 - the landing`.** There are two
  one-shot layers now, and two at full weight sum to 2 -- the gait's budget goes negative, which
  over-applies rather than bleeding the bind pose in, but it is the same class of fault. The
  loop closes it in general and a stagger is skipped outright while a landing is live, because
  that overlap is real and the landing should win.
  **m87 SHIPPED BOTH FLIPS OUTSIDE `ONCE`, WHICH IS A BUG FIXED HERE.** They were played through
  `playOnce` and would have LOOPED; `p.flip` clearing on its own clock hid most of it. Every new
  one-shot is in that set now -- the flips, the duck, the two openers and the three reaction
  poses -- and `laying_down` is the whole of what `clampWhenFinished` is for.
  **WHAT IS NOT DONE, AND IS EACH ITS OWN BUILD:** the WALL COVER system and the LEDGE system.
  Both need something this game has never had -- a test for "is there a wall/lip near me, and
  which way does it face" -- which is Shredworld's `ledgeGrab`/`HANG` and its solid-box grid, and
  neither the detection nor the state machine is a rider on an animation change. The clips are
  all in the file and measured: `ledge_hang_idle` (2.33 s, 8 bones, a real subtle dangle),
  `ledge_hang_hop_left/right`, `ledge_hang_to_get_up_over_ledge` and `ledge_hang_to_jump_away`,
  all five with hips XZ 0.000 -- **in place, mantle included**, so the code drives the arc and
  the hop distance exactly as it should.

- **THE SECOND JUMP IS A FLIP, AND THE RIGHT PAD HELD AT REST IS A CHARGED BACKFLIP (m87, `AIR`,
  `flipGo`, `backGo`, `flipMarks`, `poseAt`).** *"We're gonna have a double jump. Second jump is a
  flip, a front flip. Also, if you're on the ground and you press and hold the right stick, he
  ducks and it charges a backflip, and then when you release he backflips and it's high."*
  **THE ONLY FREE GESTURE LEFT ON THAT PAD IS A HOLD AT REST, AND THAT IS EXACTLY WHAT HE ASKED
  FOR.** Up is the trigger, the wind-up and the square-up (`padUp`); down is the guard; sideways
  is the camera; a tap is the jump and a flick is a strike. What nothing has ever read is a thumb
  that goes down, stays near the middle and stays there -- and `MOVE.tapT`/`tapR` already draw
  that line, because they are precisely what makes something NOT a tap. No mode, nothing to be in
  without knowing it.
  **AND A CAMERA DRAG CANNOT BECOME A BACKFLIP, BY CONSTRUCTION.** `out.far` is a HIGH-WATER MARK
  for the whole touch, so one sweep anywhere in the hold kills the charge for the rest of it and
  it can never come back -- the same property that makes this safe to share a pad with the look.
  It is also what makes the trigger, the wind-up and the guard need **no coordination at all**:
  every one of them arms past `fireAt`/`blockAt`, which is far past `tapR`.
  **`.42` WAS A LITERAL IN `bindStick` AND IS `MOVE.tapR` NOW.** Two copies of the tap radius is
  two things to drift, and this build needed the same number to decide what a drag is.
  **THE DUCK IS ONE KEY LIFTED OUT OF THE BACKFLIP'S OWN WIND-UP.** `Backflip` is a STANDING
  backflip: measured off the Hips height it drops from 38.4 to 28.3 over its first third of a
  second, then pushes to a peak at +0.500 and absorbs into a landing at +1.125. That opening dip
  IS the duck, so the charge pose is that frame held -- **in register**, so the release continues
  from the very frame the hold was sitting on and there is no seam to blend over. `aimPose`'s
  trick at a measured time rather than at frame zero, which is why `poseAt` samples through the
  track's OWN interpolant: a component-wise lerp between two quaternion keys is not a rotation.
  **THE THREE LANDMARKS ARE MEASURED, NEVER TYPED (`flipMarks`).** The hips carry the body's
  height off the ground, so a standing flip reads as a dip, a peak and a second dip -- the crouch
  it winds up through, the apex, and the landing absorb. Taking them off the curve means the
  wind-up is FOUND rather than trimmed by hand, and a re-export at any length lands right:
      front_flip   dur 0.833s   crouch 0.000   apex +0.292   air 0.667s
      Backflip     dur 2.167s   crouch 0.333   apex +0.500   air 1.125s
  **AND THE CROUCH NEEDS NO THRESHOLD**, which is the part that makes one function serve both: it
  is the argmin of the hips inside the opening `AIR.scan`, and on a clip with no wind-up that
  argmin is the first key. `front_flip` rises from its very first frame and comes out `from` 0.
  **THE APEX IS THE NUMBER CHOSEN AND `vy` IS DERIVED FROM IT** (m21's rule). An ordinary jump is
  2.81 m and 1.06 s, so even a bare release clears it:
      charge 0.00   apex 3.40 m   vy 11.66   airtime 1.17s
      charge 0.50   apex 5.10 m   vy 14.28   airtime 1.43s
      charge 1.00   apex 6.80 m   vy 16.49   airtime 1.65s
      the double, tapped at the apex of the first   apex +5.19 m   0.98 to 1.21 s of air left
  **THE SECOND JUMP IS SET, NEVER ADDED.** Added to whatever he had, a double off the top of a
  jump goes into orbit and one off the bottom of a fall does nothing; set, it is the same height
  whenever it is spent, which is what makes it a save you can rely on. And the gate is
  `p.jumps === 1`, so **walking off a box grants nothing** -- the double exists only if he
  actually took the first. `coyote` still covers the first .12 s off a ledge.
  **A BACKFLIP SPENDS THE DOUBLE** (`p.jumps = 2`). A front flip started out of a backflip is two
  rotations fighting over one body, and the backflip is already the higher jump of the two.
  **AND THE FLIP RATE IS FLOORED AT 1, NOT FITTED IN BOTH DIRECTIONS.** Stretching a clip to fill
  the air is the board-trick rule from one repo over and it is wrong here: these two are drawn at
  the speed a flip reads at, so slowing one to fill a long hang is slow motion. It is only ever
  sped UP, when the air is too short to fit it -- and at today's heights both come out at exactly
  **1.00**, so that term is the guard for a re-export or a retune rather than a live scaling. The
  flip then finishes with air to spare and `in_air` takes the rest, which is the landing being
  aimed rather than the rotation still coming round.
  **AND THE CHIP SAYS WHICH OF THE THREE IT IS.** `DUCK0.62`, `FLIPback0.42`, `FLIPfwd0.31` --
  "it never ducked", "it ducked and the release did nothing" and "it flipped and the rotation is
  wrong" are three bugs with one picture from a phone.
  **STATED GAPS:** there is **no desktop binding**, because m79 maps the left mouse button to the
  right pad at full deflection UP (`stick.R.far = 1`), so the hold can never be at rest -- the
  same gap the guard has. And **nothing here can see a skin** (the GLB is draco and `DRACOLoader`
  wants a Worker), so whether `Backflip`'s frame 8 reads as a duck, and whether 6.8 m is "high"
  rather than silly, are device questions. `mel.AIR` is live.

- **A SMALL BODY LANDS LIGHTER, AND THERE WERE TWO MEASURES OF "SMALL" (m84, `STEP.sizeG`,
  `voxWeight`).** *"I think we need to turn down the footsteps for Clancy cause he's like
  small."*
  **IT IS NOT A CLANCY NUMBER, WHICH IS THE WHOLE POINT.** m66 gave every NPC the same `npcG`
  .52 -- one gain for a knee-height sidekick and a 1.85 m orc -- so the honest fix is the one
  the voice already had a day earlier: read the body's own size and let every kind be its own
  weight with nothing typed. `sizeG` 1.1 on the height ratio:
      Clancy h .62 -> x0.319     skater 1.68 -> x0.956     warrior 1.85 -> x1.063
      his walk lands at g 0.033 against an adult's 0.104 -- **32% of an adult footfall**
  **AND THE ADULTS MOVE BY AT MOST 4%**, which is what says this is a size rule rather than a
  Clancy patch. `sizeG` 0 is flat, which is m83 exactly.
  **THE RATE GOES UP WITH IT, ON THE TERM THAT ALREADY MEANT WEIGHT.** `STEP.r0`/`r1` are
  "heavier is lower" across his speed range, so a small body is the same idea on the same term
  rather than a new one -- the metal clangs' rule, for the third time this week. A fifth higher
  and a third as loud is the difference between "quieter" and "smaller".
  **AND BOTH ARGUMENTS DEFAULT TO 1**, so the PLAYER's own `footSnd` call is byte-for-byte what
  it was: this is about the bodies, and he is not one of them.
  **BUT THE REAL FINDING IS THAT I HAD JUST BUILT A SECOND MEASURE OF SIZE.** m83 fitted
  `voxSize` to the collider RADIUS; the footsteps needed the same question answered, and **a
  game with two answers to "how big is this body" has two answers to everything downstream** --
  which is the `KIT.on`-with-three-owners bug wearing a different hat, caught one build after
  creating it rather than four builds later. It is `K.h` for both now, and height is the better
  of the two on its own merits:
      it is the number he SETS per character (*"he should be small"* is `h: .62`)
      it spans **3x** across the roster where the radii span 1.6
      and a radius is collider tuning that only CORRELATES with size
          on RADIUS   Clancy 1.21   skater 1.03   officer 0.97   warrior 0.93
          on HEIGHT   Clancy 1.21   skater 1.01   officer 1.00   warrior 0.99
  **`CVOX.k` IS SOLVED SO CLANCY LANDS EXACTLY WHERE m83 PUT HIM** (1.2081 -> 1.2077), so
  swapping the measure moves the voice by nothing and the feet are the only new thing -- **each
  toggle has to move one variable or neither can be judged**, and only Clancy has a `chirp` so
  no other body's voice exists to change. What it also does is collapse the adults onto 1.0,
  which is the honest answer: they ARE all the same size, and the old spread was reading a
  collider number as a body.
  **`voxWeight` READS `STEP` FROM 78 LINES BELOW IT**, at CALL time, from `bodyFeet` -- not a
  TDZ, and there is a comment saying so, because this file has been bitten eight times by the
  real thing and the shape is worth not mistaking.

- **CLANCY HAS A VOICE, AND THE MECHANISM WAS WORTH MORE THAN THE FILES (m82/m83, `CVOX`,
  `bodyVox`).** *"I think we could steal some of the creature noises from Plutopia for Clancy's
  little noises."* Then: *"No, they're definitely used. Are you sure you're grabbing the right
  ones?"*
  **HE WAS RIGHT AND I HAD GREPPED FOR THE WRONG WORD.** I searched Plutopia for `'creature'`,
  found only the filenames, and shipped m82 saying the bank was unused over there. **The key is
  `beast`**, and `snd.beast` is a whole system: a `beastTick` that picks a near animal every 3.4
  to 8.5 s, six MOODS, a per-creature gap, and a pitch derived from the animal's size. Grepping
  for the value when the thing you want is keyed by a name is how you conclude a live system is
  dead -- **search for the KEY, not for the payload.**
  **AND THE SEVEN FILES ARE UNLABELLED ON PURPOSE, WHICH IS THE ANSWER TO HIS QUESTION.**
  Plutopia's own note: *"Naming one of them 'angry' would spend it on one feeling; kept as one
  voice they are the ISLAND'S voice, and which feeling it is comes out of pitch and weight
  instead."* So there is no calm subset to grab and no angry one -- **all seven are every mood**,
  which means the files were right and it was the MECHANISM that was missing.
  **THE MOOD TABLE IS PLUTOPIA'S, UNCHANGED**, `[rate, gain]`: alarm goes up and gets shorter,
  anger goes down and gets louder, contentment sits low and quiet, a hurt one is a bark at the
  top of its range. One pool doing six jobs, which is the metal clangs' rule (three car tiers by
  PITCH, not three recordings) stated from the other side -- and it is strictly better than the
  single `r` range m82 shipped, because that conflated "which feeling" with "not the same twice".
  The jitter is its own term now.
  **BUT THE SIZE CURVE IS THE ONE THING THAT DOES NOT PORT, AND IT WOULD HAVE BEEN SILENT.**
  Over there it is `pow(1.05 / clamp(rad, .5, 2.6), .45)` -- half an octave across a 5.2x range
  of creature. **Every body in THIS game has a radius between .28 and .46**, so that clamp puts
  all of them on its FLOOR and returns the identical pitch for a knee-high sidekick and a 1.85 m
  orc. Nothing would have thrown; it would just have sounded wrong. Same curve, refitted --
  `ref` .40 over a 1.9x range with `k` .53 solved so that range still spans half an octave
  (`1.92^k = 1.41`):
      Clancy r .28 -> x1.208   skater .38 -> x1.028   hobo .40 -> x1.000   warrior .46 -> x0.929
      span across the roster 1.30x, and the clamp keeps headroom either side
      Clancy's own moods:  calm 1.09   fond 1.14   angry 0.99   alarm 1.50   hurt 1.62
  **A ported number is only as good as the shape of the world it was tuned in**, which is now the
  fourth time across these repos after the see-through hole's radius, the jetpack's palette and
  the aim assist's cone.
  **IT IS READ OFF `K.r`, THE COLLIDER RADIUS THAT ALREADY EXISTS**, so a body added tomorrow is
  pitched for its own size with nothing typed -- and `voxSize` is called from the HIT path too,
  or one body would be two different creatures depending on what happened to him.
  **`BODYSND.grunt` STAYS ON THE HIT PATH RATHER THAN BECOMING A MOOD**, because it maps POWER to
  gain and rate and the mood table cannot: a jab and a full charge are not the same noise. What
  it was missing was only the size term.
  **THE MOODS ARE WIRED TO STATES THAT ALREADY EXISTED, one line each:**
      calm / fond   the ambient tick, and WHICH one is how near you he is. Plutopia picks this
                    off the animal's `trust`; a sidekick has none to grow because he is already
                    yours, so the honest equivalent is that he is happier stood next to you
      alarm         the m81 dive -- the one moment a sidekick's voice has something to be about
      angry         his own swing (`foeSwing`), which is m75's punch
      daze          the get-up, the one beat of a knock-down with no noise on it
      hurt          `dummyBlow`, through `K.voice` -- m62's hook, and it needed no code at all
  **AN EVENT RE-ARMS THE AMBIENT CLOCK**, so a mood and a chirp can never stack and m81's
  two-dive scramble is one yelp rather than two.
  **AND HE ONLY CHIRPS WHEN NOTHING IS HAPPENING TO HIM** -- `hit`, `down` and `up` already have
  a noise, and a chirp on top of a grunt is two voices describing one event, m27's duplicate. The
  clock still runs through them, so he does not go quiet for a minute after a fight.
  **THE INTERVAL IS RE-ROLLED EVERY TIME AND SEEDED AT SPAWN.** A fixed one is a metronome, which
  is what a creature is not (`SMOKE`'s rule, m41); and seeded rather than started at zero, or
  every body chirps on frame one and then on the same frame for ever -- m50's staggered get-ups,
  on the audio side. It is a NUMBER rather than `undefined`, because `undefined -= dt` is NaN and
  a NaN clock is a body that never speaks again (m63).
  **A KIND WITH NO `chirp` NEVER REACHES ANY OF IT** -- no ambient tick, no moods, and `voxSize`
  returns 1 on the hit path -- so the two drunks, the skater, the officer and the orcs are
  byte-for-byte what they were. m38's empty-field pattern, which is why none of this needed a
  gate naming anybody. Giving the skater a voice is two words.
  **NOTHING HERE PASSES `cut` OR `dec`**, which is correct: those are for an IMPACT, a transient
  that has to start at its own peak (m59). A vocalisation plays whole, through `SFX.edge`'s
  ordinary onset trim, which since m59 is relative to the file's own peak and handles a natural
  attack for free.
  **AND `audio/creature_noises` HAD TO GO INTO `bump.mjs`'s `DIRS`** -- `readdirSync` is not
  recursive, so a new asset folder is a new entry there or every file in it goes stale silently.
  **Sixth time**, after `models/buildings` (m25), `audio/plasma_sounds` (m58), `models/towers`
  (m60), `audio/alien_orc_grunt_sounds` (m62) and Shredworld's own.
  **WHAT IS NOT PORTED, AND IS STATED:** Plutopia's `beastTick` picks ONE near animal out of all
  of them so the island speaks with one voice at a time; here every body with a `chirp` runs its
  own clock, which is right for one sidekick and would want that picker the day a second kind
  gets a voice. `mel.CVOX` is live and `mel.snd('creature')` plays one from the console.

- **THE DIVE COULD NOT LEAVE THE WEDGE, AND PAST 7 m THAT WAS ARITHMETIC (m81, `K.dive.clear`).**
  *"The little Clancy sidekick still just constantly walks in front of my shot. His reflexes or
  anticipation are terrible. I feel like the instant I shoot or charge he should jump out of the
  pizza slice of direction of my aim. I should be able to shoot him but it should actually be a
  struggle, not an accidental regular occurrence."*
  **HIS WORD "PIZZA SLICE" IS THE DIAGNOSIS.** m74 built the dive as a FIXED 3.1 m sideways and
  m76 sized that against the BLAST (1.35 m on a pal) and called it done -- but the thing he is
  actually asking to leave is a WEDGE, and a wedge is a different width at every range while
  `v * dur` is the same 3.12 m at all of them:
      needs dd x tan(cone) to reach the edge, from dead on the line
       3 m -> 1.34   5 m -> 2.23   7 m -> 3.13   9 m -> 4.02   11 m -> 4.91
      dive covers 3.12   ->   **break-even 6.99 m, against a `range` of 11**
  So over a third of the range this was defined over was range where the dive fired, played its
  clip, cost its cooldown and **left him in the cone** -- at 11 m it ended 0.28 rad in against a
  0.42 cone. Every previous pass tuned the trigger (m76 moved it off the latch onto `p.armT`,
  which was real) and none of them touched the one number that could not work.
  **SO THE DISTANCE IS SOLVED, NOT TYPED.** `off` is how far off the firing line he is as seen
  from the PLAYER, so his perpendicular from the line is `dd*sin|off|`, the wedge edge at his own
  along-distance is `dd*cos(off)*tan(cone*clear)`, and what is left is what he has to cover. The
  speed falls out of it over `dur` -- m21's rule (the number is the thing you chose, the velocity
  is derived) one move over, and this is the second time in this file a typed distance has been
  the whole bug after the trigger was fixed twice.
  **AND THE CAP IS HONEST RATHER THAN HIDDEN.** Clearing an 11 m wedge in one move is 11.6 m/s,
  which is a teleport, so `vMax` 7.5 bites -- and `cool` 1.0 -> **.25** is what makes that fine:
  the next dive re-solves from wherever he got to and finishes the job. **Two hops of a scramble
  reads better than one impossible leap**, and it stops by itself, because a dive from outside
  the cone never fires. Simulated over the shipped formula:
      at  3 / 5 / 7 m      ONE dive, out at .53 to .68 rad
      at  9 / 11 / 13 m    TWO, 1.6 s, out at .57 to .68
      9 m already .35 off  ONE, and a shorter one -- the solve reads what he has already got
  `cone` .42 -> .52 so he answers a shot loosely lined up rather than one already on him, and
  `range` 11 -> 13.
- **AND THE REFLEX WAS NEVER GOING TO BE ENOUGH, BECAUSE THE HABIT WAS SWITCHED OFF (m81).**
  m76 wrote this gap down and left it: *"nothing stops him being in the lane while POUNCING --
  joining the fight outranks it, which is right, but it means the one time he is deliberately
  near an enemy you are shooting is the one time the clear is switched off."* **That is not a
  corner case, it is THE case.** `palFoe` returns a MARKED body, a mark is a body you just hit,
  so the pounce is live precisely while the trigger is -- and the pounce `return`s above the lane
  clear. The loop he is describing is exactly that: dive, cooldown, pounce, walk back into the
  line, dive again.
  **`aimLive && clear` STANDS THE POUNCE DOWN**, and that is the whole change -- one clause, with
  `palPost` hoisted above it so there is one call and one answer rather than two. The dive is the
  REFLEX and the clear is the HABIT, and a build that only ever fixed the reflex could not have
  worked however well the reflex was tuned.
  **WHAT IS NOT DONE:** the hammer's wind-up does not make him dive. It sets `p.chargeT` rather
  than `p.armT`, and it is a melee -- diving from it would be a sidekick flinching at something
  that cannot reach him. His *"shoot or charge"* is the blaster's charge, which `p.armT` covers.
  And the lane clear is still horizontal and knows nothing about the boxes (m76's other gap).
- **A MELEE TURNS THE LENS (m81, `CAM.melEase`, `p.camWant`).** *"I want to try making it so that
  the camera centers based on my melees -- so if I melee toward the camera, the camera will ease
  to my new forward, and for every direction."*
  **IT IS A WANT, NOT A WRITE, AND THAT IS THE ONLY WAY IT COULD BE BUILT HERE.** `cam.az` has
  **exactly one writer** -- this file's oldest standing invariant, and the one that shows up every
  single time it is broken -- so `meleeGo` states a bearing and `stepCam` is the one place that
  spends it, sitting beside the lock's own come-round for the identical reason.
  **AND `h` IS THE DIRECTION HE ACTUALLY STRIKES, taken AFTER `meleeLock` has had its say** -- so
  a locked swing turns the camera onto the MAN rather than onto the thumb, which is m20's "one
  answer" rule arriving on the camera side.
  **THE THUMB OUTRANKS IT**, which is why both drag writers clear it outright rather than being
  averaged with it: an auto-follow fighting a deliberate drag is the loop that never settles.
  **AND IT COSTS NOTHING TO HIS FACING**, because `faceTgt` reads `cam.az` while aiming -- the
  lens and his forward are the same bearing here, which is what makes this a CENTRING rather than
  a second thing to keep in step. The charged dash sets it too; a dash is a melee.
- **A FLICK DOWN IN THE AIR IS A SLAM (m81, `SLAM`, `slamGo`, `slamLand`).** *"If I jump and swipe
  down on right stick he does a slam down to earth, which we can use the same melee as the charge
  attack (minus the charge) because that is actually where that animation fits."*
  **THE GESTURE WAS FREE AND THAT IS WHY IT FITS.** `meleeGo` returns on `!p.grounded`, so a flick
  in the air did nothing at all -- the one unspent thing on a pad whose tap is the jump, whose
  hold is the trigger and whose ground flick is the strike. And DOWN is free specifically: down
  HELD is the guard (m37), and a flick is a fast move and a release, which `padUp`'s own
  hysteresis argument already separates from a hold.
  **THE DIRECTION TEST IS THE PAD'S RAW TRAVEL, NOT `flickH`.** That function maps a flick into
  WORLD space through `cam.az`, which is exactly right for a strike thrown somewhere and
  meaningless for one thrown at the floor: down-the-screen is down-the-screen whatever the camera
  is doing. The pad's +Y is DOWN (`flickH(0, -1)` is the desktop punch and that is straight up).
  **IT ENDS WHEN HE MEETS THE GROUND, WHICH IS THE OPPOSITE TEST FROM EVERY OTHER STRIKE** -- they
  all end when he LEAVES it. So it is its own branch rather than a clause on that one: sharing
  that condition would have it cancel itself on the frame it began.
  **AND THE HANG IS WHAT MAKES IT READ.** Dropped straight from the flick it is over in a tenth of
  a second and looks like a fall; stopped dead for `hang` .16 first, it is a wind-up and then a
  drive. **`down` 12 is a DRIVE and not a drop**, which is the difference between slamming and
  falling.
  **THE CLIP IS COMPRESSED TO THE PREDICTED ARRIVAL, WHICH IS KNOWABLE.** The fall height is
  `groundAt` under him, so `t` solves out of `h = down*t + g*t^2/2` -- m8's landmine, and this is
  a state whose length genuinely is not a constant. **And the rate ceiling is not a taste number**:
  the charged dash already plays this same clip over `dashDur + finishTail` = .52 s, so 3.5 is the
  rate he is looking at on it today.
  **A SLAM GOES IN EVERY DIRECTION, SO IT IS A RADIUS AND NOT A CONE.** Every other blow here is a
  cone because it is thrown somewhere; this one throws each man OUTWARD from where it landed,
  which is one bearing per body and not one for the lot -- so it is a loop over `dummyBlow` rather
  than a `dummyHit` call. **A friend is harder to catch through `WEAP.palBlast`**, m76's own
  number, so "how much a friend is spared" stays one dial.
  **AND IT HANDS TO THE HARD LANDING**, because `rateMax` means a low slam plays only part of the
  swing and ending there would snap him from mid-arc into the idle -- a jump cut, which nothing in
  this file is allowed to be. `landing_hard` is a man hitting the ground and pushing back up off
  it, which IS the follow-through, so this took the state that already exists.
  **ONE PER AIRTIME (`p.slamUsed`, cleared where `p.jumps` is)**, or a thumb flicking repeatedly is
  a man hammering the floor all the way down. And **the failsafe may not end it in mid-air**:
  `SLAM.max` can run out before the ground arrives over a drop, and a landing state entered
  airborne is a man lying on nothing -- the ordinary fall takes him from there, which needed no
  case of its own.
  **THE CHIP SAYS `SLAM<dur>` and gains `!` when it connects**, the swing's own idiom: "it never
  fired", "it fired and reached nobody" and "it landed" are three bugs with one picture on a phone.
  **WHAT IS UNVERIFIED AND WHY:** nothing in this container can build a skin, so whether
  `weapon_melee_finish` reads as a slam at 3.5x, whether `hang` .16 is enough of a beat, and
  whether the camera's half-second sweep is decisive or lurching are all device questions.
  `mel.SLAM` and `mel.CAM.melEase` are live, and `melEase = 0` is the one word back to m80.

- **A NEW NPC COST A TABLE AND A LOAD LINE, FOR THE FIFTH TIME (m80, `SKATER`, `buildSkaters`).**
  *"Hey I just added a alien roller skate blue model, can you add her to the game as an NPC?"*
  **THE FILE HAD ARRIVED AND WAS NOT WHERE THE OTHERS ARE.** `models/alien_rollerskate_blue.glb`,
  in `models/` rather than `models/characters/` -- so a listing of the characters folder came back
  with the seven that were already there and said nothing. **`git log --stat -1` is the command**,
  and it is worth reaching for first every time: this repo's other failure mode is an EMPTY commit
  (m58: four of his five "fixed colin" pushes never left his machine), and "the file is somewhere
  else" and "the file never came" are one picture from a directory listing.
  **IT IS LEFT WHERE HE PUT IT.** `models` is already in `bump.mjs`'s `DIRS`, so `A()` hashes her
  contents and a re-export under the same name actually reaches his phone -- and moving it would
  be a 404 the next time he drops the same file in the same place, which is the audio filenames'
  own rule (`gound_01`, `.mp4` in the middle of a skateboard name) one asset type over.
  **AND SHE NEEDED NO BUILDER, NO BRAIN AND NO SECOND PATH.** The bolt, the swept limb, `bodyFly`,
  `bodySep`, `dummyBlow`, the player's own resolver and `foeWander` all reach anything in
  `DUMMIES`, so `buildSkaters` is `buildHobos` with a different table in it. That is `d.K`'s
  dividend for the fifth time and it is why this build is a table and a `side(...)` line.
  **MEASURED BEFORE A LINE WAS WRITTEN, which is what those two tools are for** -- and they are
  not a verification pass: `walkRef` and `runRef` are numbers the table CANNOT be written without,
  and eyeballing them is what put the city's rifle run 36% too fast and its walk 37% too slow in
  one build, in opposite directions.
      1 mesh / 1 material / 1 texture, 67 nodes, draco + EXT_texture_webp + specular
      authored height 0.9995 m, soles at EXACTLY 0        -> x1.681 to stand 1.68 m
      toes (0.0000, 1.0000), shoulders cross-check 1.0000 -> +Z, like everyone else here
      NO weapon mounts, which is right -- an NPC, not a wearer
      13 clips; `CINEMA_4D_Main` is the usual one-frame residue
      idle     0.002 m/s   <- THE CONTROL, and the reason the other two can be believed
      walking  0.807 authored, feet AGREE            -> walkRef .81
      running  2.005, **feet disagree 25%** (L 2.26, R 1.75) -> runRef 2.00
  **THAT 25% IS REAL AND IS IN THE CLIP**, reported rather than quietly averaged away -- the
  warrior's own m35 shape. If her run ever reads limpy, that is why.
  **HER TURN CLIPS ARE HER HIT REACTIONS, AND THAT IS A JUDGEMENT SAID OUT LOUD.** This export is
  locomotion and nothing else: no `hit_*`, no fall, no get-up. On the hick a turn plays as a
  stumble because he is drunk; on a body ON WHEELS a blow that spins her round is what actually
  happens, and m78's `FLAIL.spin` already tumbles her in the air on top of it. The alternative was
  nothing at all, and **a blow that produces the idle is a blow nobody can see landing.** The
  honest fix is drawn poses, and `big` takes the two 90-degree turns so a heavy blow reads wider.
  **THE FALL AND THE GET-UP ARE NAMED AND EMPTY**, m38's pattern: the STATES run either way -- she
  flies, lands, lies there, gets up and runs off -- and naming a clip later is one string with no
  branch to add. m41 is the build that collected on exactly that, one character over.
  **AND SHE IS GIVEN NO `flee` CLIP, WHICH IS ONE FEWER THING TO KEEP IN STEP.** `foeWander` reads
  `K.clips.flee || K.clips.run` and picks `fleeRef` or `runRef` to MATCH, so naming `running`
  twice would be two fields describing one clip and two places for them to drift apart. The
  fleeing read comes from `flee` being the fastest speed on the table.
  **SHE ROLLS, so both her speeds sit just OVER their own references** (x1.11 walking and x1.20
  running, well inside `tsHi` 1.5) -- which makes her the quickest ambler on the street and is as
  far as a walk cycle can be pushed before the feet scramble. **A skating clip is the honest way
  to go faster**, and `walk`/`run` are the two dials until there is one. Her `gait` stops less and
  surges less than a drunk's and her roam ring is 14 m against their 9, because wheels cover
  ground.
  **THE SPAWNS ARE CHECKED AS RECTANGLES, NEVER PLACED BY EYE** -- m60's rule, and it caught two
  things. Each of `[9, 1]`, `[-26, 0]` and `[-7, -25]` clears all ten boxes, the building's plan
  and the tower's by at least 2.1 m, and the nearest of the fourteen other bodies by 7.2 m.
  **And farthest-point sampling had to be CONSTRAINED to the band the street occupies**: run over
  the whole search square it went straight to the corners and put her at 42 m, which is the void
  rather than the test site. 9 to 26 m is where every other body already is.
  **WHAT IS UNVERIFIED AND WHY:** nothing in this container can build a skin (her GLB is draco and
  `DRACOLoader` wants a Worker), so **whether a walk cycle on a body wearing roller skates reads
  as skating at all** is a device question, and so are her height and whether the turn-as-hit
  lands. The arithmetic that CAN be checked -- the scale, the references, the time scales and the
  clearances -- is above and was. `mel.SKATER` is live except `h`, which wants a reload.

- **THE MOUSE BECOMES THE RIGHT PAD, IT DOES NOT BYPASS IT (m79, `DESK`).** *"I need to make
  this game work better on desktop web view. Right now you can move with WASD, which is good, but
  if it detects a mouse have it so the aiming works with the mouse -- left click will be shoot and
  melee, the keys can be locomotion, the camera is look around with the mouse. Space bar will be
  jump, right click for now will be rotate through your weapons from unarmed to blaster to melee.
  Switching the blaster between automatic and charge will maybe be alt."*
  **EVERY VERB IN THIS GAME READS THE RIGHT PAD'S GEOMETRY**, which is why this is fifteen lines
  of input and not a second control layer: `padUp`'s four gates, the guard's mirrored four, the
  flick and the tap all ask where a thumb is. **A second path would be a second answer to "is the
  thumb pushed up"** -- the exact thing m46 spent a build collapsing into one. So holding the left
  button writes `stick.R` to straight-up-at-full-deflection and lets go on release, and the
  trigger, the wind-up, the square-up, the release edge and `chargeRelease` all work with **not
  one line changed**.
  **AND IT WRITES x = 0, WHICH IS LOAD-BEARING RATHER THAN TIDY.** `stepCam` turns the camera off
  `stick.R.x`, so a synthetic stick with any lean in it would fight the mouse for `cam.az` --
  **two writers on a camera bearing**, this file's oldest standing invariant and the one that
  shows up every single time. At zero the stick contributes nothing and the mouse is the only
  writer, which is the identical arrangement the phone has.
  **THE YAW IS SPENT IN `stepCam`, NOT IN THE LISTENER**, for that same reason -- and it is a
  DISPLACEMENT rather than a rate, so it is not multiplied by `dt`: the pixels already happened.
  **AIMING AND LOOKING ARE THE SAME THING HERE, WHICH IS WHY ONE DEVICE DOES BOTH.** While aiming
  he faces wherever the lens points, so there is no separate aim axis to bind -- **mouse-look IS
  the aim**, and that falls out of the one-writer rule rather than being arranged. **And there is
  no pitch**: `cam.el` is a constant, so `movementY` has nothing to drive and is ignored rather
  than wired to something invented for it.
  **A TAP IS THE MELEE AND A HOLD IS THE WEAPON'S OWN HOLD**, which is *"shoot and melee"* read
  literally -- and it needed no mode, because `armT` .09 against `tapT` .30 already separates
  them: a click too short to arm the trigger is a punch and anything longer is the charge.
  **Not in rapid fire**, where a tap already spends the hold as a ROUND and punching as well would
  be one click doing two things. The direction is `flickH(0, -1)` -- straight up on the pad, which
  is forward relative to the camera -- so **a desktop strike and a phone strike read the same
  mapping** and cannot disagree about which way forward is.
  **LAST INPUT WINS, RATHER THAN A SNIFF.** `matchMedia('(pointer: fine)')` seeds it so a desktop
  starts right, and a real mouse move or a real touch flips it either way -- so a laptop with a
  touchscreen is never in the wrong mode for more than one gesture, and there is no user-agent
  string to be wrong about. Flipping to desktop releases both pads, which is the m138 stuck-stick
  rule: a mode change with a thumb down is an up nobody will ever hear.
  **THE FIRST CLICK TAKES THE MOUSE AND DOES NOTHING ELSE**, which is the standard bargain and is
  also the only one available -- `requestPointerLock` needs a gesture. Esc gives it back and the
  next click takes it again, and **losing the lock releases the button**, alongside the same
  blur/pagehide/visibilitychange trio the pads have had since m35: all three are ways an up goes
  missing, one input device over.
  **AND THE ROLL GOT A KEY RATHER THAN A STATED GAP.** It is the one thing that saves you -- its
  i-frames are what `p.roll` was always for -- and on a mouse there is no gesture left for it, so
  SHIFT rolls where you are WALKING and falls back to where he faces. That is the left pad's own
  flick read off the keys instead of off a thumb, and it is a judgement rather than something he
  asked for.
  **THE HINT IS BUILT FROM `DESK.hint` AND ONLY SHOWS WHILE THE MOUSE IS FREE.** One place binds a
  key and the same place names it, because a printed map that disagrees with a binding is worse
  than no map; and once the pointer is locked it is a HUD element in the play area saying
  something you already know, which is the `actB` lesson one game over.
  **WHAT IS NOT BOUND, AND IS STATED:** the GUARD. It is right-pad DOWN on the phone and right
  click is spent on the weapon cycle, so there is no desktop block -- which matters more than it
  sounds now that m67 gave the orcs a knock-down that a guard is what keeps you out of. A key
  (`Q`, or holding RMB against a tap to cycle) is the obvious next thing and it is his call which.
  **AND NOTHING IN THIS CONTAINER HAS A MOUSE**, so the sensitivity (`DESK.sens`, about 2000 px
  for a full turn), whether a tap-punch fires too readily, and whether losing the lock to Esc is a
  nuisance are all device questions. `mel.DESK` is live and `mel.DESK.sens` is the dial.

- **ONE BOLT, ONE BODY -- AND THE CHAIN IS THE BETTER WAY TO PUT A CROWD DOWN (m78,
  `WEAP.blastMax`).** *"I shoot it and it hits all three orc warrior aliens at the same time and
  it's just cheap. Maybe the blast should only be able to hit one thing at a time? I do like the
  idea of guys physically running into each other -- I shoot one, he goes flying, hits another."*
  **m36 ASKED FOR THE OPPOSITE AND HE IS RIGHT TO TAKE IT BACK.** *"If I shoot a ball and it hits
  in the general area of a few of them, that should hit more than one at a time"* is a perfectly
  good idea that turns out to play as three men leaving the ground on one frame for one tap --
  which is the whole of "cheap", and which no amount of varying the FLIGHT can rescue, because
  the thing that reads wrong is the simultaneity and not the animation.
  **AND THE SECOND HALF OF HIS MESSAGE IS THE REPLACEMENT.** `FLYHIT` (m63) already puts a crowd
  down and does it **sequentially by construction**: a flyer bowls over the man he reaches, pays
  `cost`, and carries on -- so the second man leaves a beat after the first and the third a beat
  after him. That is the un-simultaneity being asked for, and it is already built. **The two
  halves of his message solve each other**, which is why this is a cap rather than a new system.
  **THE BUDGET COVERS THE DIRECT HIT TOO**, or a ball landing ON somebody would still splash a
  second man and two would go over together -- which is the complaint at a smaller number. The
  direct victim is already on `K.cool` and skipped either way, so this is purely about the COUNT.
  **AND `dummyHit` TAKES THE NEAREST, NOT THE FIRST.** Unbudgeted it catches everyone in range,
  which is what a melee sweep wants (m36's `hitAll`) and what every other caller has always had.
  With a budget, **the order `DUMMIES` happens to be stored in would otherwise decide who dies** --
  the same class of arbitrariness as a tiebreak that flips, and invisible until three men stand
  in a line.
  **THE REACH CAME DOWN WITH IT, WHICH IS THE JUDGEMENT HALF AND IS SAID AS ONE.** The cap is
  what answers his complaint; 4 m to catch ONE man is still "I did not aim at him and he died":
      full charge   ball .95 + blast 2.60 + warrior .46  =  **4.01 m**  ->  3.01 m
      fumble                .225 + .55 + .46 = 1.24      ->  1.04 m
      the DIRECT hit in flight, 1.41 m at a full charge  ->  **untouched** (m56, m70)
  `mel.WEAP.blastMax = 9` is the one word back to m36 and `mel.WEAP.blast1` is the other dial.
- **AND NO TWO MEN FLY THE SAME WAY (m78, `FLAIL`).** *"Is there any way to make their flail in
  the air unique somehow. I shoot all three, they all go flying at the exact same time and do the
  exact same animation timed exactly the same, so it looks repetitive."* Three separate things
  were shared, and m50 had already fixed the two on the far side of them -- the LIE and the
  GET-UP are rolled per body and have been since *"they all get up at the exact same time"*. The
  FLIGHT never was.
      beat   the fall clip played at `K.downBeat` exactly, so two men hit the same pose on the
             same frame. `d.downB` now, rolled at the knock-down, and **read by the state length
             as well as the clip scale** -- the m8 landmine, which is precisely what a per-body
             beat walks into. `downVary` [.80, 1.25] on `downBeat` 1.5 is 1.20 s to 1.88 s.
      arc    and the launch `k` was a pure function of `power`, so two men blown by one event
             left on IDENTICAL trajectories and landed on the same frame. That is the one that
             matters, because **a clip rate cannot change when he arrives**: `flyVary`
             [.86, 1.16] on the warrior's `flyUp` 8.5 gives 7.31 to 9.86 m/s up, an apex of 1.34
             to 2.43 m and a hang time of 0.73 to 0.99 s -- so two men launched on the same frame
             land as much as **a quarter of a second apart**, which is fifteen frames.
      spin   a tumble about his own axis. There is ONE fall clip per direction and no amount of
             rolling numbers makes one clip into two, so what is left is to turn him while he is
             in the air -- which is what "flail" reads as and is the cheapest thing on screen.
             Up to 5 rad/s, about two thirds of a turn over a typical flight.
  **THE BOTTOM OF THE SPIN RANGE IS ZERO ON PURPOSE.** A man who simply goes over backwards is
  one of the ways this should read, and **a street where everybody spins is as uniform as a
  street where nobody does** -- which is the m50 lesson stated forwards.
  **IT IS A PROPERTY OF THE EVENT, NOT OF A KIND**, so `FLAIL` sits beside `FLYHIT` and every
  body gets it, `PALMARK`'s own argument. A kind may still name its own `downVary`/`flyVary`.
  **THE TUMBLE LIVES IN `bodyFly` BECAUSE THAT IS THE ONE PLACE THAT KNOWS HE IS IN THE AIR** --
  `d.stuckT`-in-`foeMove`'s own argument -- and it is an OFFSET on top of `d.h` rather than a
  write to it, so the brain's bearing is untouched and the get-up still faces where `d.back` says.
  **AND IT IS WRAPPED BEFORE IT IS UNWOUND.** A long flight banks several turns and damping THAT
  to zero is a visible spin-up on a man lying still; wrapped to half a turn on landing, what is
  left reads as settling and is gone long before the get-up starts.
  **`bodyFly`'s EARLY RETURN HAD TO LEARN ABOUT IT**, which was a real bug and not a detail: the
  velocity is zeroed the moment he settles, so `if (!vx && !vz && !vy) return` fires on the very
  next frame -- the tumble freezes where it stopped, and he lies on the floor at an angle and
  then STANDS UP at that angle. A state that needs a per-frame step has to keep its stepper alive.
  **WHAT IS UNVERIFIED AND WHY:** nothing in this container can build a skin, so whether a
  tumbling man reads as a flail or as a bug is a device question, and so is whether one body per
  bolt now feels weak. The arithmetic -- the hang times, the apexes, the blast reaches and the
  budget -- is above and was. `mel.FLAIL.spin = [0, 0]` turns the tumble off alone;
  `mel.FLAIL.flyVary = [1, 1]` and `mel.FLAIL.downVary = [1, 1]` are the other two A/Bs.

- **AN ORC SWINGS AT THE LITTLE GUY, AND THE WHOLE BRAIN FOLLOWED ONE PAIR OF NUMBERS (m77,
  `foeTarget`, `K.foePal`, `K.hitPow`, `d.sfoe`).** *"Let's have the warrior orcs also swing at
  the little guy and hit him. Send him in the air."*
  **`foeAI` IS WRITTEN AGAINST `dd` AND `toP` AND NOTHING ELSE**, both derived from `player.pos`
  in its first three lines -- so pointing those two at a BODY is the whole change, and the
  approach, the lane, the circle, the giving ground, `foePlan`'s range test and `foeSwing` all
  come with it. No second brain, no second state, no target field threaded through six branches.
  That is `d.K`'s dividend for the seventh time, and the reason an attack on a new victim cost
  less than the dive did.
  **TWO WAYS HE PICKS ONE, AND THEY NEED DIFFERENT MECHANISMS.** Nearer-than-you is a rule about
  geometry and retaliation is a rule about history, so one is a per-frame test and the other is a
  LATCH -- and the latch is what carries the case the test can never see, because a pal who has
  just punched an orc is usually still the FURTHER of the two.
      foePal.near 1.2   how much nearer than you he has to be to be worth turning onto. Without
                        a margin the orc flips between the two of you every time the gap crosses,
                        which is `LOCK.keep`'s own lesson one system over.
      foePal.hold 2.4   how long the pick survives. The picker REFRESHES it rather than
                        re-deciding, so a retaliation outlives the geometry that contradicts it.
  **A KIND WITH NO `foePal` NEVER FIGHTS A PAL**, so the two drunks and the officer are
  byte-for-byte what they were -- m38's empty-clip-name pattern, one field over.
  **THE 5th ARGUMENT OF `dummyBlow` IS THE ATTACKING BODY NOW, NOT A BOOLEAN.** m75 only needed
  `1` for "this came from a pal"; the moment an orc can be hit BY the pal, the victim has to know
  WHO hit him or there is nothing to turn onto. `if (!pal)` reads identically, so every existing
  call site is untouched -- what is added is that a blow names its author. **And `foeStrike`
  passes `d`**, which is also what keeps the pal from being MARKED: `d.mark` is YOUR interest in a
  body, and an orc hitting the sidekick is not something you did.
  **THE BLOW GOES THROUGH `dummyBlow`, SO THE LAUNCH WAS ALREADY WRITTEN.** The grunt, the shove,
  the reaction pool, the health, the knock-down and the flight are all there, and **a man knocked
  far enough is a flyer in his own right**, so the chain into whoever he lands on falls out of
  `FLYHIT` (m63) rather than being coded. CLANCY's `downF`/`downB` are `falling_to_roll` and his
  get-up is `cover_to_stand`, so he rolls, stands and comes back with no state added anywhere.
  **`hitPow` .92 IS WHERE IN THE LAUNCH RANGE IT LANDS, AND THAT IS THE WHOLE OF HOW FAR HE
  GOES.** CLANCY's `fling` is .45, so anything over it launches; `dummyBlow` then grades `k`
  from `fly0` .55 to 1 across .45..1, **squared**. At .92 that is k .879 on `flyV` 18 and
  `flyUp` 7.5 -- **6.6 m/s up, an apex of 1.09 m at `flyG` 20, 0.66 s of air and about seven
  metres of travel** after `flyDrag` 1.2. That is "in the air" rather than a stagger, and it
  leaves the player's own finisher at 1.0 as the biggest thing in the game.
  **AND `d.hp = K.hp` ON THE KNOCK-DOWN**, which is why two swings do not accumulate into
  anything: he is launched on the first one whatever his health says, and stands up whole.
  **THE TARGET IS LATCHED WHERE THE SWING STARTS (`d.sfoe`), NOT READ AT THE CONTACT FRAME.**
  `foeTarget` runs every frame and the blow lands `swingAt` .42 of the way through a 0.85 s
  swing, so reading it late is a mace thrown at one man landing on another -- **the picture and
  its consequence have to be ONE event**, which is `MELEE.at`'s own rule and the reason the blow
  was moved off the input frame in the first place.
  **A MAN ON THE FLOOR IS FINISHED WITH**, `palFoe`'s rule pointed the other way: a launched pal
  drops out of the picker and clears the latch at once, so the orc turns back to you while Clancy
  rolls, gets up and runs in again. That is what makes it a LOOP rather than an execution, and it
  needed one clause rather than a state.
  **AND THE CHIP SAYS `· vsPAL` / `· PALDOWN`.** "An orc never went for him" and "one did and it
  did nothing" are opposite bugs and one picture from a phone -- and the pal's own state cannot
  answer it, because `PALDOWN` is equally what a stray bolt from you looks like. `vs` reads the
  ORCS (`DUMMIES.some(d => d.foe === pal)`), which is the half only they know.
  **WHAT IS UNVERIFIED AND WHY:** nothing in this container can build a skin (every character GLB
  is draco and `DRACOLoader` wants a Worker), so whether the punt reads as a launch, and whether
  an orc peeling off to chase the sidekick is fun or annoying, are device questions. The
  arithmetic that CAN be checked -- the apex, the hang time, the travel, and that `hitPow` sits
  over CLANCY's `fling` and under the player's finisher -- is above and was. `mel.FOE.foePal =
  null` is the one word back to m76, and `mel.FOE.hitPow` is the dial for how far he goes.
  **AND CLANCY DOES NOT GUARD, DODGE OR RUN FROM A SWING.** His `dive` reads `player.aim` and
  knows nothing about a mace, `vary.guard` is `[0, 0]` and `flee0` is 0 -- so he takes it. That
  is a stated gap rather than a claim; a `foeDive` on an orc winding up is the obvious next thing
  and it is its own build.

- **THE RING HAD A HOLE IN IT AND THE RETURN LEG RAN STRAIGHT DOWN THE MIDDLE (m76, `palPost`).**
  *"He constantly walks down the runway, basically down my line of sight -- if I shoot him once
  and he's downfield, then he's just running back to me in front of me and I'm shooting guys."*
  **m74 FIXED THE RING AND LEFT THE ONE PATH THAT IS ALWAYS IN THE LANE.** The catch-up was
  `faceTo(d, toP, dt)` -- **straight at the player** -- which from downfield is the runway by
  definition, so the single moment he was guaranteed to be in the line was the moment he was
  coming back from having been shot. His sentence describes the geometry exactly.
  **AND CLOSING FIRST IS WHAT MAKES IT A RUNWAY, WHICH IS WHY A POST BESIDE YOU IS NOT ENOUGH.**
  A point at your flank is still reached by walking the length of the lane if he starts at the
  far end of it. So inside the lane the target keeps **HIS OWN RANGE** and only moves him
  SIDEWAYS -- he steps off the runway at whatever distance he is at, and only once he is clear
  does the target become a post beside you. One continuous steer, no state, and it falls out of
  the same `off` the ring was already being pushed by.
  **AND STANDING IN THE LANE IS ITS OWN REASON TO MOVE**, not merely a detail of coming back: he
  can wander in, be shoved in, or simply have you turn onto him. The test is WHERE HE IS rather
  than what he was doing, which is why it outranks the ring.
  **`laneArc` .70 IS NARROWER THAN `palArc` 1.05 AND THE GAP IS HYSTERESIS.** The roam point is
  PUSHED to `palArc`, so a clear that triggered at `palArc` would fire on the spot he had just
  been sent to, every frame, for ever. Same shape as `leash`/`leashIn` and as m36's `hold`/`reach`.
  **AND HE RUNS OUT OF IT.** Ambling off the runway is the same complaint as the delayed dive,
  one system over -- and since every path into that branch is either a catch-up or a lane clear,
  both of which are runs, there is no walk case to write. The chip says `· LANE`.
- **THE DIVE FIRED ON THE LATCH AND THE SHOT WAS ALREADY LEAVING (m76).** *"If I'm aiming down
  sight he should basically know to get out of the way, rather than he's kind of delayed."*
  `p.aim` only goes true after `WEAP.armT` of the thumb being up there, and a dive takes `dur`
  .60 s to deliver -- so the earliest he could start was already late. `p.armT > 0` is the moment
  the thumb ARRIVES, which is the earliest thing there is to know, and it is free.
  **THE CONE IS WHAT BUYS THE REST**, .30 -> .42: at .30 he only reacted to a shot already on top
  of him, and at .42 he is reacting to one lined up on him. `range` 9 -> 11 and `cool` 1.6 -> 1.0.
- **AND A DIVE THAT CANNOT OUTRUN THE SPLASH IS NOT A DIVE (m76, `WEAP.palBlast`).** *"Part of it
  is the blast radius of the charge cannon... maybe we could narrow the collider for the charge
  cannon or something."* The arithmetic says he is right and says which half:
      a full charge's blast on a body   size*.5 + blast  =  .95 + 2.60 = 3.55 m, + his r = 3.83
      m74's dive carried him            v 4.0 x dur .60  =  **2.4 m**
  So he could clear the LINE perfectly and still be inside the blast of a shot that landed on
  somebody else -- **the dive could not win against the weapon however well it was timed**, which
  is the "I end up shooting him a bunch" that survived m74.
  **BOTH ENDS MOVED, AND ONLY THE AREA HALF OF THE WEAPON.** `palBlast` .30 is a multiplier on
  the SPLASH reach for a `pal` body only: 1.35 m rather than 3.83. **The DIRECT hit is unscaled
  and unchanged** -- aiming at him still hits him, which is m74's own *"doesn't mean I can't hit
  him"* -- and no enemy's blast moved, so the weapon he tuned is the weapon he still has. And
  `dive.v` 4.0 -> 5.2 carries him **3.1 m**, which is now comfortably outside that 1.35.
  **IT IS ONE OPTIONAL ARGUMENT ON `dummyHit`, PASSED BY THE BLAST CALL AND NOT BY THE FLIGHT
  CALL** -- which is what keeps "a friend is harder to splash" and "a friend is harder to hit"
  from becoming the same number by accident.
- **TIGHTER, AND `hunt` IS DELIBERATELY NOT (m76).** *"I kind of want him on a little tighter of a
  leash. I like that he can go far away, but I want him to try to get back into a more closer
  position."* Two halves of one sentence that pull opposite ways, and they are two different
  numbers: `leash` 4.0 -> 3.2, `leashIn` 1.8 -> 1.1 and `roam` 2.2 -> 1.7 are the coming-back;
  **`pounce.hunt` 9 is the only thing that takes him properly far and it is untouched**, because
  that is the going-away he said he likes.
  **WHAT IS NOT DONE:** the lane clear is horizontal and has no idea about the boxes, so he can
  step sideways into one and fall through to m74's stuck-then-hop on the wall. And nothing stops
  him being in the lane while POUNCING -- joining the fight outranks it, which is right, but it
  means the one time he is deliberately near an enemy you are shooting is the one time the clear
  is switched off. `mel.CLANCY.laneArc = 0` turns the whole clear off for an A/B.

- **HE PILES ON TO WHATEVER YOU ARE HITTING, AND THE SWING IS THE WARRIOR'S OWN MACHINERY
  (m75, `PALMARK`, `palFoe`, `K.pounce`).** *"Let's make him attack with the mutant punch."*
  **"ONLY ATTACK IF YOU'RE ATTACKING SOMETHING" IS A MARK ON THE MAN, NOT A MOOD.** m73's standing
  permission had a condition in it, and the condition is a fact about a BODY rather than a state
  in the sidekick: `dummyBlow` is the one function every blow on a body reaches, so it is the one
  place that can stamp *you are fighting this one*, and `palFoe` only ever returns a body still
  carrying that stamp. He therefore never starts a fight, never wanders off after one, and stops
  when you stop -- **no aggro of his own, and nothing to tune about when he decides to engage.**
  **AND HIS OWN PUNCH DOES NOT REFRESH IT** (`pal` 1 on that one call), or he would keep his own
  victim alive as a target for ever and never come back. The mark is YOUR interest.
  **`PALMARK` IS A PROPERTY OF THE EVENT, NOT OF A PAL**, so it is a constant beside `FLYHIT`
  rather than a field on his table -- a second sidekick tomorrow reads the same mark and there is
  nothing to keep in step.
  **THE ATTACK IS A TABLE AND ONE BRANCH.** `swings`, `swingDur`, `swingAt`, `swingGap`, `hitR`
  and `hitArc` are the fields `foeSwing`, `foeAI`'s `swing` branch and `foeStrike` have read since
  m35 -- so naming them on `CLANCY` IS the attack, and the only new code is a branch in
  `foeStrike` that swings at a BODY instead of at the player. The beat, the contact frame, the
  lean through the blow and the cooldown all came with it. **That is `d.K`'s dividend for the
  sixth time**, and it is why an attack cost less than the hop did.
  **`mutant_punch` IS 1.167 s AND PLAYS AT x1.37** -- m37's rule, that a reaction too fast to read
  is the same reaction every time -- and `swingGap` .45 puts a punch every ~1.3 s, which is a
  helper chipping in rather than a second fighter.
  **`power` .34 IS UNDER THE WARRIOR'S `fling` .70 AND HIS `hard` 1.01 BY CONSTRUCTION**, so a
  sidekick's punch staggers and shoves (`knock` 4.2 x .34 = 1.43 m/s, 0.65 m at `shoveDrag` 2.2)
  and can never put a man down. That is right rather than a limitation: **knocking them over is
  yours.** `dmg` 2.0 through the same `max(.35, power)` is 0.70 a punch against 6 hit points, so
  he is worth about a third of a fight.
  **A MAN ON THE FLOOR IS FINISHED WITH.** `palFoe` skips `down` and `up`, which is what makes him
  disengage and come back rather than stand over a downed warrior punting him for ever --
  `dummyBlow`'s punt branch would happily let him.
  **AND JOINING THE FIGHT OUTRANKS THE LEASH, DELIBERATELY.** `hunt` 9 is further than `leash` 4 --
  but the range is measured from YOU rather than from him, so he can never be more than `hunt`
  away however long it runs, and the leash takes him back the moment the marks expire.
  **`foePlan` HAD TO BE GATED ON `pacifist`.** The swing branch ends by planning what to do next,
  and that function picks between a guard, a circle and giving ground -- **a fight against the
  player**, which is the one thing a sidekick's swing must not end in. One clause, and the drunks
  (who have no `swings` and can never reach it) are unaffected either way.
  **WHAT IS NOT DONE:** he does not answer a warrior who is attacking YOU but whom you have not
  hit yet -- his own sentence is "if you're attacking something", and `aggro` would be the other
  signal if that is wanted. `mutant_swiping` and `jump_attack` are still unnamed, so there is one
  strike and no chain. And a target behind a box makes him walk into it, build `stuckT` and hop at
  the wall on m74's own timer: self-limiting, visible in the chip, and not pretty.
  **The chip says `· PUNCH`.** `mel.CLANCY.pounce = null` takes the attack away entirely.

- **THE 40 cm CUBE STOPPED BEING WALKABLE WHEN THE PLAYER SHRANK, AND ONLY THE COMMENT STILL
  THOUGHT OTHERWISE (m74).** *"He can't get up on -- there was a really short little cube he just
  got stuck on. He just indefinitely was kind of stuck, didn't know what to do."* Read straight
  out of the world builder, and it is the box nearest the spawn:
      put(6, 0, -3, 3, .40, 3, 0);   // "under MOVE.step, so this one is WALKED onto"
  `MOVE.step` is `.5 * SZ`. At `RIG.height` 1.75 that was **0.50 m** and the claim was true; m52
  took him to 1.45 and m57 to 1.25, and the step came down **to 0.357 m** with him -- so this box
  has been a WALL since m57, to the player as much as to anybody, and the 0.35 platform beside it
  is still walkable by seven millimetres. **A comment describing an intent the code no longer has
  is the tell**, and this file already has that sentence about `blast0`'s own comment at m56.
  **THE BOX IS LEFT ALONE AND THE CLAIM IS CORRECTED.** A low obstacle is a fair thing for a test
  site to have, and changing the world to suit a body is the wrong instinct -- he asked for the
  sidekick to be able to get up on things, not for the things to get shorter.
- **HE TRIES, THEN HE HOPS, THEN HE GOES SOMEWHERE ELSE (m74, `d.stuckT`, `K.hop`, `K.give`).**
  Both halves of that report are ONE detector, and it lives in `foeMove` because **that is the
  one place a body is ever told to travel** -- so it is the one place that knows both what was
  asked and what was delivered, and comparing those two needs nothing from the state machine.
  That makes it equally true of a wall, a kerb, another body and a corner. **A detector every
  caller has to remember is not a detector**, which is this file's own sentence about `roadTag`
  one repo over.
      stuckT > hop.at .55   -> he jumps at the thing
      stuckT > give   1.6   -> that point is unreachable; re-roll it
  **THE ORDER IS WHAT MAKES IT READ AS A CREATURE**: a hop first, and only when that has not
  helped does he give up on the point. And it DECAYS at twice the rate it builds, so a body that
  scrapes past something forgets rather than carrying a grudge into the next corner.
  **THE HOP IS AN ARC SOMEBODY CHOSE, SO THE APEX IS THE NUMBER** -- m21's rule, and `vy` is
  derived from it rather than picked. At `flyG` 20:
      up 4.8   apex **0.576 m**, 0.48 s of air   -- clears the 0.40 box by 18 cm
                                                 -- does NOT clear the 1.15 one, which is right
      fwd 3.0  x 0.48 s = **1.44 m** of travel   -- exact, because `leapDrag` is 0
  **AND 3.0 IS UNDER `FLYHIT.at` 6 BY CONSTRUCTION**, so a hopping sidekick can never bowl a
  warrior over. That needed no case at all -- only a number kept under one that already exists.
  **IT OWNS NOTHING BUT A VELOCITY.** `d.vx/vy/vz` and `bodyFly` -- the integrator the knock-down
  flight has used since m37 -- so the wall bounce, the ground stop and the landing thump come
  with it and there is no second physics path. **What it did need is `K.leapDrag`**: `flyDrag` is
  right for a body that was THROWN and wrong for one that jumped, and a drag on top of a solved
  arc makes the arithmetic above a lie and lands him short of the thing he jumped at.
  **AND THE STATE HAS TO SIT ABOVE `foeWander`**, which ends in `foeMove`, which snaps `P.y` to
  the ground: walking and flying at once is a hop that never leaves the floor.
  **THE MINIMUM (`d.t > .12`) IS WHAT STOPS IT ENDING ON THE FRAME IT BEGAN** -- `bodyFly` runs
  at the TOP of `stepDummies`, so on the launch frame the velocity has not been integrated yet
  and he is still standing on the floor.
  **BOTH ARE GATED ON THE KIND'S OWN FIELDS**, so the drunks are byte-for-byte unchanged. A stuck
  drunk is a real bug too and it is a different build, not a free ride on this one.
- **THE RING HAS A HOLE IN IT WHERE YOU ARE POINTING (m74, `K.palArc`).** *"The leash is too long.
  I do want him to more or less stay near me, checking out what I'm doing, stand off the side of
  me. He goes in front of me a lot and then I just end up shooting him."* Two separate things and
  the second is the one that matters: a uniform ring puts him in front of you a third of the
  time, for ever, whatever its radius.
      leash 7.0 -> 4.0    leashIn 3.2 -> 1.8    roam 4.2 -> 2.2    roamAt .7 -> .5
      palArc 1.05 rad (60 deg either side of your nose) that the roam point may not be in
  **`player.faceH` IS THE FIRING BEARING AND IT ALREADY EXISTS.** While aiming he faces wherever
  the lens looks -- the one-writer-on-`cam.az` invariant -- so the arc to keep clear of needed no
  second number to keep in step with the first.
  **AND THE ANGLE IS PUSHED TO THE NEARER EDGE, NOT RE-ROLLED.** A rejection loop is unbounded;
  a push is one line. It also piles him up along the two EDGES of the arc, which is *"off the
  side of me"* rather than merely "anywhere but in front" -- the better behaviour falls out of
  the cheaper implementation, which is worth noticing rather than arguing about.
- **AND THE DIVE IS THE BACKSTOP, NOT THE FIX (m74, `K.dive`).** *"Maybe he jumps out of the way,
  doesn't mean I can't hit him. I don't think I have a dive animation or a roll animation but if
  we do, you could like dive roll out of the way."*
  **HE HAS ONE AND IT IS ALREADY IN HIS TABLE.** `falling_to_roll`, 1.875 s -- a body going down
  into a roll, which is what a dive IS, and m73 wired it as his knock-down. Second build running
  that the clip he thinks he has not drawn is in the export: **read the file before taking his
  word for what is missing from it.** Compressed to `dur` .60, which is x3.1.
  **NO I-FRAMES, WHICH IS WHAT HE ASKED FOR AND IS ALSO THE SIMPLER THING.** It MOVES him and
  nothing else: 4.0 m/s for .60 s is **2.4 m** out of the line, against a `cone` of .30 rad which
  is 2.7 m of half-width at the 9 m range. So he clears most of the way out of a shot he was
  standing in, and a shot that was going to hit him anyway still does.
  **AND IT IS PERPENDICULAR TO THE LINE, NOT AWAY FROM YOU** -- away from you is down the barrel,
  which is the whole difference between getting clear and running at the muzzle. The side comes
  off the sign of his own offset from the line, so he goes the way he was already leaning.
  **`p.aim` COVERS BOTH TRIGGERS** -- it is true for the charge and for rapid fire -- so one test
  rather than two to keep in step.
  **WHAT IS NOT DONE:** `crouched_sneaking_left/right` and `left/right_cover_sneak` are a sidestep
  set that would read better than a roll for a small dodge, and nothing names them. And there is
  no attack: `mutant_punch`, `mutant_swiping` and `jump_attack` are all in the file, *"you're
  welcome to make him attack, I don't really care"* is the standing permission, and it is its own
  build rather than a rider on this one.
- **AND THE CHIP SAYS WHICH OF THE THREE IT IS (m74).** *"He just indefinitely was kind of stuck"*
  is the report, and "he never hopped", "he hopped and it did nothing" and "he is stuck and never
  tried" are three different bugs with one picture from a phone. `· HOP`, `· DIVE`, `· STUCK1.4`
  -- and the STUCK CLOCK is the one that separates them, because it is the thing both the hop and
  the give-up are triggered off. Silent while he is simply pottering about, `rollREC`'s rule.
  **WHAT IS UNVERIFIED AND WHY:** nothing in this container can build a skin (his GLB is draco and
  `DRACOLoader` wants a Worker), so the hop's apex, the dive's read and whether the ring now keeps
  him out of the way are all device questions. The arithmetic that CAN be checked -- the apex, the
  flight time, the travel, and that `fwd` sits under `FLYHIT.at` -- is above and was.

- **A SIDEKICK IS m38'S PACIFIST WITH THE RING MOVED (m73, `CLANCY`, `K.pal`, `K.clips.rest`).**
  *"He's basically like your little sidekick, so he just sort of follows you around... I don't want
  it to be like super super mechanical, I want him to kinda wander a little bit and walk around a
  sort of radius around you. I kinda just want him to be your little dog sidekick that hangs out
  and is fairly autonomous, but stays within a certain radius of you."*
  **EVERY WORD OF THAT EXCEPT ONE IS ALREADY `foeWander`.** m38 built the amble for a drunk: a roam
  ring, a stop timer, a look-about flourish and m50's surge-and-hesitate breathing -- which is
  precisely *"wander a little bit"* and *"not super super mechanical"*, written and shipped three
  builds before anybody asked for a sidekick. **The only thing a follower changes is WHICH POINT
  the ring is round**, so that is the only thing the branch changes: `d.hx/d.hz` become the
  player's position instead of the spawn. Six lines, and the wander, the stops, the idles, the
  clip scaling and the pacifism come with it.
  **AND BEING HITTABLE COST NOTHING AT ALL**, which is `d.K`'s own dividend for the fifth time: the
  bolt, the swept limb, `bodyFly`, `bodySep`, `dummyBlow`, the player's resolver and the fly-into-a-
  body chain all reach anything in `DUMMIES`. *"I wanted to be able to be hit by both you and
  NPCs"* is a table and a load line, and his own roll and landing clips are wired into the states
  m38 and m41 already wrote.
  **THE LEASH IS WHAT KEEPS IT A RADIUS RATHER THAN A DRIFT, AND IT NEEDS TWO NUMBERS.** He stops
  wandering past `leash` 7.0 and comes back at a run, and goes back to ambling at `leashIn` 3.2 --
  **the gap between them is hysteresis**, and one number would flip him between amble and dash on
  the boundary every frame. That is the m36 `hold`/`reach` lesson one body over, and it is also
  why the catch-up state is a LATCH (`d.catch`) rather than a distance test.
  **WHICH IDLE HE HOLDS IS A POOL PICKED FRESH ON EACH STOP.** *"I got some idles titled Clancy
  idle one and Clancy idle two, those are the main ones I want, but I do have like four more idles
  in addition that you can mix in randomly."* Two facts, two fields: `rest` is the pool he SETTLES
  into and `look` is the existing one-shot flourish, which is exactly what four occasional extras
  are. **`K.clips.idle` stays a single string**, because nine other places read it as the
  structural fallback and a pool there would have been nine readers to change for one character.
  **And the pool goes into `bodyLoops`** -- an idle is held, so it loops like the one in `idle`
  does; `look` deliberately does not, because looping a one-shot flourish is a tic.
  **HE DOES NOT RUN AWAY (`flee0: 0`).** m38's pacifist flees when hit, which is what a drunk does
  and is the opposite of a sidekick: the one thing a dog does when you get into a fight is stay.
  The flee branch is untouched and simply never entered, rather than being gated on `pal`.
  **AND HE HAS NO HEALTH BAR**, because `foeBar` is a call `buildClancy` does not make. A gauge
  over the head of the thing on your own side reads as a target.
  **WHAT IS NOT DONE AND IS STATED RATHER THAN HIDDEN:** he cannot keep up with a full 7.2 m/s
  sprint -- `running` is walking at 1.44 m/s and `run` 2.6 is already above its own reference, so
  a faster approach than the clip can sell is a scramble and the leash plus the catch-up is the
  honest answer. Nothing calls the mutant attack clips. And **nothing in this container can build
  a skin** (the GLB is draco and `DRACOLoader` wants a Worker), so his scale at `h` .62, his facing
  and whether a knee-high alien reads as a dog are all device questions. `mel.CLANCY` is live
  except `h`, which is measured at load and wants a reload.

- **A LUNGE COULD CARRY HIM SIXTEEN METRES, AND THE MAN DECIDED IT (m72, `MELEE.lungeMax`).**
  *"When I melee he launches forward quite a bit -- sometimes I wanna cap that distance, sometimes
  it's ridiculous. We're starting to develop a bit more of a system, and I don't want him to launch
  so far forward -- unless I make an animation for an actual launch, like a slide tackle or flying
  kick. As is, he can go forward, but it should be more capped."*
  **"SOMETIMES" IS THE WORD THAT NAMES THE CAUSE.** m51's solve is right and stays: the lock
  inverts `v * dur * carryAvg` so the swing lands ON him, which is why a man at arm's length gets
  a punch thrown on the spot. But that means **where the MAN is was the only thing setting the
  distance**, and the ceiling was never chosen -- it fell out of `maxV` 28 times whichever beat
  was playing. Measured, with `arrive` 0.75 m:
      strike  beat   ACQUIRE out to      then TRAVELS      free travel
      jab     .62    12.59 -> 5.35 m     11.84 -> 4.60 m   3.15 -> 3.15 m
      two     .68    13.80 -> 5.35       13.05 -> 4.60     3.20 -> 3.20
      finish  .82    16.65 -> 5.35       15.90 -> 4.60     5.35 -> 4.60
  On a 1.25 m body that is **ten to thirteen of his own heights** for a jab. A launch, and he has
  not drawn one yet -- so it is capped rather than made a feature.
  **IT IS METRES, NOT A LOWER `maxV`, BECAUSE A SPEED CAP IS THREE DIFFERENT DISTANCES HERE.**
  The beats are .62 / .68 / .82, so one velocity ceiling leaves the finisher travelling 32%
  further than a jab however it is tuned. **Distance is what he asked to cap**, and it becomes a
  speed through the same `dur * carryAvg` the solve already inverts.
  **AND IT CAPS BOTH PATHS, SO THEY CANNOT DISAGREE.** An unlocked finisher covered 5.35 m off
  `lunge[2]`, so capping only the SOLVE would leave a swing at NOBODY travelling further than a
  swing at a man -- a lock that makes him move less is worse than no lock. One number governs how
  far a strike carries whether or not it found anybody; strikes 1 and 2 free are already under it
  and are byte-for-byte unchanged.
  **AND THE ACQUIRE RADIUS HAD TO COME DOWN WITH IT, WHICH IS THE HALF THAT IS EASY TO MISS.** A
  man further off than the lunge can deliver has to be REFUSED, or he is aimed at somebody he then
  falls short of and swings at the air -- m20's rule (an assist's range is sized for what it
  DELIVERS, not for what it draws) and `chargeAim`'s `acq` one move over. `lungeMax + arrive` is
  that radius by construction.
  **AND THAT FIXES m40's OWN COMPLAINT, WHICH WAS STILL HALF TRUE.** That note says *"`maxV` is
  also an acquire radius -- a number meant for one thing must not be shared with another"* and
  then left it shared: `reachMax` read it for the radius while the clamp read it for the speed.
  It is a speed ceiling only now, and the distance cap is what decides the reach.
  **THE CHARGED DASH IS NOT THIS AND KEEPS ITS OWN `flatFar` 11.** It is the move that is
  SUPPOSED to cross ground, it has its own clip, its own `dashV` and its own `acq`, and m43/m45
  were three builds of getting its distance to mean anything. Capping both through one number
  would undo that.
  **`mel.MELEE.lungeMax` IS THE DIAL, and 4.6 is a look-at-it number rather than a derived one** --
  it is under every current free lunge except the finisher's. Raise it, or give the ordinary
  strikes their own, the day there IS a flying-kick clip: *"unless I'll make an animation for an
  actual launch"* is exactly the condition under which a long lunge stops reading as a bug.
- **A SHOVE IS A DISTANCE *AND* A DURATION, AND ONE DRAG SETS BOTH (m71, `K.shoveDrag`).**
  *"When I hit them like melee and stuff, or even shots, I want there to be like a subtle kickback
  -- even if they're not flying through the air -- so it feels like a more dramatic effect."*
  **THE MAGNITUDE WAS NEVER THE PROBLEM, WHICH IS WHY RAISING `knock` WOULD HAVE BEEN THE WRONG
  MOVE.** m37 gave every blow a shove and the impulse is real -- a fist on the warrior is
  `knock` 4.2 x power .45 = **1.89 m/s** -- and `bodyFly` spent it at `knockDrag` 5.5, which is
  `v/k` metres with a `1/k` time constant:
      old   drag 5.5   fist 0.34 m over 0.18 s   rapid bolt 0.27 m   near-fling 0.53 m
      new   drag 2.2   fist 0.86 m over 0.45 s              0.69 m               1.32 m
  A third of a body-width, over a fifth of a second, is a TWITCH -- on a phone it is
  indistinguishable from the body not moving at all, which is exactly the report. **The same
  impulse at 2.2 travels 2.5x as far and takes 2.5x as long**, and nothing about how hard a blow
  hits, how much damage it does or where `fling` sits moved. **A distance you can see and a
  duration you can see are the same number in disguise**; when a motion reads as nothing, check
  the drag before the launch.
  **AND IT CANNOT SHARE `knockDrag`, BECAUSE THAT NUMBER HAS A SECOND JOB.** The same constant
  scrubs a FLUNG body along the ground after it lands, so halving it would double every skid
  as well -- a change nobody asked for, and the `chargeGoH` lesson at m27 one constant over.
  **THE TEST IS THE STATE RATHER THAN A FLAG, BECAUSE THE STATE *IS* THE FACT**: `hit` and
  `block` mean he is on his feet reacting to a blow, `down`/`up` mean he is on the floor. No
  field to set at the blow and nothing for a future shove site to forget.
  **AND KEYING ON IT CUTS THE TAIL FOR FREE**, which a flag would not have. The warrior's hit
  state is 1.0 s and the shove would take 1.65 s to reach `bodyFly`'s 0.05 m/s floor -- so the
  reaction ending flips the drag back to 5.5 and the 0.21 m/s left over dies in 4 cm, instead of
  a man walking away still drifting.
  **THE FLING IS STILL PLAINLY A DIFFERENT EVENT.** The hardest blow that does NOT launch a
  warrior is just under `fling` .70, which is 1.32 m of stagger against a fling's `flyV` 24 m/s
  -- so "knocked back" and "sent flying" are not two points on one curve you have to compare.
  **AND THE WHOOSH IS DELIBERATELY STILL SILENT.** `BODYSND.whoosh.at` is 5 m/s and the biggest
  shove is 3.2, so a stagger makes no air noise -- which is right: it is a man being moved, not
  a man being thrown. `mel.FOE.shoveDrag = 5.5` is the one word back to m70.
  **WHAT IS NOT DONE, AND IS THE NEXT LEVER IF THIS STILL READS FLAT: a melee hit does not
  flash the body.** `bodyFlash` exists (m39) and is called from exactly one place -- the bolt's
  impact swarm -- so a shot lights the mesh up and a punch does not, although his sentence names
  both. One line in `dummyBlow` would do it (`bodyFlash` takes a `max`, so it cannot double with
  the bolt's own), and it is left out here so the kickback can be judged on its own.
- **THE CLANG LAYER IS A LAYER, SO IT HAS TO SIT *UNDER* SOMETHING (m71, `HITSND.hard.ring.g`).**
  *"I'm thinking we turned down the metal clang sound effect. It's just kind of loud -- and I'm
  wearing headphones so it's extra loud -- but maybe tone that down a little bit so it works in
  conjunction with the other noises."* .52 -> .30. m64's whole argument is that the ring is what
  the blow lands ON and the hit bank is the BLOW, **so the ring is the one of the two that must
  never be the loudest thing in the mix** -- at .52 against `hard.g` .98 it was over half the
  impact it is supposed to be a detail of, and against m59's `cut`/`dec` envelope (which made
  every impact start AT its peak) the two arrived together and fought. Nothing else moved: the
  hit bank, the grunt and the plasma impact are untouched, so this is one variable.
  **AND IT IS THE ONLY DIAL, WHICH IS WHY IT WAS ONE LINE.** `ring` is on the KIND's row, read
  by all three of its callers (the melee connect, a bolt landing on a man, and the warrior's
  chest thump), so they cannot disagree about how loud a ring is -- and the flesh row has no
  `ring` at all, so a drunk in a coat was never in this conversation.
- **A RAPID ROUND WAS THE LEAST ACCURATE THING IN THE GAME, AND ITS PICTURE IS WHY (m70,
  `WEAP.autoR`).** *"The impact noise from the rapid fire blaster doesn't quite play the same
  sound as the charge blaster. Obviously the charge should be more intense, but I feel like
  they're maybe doing different stuff -- it's just kind of this pitter patter thing, it doesn't
  really feel like you're fully hitting him."* **His instinct was right and it is not a mix
  problem.** m56 tied the in-flight test to the visible BALL, which is exactly right for a
  charge shot -- the ball IS the thing, so what you see is what you hit -- and a rapid round's
  ball is small ON PURPOSE:
      full charge   ball 1.90 across  ->  .95 + warrior .46  =  **1.41 m** of forgiveness
      rapid round   ball 0.68         ->  .34 + .46          =  **0.80 m**, 43% less
  So a stream aimed at a man passes wide of him far more often than a cannonball does, flies on,
  and dies on the tarmac behind him -- **which plays the `plasma` bank rather than `pbody`, and
  does no damage.** That is "not the same sound" LITERALLY: a good fraction of the time it is a
  different bank, because a good fraction of the time you are not hitting him. `autoR` .60 puts
  it at 1.06 m, between a fumble and a full charge.
  **AND IT IS NOT m56's CORRIDOR COMING BACK.** That was `size * .5 + blast` = 4.01 m swept down
  a sixty-metre shot, with no impact to measure from; this is one round's own body, a quarter of
  that, and the full charge is untouched at 1.41. **The ball stays the picture for everything
  that HAS a meaningful ball; a round whose picture is a tracer needs its own number.**
- **AND NINE IMPACTS A SECOND WITH A 0.27 s TAIL ARE ALWAYS THREE DEEP (m70, `PUNCH.autoTail`).**
  The other half of "pitter patter", and it is not that each round is quiet -- measured, a rapid
  impact is already **77% of a full charge's gain**. It is that `PUNCH.dec` .17 stops at
  `dec * 1.6` = **.272 s** against a round every `WEAP.autoRate` .11, so **2.5 impacts overlap at
  all times**: the tails sum into a continuous wash and not one of the ATTACKS stands out of it.
  **No round has anywhere to land.**
      tail was   0.272 s  ->  2.5 deep
      tail now   0.109 s  ->  0.99 deep
  **THE TAIL IS DERIVED FROM THE ROUND INTERVAL, NOT PICKED.** `autoRate * .62` is one impact per
  round BY CONSTRUCTION and follows if the fire rate is ever retuned; a number typed here would
  silently stop fitting the first time `autoRate` moved. `autoG` 1.14 lifts the PEAK to pay for
  the shorter tail, which is the same trade `cut` makes at m59 -- an impact is a transient, and
  what carries it is the front, not the length.
  **AND `pbody` IS TWO FILES AT NINE A SECOND**, which is a recognisable loop inside a second --
  m62 wrote that rule about seven grunts and it had never been applied here. `autoJit` .09.
- **A LAYER THAT SAYS "PLATE" ONCE IS WEIGHT; NINE A SECOND IS A SECOND DRUM (m70,
  `HITSND.ringGap`).** m64's ring is a deliberate blow's second source, and under rapid fire it
  fired on **every round** -- so two short percussive layers at 9 Hz each, which is rain rather
  than an impact. It is thinned to `ringGap` .30 under auto and untouched everywhere else: a
  charge shot, a fist and a hammer all still ring on every blow.
  **ITS OWN INTERVAL RATHER THAN `SFX.gap`**, because what is wrong here is musical and not a
  voice budget -- .045 would let all nine through and changing the global would thin every clang
  in the game. And `thin` is a parameter rather than a read of the mode, so the one caller that
  knows it is a stream is the one that asks for it.
- **AND THE FOOTSTEPS WERE PLAYING THROUGH THE ROLL, WHICH IS WHERE `stepFeet` IS CALLED (m70).**
  *"The footsteps are way better. Now we need to make sure when he rolls he's not playing
  footsteps, because it currently is."* `stepFeet` is the FIRST line of `stepPlayer`, above the
  branch that owns the body -- so a roll, a lunge, a dash and a get-up all covered ground and all
  counted footfalls, and a dodge roll at `MELEE.rollV` is the fastest of them.
  **THE GAIT IS THE ONLY THING WITH FEET IN IT.** Everything in that list is a clip of a man
  doing something that is not walking, which is `bodyFeet`'s own `d.st !== 'idle'` test pointed
  at the player -- and it is the fourth time in this file that "when a feature does something
  wrong, check WHERE it is called before what it does".
  **The phase carries through rather than being zeroed**, so the first step out of a roll is not
  instant -- m64's own rule, which is exactly what a reset here would have broken.

- **A LOOPING CLIP THAT TRAVELS TELEPORTS AT ITS LOOP POINT (m69, `deDrift`).** *"He's like
  walking, most of his locomotion and animations go well, but then every now and again he'll walk
  to the side and then teleport like 5 feet back to where he was. I don't know what causes this,
  if it's an animation that's unaligned or what."* **It is the animation, and it is not
  alignment** -- it is baked root travel in the two clips the circle plays. Read straight out of
  his file, net Hips drift from the first key to the last, in armature units:
      standing_walk_forward   0.0      standing_walk_left    44.4   -> 1.06 m
      standing_run_forward    0.0      standing_walk_right   51.4   -> 1.23 m
      standing_walk_back      0.0      (and the drunks' unused strafes: 110 to 117)
  m35's note says *"THE CLIPS ANIMATE IN PLACE"* -- that was measured on the ANTENNA ALIEN and
  written under his section, and it was never true of the warrior's two strafes. **`K.strafe` and
  `K.strafeR` are `standing_walk_left/right`**, they are what `foeMove` plays while he CIRCLES,
  and `bodyLoops` correctly makes them LOOP: so the cycle carries him 1.2 m sideways and the wrap
  snaps him back. Four feet, intermittently, exactly as described. Nothing to do with a collider,
  a state machine or `bodySep`.
  **THE DRIFT IS REMOVED, NOT THE MOTION -- WHICH IS WHY IT IS NOT A FREEZE.** Pinning X and Z at
  the first key is the obvious fix and it would take the lateral hip sway out of every gait in
  the game along with it: the GOOD clips carry 1.9 to 2.3 units of it and that sway IS the walk.
  What is subtracted is the LINEAR RAMP from the first key to the last, so the clip starts and
  ends in the same place BY CONSTRUCTION and everything else survives. **No threshold to pick**,
  which matters -- a magic number here would have had to separate 2.3 from 44.4 by taste.
  **AND Y IS NEVER TOUCHED.** The Hips translation is the body's height off the ground and every
  crouch, landing and fall in the set uses it -- this file's own standing rule about why that one
  position track is kept when all the others are stripped.
  **A `ONCE` CLIP THAT TRAVELS IS FINE AND MUST BE LEFT ALONE.** `Shoulder_Hit_And_Fall` drifts
  26.7 units and `Getting_Up` 26.5, which is a man falling forwards and getting back up -- there
  is no loop point for it to snap at, and de-drifting those would make him fall straight down.
  So the pass is over `bodyLoops(K)`, the set the game already derives for exactly this question,
  rather than over a second list to keep in step.
  **ONCE PER KIND, NOT PER BODY.** `bodyProto` runs once and every copy of that kind shares the
  clip objects, so three warriors cannot de-drift the same track three times. Doing it in
  `bodySpawn` would have subtracted the ramp once per man.
  **AND `values` IS CLONED BEFORE IT IS WRITTEN.** GLTFLoader resolves an accessor once and
  caches it, so two tracks can hold the same `Float32Array` -- `normaliseClips` already clones
  `times` for that reason a few dozen lines up, and this is the same landmine one array over.
  **VERIFIED BY RUNNING THE SHIPPED ARITHMETIC OVER THE REAL TRACKS**, with the clean clips as
  the control, which is the half that says the fix is not also a bug:
      clip                    net before   net after   X-sway before / after
      standing_walk_left           44.38      0.0000     44.38 / 2.77   <- what is left is SWAY
      standing_walk_right          51.41      0.0000     51.41 / 3.39
      standing_walk_forward         0.00      0.0000      2.33 / 2.33   <- provably a NO-OP
      standing_run_forward          0.00      0.0000      1.89 / 1.89
  **AND THE PLAYER'S OWN EXPORT MEASURES CLEAN**, so this is not applied to him: every looping
  clip he has drifts under 0.5 units, and the four that drift at all (`landing_soft` 4.5,
  `Standing_Melee_Attack_360_High` 10.4) are `ONCE` clips at one to fourteen centimetres.
  `deDrift` is general and is there the day one of his re-exports is not.
  **WHAT THIS SAYS ABOUT THE NEXT MIXAMO CLIP** is the part worth keeping: an "in place" export
  is a CHECKBOX, and the strafes in this file were not exported with it ticked. `npm run clips`
  is where a net-drift column belongs the next time that tool is touched -- until then, the one
  thing that makes this class of bug invisible is that it looks like a physics or collider fault
  and is neither.

- **THE SOUND RAN AHEAD OF THE FEET, AND THIRTEEN MEN SHARED ONE KEY (m68, `strideOf`,
  `STEP.near`).** *"The footsteps are insane. I can't tell if it's coming from my guy or all the
  other guys but they're just constantly going and it just sounds like tap dancing."* Two causes,
  and the second is why he could not tell whose they were.
  **1. m64's STRIDE IS ONLY TRUE WHILE THE CLIP PLAYS AT `sp / ref`, AND `tsHi` CLAMPS THAT.**
  That note's argument -- one cycle covers `duration * ref` METRES whatever the speed, because
  the speed cancels -- is exactly right and has a precondition nobody wrote down: it cancels
  through the TIME SCALE, and the time scale is `clamp(sp / ref, tsLo, tsHi)`. Wherever the clamp
  bites the feet slow down and the sound does not. Tabled against what is actually on screen:
      speed  band     ts     OLD/s   NEW/s   feet/s
        1.5  walk    1.60      3.5     2.3      2.3
        2.0  walk    1.60      4.7     2.3      2.3   <- TWICE his feet, for the whole walk band
        3.0  run     1.36      3.6     3.6      3.6   <- unclamped, and m64 was right here
        7.2  sprint  1.60      8.9     6.4      6.4
  **THE WALK BAND IS CLAMPED ACROSS ITS WHOLE RANGE**, which is the part I would not have
  guessed: `walk_fwd` is 1.417 s against a scaled `walkRef` of 0.60, so ANY real walking speed
  asks for more than 1.6x. Nearly every step he takes was in the broken half.
  **THE FIX IS THE SAME ARITHMETIC WITH THE REAL `ts` IN IT.** One cycle takes `duration / ts`
  seconds, so it covers `sp * duration / ts` metres -- and with `ts` unclamped that reduces to
  `duration * ref` exactly, so this GENERALISES m64 rather than replacing it. **Both halves now
  read one `ts`, so the foot and the sound cannot disagree by construction**, which is the only
  agreement worth having given that nothing in this container can hear the game.
  **SO WHAT IS MEASURED AT LOAD IS THE PAIR, NOT THE ANSWER.** `STEP.clip` holds `{d, r}` and the
  distance is worked out at the speed he is going. A stride is not a constant on a clamped clip.
  **2. AND `SFX.gap` TURNS THIRTEEN RHYTHMS INTO ONE STREAM.** It refuses two `foot` sounds
  inside 45 ms, so a street of amblers does not come out as thirteen sets of footsteps -- it
  comes out as ONE saturated key with no rhythm in it at all. **That is precisely why "whose are
  those" had no answer**: the interval nobody could hear a pattern in was the gap's, not anyone's
  stride. `SFX.near` could not fix it either -- it is a MIX rule that fades to nothing at 40 m,
  and a body at thirty metres was still spending voices and still spending the gap.
  **A HARD RANGE IS A DIFFERENT QUESTION FROM A FADE**: `STEP.near` 9 m is "is a man over there
  worth a voice at all", answered at the producer, and `npcG` .52 puts the ones that survive it
  behind him rather than beside him.
  **AND THERE IS A MASTER SWITCH, BECAUSE HE ASKED FOR ONE.** *"Either way we need to fix it or
  just get rid of it altogether."* `mel.STEP.on = 0` is the one word and `mel.STEP.npc = 0` keeps
  his and drops the other thirteen -- so the A/B is on the phone rather than in a build.
  **THE BANK IS A STAND-IN AND IS MARKED AS ONE.** *"I'll put in a different footsteps sound."*
  `SFX.files.foot` points at the two BODY-IMPACT recordings, which is a man arriving flat -- six
  of those a second is a drum rather than a stride whatever the rate is. Its own key is what
  makes the swap one line.
- **AND NOTHING IN THE TRIGGER BLOCK HAD A `busy` GATE AT ALL (m68, `triggerStop`).** *"When I'm
  shooting and then I roll, he needs to stop shooting -- right now he just continues shooting
  while he rolls. It looks weird."* The guard has one, the square-up has one, and the blaster's
  trigger never did: a wound shot went on winding and a rapid-fire hold went on firing ROUNDS out
  of a man rolling along the floor.
  **CLEARING ON THE WAY IN IS NOT ENOUGH, WHICH IS THE HALF THAT IS EASY TO MISS.** The thumb is
  still up there, so the very next frame walks straight back through `padUp` and arms again
  mid-roll. It takes both: `rollGo` stands it down, and the block refuses to run while the body
  is not his.
  **`p.roll` AND `p.knock`, NOT `!p.grounded`.** Shooting out of a jump is fine and always was;
  what is wrong is shooting out of a move that owns the body. Copying the guard's `busy` verbatim
  would have taken the air with it.
  **AND A ROLL COSTS YOU THE CHARGE**, which is the trade rather than an oversight: you spent the
  move to go somewhere.
  **`triggerStop` IS ONE FUNCTION BECAUSE IT WAS ALREADY THREE COPIES WAITING TO HAPPEN.** The
  guard spelt the five assignments out inline; the roll and the knock-down want the identical
  thing, and `chargeStop()` is the one of the five that is easy to forget -- a rising synth hum
  nobody stops plays for the rest of the session.

- **THE m64 DEPLOY FAILED, AND A PAGES RUN IS A LINK IN THE CHAIN NOBODY WAS WATCHING (m67).**
  *"My game is stuck on m63."* He was on m63 and the repo was on m66, and the gap is not his cache
  alone. Read off the runs:
      m63  run 75  **success**  23:52   <- the last build that actually reached the server
      m64  run 76  **FAILURE**  00:00   <- deployed nothing
      m65  run 77  success      00:02
      m66  run 78  success      00:08
  **"PUSHED" AND "LIVE" ARE TWO DIFFERENT FACTS AND THIS FILE ONLY EVER CHECKED THE FIRST.** The
  loop here ends at `git push` and reports the build number, which is right for the ninety-odd
  builds where the deploy succeeds and is exactly wrong for the one where it does not -- **and
  from where he is standing a failed deploy, a ten-minute Pages cache and a bug that did not fix
  anything are all the same picture**, which is the same sentence `npm run bump` exists under.
  **SO THE CHECK IS ONE CALL AND IT COSTS NOTHING:** after a push, read the newest
  `pages build and deployment` run for that head sha and say so if it is not green. It is NOT a
  CI gate -- the "there must not be one" note above is about a workflow that FAILS on every push
  and trains everybody to ignore a red X; this is reading the one run GitHub creates by itself.
  **AND A QUEUED RUN IS NOT A SHIPPED BUILD.** m66's run was still `in_progress` when this was
  looked at, so "shipped unverified -- m66" was true of the repo and not yet true of the phone.
  Say which, when it matters.
- **BEING KNOCKED DOWN, AND THE EXPORT ALREADY HAD TWO OF THE THREE BEATS (m67, `HURT`,
  `p.knock`).** *"When the orcs hit you, you fly through the air a little bit and land on the
  ground and then get up."* Read straight out of the file -- 24 clips, and what is in there is
  `in_air` (a real float) and `landing_hard` (a real man hitting the ground and pushing back up
  off it, 1.50 s authored). **What there is NO clip for is LYING there**, so there is no lying
  beat: the arc runs straight into the hard landing and that IS the get-up. `HURT.down`/`up` are
  the hooks, written the way `CLIPS.block` and the hick's empty pose names are -- **the STATE runs
  either way and naming a clip later adds no branch**, which is the whole return on keeping the
  two separate.
  **THE APEX IS THE NUMBER AND `vy` IS DERIVED FROM IT**, m21's rule: a velocity picked by eye is
  a height nobody chose. `hi` .78 at `MOVE.g` 20 is 5.59 m/s up and 0.56 s of air, and `back` 7.6
  against `airDrag` integrates to **about four metres** -- `v0(1-e^-kT)/k` with k = .25, not
  `back * T`, which is the m146 arithmetic one repo over (a launch speed means nothing without
  the clock and the drag beside it).
  **AND IT IS SET, NOT ADDED.** Every other shove in `playerHurt` is `+=` on whatever he was
  already doing, which is right for a nudge and wrong for a solved arc -- added to a sprint it
  lands him somewhere nobody chose.
  **IT ALWAYS LANDS HARD, rather than hoping the arc clears `MOVE.hardLand`.** Those are two
  unrelated numbers -- the apex is chosen for how it READS and the threshold is about falls -- so
  coupling them means retuning one silently changes the other. At 5.59 m/s it would have failed
  the 8.0 test and landed SOFT, which is the picture this whole build exists to avoid.
  **AND `landing_hard` PLAYS AT ITS OWN LENGTH.** `MOVE.landHard` 1.15 compresses a 1.50 s clip
  to x1.30, which is right for a landing you are running out of and is m37's "too fast to read is
  the same reaction every time" for a get-up. `HURT.land` is 1.50, so x1.0.
  **A GET-UP IS NOT CANCELLABLE, WHICH `landFree` WOULD OTHERWISE MAKE IT.** That early-out exists
  so an ordinary landing does not cost you a step you were already taking; applied here, one nudge
  of the stick and the get-up is never once seen -- m8's lesson about a state that cuts its own
  clip short, arriving from the other side. `meleeGo` and `rollGo` refuse to start out of one too.
  **ONE FLAG FOR BOTH HALVES.** `p.knock` is set at the launch and cleared where the landing ends,
  so the flight and the get-up are one move rather than two states to keep in step -- and every
  gate (no steering, no early-out, land hard, no strike, no roll) reads that one thing.
  **A GUARD IS WHAT KEEPS HIM ON HIS FEET**, which is the third thing blocking now buys on top of
  the damage and the shove. **And `again` 1.1 is what stops three orcs holding him on the floor**
  -- a blow inside that window still hurts and still shoves, it just does not re-launch, which is
  `d.cool`'s own rule pointed at the player. Being unable to move is the least fun state in any
  game and this file already says so about the stun.
  **AND A BLOW TAKEN WHILE HE IS DOWN DOES NOT HOP HIM BACK OFF THE FLOOR** -- the shove branch's
  `if (p.grounded) p.vel.y = up` would otherwise interrupt a get-up with a little jump, which
  reads as a glitch and not as a second hit.
  **`whooshSnd` CAME OUT OF `bodyWhoosh`, `bumpSnd`'s own m66 refactor one event over.** A man
  thrown through the air and a BODY thrown through the air must not be two different sounds; the
  landing thump was already shared and this is the other half. **`p.knockCool` and `p.knock` are
  initialised in the player object**, because `undefined -= dt` is NaN and a NaN cooldown is a
  player who can never be knocked down again -- silent, and invisible to both gates. m63's
  `d.bumpT` lesson, and the reason it is checked every time now.
  **THE CHIP SAYS `KNOCKED` IN THE AIR AND `getup` ON THE GROUND**, because "it never fired" and
  "it fired and I could not tell which half I was in" are opposite bugs and one picture from a
  phone. `mel.hurt()` knocks him down from the console, `mel.hurt(12, 0)` is the old plain shove,
  and `mel.HURT` is live.
  **WHAT IS UNVERIFIED**: whether four metres and 0.56 s read as *"a little bit"* is the
  look-at-it half and belongs on the phone -- `hi`, `back` and `land` are the three dials. And
  `npm run sim` has no case for this; the knock-down is arithmetic over the shipped `integrate`
  and could have one, which is a stated gap rather than a claim.

- **A SOUND KNOWS WHERE IT HAPPENED, AND THAT BELONGS IN `snd` (m66, `SFX.near`).** *"Maybe the
  footsteps on them as well, but they probably -- depending how far away from you they are, the
  volume is quieter."* Right, and it is the whole reason this goes in `snd` rather than at the
  call sites: **a body sound is emitted from ten places now** (the grunt, the melee hit, the ring,
  the bolt on a man, two taunt beats, the whoosh, the bump and both footstep callers) and a rule
  every producer has to remember is not a rule. One optional `{ x, z }` on the options object,
  absent for anything that happens to the player himself, and the gain is multiplied on the way
  past. `mel.SFX.near` is live.
  **THE DISTANCE IS CHECKED FIRST, BEFORE THE VOICE CAP AND BEFORE THE PER-KEY GAP.** A warrior
  thirty metres away being punched by another warrior must not take one of `SFX.max` voices and
  must not spend `SFX.gap` on the `hit` key -- if it did, a brawl across the street would silence
  the fight you are standing in, which is exactly backwards. Past `out` it returns before
  touching either.
  **AND IT IS A SMOOTHSTEP TO ZERO, NOT AN INVERSE SQUARE.** A physical falloff is 1/d and never
  actually reaches zero, so a hundred bodies at a hundred metres each contribute a little and the
  mix turns to mud; `full` (7 m) is "as loud as it gets" and `out` (40 m) is silence, which is a
  decision about the MIX rather than about acoustics. No `PannerNode` either: this is one gain
  multiply against a whole spatial audio graph, and nothing in here is stereo-positioned.
- **HIS LANDING IS THE SAME IMPACT A BODY'S IS (m66, `bumpSnd`, `BODYSND.drop.me`).** *"He said
  the bank -- for it is still sitting right there for the hero. I'm assuming we could do it for
  his landing as well."* `bodyBump` was already the one rule for a body arriving; the half that
  is genuinely shared is the SOUND, so `bumpSnd(v, x, z)` came out of it and `bodyBump` kept the
  cooldown and the position lookup, which are the body's own business. `integrate` calls it where
  `p.fallV` is already measured -- **the one frame `landed` is set**, so there is no second test
  for "is he on the ground" to drift from the first.
  **`me` .72 IS WHY HE IS NOT A SACK.** A man landing on his feet absorbs it; a body arriving flat
  does not, and the same recording at the same gain would make every jump sound like somebody
  being dropped. One multiplier rather than a second table, so retuning `drop` moves both.
- **AND THEIR FOOTSTEPS ARE m64'S ARITHMETIC ON THEIR OWN CLIPS (m66, `bodyStride`, `bodyFeet`).**
  A stride is `duration * ref / perCycle` metres -- how far one authored cycle carries a body
  whatever rate it is played at -- so an NPC needed no new idea, only the kind's own two clips and
  two refs. **Cached on the KIND**, because it is a fact about the EXPORT and not about the man:
  three warriors share one measurement.
  **THE CROSSOVER NEEDS NO CONSTANT**, because each kind already carries its own two reference
  speeds: midway between `walkRef` and `runRef` is the point the gait blend is halfway across, by
  construction, and a typed threshold would be a third number to keep in step with two that
  already exist.
  **A KIND WITH NO WALK CLIP IS SILENT AND THAT IS CORRECT.** The officer never moves; `K.clips.walk`
  being absent is the honest test for it, not a flag to remember to set.
  **AND `d.st !== 'idle'` IS DOING REAL WORK.** `idle` is the umbrella every AI state lives under;
  `hit`, `down`, `up`, `taunt` and `block` are not walking -- and a man being SHOVED along the
  ground covers distance without taking a step, which would otherwise read as him jogging while
  unconscious. That distance already has its own sound in `bodyBump`.
  **THE PHASE IS KEPT, NEVER ZEROED, on both bodies and the player.** Resetting it on a stop makes
  the first step of every start instant, so a jiggled stick is a burst of footfalls -- which is the
  push cycle's own lesson one repo over, where a released thumb re-seeding the stroke turned a
  rhythm into four sounds.

- **A CHARGE TOPPING OUT IS NOT AN IMPACT (m65, `HCHG.snd`, `SFX.files.ready`).** *"As it
  currently is, when you charge the melee it makes a metal clang noise and I don't really like
  that -- it's confusing, it seems like you hit something. There's another one we used, I don't
  know if it was a ping, or there's also a bunch in the other game robits like a power up
  noise."* He is describing a **vocabulary** error and not a mix one, which is the same shape as
  m55's plasma-bolt-is-not-a-detonation: the clang is the sound of a blow landing, so playing it
  when nothing has been hit says the wrong thing however quiet it is. m64 made that worse by
  putting a real clang on every actual blow, so the two became the same noise.
  **`powerup_01.mp3`, BORROWED FROM `robits/audio`** the way the swooshes and clangs already
  were. **And it is played from its PEAK (`cut: 1`), which is what makes a RISE usable as an
  ARRIVAL** -- Shredworld turned this exact file down for the blaster's charge HUM because it is
  a one-shot rise and a hum has to loop, which is the opposite requirement. Here the EVENT is
  the moment the rise lands, so `e.p` throws the wind-up away and leaves the ding. m59's
  mechanism doing the job it was built for.
  **THE WHOLE SHAPE IS ON `HCHG` NOW**, not spelt at the call site, so `mel.HCHG.snd = 'lock'`
  is the A/B to the metal ping he also named and `'clang'` is the one word back.
- **AND A TAUNT MAKES A NOISE (m65, `K.tauntSnd`).** *"When the warrior beats his chest we could
  use those same sound effects for that as well. I'll probably make custom orc noises for that,
  but for the sound of the chest beat."*
  **KEYED ON THE CLIP NAME, ON THE KIND'S OWN TABLE.** A chest thump and a battlecry are two
  different events and **the only thing that separates them IS which clip is playing** -- so
  this is the one place in this file where a name test is the honest test rather than a shortcut
  for a structural one (`stripPoses`' rule, met from the other side). A taunt with no row is
  silent, which is what a new one should be until somebody says what it sounds like.
      standing_taunt_chest_thump   `hit`, TWICE, heavy and low, plus the armour ring
      standing_taunt_battlecry     `grunt`, once -- the orc bank, which is what a bark is
  **`at` IS WHERE IN THE CLIP, AS FRACTIONS, AND THE LOOP IS A `while`** -- so a slow frame that
  steps past two beats fires both rather than losing one, which a per-frame `if` would.
  `d.tauntN` is how many have gone and is reset where the taunt starts.
  **BOTH ARE STAND-INS AND BOTH ARE MARKED**, the way `soft` and `drop` were before his own
  recordings landed: point the keys at files and nothing else moves.
  **AND THE FRACTIONS ARE A GUESS THAT WANTS A LOOK ON THE PHONE.** A strike has `MELEE.at` --
  an authored contact frame to measure against -- and a taunt has nothing of the kind, so .30
  and .50 are where two chest beats plausibly fall in a clip and not a measurement. Stated
  rather than dressed up; `mel.FOE.tauntSnd` is live.
  **THE TAUNT IS ONE KNOCK-DOWN IN FOUR** (`FOE.taunt` .25) and only on the way back up, so it
  takes a few fights to hear. That is the existing rule, not a new one.

- **THE CLANG IS A LAYER, NOT AN ALTERNATIVE -- AND THAT IS THE THIRD ANSWER (m64, `hitRing`).**
  *"I'm thinking the metal clang in addition to what we're using, for both the blaster and the
  melee."* m57 made it the armoured body's SOUND, m63 replaced it with his own recordings, and
  **ADDITION is what he actually wanted both times**: the hit bank is the BLOW and the ring is
  what the blow lands ON, so they are two sources and one event -- exactly the shape the grunt
  already has at m62, and not the m27 duplicate, which was two voices describing one thing.
  **IT IS STILL A FACT ABOUT THE MAN.** The ring rides `HITSND.hard.ring`, so plate rings and a
  drunk in a coat does not, and giving a body one is a field on his row. m57's own distinction
  survives -- what changed is that it is now carried by a LAYER instead of by a different file.
  Quieter and higher than the clang ever was alone, because it is no longer doing the impact.
  **AND `dummyHit` RETURNS THE BODY NOW, NOT A FLAG.** The blaster half of his sentence needed
  to know WHAT the bolt hit in order to ask whether that man rings -- which is the identical
  one-word change `strikeSweep` needed at m57, for the identical reason. It still loops them
  ALL (m36's `hitAll`), and every caller tested it for truth rather than comparing it to 1, so
  returning the man cost nothing. `b.onMan` carries the body rather than a 1.
- **HIS FOOTSTEPS, AND THE STRIDE IS A DISTANCE THE CLIP ALREADY DECIDED (m64, `STEP`,
  `stepFeet`).** *"I think his footsteps, we could use the two ground sound effects that I just
  made, for each footstep."*
  **A FOOTSTEP IS EVERY N METRES, NOT EVERY N SECONDS**, and that is the whole reason this stays
  in sync with nothing to keep in step. `rigAnim` time-scales every locomotion clip by
  `speed / ref`, so one cycle takes `duration * ref / speed` seconds and therefore covers
  **`duration * ref` METRES whatever speed he is going** -- the speed cancels. Two footfalls to
  a cycle, so the stride is half of that, and the accumulator does the rest.
      a TIMER would be right at exactly one speed and wrong at every other
      a PHASE read off the mixer would be a second clock to keep in step with the clip's own,
      which is the m59 push-scrape lesson one game over
  **AND THE THREE STRIDES ARE COMPUTED AT LOAD FROM THE REAL DURATIONS AND THE SCALED REFS**, in
  `buildRig` where both are known -- so a re-export at a different length, or another change to
  `RIG.height`, moves them with nothing edited. They are printed at boot beside the clip list.
  **THE PHASE IS KEPT WHILE HE STANDS STILL.** Zeroing it makes the first step of every start
  instant, so a jiggled stick is a burst of footfalls; carried, he simply resumes.
  **LEFT AND RIGHT ALTERNATE BY A SHADE OF PITCH**, plus jitter, because two identical footfalls
  in a row read as a loop rather than as a man -- the grunt's own argument at m62.
  **ITS OWN KEY ON THE SAME TWO FILES.** A footstep must not gate out a body hitting the ground
  through `SFX.last`'s per-key gap, and either wants re-pointing alone. Bytes off the HTTP
  cache; one extra decode on a short file.
  **THE PLAYER ONLY, WHICH IS WHAT HE ASKED FOR AND IS ALSO THE CHEAP HALF.** Thirteen bodies
  with footsteps is thirteen more voices in a fight; `stepFeet` reads `player` directly and
  giving the NPCs the same thing would want the accumulator on the body, not a second function.
  **AND HIS OWN LANDING IS STILL SILENT** -- `MOVE.landSoft`/`landHard` fire no sound at all, and
  the bank for it is now sitting right there. Not done because he did not ask; stated so it is
  not re-discovered.

- **HIS HIT BANK, AND THREE STAND-INS DISCHARGED AT ONCE (m63, `audio/hit_sounds`).** *"The
  first like three are for when the melee connects, then there's two for when the plasma cannon
  actually hits the character, and the last two are for when they fly into the air and then hit
  a wall or another character or the ground -- play one of these two for every connection
  point, so if they bounce or hit a wall and then hit the ground."* **The filenames carry the
  split and the game reads it exactly as he wrote it**, three keys, no guessing.
      hit_sound_01..03          -> `hit`    the melee connect
      hit_sound_plasma_01/02    -> `pbody`  the bolt landing ON a man
      hit_sound_gound_01,
      hit_sound_ground_02       -> `drop`   every impact a flying body makes
  **THE FILENAMES ARE LEFT EXACTLY AS UPLOADED, `gound` AND ALL.** A tidy-up here is a 404 the
  next time he drops the same files in, and `A()` keys on the path -- Shredworld's own rule
  about `.mp4` in the middle of a skateboard filename.
  **AND THREE NUMBERS THAT ONLY EXISTED TO RESCUE A STAND-IN WENT WITH THEM.** `soft`'s `r` .55
  and `dur` .13, and `drop`'s `r` .52 and `dur` .18, were what made `box_break_01` sound
  remotely like a body; his recordings ARE the thing, so they play at their own rate and their
  own length. **A number that exists to rescue a stand-in has to go when the stand-in does**, or
  the fix for one file becomes a bug in the next -- m58 paid for this once on the `dur` cap.
  **BOTH `HITSND` ROWS NAME THE SAME BANK NOW, WHICH REOPENS m57 DELIBERATELY.** That build put
  `clang` on the warrior because *"the clang and the clink is for people with armour"*, and
  these three are recordings of a melee landing with no exception named. So the armoured/flesh
  distinction stops being two FILES and becomes WEIGHT and PITCH on one set -- the metal clangs'
  own rule, where three car tiers are told apart by pitch rather than by three recordings. The
  rows are `hard` and `soft` rather than `clang` and `soft`, because a row called `clang` that
  does not play a clang is a comment describing an intent the code cannot express.
  `metal_clang_01..03` stay loaded, so `mel.snd('clang')` is the A/B and the hammer's top-out
  ring is untouched.
  **AND THE BOLT PICKS A BANK RATHER THAN A GAIN.** `b.onMan` has told those two events apart
  since m58 and was only choosing how loud; it chooses the recording now. A near miss into the
  wall behind him still lands on the `plasma` bank, because that is what an area weapon IS and
  it must not go silent.
- **A BODY IN THE AIR IS A PROJECTILE (m63, `FLYHIT`, `bodyBump`).** *"I do think we should make
  enemies be able to fly there and hit other enemies. Knock them down, or at least hit them back
  a little bit."*
  **IT NEEDED NO DAMAGE PATH AND NO SECOND BRAIN.** The man he lands on goes through
  `dummyBlow`, which is the one function a fist, a mace and a bolt all already reach -- so the
  reaction clip, the grunt, the shove, the health and the knock-down are written, and **a man
  knocked down hard enough is a flyer in his own right, so the CHAIN falls out of it** rather
  than being coded. That is `d.K`'s own dividend, three builds along.
  **THE POWER COMES FROM THE IMPACT SPEED**, which is the difference between "knock them down"
  and "hit them back a little": `FOE.fling` .70 is crossed around 14 m/s, so a full fling (24
  m/s) bowls the next man over and a light knock merely staggers him -- one curve, both of his
  outcomes, nothing typed per case.
  **THE STRUCK BODY'S OWN `K.cool` IS WHAT STOPS IT FIRING EVERY FRAME** they overlap, so this
  needed no state of its own; `dummyHit` has skipped bodies on cool since m56 and the same field
  does the work here. `cost` is what the flyer pays, or one fling scythes a whole street.
  **AND A WALL IS A REAL BOUNCE, WITH THE NORMAL COMING FOR FREE.** `resolveBoxes` returns
  whether it pushed, and **the push itself IS the surface normal** -- so only the component going
  INTO the wall is reflected and what he had ALONG it he keeps. A slide along a shopfront costs
  nothing and a square hit comes back off it, which is Shredworld's `SK8.bounce` rule one body
  over and is exactly the *"if they bounce"* he asked for.
  **ONE `bodyBump`, SO THREE CONNECTION POINTS CANNOT BECOME THREE RULES.** Its floor is a SPEED
  (a man scrubbed along the floor or grinding down a wall must not thump) and its `cool` is the
  same floor in TIME, **per body rather than per key** -- two men landing together are two
  impacts and one man scraping a wall is not, which `SFX.last`'s global gap gets backwards.
  **`d.bumpT` HAD TO BE INITIALISED IN `bodySpawn`.** `undefined -= dt` is NaN, and a NaN clock
  is a body that never bumps again -- silent, and invisible to both gates.
  **WHAT IS UNVERIFIED**: the flyer-into-body test is horizontal with a height gate, so a body
  sailing over another one's head at a steep angle may still clip him; and a body knocked into
  the PLAYER does nothing, because `playerHurt` is a separate path and he did not ask for it.
  Both stated rather than hidden. `mel.FLYHIT` is live.

- **A BODY MAKES THREE SOUNDS AND `HITSND` HAD NOTHING TO SAY ABOUT ANY OF THEM (m62, `BODYSND`,
  `K.voice`, `bodyWhoosh`).** *"I added a sound effects folder for alien orc grunts, so when he
  gets hit or shot he plays these also. Also, when you launch them in the air it needs to play
  that swipe noise the character plays when he melees -- any time a body part moves fast we need
  to play one of those. And then I need a sound effect for when they hit the ground too."*
  **"ALSO" IS THE WORD THAT DECIDES THE SHAPE.** `HITSND` is the sound of the CONTACT, keyed on
  what the man is made of; a grunt is the sound of the MAN. Two sources, one event, so the voice
  sits BESIDE the impact rather than replacing it -- which is not the m27 duplicate, because
  that one was two voices describing the same physical thing.
      grunt    `K.voice` on the kind, the way `K.snd` is. Louder and lower the harder he was hit
      whoosh   the strikes' OWN swoosh, keyed on the body's SPEED and nothing else
      drop     the arrival, where `bodyFly` actually sets him down
  **THE VOICE GOES IN `dummyBlow`, WHICH IS THE ONE PLACE EVERY BLOW ON A BODY REACHES** -- fist,
  mace, bolt and blast alike -- and `dummyHit` has already refused anyone inside `K.cool`, so it
  is exactly one grunt per blow with nothing new to gate. **Above the down-punt return on
  purpose**: kicking a man who is already on the floor is still hitting him.
  **THE RATE IS JITTERED.** Seven files heard a hundred times become recognisable, and a grunt
  that is always the same grunt reads as a sample rather than as a man -- which is this file's
  own "it always does the same thing" lesson, for the third time and on the audio side.
  **AND IT IS THE ORC'S.** The files are named for him and only `FOE` names the voice; the two
  drunks and the officer stay silent until there are recordings for them, which is **one word
  each** on their tables. `mel.snd('grunt')` plays one from the console.
  **THE WHOOSH IS KEYED ON SPEED, NOT ON WHICH BRANCH LAUNCHED HIM**, which is his sentence read
  literally and is also the only version with one threshold in it: `bodyWhoosh(d)` reads
  `hypot(vx, vy, vz)` and is called at each of the three places a launch velocity is set. A
  full-power KNOCK is 4.2 m/s and the smallest real launch is over 7, so `at` 5 keeps an ordinary
  jab silent and catches every punt and every fling with nothing typed per case. **And the pitch
  comes DOWN as the speed goes up** -- a big body moving fast is a lower sound than a fist, which
  is the metal clangs' own rule, where three car tiers are told apart by pitch and not by three
  recordings.
  **THE LANDING IS FIRED WHERE THE FLIGHT IS ACTUALLY ENDED**, in `bodyFly`, not on the state
  clock -- the GROUND is what stops a body and a timer drops him through whatever he was thrown
  onto (m35's own reason for making the flight ballistic in the first place). **The impact speed
  has to be read before `d.vy` is zeroed**, and `at` 3 is what stops a man being scrubbed ALONG
  the floor thumping on every frame that branch runs, because `d.vy <= 0` is true the whole time
  he is down.
  **`drop` IS A STAND-IN AND THE THIRD KEY POINTED AT `box_break_01`.** There is nothing on disk
  that is a body landing, any more than there was one for a body being hit -- so it is the dull
  break dropped an octave, cut to an instant and given `cut`/`dec`'s percussive envelope. **Its
  own key** so it can be re-pointed alone and cannot gate `thud` or `soft` through `SFX.last`;
  the bytes come off the HTTP cache and only the decode is paid again.
  **AND `audio/alien_orc_grunt_sounds` HAD TO GO INTO `bump.mjs`'s `DIRS`** -- `readdirSync` is
  not recursive, so a new asset folder is a new entry there or every file in it goes stale
  silently. **Fifth time**, after `models/buildings` (m25), `audio/plasma_sounds` (m58),
  `models/towers` (m60) and Shredworld's own.
  **WHAT IS UNVERIFIED**: whether a grunt over `soft`'s box break is muddy on the drunks is moot
  (they have no voice yet), and whether a grunt over `clang` is right on the warrior is a device
  question -- `mel.SFX` is live and `HITSND.clang.g` is the dial if the ring is now in the way.

- **A RINGING BLOW IS A FACT ABOUT THE MAN, NOT ABOUT THE WEAPON (m57, `HITSND`, `K.snd`).**
  *"When you hit regular characters that are like NPCs, I think it needs to be more of a [moan].
  It shouldn't make the clang or the clink, cause that's for people with armour. I know that I
  need to make these noises, but I'm just thinking out loud."* m55 left this written down as a
  stated gap -- *"what it hits is arguably the better key"* -- and he closed it from the other
  side, in the same words.
  **THE BLOCKER WAS A BOOLEAN.** `strikeSweep` returned 1, so the call site knew a swing had
  connected and had no idea WITH WHAT -- which is why m55 could only split the sound by WEAPON.
  It returns the first body caught now; `p.melFired` already gates the sound to one per strike
  however many `hitAll` goes on to reach, and **every caller tests it for truth and nothing
  compares it to 1**, so returning the man cost nothing and broke nothing.
  **TWO TABLES, TWO FACTS, AND THAT IS THE WHOLE SHAPE.** `K.snd` on the KIND says what a blow on
  that body sounds like; the weapon multiplies the weight on top of it -- heavier and lower for a
  hammer, lighter and higher for a fist -- so a hammer on a drunk and a fist on a drunk are the
  same sound at two weights, which is right. **A kind with no `snd` keeps `clang`**, so a body
  added tomorrow is never silent.
      warrior   clang   armoured, and the one body in here his sentence is about
      officer   soft    a man in a uniform, not an orc in plate. ARGUABLE -- `snd: 'clang'` is
                        the one word if a vest should ring, and it is stated rather than assumed
      hick      soft
      hobo      soft
  **`HITSND` CARRIES THE WHOLE SHAPE AND NOT JUST THE FILE**, because a stand-in that is the
  wrong file is almost always the wrong LENGTH and the wrong PITCH too. `box_break_01` at its own
  rate is unmistakably a crate; dropped to .55 and cut to 130 ms it is at least a dull impact.
  **AND THERE IS NOTHING ON DISK THAT IS A BODY BEING HIT.** All fourteen files are metal, air,
  electricity or explosions, which is exactly why he is going to record these. So `SFX.files.soft`
  is named, wired and **marked a stand-in**: drop a file at that path, `npm run bump`, and nothing
  else moves. Same pattern as `CLIPS.block` and the hick's empty pose names -- write it to take
  the asset the moment one exists.
  **ITS OWN KEY RATHER THAN SHARING `thud`'s**, so the player taking a blow and an NPC taking one
  cannot gate each other through `SFX.last`'s per-key `gap`, and either can be re-pointed alone.
  That is `splat`'s own argument at m55, one event over.
  **AND THE BOLT'S IMPACT IS ALREADY ON ITS OWN HOOK.** *"I like the electricity and the launch
  noise of the ball, but when it hits them it needs a more punchy noise. Just the explosion noise
  wasn't great."* m55 took it off `explosion_small.mp3` and onto `splat` -- the beam file cut to
  an instant -- so if he is still hearing an explosion he is on m54 or older. **The stand-in is
  deliberately NOT re-tuned here**: churning a sound he is about to replace is work that gets
  thrown away, and the one-line swap is already in place.
- **SMALLER AGAIN, AND THE COST IS ALL AT THE TOP OF THE STICK (m57, `RIG.height` 1.45 -> 1.25).**
  *"I wanna try making the character smaller again."* `SZ` and `GAIT.refScale` between them make
  this one edit, which is what m52 was for -- the collider, the camera, his step, his reach and
  his fist all follow, the world does not, and every locomotion reference re-scales at load:
      h 1.75   scale x1.926   sprintRef 4.55   sprint clip asks 1.58x   no slide
      h 1.45   scale x1.596   sprintRef 3.77             1.91x          16% at full deflection
      h 1.25   scale x1.376   sprintRef 3.25             2.22x          **28%**
      warrior 1.85 is now 48% taller than he is; the hick 42%, the hobo 39%
  **`scaleSpeed` IS 0, WHICH IS HIS OWN m53 DECISION AND IS WHAT COSTS THIS.** Keeping his world
  speed at a smaller size is exactly the *"quicker despite him technically moving at the same
  rate"* he asked for -- the stride covers more ground per step -- and the arithmetic of that is
  `MOVE.max / sprintRef`, which grows every time he shrinks. Every band BELOW the sprint is inside
  `tsHi` and simply reads faster; it is only the top of the stick that slides.
  **`mel.GAIT.tsHi` IS THE DIAL AND IT IS NOT FREE**: it applies to every clip, and m53 brought it
  to 1.6 because at 1.9 the walk clip is a cartoon scramble through the whole walk/run crossfade.
  **A faster sprint clip is still the honest fix** and is still a stated open item.
  `mel.RIG.height` is NOT live -- the scale is measured at load -- so it wants a reload.

- **A BLAST RADIUS USED AS A COLLISION RADIUS IS AN EIGHT-METRE CORRIDOR (m56).** *"The radius
  of the collider of the Warrior aliens versus the charged blaster shot -- when they're almost off
  screen to my left, I still hit them. You need a little bit more specificity."* Exactly that, and
  the arithmetic is flat:
      full charge   ball  1.90 m ACROSS, so a visible radius of 0.95
                    test  size*.5 + blast + warrior r  =  .95 + 2.60 + .46  =  **4.01 m**
      fumble        test  .225 + .55 + .46 = 1.24, against a ball 0.45 across
  **AND IT RAN EVERY HALF-STEP OF THE FLIGHT**, not at a landing -- so it was not a sphere at an
  impact, it was a **four-metre-radius cylinder swept down the whole sixty-metre shot**, and the
  first man within four metres of the path anywhere along it WAS the impact. His sentence describes
  the shape precisely: off to the left, never aimed at, still hit.
  **m36 WAS NOT WRONG; IT WAS ONE NUMBER DOING TWO JOBS.** *"If I shoot a ball and it hits in the
  general area of a few of them, that should hit more than one at a time."* That is a blast, and
  `blast0`/`blast1` were sized for it -- the field's own comment said **"how far from the impact a
  body is caught"** and there was no impact to measure from, because the blast radius was what
  decided where the impact happened. **A comment describing an intent the code cannot express is
  the tell.** So the two are separate now and each does its own job:
      in flight   `size * .5` -- the ball, which is what he can SEE. 1.41 m at a full charge with
                  his own radius, and 0.68 at a fumble. You have to land it.
      on death    `size * .5 + blast` at the point it lands -- unchanged, so a crowd still goes
                  over together and m36 survives whole.
  **NOBODY IS BLOWN TWICE AND THAT NEEDED NO CASE.** `dummyBlow` sets `d.cool` and `dummyHit`
  skips anyone on it, so the man the ball hit directly is already out by the time the blast pass
  runs. The direct hit runs first by construction, because it is what killed the bolt.
  **THE BLAST IS SPENT WHEREVER IT DIES**, including on a wall, on the ground and at `boltLife` --
  which is right: a near miss that hits the wall behind him still catches him, and that is the
  whole of what an area weapon is for.
  **AND THE TEST IS STILL PURELY HORIZONTAL, WHICH IS A STATED GAP.** `dummyHit` has no y term at
  all, and the bolt is aimed at `aimTarget()` -- a point on the ground or a wall -- so it DESCENDS
  across its flight from a muzzle at chest height. A shot aimed at open ground sixty metres out
  passes well over a man at thirty and still reads as horizontally on top of him. Same class of
  complaint, not fixed here, deliberately: this build moves 4.01 m to 1.41 and **each toggle has to
  move one variable** or neither can be judged.
  **NO COLLIDER VIEW EXISTS IN THIS REPO.** Shredworld has one (`BOXES`, badge tap 12) and it is
  what settled the identical fault there -- *"the bolt tested a CIRCLE on the car's long axis"*,
  c161 -- so it is worth building the first time a hit radius has to be argued about rather than
  computed.

- **A BLOW ON A BODY RINGS, AND IT WAS LITERALLY A BOX BREAKING (m55).** *"The sound effect
  for when he melees and hits the warriors is like a box break, and I want it to be more like
  the clang noise."* Exactly that: `SFX.files.thud` is `box_break_01.mp3`, a crate coming apart,
  and the FIST played it while only the hammer rang. **He was describing the file, not a
  resemblance.**
  **THE TWO ARE STILL TOLD APART, BY WEIGHT RATHER THAN BY FILE.** A hammer is heavier and lower
  (g .9, rate .80), a fist lighter and higher (g .62, rate 1.22) -- which is the metal clangs'
  own rule one repo over, where three car tiers are told apart by PITCH and not by three
  recordings.
  **WHAT IT HITS IS ARGUABLY THE BETTER KEY AND IT IS A STATED GAP** -- a warrior is armoured
  and a drunk is not -- but `strikeSweep` reports a CONNECT rather than a body, and `hitAll`
  means one swing can land on several at once. A `snd` field on the KIND table is where that
  goes, beside `dmg`.
  **`thud` IS NOW ONLY THE PLAYER TAKING A BLOW**, which is the one place a dull break is right.
- **A PLASMA BOLT LANDING IS NOT A DETONATION (m55, `SFX.files.splat`).** *"I don't love the
  noise when the plasma cannon hits them -- it's kind of an explosion noise, whereas I want it
  to be more of, I'm not sure, something else. I'll probably go make a better one."*
  `explosion_small.mp3` is exactly what it says on the tin, and it is the wrong VOCABULARY
  rather than the wrong mix: what arrives is a ball of charged gas. The nearest thing on disk is
  the electrical beam, **cut to the length of an impact**.
  **AND THE LENGTH IS THE WHOLE TRICK, WHICH IS WHY `dur` IS HERE.** That file is a BEAM --
  seconds of it -- and an impact is an instant. m26 paid for exactly this once, when the arming
  zap *"kept playing for the full gambit of the noise"*, and `dur`'s ramp is what stops a
  mid-waveform cut being a click. A bigger hit rings a little longer; the rate goes DOWN and the
  gain UP with the charge, the way every other charged thing in this file reads heavier.
  **IT IS A STAND-IN AND IT IS MARKED AS ONE.** He is going to record it: drop the file in,
  point `SFX.files.splat` at it, nothing else moves. `boom` stays loaded and unused so
  `mel.snd('boom')` is still the A/B.
  **IT IS ITS OWN KEY RATHER THAN SHARING `zap`**, so the two cannot gate each other through
  `SFX.last`'s per-key `gap` and either can be re-pointed without touching the other. The bytes
  come off the HTTP cache the second time; only the decode is paid twice, on a short file.
- **WHERE HE ENDS UP IS WHERE HE IS (m54).** *"When I press up on the right stick to send him
  about the camera it works, it's good. But then when you release, he goes back to his original
  position, which is not ideal -- that should just be his new position."* Exactly what it did,
  and it is one line: **`p.heading` is only ever written from the THUMB**, and the `!aiming`
  gate freezes it for the whole hold -- so on release `faceTgt` fell back to whatever he was
  facing before the hold began and he eased all the way round again.
  **IT FOLLOWS `faceH` WHILE AIMING RATHER THAN BEING ADOPTED ON AN EDGE.** An edge is a thing
  to remember in three places -- the trigger, the guard and the square-up all freeze it the same
  way -- and a thing to get wrong once. Following it means there is nothing to hand over,
  because on the release frame `faceTgt` is already `faceH` and he simply stops.
  **RELEASED MID-TURN HE HOLDS WHERE HE GOT TO**, which is the predictable answer: carrying on
  to finish a turn nobody is asking for any more is the same surprise pointed the other way.
  **AND IT COSTS NOTHING WHILE THE LEFT STICK IS HELD**, because `heading` is rewritten from the
  thumb the moment `aiming` ends. It only ever shows standing still -- which is exactly when he
  is turning to look at something. **`p.heading` has precisely one reader (`faceTgt`)**, checked
  rather than assumed, which is what makes following it safe.
- **HE HAS NO TURN CLIPS, AND THE HOOK IS WIRED (m54, `CLIPS.turnL`/`turnR`, `GAIT.turn*`).**
  *"I do need to add some animations for when he turns, if we don't already have turn left /
  turn right, because he just rotates, not moving his feet at all -- and that would be the time
  to use those."* **Read straight out of the file: 24 clips and not a turn among them.** The
  WARRIOR has four (`standing_turn_*`), which is probably where the memory comes from, and they
  are on a different rig. So this is wired and waiting rather than guessed at, `CLIPS.block`'s
  own pattern: name one and it blends, leave it empty and `turnWeight` is zero and nothing in
  the gait changes.
  **IT IS DRIVEN BY THE BODY'S TURN RATE, NOT BY THE ANGLE STILL TO GO.** The residual says how
  far he has LEFT, which is large the instant a turn starts and large again if he is standing
  still facing the wrong way; the rate says whether he is actually moving. Damped, because one
  frame of jitter must not flicker a clip in and out. **+X IS HIS LEFT**, so a positive rate
  picks `turnL`.
  **AND IT TAKES WEIGHT RATHER THAN ADDING IT.** The gait below is a four-clip CHAIN that sums
  to exactly 1 by construction, and a table over or under 1 bleeds the BIND pose in -- the
  T-pose exactly. So the turn is paid for out of `rest`, the same budget the landing already
  comes out of, and every branch downstream keeps summing to what it was handed.
  **IT SITS ABOVE THE BRANCHES**, because turning on the spot happens in the ordinary gait AND
  in the committed one -- squaring up to the camera and pivoting is the case he reported it
  from -- so computing it once is what stops it being two copies.
  **AND IT IS GONE BY A WALK** (`turnUpTo` 1.1): once the gait is already showing his feet move,
  a turn clip on top of it is two strides at once. Measured through the curve: standing and
  turning deliberately it reaches .90, at half a metre a second .51, at a walk and above zero.
  **THE RATE SCALING WANTS MEASURING WHEN THEY LAND** -- `npm run gait`'s planted-foot method
  reads a walk, and the equivalent for a turn is degrees per second of the HIPS. Until then they
  play at 1.0x, which is what a turn clip is usually authored at.
- **I MADE THE SPEED PROPORTIONAL AND THAT WAS THE OPPOSITE OF THE ASK (m53,
  `GAIT.scaleSpeed`).** *"I thought making him smaller would make the locomotion seem a little
  quicker despite him technically moving at the same rate -- because he has these big giant
  chunky feet, and when he runs his stride is just so funny. He's moving these giant big feet
  but they're not going that far. Did you keep his stride and speed proportional to his new
  smaller size, or did you keep it the same?"*
  **I SCALED IT, AND PROPORTIONAL IS EXACTLY WHAT HE WAS TRYING TO GET AWAY FROM.** m52 moved
  `MOVE.max` and the bands along with the refs, which preserves the stride PERFECTLY relative to
  his body -- so he covers 17% fewer metres and from the camera the locomotion is the identical
  picture, only smaller. The whole complaint is that the stride is short for the feet, and the
  proportional answer keeps that intact by construction. **My reason was the "feet never slide
  at the top" invariant**, which is a real invariant and was the wrong thing to protect here.
      scaleSpeed 1   proportional. Same picture, smaller. Nothing slides.
      scaleSpeed 0   he keeps his world speed at four fifths the size, so every locomotion clip
                     plays **1.21x faster** for the same metres -- the stride covers more ground
                     per step, which is the "quicker" he described. **Default.**
  **THE REFS ALWAYS SCALE EITHER WAY.** That half is a FACT about the model scale, not a choice,
  and it is what m52 got right.
  **AND THE BANDS GO WITH `MOVE.max`, NEVER APART FROM IT.** Where a band lands on the PAD is
  `band / MOVE.max`, so moving one without the other is the m27 finding undone -- and moving
  both together leaves every crossfade where it was under either setting.
  **THE COST IS AT THE VERY TOP AND NOWHERE ELSE.** `MOVE.max` 7.2 against a scaled `sprintRef`
  of 3.77 asks the sprint clip for **1.91x against a `tsHi` of 1.6**, so it clamps and the feet
  slide about 16% at full deflection. Every band below is inside the cap and simply reads
  faster. `mel.GAIT.tsHi` is the dial and **a faster sprint clip is the honest fix** -- already
  a stated open item.
  **AND THE LESSON IS THE ANSWER TO "DID YOU".** He had to ask, which means the build note said
  what I did and not what it would FEEL like. A change with two defensible readings needs the
  reading stated in the reply, not only the mechanism.
- **THE MODE BUTTONS ARE ANNULAR SECTORS ROUND THE RIGHT STICK (m53, `MODES`).** *"Take two
  rings, one smaller, one larger, and cut pizza slices out of that -- those buttons would be
  like those segments."* The pad is a circle, so the controls that belong to it share its
  CENTRE: that is what makes them read as part of the same object rather than as a HUD element
  that happens to sit nearby, and it is the same argument the kit ring is built on one repo over.
  **THE SVG IS HUNG OFF THE PAD'S OWN INSET PLUS ITS RADIUS**, never written a second time, so
  the annulus cannot drift off the pad on a notched phone. It deliberately OVERHANGS the screen
  edge and that costs nothing, because `pointer-events: none` on the root means only the paths
  are targets.
  **`pointer-events: all` IS WHAT GIVES AN UNFILLED PATH A HIT AREA.** The alternative is a
  translucent fill, and m50's whole finding is that nothing on these pads should be a tint.
  **SCREEN Y POINTS DOWN, so a maths angle maps with its sine NEGATED** -- get that wrong and
  the set mirrors BELOW the pad, which is the one place it must not be. Checked as rectangles on
  a 390 x 844 phone: both sectors land at x 202-349, y 646-733, entirely on screen, clear of the
  left pad, and by construction outside the pad's circle (their inner ring is r0 74 against its
  radius 69).
  **AND ALL OF IT IS DERIVED FROM `MODES` AND `WEAP.modes`**: a third mode is a row in that
  table and the arc simply divides three ways. `mid` is 115 degrees rather than straight up,
  because straight up puts the outer segment off the right edge of a phone.
  **THE LABEL IS HORIZONTAL, NOT SET ON THE ARC.** At a 32 px band and ten-pixel type, text bent
  round a curve is decoration bought with legibility -- and legibility is the entire job of a
  control whose only purpose is to say which of two states you are in.
- **HE IS A LITTLE GUY AND HE WAS NOT DRAWN LIKE ONE (m52, `RIG.height` 1.75 -> 1.45, `SZ`).**
  *"He's kind of big compared to the guys that are supposed to be big bad warrior alien orcs --
  he's almost bigger than them even though his character is a little guy. I'm wondering if
  making him smaller would make the movements feel more grand."* Measured rather than eyeballed:
  hero **1.75**, warrior **1.85**. Six per cent is not a size difference, it is a rounding
  error. At 1.45 the warrior is **28% taller** and the hick and the hobo are a head over him.
  **A NUMBER HERE IS EITHER A PROPERTY OF HIS BODY OR A PROPERTY OF THE WORLD**, and shrinking
  him must move only the first kind. `SZ` is the ratio to `RIG.base`, so one edit moves the
  whole set and there is nothing to remember:
      SCALES    the collider (`r`, `hh`), `CAM.look`, `MOVE.step` (his LEG -- half a metre is
                his own hip at this size), `MELEE.arrive` (arm's length), `STRIKE.r` (his fist)
      DOES NOT  `CAM.dist`, `MOVE.jump`, `g`, the boxes, the building, the other bodies
  **AND `SZ` HAS TO BE DECLARED ABOVE EVERY TABLE THAT READS IT.** It went in beside `GAIT` and
  `MOVE` is declared FIRST, so `step: .5 * SZ` was a temporal dead zone -- **a blank page, and
  `npm run check:boot` caught it on the first run.** Eighth time across these repos, and the one
  the gate exists for. It sits immediately after `RIG` now.
- **AND A CLIP'S REFERENCE SPEED IS A FACT ABOUT THE MODEL SCALE (m52, `GAIT.refScale`).** This
  is the half that makes a height edit survivable at all. A reference is how fast the PLANTED
  FOOT slides backwards, which is authored travel TIMES the scale the model is drawn at -- so
  every number in `GAIT` was only ever true at **x1.926**, and a smaller hero whose refs did not
  follow plays every locomotion clip about **21% too slow** for the speed he is moving at. Not a
  slide at the top of the range: a slide at every point of it.
  They are scaled ONCE at load off `rig.scale`, not off `RIG.height` -- a re-export at a
  different authored height moves the scale without moving `RIG.height`, and the refs have to
  follow the one that actually changed. `mel.GAIT` therefore prints the SCALED numbers, which is
  the honest thing for it to print.
  **AND `MOVE.max` AND THE BANDS GO WITH THEM, WHICH IS THE PART THAT IS EASY TO MISS.**
  `MOVE.max` **IS** the sprint clip's own speed -- that is what makes the fastest clip play at
  1.0x at full deflection and the feet never slide at the top. Scaling the refs ALONE leaves it
  21% above the sprint it is meant to be: measured, the clip is then asked for **1.91x against
  a `tsHi` of 1.6**, so it clamps and he slides for the whole top of the stick. And the BANDS
  are speeds too, so leaving those would move every crossfade to a different place on the pad
  -- **which is exactly the m27 finding, undone by a height edit.** One factor over the whole
  table keeps every relationship: verified, all four bands land on the **identical percentage of
  the pad** (0.241 / 0.379 / 0.545 / 0.759) and the sprint clip plays at **1.58x, unchanged**.
  **AND "GRAND" IS THE WORLD, NOT HIS PACE.** Nothing else shrank, so he is four fifths the size
  against every box, the building and every other body, and the camera sits lower. `mel.MOVE.max`
  is the dial if he should also be FAST for his size; the cost of raising it is foot slide, and
  `tsHi` caps how much.
- **THE RAPID FIRE STOPPED BEING A SLOT AND BECAME A MODE WITH A BUTTON (m52, `WEAP.modes`,
  `modeNow`, `autoNow`, `#modeRow`).** *"When your blaster is equipped you have a button -- for
  now, until I build different guns that do different stuff, we'll just have this one do two
  modes. Above the right stick two buttons pop up and you click one for the sort of ball charge
  and the other one is the automatic, where you just press and hold up and that does rapid
  fire."*
  **m36 MADE IT A SLOT ON AN ARGUMENT THAT IS NOW ANSWERED BETTER.** *"A hidden mode is a state
  you can be in without knowing it"* -- right, and the fix for a hidden mode is to SHOW it, not
  to spend a kit slot on it. The two buttons ARE the state: on screen, lit, and only while the
  gun that has them is out. Same trade the guard made at m37. It also takes the kit cycle from
  four taps to three, and the two slots were identical to look at anyway because they share the
  model.
  **THE ROW IS BUILT FROM `WEAP.modes`**, so a third mode is a row in that table and nothing in
  the DOM -- and giving one its own `file:` is what would make it a different GUN rather than a
  different trigger.
  **AND IT EXISTS ONLY WHERE IT MEANS SOMETHING.** A mode row for a weapon with no modes is a
  HUD element sitting in the play area saying nothing, which is the `actB` lesson one game over.
  It is positioned off the right pad's OWN insets, so the two cannot drift apart on a notched
  phone the way two independently written positions eventually would.
  **`pointerdown`, NOT `click`**, and both `preventDefault` and `stopPropagation`: a click is
  synthesised after the touch has ended, and the one thing that must never happen on this row is
  a tap that also reaches the pad behind it.
  **AND SWITCHING MID-HOLD STANDS THE TRIGGER DOWN**, because a wound-up charge handed to a
  weapon that does not bank one has nowhere to go. `setMode` is the one place, so the lit button,
  the hint and what the trigger actually does cannot disagree.
  **The name stays the slot's**: "BLASTER - CHARGE" in the display face is wide enough to meet
  the build chip on a 390 px phone, and the mode is already on screen as a lit button.
- **THE CHARGE SETS THE REACH; THE TARGET SETS THE DISTANCE (m51, `MELEE.dashFree = 0`,
  `chargeAim`, `MELEE.dashLand`).** *"The way I think it will work is you still always launch to
  the character's position... the distance he travels always ends right at them, so that the full
  animation and swing finishes right at them -- you'll have to basically gauge the distance.
  There should still be a distance cap, in that the longer you charge the farther you can
  actually launch to hit them. It's just, regardless, when you release he still always launches
  to them within reason, within a cap."*
  **BOTH OF THE PREVIOUS SHAPES WERE ONE HALF OF THAT, AND THE LINE IS THE SAME LINE:**
      m21   `far = gap`               the man sets it, and the hold buys NOTHING
      m43   `far = wantD`             the hold sets it, and he goes straight THROUGH him
      m51   `far = min(gap, wantD)`   the hold is the CAP, the man is the DISTANCE
  **m43'S FINDING STANDS AND WAS NEVER ABOUT THE `min`.** What made the hold meaningless was
  that `finishRange` 26 acquired a man in a 24-degree cone from across the street, so `gap` was
  always the small number and `wantD` had no way to matter. `chargeAim`'s `acq` is what makes
  the cap real: **a target is only taken if the charge can actually carry him to it**, which is
  m20's rule -- an assist's range is sized for what it DELIVERS, not for what it draws --
  arriving on the melee side three builds late. A man past the reach is not acquired, so the
  dash covers the whole hold and falls short of him, which is what "gauge the distance" means.
- **AND HE WAS STILL MOVING WHEN THE HAMMER LANDED (m51, `MELEE.dashLand`).** *"He launches
  through them and so they go flying before he's even swung his hammer."* That is a SECOND
  cause and clamping the travel does not fix it: `carry` bleeds him to zero across the WHOLE
  state, so at the contact frame (`finishAt` .38) he has covered **.38 / .725 = 52% of the
  distance** and spends the other 48% ploughing on past the man he has just hit.
  **THE TRAVEL IS SPENT BY `dashLand` .42 AND HE IS STATIONARY FROM THERE**, so the blow is the
  hammer arriving at a body that has already arrived, and the rest of the clip is the
  follow-through it was drawn as. One `uu = u / arr` in the bleed, `arr` 1 for every other move,
  so the line is unchanged for everything that is not a dash.
  **AND `STRIKE.dashFrom` GOES BACK TO `from`.** m45's 0 was the right fix for the wrong shape:
  the dash used to plough past anybody close, so opening the window on frame one was the only
  way to catch them -- and catching them ON THE WAY THROUGH is precisely what he then described.
  **AND `dashV` HAD TO RISE WITH IT**, 66 -> 76: the clock is now `goDur * carryAvg * dashLand`
  = **.158 s**, not .377, so at 66 the furthest reachable became 10.45 m against a `flatFar` cap
  of 11 -- a lock the dash cannot deliver, which is the very thing `acq` was added to stop.
  Measured through the solve: every target case stops **exactly `arrive` 1.05 m short of him**,
  a full hold with nobody in range still covers 11.00 m, and a half hold 8.38.
- **A MARK ON THE FLOOR IS NOT A LOCK (m51, `MARK`, `markStep`).** *"Maybe we'll put a little
  circle under their feet, that kind of shows that they're qualifying as what your target is --
  rather than the lock, where the aimer is on them."* He has now turned down two assists that
  MOVED HIS AIM and kept the one that only moves his BODY, and this is the same distinction
  drawn in the art: **a mark drawn ON a man is a lock** -- your eye goes to it and you stop
  aiming -- **and a mark on the FLOOR under him is a fact about the world**, where the dash is
  about to put you, readable without looking away from the fight.
  **IT PULSES AND THEN SNAPS.** The ring TIGHTENS as the hold fills, which is the reticle's own
  argument (how loaded something is should be a SHAPE, not a bar), and at full it goes hot and
  stops breathing -- a DIFFERENT mark rather than a brighter one, which is the only kind
  readable at a glance instead of by comparison with a memory.
  **AND `chargeAim` IS ONE FUNCTION BECAUSE THE MARK IS A PROMISE.** `markStep` calls it every
  frame to draw the ring and `chargeRelease` calls it on the frame the thumb lifts to aim the
  dash. Two places computing "who is the target" is exactly the m20 bug -- the mark on one man
  and the shot at another -- and the fix there was to make it one call. **The circle can never
  appear under somebody the dash will fall short of**, by construction.
  **The chip reads `charge0.7>4.2`**: how wound, and how far off the man it has. No `>` at all
  means the release will cover the whole hold instead. "It didn't go to him" and "it never had
  him" are opposite bugs and one picture from a phone.
- **THE HAMMER SAYS IT IS LOADED, AND FULL IS AN EVENT (m51, `HCHG`).** *"We need to make it
  really obvious when the hammer is charging. I'm not sure how to do this, but maybe the hammer
  starts to glow and pulse, maybe his stance gets more violent, maybe it smokes -- something to
  know when you're fully charged. We could put a little bar."*
  **A BAR IS A NUMBER YOU LOOK AWAY TO READ.** Sparks off the head are something you see while
  still watching the fight, and they cost nothing: `spk` is a pool and one draw call, and
  `muzzleWorld()` is the measured far end of the geometry along the mount's own axis -- which on
  a hammer IS the head, so nothing about where they come from is typed.
  **THE RATE TIGHTENS AS IT FILLS** (`every0` -> `every1`), which is the jetpack's own lesson one
  weapon over: a single puff is a sticker and a run of them coming faster is a machine winding
  up. **AND THE TOP-OUT IS THREE THINGS ON ONE FRAME** -- a ring thrown off the head, a clang,
  and the ring under the target going hot -- fired on the CROSSING (`was < charge && now >=`)
  rather than on "it is full", which would fire every frame it is held.
  **AND THE GLOW HOOK WAS GATED ON THE WRONG QUESTION.** `if (slot.aim)` is "does this weapon
  shoot"; what `hueGlow` actually answers is "does it light up as the hold fills", which the
  hammer now does too. `GUNU` stays ONE shared uniform set -- only one weapon is ever mounted
  and `mountWeapon` re-measures the hue per slot -- but the two weapons were then both damping
  it every frame toward different targets, which is **two writers on one number**, so the slot
  names the source and there is exactly one line that moves it.
- **THE MELEE LUNGE SOLVED FOR THE GAP AND THEN THREW THE ANSWER AWAY (m51).** *"When you're
  swiping generally towards them it more or less moves directly to them, or to right in front of
  them, so that his melee animation really actually nails them perfectly."* It did solve for
  `dist - arrive` -- and then clamped the result UP to `base`, a typed lunge speed that has
  nothing to do with where the man is:
      man 1.5 m off   solves to 1.0 m/s   floored at 7.0   covers 3.1 m   = **1.6 m PAST him**
  every single time, which is the whole of "he goes through them". `base` is the FREE lunge, for
  a flick at nobody; a solved one is solved and the only floor it needs is **zero**. A man
  already at arm's length now gets a swing thrown on the spot.
  **AND THE CONE WIDENED, .42 -> .60** (24 deg -> 34). *"You can kind of button-smash with the
  stick -- swipe, swipe, swipe -- and he hits him, goes back, goes across to them. It's because
  of the aim assist on the melee, so he always kind of targets them if you're at least flicking
  in their general direction, and for a mobile game that's pretty good because you're pretty
  limited."* **"General direction" is a wider cone than "aimed at"**, and this one is safe to
  widen where the blaster's was not: it only ever pulls a LUNGE -- a physical assist with
  nothing drawn and nothing taken off the thumb, the half he has now asked to keep three times
  -- and the strike's own reach caps how far it can drag him.
- **A DEAD ZONE IS THE SLACK AT CENTRE, NOT A REGION (m51, `CAM.deadAim` .20 -> .12).** *"I
  really just wanted it to be like a subtle grace right in the middle."* Which is the right way
  to say what the number is FOR -- and because it SUBTRACTS rather than gates, a wide one is not
  merely a wide middle: the rescale goes on costing sensitivity all the way out to full lock, so
  it makes the stick heavy everywhere. Third pass on this number, and the lesson is that .34 and
  .20 were both sized against the RANGE rather than against the wobble.
- **NOT DONE, AND DELIBERATELY: the strike-pose clips and the multi-target combo.** *"I do need
  to put in better animations... I wanna play with the super fast ending in strike position pose
  things, which actually sounds fairly easy because it's less animation."* He is right that it is
  less animation and it is also a different SHAPE of move -- the travel comes first and the pose
  is HELD at the end, which is `MELEE.carry` inverted. `dashLand` is now exactly that shape for
  the charge: the travel is spent in the first 42% and the rest of the clip is the pose. Wire the
  ordinary strikes the same way when the clips land; do not fake it by retuning `carry`.
  And *"maybe if there's two guys or three you do a little combo and quickly hit all of them --
  not yet"*: `hitAll` already means the swept weapon catches everyone in the arc, so what that
  would need is a CHAIN of dashes rather than a wider blow.
- **THE INK WAS PAYING TWICE FOR WHAT THE COLOUR HAD ALREADY BOUGHT (m50).** *"You gave the
  sticks a slight drop shadow, I think we should remove that -- and the slight dim. I think the
  colours are enough. It makes it hard to read the little writing."* m49's rule was right about
  the problem and wrong about the remedy: what a white ring lacked was **CHROMA**, not WEIGHT.
  A saturated hue on a white floor is already high contrast, so the dark fill, the outer glow,
  the knob's drop shadow and the label's halo were a second solution to a solved problem -- and
  each one cost something: the fill greys the floor under the thumb, and **a dark halo behind
  ten-pixel text at .12em of tracking fills the counters and muddies the letters it was meant
  to lift.** The rim went 2px to 3px so the shape carries on one crisp line, the knob is a solid
  disc with one dark edge, and nothing on either pad is translucent, blurred or tinted.
  **THE `.act` FEEDBACK MOVED FROM THE FILL TO THE RIM** for the same reason: a tint that says
  "you are touching this" is a tint over the play area the rest of the time.
- **A DEAD ZONE IS SIZED TO THE WOBBLE, NOT TO THE RANGE (m50, `CAM.deadAim` .34 -> .20).**
  *"The dead zone now is like too strong, it's kinda hard to aim left and right."* A third of
  the pad spent on nothing is not a dead zone, it is a deliberate lean that does nothing.
  **AND m48'S OWN TABLE SAID SO -- I READ IT AS A PASS.** It reported **0.0 deg/s at 32% off
  centre** and I wrote that up as the fix working, when 32% of a pad is plainly a turn being
  asked for. The number to size against is the residual x a HELD thumb carries (.1 to .3), so
  .20 kills the bottom of that band and leaves the top of it turning. **A measurement that
  reports zero everywhere is as suspicious as one that reports zero nowhere** -- ask which of
  the rows were meant to be non-zero before calling it green.
- **HOLD UP BARE-HANDED AND HE SQUARES UP TO THE CAMERA (m50, `p.center`).** *"When you're
  disarmed, if you press up on the right stick he should centre to the view -- so now if you
  hold down on the left stick he runs backwards, if you hold left he strafes to the side, until
  you release the right stick."*
  **IT COST ALMOST NOTHING BECAUSE IT IS THE `aiming` BRANCH WITH EMPTY HANDS.** That branch
  already means exactly what he described: face where the lens looks, let `plant` go to zero so
  the legs carry him wherever the thumb says instead of dragging his body round to point that
  way, and let `rigAnim` pick the back/strafe clip off the SIGN of his travel. The guard
  borrowed it at m39 with the same `bare` handling; this is a THIRD caller, not a second copy.
  **UP WAS THE FREE GESTURE AND ONLY ON THIS SLOT.** It is the trigger with a gun and the
  wind-up with the hammer, and unarmed it did nothing at all -- so it is gated on the SLOT
  (`!s.aim && !s.charge`) rather than on a mode, and there is nothing to be in without knowing
  it. Same four gates through `padUp`: a third answer to "is the thumb pushed up" is a third
  thing to keep in step with the other two.
  **AND THE RING LIGHTS.** There is no weapon and no charge to show, so without it the only
  thing saying the hold took is the character turning -- which is also what he looks like when
  the camera happens to swing. The chip says `SQUARE`.
- **NOBODY GETS UP ON THE SAME FRAME (m50, `d.lie`, `d.upB`).** *"If I shoot them all three down
  at the same time they all get up at the exact same time -- we should stagger it by a different
  small amount so it feels more random."* `K.out` and `K.upBeat` were CONSTANTS, so three men
  knocked down together stood up in step, for ever, which reads as one animation played three
  times rather than as three men.
  **TWO NUMBERS, BECAUSE HE ASKED FOR THE RATE AS WELL**: how long he lies there and how long
  the get-up takes are different things. **ROLLED AT THE KNOCK-DOWN, NOT AT SPAWN**, so the same
  three do not stagger in the same order every fight.
  **AND THE STATE'S LENGTH HAS TO READ THE SAME `d.upB` THE CLIP WAS SCALED BY**, or it cuts the
  get-up off part-way -- the m8 landmine, which is exactly what a per-body beat would walk into.
- **THREE MEN MARCHING AT ONE SPEED DOWN ONE LINE IS ONE MAN DRAWN THREE TIMES (m50, `foeGait`,
  `foeLane`).** *"They just all kind of walk at the exact same speed towards me... maybe they
  don't always go in a straight line towards you, a little more intelligent path as well as
  speed. Sometimes it's a little faster, sometimes they stop, sometimes they turn, sometimes a
  little bit slower."*
  **m36 ALREADY ROLLED A `pace` PER BODY AND IT WAS NOT ENOUGH, WHICH IS THE POINT.** A CONSTANT
  multiplier spreads three men along one line and every one of them still moves at ONE speed, in
  a STRAIGHT line, for ever. **What reads as a person is the speed CHANGING and the line
  BENDING**, so what varies has to vary over TIME and not once at spawn. Three things off one
  clock, one per word of his sentence:
      lane    a bearing he drifts off dead-on   -- "not a straight line", "sometimes they turn"
      surge   a multiplier on his own pace      -- "a little faster... a little slower"
      hold    a hesitation instead of a lane    -- "sometimes they stop"
  **HE AIMS OFF AND WALKS WHERE HE IS POINTED.** `foeMove` drives him along `d.h`, which
  `faceTo` eases toward whatever it is given -- so biasing the FACE target bends the path for
  free, with an ease already on it, and there is no second bearing for the body and the travel
  to disagree about. The ease is also what turns a re-rolled lane into a visible TURN rather
  than a jump sideways. It reaches the travel only in the APPROACH, because giving ground and
  circling both compute their own bearing.
  **AND THE LANE TAPERS TO NOTHING AS HE ARRIVES.** Sidling in from thirty degrees off is a man
  closing on you; doing it at arm's length is a man who cannot find you.
  **EACH BODY HAS HIS OWN CLOCK AND HIS OWN PHASE**, so three can never re-sync -- the smoke
  plumes' rule. **AND A RE-ROLL IS A LANE *OR* A HESITATION, NEVER BOTH**, or a man stops and
  changes direction on the same frame, which reads as a glitch rather than as a decision.
  **`V.dash` IS THE HALF THAT WAS MOST VISIBLY SHARED.** A flat `notice * .45` meant every one
  of them broke into a run at the identical distance and dropped out of it at the identical
  distance -- so the one moment that could have told them apart was the one moment they all
  agreed on. Rolled per body, one jogs nearly the whole way in and another is walking from
  twenty metres out.
  **THE DRUNKS GET THE SAME FUNCTION WITH NO LANE.** Their path is already their own (the roam
  ring gives every body a different point to walk to), so a lane would only be a man failing to
  arrive somewhere nobody can see; what the amble was missing is the speed changing and the
  occasional stop, which is the other two thirds of it. They breathe harder and stop more,
  because that is what a drunk amble IS -- and it is one line on the table.
  **AND THE RUN CLIP IS STILL SLOW**: `K.run` 2.6 against a `runRef` of 1.79 is what `standing_
  run_forward` is actually walking at, so more of them running does not make them faster. The
  honest fix for a slow clip is a faster clip, and it stays a stated open item.
- **A WHITE CONTROL ON A WHITE FLOOR IS NOT A FAINT CONTROL, IT IS NO CONTROL (m49).** *"We need
  to make the joysticks different colors, they're almost impossible to see on the white... I keep
  missing."* Every value on both pads was `#ffffff` at 5 to 30 per cent -- a treatment that only
  exists against a dark background, and the world here is a white floor.
  **THE RULE IS THE DRAWN EFFECT WORDS' OWN, ONE REPO OVER: a FAT DARK RIM UNDER A SATURATED
  FILL survives ANY background**, because the ink carries the SHAPE and the colour carries the
  IDENTITY, while a translucent tint survives only the background it was picked against. Every
  ring is sandwiched now -- `#0b0d12` outside, the hue, `#0b0d12` inside -- and the knob is
  SOLID rather than a wash.
  **AND THE TWO HUES ARE NOT DECORATION.** They are two different controls -- the body and the
  verb -- and on a phone a thumb that lands on the wrong one has nothing to tell it so. `--pc`
  is the ONLY thing that differs between `#padL` (rose) and `#padR` (azure): the rim, the
  ticks, the knob and the label all read it, so a pad cannot end up half recoloured, and
  `mel.pads({ left, right })` moves both live.
  **THE ARM RING STAYS AMBER, which is now load-bearing rather than incidental** -- it has to be
  a different hue from whatever `--pc` is, or "the trigger is armed" degrades to "slightly
  brighter", which is the comparison-against-a-memory the reticle's own lock note refuses.
  **THE STYLING IS EIGHT STATIC TICKS AND THAT IS ALL.** *"Kind of similar to how we did the
  radical, but not as complex."* The reticle is five spinning layers because it is a MARK you
  READ; a pad is a place you PUT A THUMB, and anything moving under a thumb is something to look
  at instead of the game. One `repeating-conic-gradient` masked to an annulus on `::before`: no
  extra element, no animation, nothing written per frame.
  **THE TOUCH GEOMETRY IS UNTOUCHED.** `* { box-sizing: border-box }` and the border was already
  2px, so the rect `bindStick` measures is the same 132 px it always was; the `box-shadow` rim
  paints outside the element and is not in the hit area.
  **WHAT IS STILL NOT DONE IS THE FLOATING PAD** -- *"since we don't have the whole adjusting
  joystick thing on, which maybe we should think about in the future"*. A pad that appears where
  the thumb lands is the real fix for missing one; making it visible is the cheap half.
- **A THUMB PUSHED UP IS NEVER VERTICAL, AND THE AIM IS THE CAMERA (m48, `CAM.deadAim`).**
  *"When I'm trying to shoot and I'm aiming, I'm holding up on the right stick, and it's slightly
  sensitive -- the aimer goes right a little, goes left a little. I'd like it to just stay still,
  and left and right you'd have to go a little wider to turn the camera."* A held thumb carries
  an x of .1 to .3 the whole time, and at `yawRate` 2.6 that is up to **45 degrees a second** of
  turn under a thumb asking for none. **One writer on `cam.az` means that drift IS the reticle
  wandering** — the invariant that keeps the mark and the shot one answer is also what hands the
  camera's sensitivity straight to the aim.
  **AND IT IS A RESCALE, NOT A GATE.** `if (|rx| > .06) cam.az -= rx * rate` passes the FULL `rx`
  through the moment it clears, which is a step at the threshold: nothing, nothing, then .06 of
  rate all at once. Taking the dead zone OFF and stretching what is left back to 1 is continuous,
  gentler in the middle — the other half of "slightly sensitive" — and leaves full deflection at
  exactly the rate it always had. **A dead zone that subtracts is a dead zone; one that only
  gates is a threshold with a jump on it.** Measured: 149.0 deg/s at full lock, unchanged.
  **AND IT IS THE THUMB'S GEOMETRY, NOT `p.aim`.** Gating on the armed state leaves the `armT`
  window before the trigger latches running on the narrow zone — measured, **a one-off kick of
  2.5 to 3.4 degrees at the moment the aim starts**, which is the "it jumps a little" half. So it
  reads `padUp`, which is true from the first frame the thumb is up there, and whose hysteresis
  argument keeps it true once something IS armed: a thumb rolling inward mid-aim does not get the
  twitchy zone back.
  Measured over a two-second hold at 12 / 25 / 32 per cent off centre: **0.0 degrees**, against
  19 / 60 / 82 before. A deliberate lean still swings 92 deg/s, so turning while aiming is
  wider rather than gone.
- **THE WIND-UP HAD NO DIRECTION TEST AT ALL (m46, `padUp`).** *"The melee charge should only
  initiate when you hold up on the right pad, not any direction."* The gate was
  `R.down && PADS.R.hold() > MOVE.tapT` — **a third of a second of the thumb being anywhere on
  the pad** — so a CAMERA DRAG wound the hammer up and letting go swung it, which on this pad is
  the single most common thing a thumb does.
  **IT IS THE TRIGGER'S OWN FOUR GATES, SHARED RATHER THAN RE-DERIVED.** `padUp(on)` is now the
  one answer to "is the thumb pushed up" and both the blaster and the hammer call it: `arc` is
  what keeps a sideways drag a drag, `fireAt` is a push a nudge cannot reach, and `keepAt` is the
  hysteresis — it takes `fireAt` to arm and only `keepAt` to keep, so a thumb rolling inward as
  it lifts cannot cancel the swing you meant. **Two copies of that is two places for the trigger
  and the wind-up to start disagreeing about what a push up is**, which is what m37 said when the
  guard went on the same pad pointing the other way.
  **AND `tapT` IS GONE FROM IT**, which was the old gate's entire substance. It is redundant for
  the trigger's own reason: a push past `fireAt` .78 is already far beyond the tap's `far < .42`,
  so the jump and the wind-up cannot collide — and the wind-up can now be entered as fast as the
  thumb moves rather than a third of a second later.
  **THE POSE WAITS `armT` AND THE CHARGE DOES NOT.** A hold must not be shortened by its own
  gate, so `chargeT` starts at once; but a stab at the top that comes straight back is not a
  wind-up, and without the wait it swooshes and plays the strain every time. A stab could never
  SWING anyway (`chargeRelease` wants half a charge), so the delay is only on the sound and the
  clip — the two things a stab would make a liar of.
  **THE CASE FOR IT IS MOSTLY NEGATIVE ROWS**, because what was broken is something that must not
  happen: left, right, down and a diagonal all read `wound 0.00 s, chargeGo false`, straight up
  winds fully and swings, and a thumb rolled back to between `keepAt` and `fireAt` keeps its
  charge and still swings on the lift.
- **A MAN THREE METRES AHEAD WAS PASSED THROUGH AND TOOK NOTHING (m45, `STRIKE.dashFrom`).**
  *"Now the charge melee is working and now it's wayyyy too far. However I want the charge hit to
  send them flyingggfff and they don't really."* Two things, and the second one is a bug that
  m43 uncovered rather than caused.
  **THE WINDOW OPENED TOO LATE FOR A MOVE THIS FAST.** `STRIKE.from` .55 is a fraction of the
  clip's authored CONTACT FRAME, which is right for a standing swing — the arm has to get moving
  before it can hit anything. It is exactly wrong for a dash, where **the blow IS the body
  arriving at speed**. `finishAt` .38 × `from` .55 puts the window at u 0.21, and on a .30 s dash
  that is 0.063 s — by which point he has travelled about four metres. Measured through the real
  pad, a full hold at a warrior:
      3 m ahead    fired 0, he is idle, hp untouched   <- passed clean through him
      6 m ahead    fired 1, down, 15.0 m/s out
      12 m ahead   fired 1, down, 15.0 m/s out
  **So the ones close enough to matter were never hit at all**, which is most of *"they don't
  really"*. A dash opens at once (`dashFrom` 0) and the other strikes keep their wind-up.
  **AND `flatFar` CAME BACK DOWN, 24 -> 11.** Worth saying plainly: **24 had never once been
  SEEN.** m43 was the build that made `flatFar` mean anything at all — before it a man in front
  set the distance and these numbers were decoration — so the first time the hold actually drove
  the travel was also the first time anyone looked at what 24 m does. It is too far.
  **AND THE LAUNCH IS COMPARABLE TO THE DASH NOW, WHICH IS WHAT "FLYING" MEANS.** 15 m/s out is
  a perfectly good knock-down beside a man standing still and reads as nothing beside a man who
  has just covered 24 m: **the launch is judged against YOUR speed, not against zero.** 24 m/s
  and 8.5 up on the warrior, 26 / 9.0 on the hick, 25 / 8.8 on the hobo, with the drag eased so
  the flight is long enough to watch. These are the FULL-power numbers and everything under
  `fling` is graded up to them, so the ordinary jab is untouched.
- **THREE BUILDS OF TUNING COULD NOT POSSIBLY HAVE SHOWN, BECAUSE THE DISTANCE WAS NEVER THE
  HOLD'S TO SET (m43, `MELEE.dashFree`).** *"The charge melee STILL isn't really going very far.
  I have a feeling you've been implementing something and it's somehow not working, because
  nothing has changed and I've told you three times."* He was right three times, and every number
  I moved was real and irrelevant:
      const far = p.melTgt ? Math.min(gap, wantD) : wantD;
  `gap` is the distance to whoever `meleeLock` found in front of him. m21 solved the launch to
  land ON that man, on the argument that a leap which overshoots goes THROUGH people — correct
  for a LEAP, and it means the nearest body decides the travel and **the charge does not**.
  m37 flattened it to a dash, m40 raised `flatFar` to 24, m42 left it alone; none of them could
  reach a number that `min` was discarding. Measured through the real pad:
      nobody in front           24.00 m
      one man six metres ahead   4.95 m
      three of them about        2.95 m
  And the street has eighteen bodies in it now, so **the second row is what he was playing every
  single time**. `MELEE.aimCone` is 24 degrees and `finishRange` 26 m, so somebody is nearly
  always in it.
  **THE LOCK KEEPS THE FACING AND LOSES THE DISTANCE.** Aiming him at the man is the half that
  helps; clamping the travel to the gap is the half that ate the feature. And going through him
  stopped being a bug at m36: `hitAll` means a mace does not stop at the first man, so the swept
  weapon catches everyone the dash passes and the launch sends them. The hop and the arc keep
  m21, because those genuinely would sail over him. `mel.MELEE.dashFree = 0` restores it exactly.
- **AND NO HARNESS HAD EVER REACHED THE HAMMER'S OWN GATE (m43, `PADS` exported).** The charge
  arms on `holding = R.down && PADS.R.hold() > MOVE.tapT`, and `hold()` returns **0 unless a real
  pointer is down** — so every case that set `stick.R` directly and called `stepKit` was
  measuring a game in which the hammer charge CANNOT ARM. Case 13 sidestepped it by calling
  `chargeRelease()`, **which is the one thing a player never does**, and in doing so it skipped
  the target acquisition, the wind-up and the release edge in one go.
  **THIS IS THE REPO'S OLDEST MISTAKE AND THE TENTH TIME**, and it is the expensive shape of it:
  not a harness that measures the wrong rule, but one that enters a function past the branch the
  bug lives in. **The case that found it drives the pad**: it stubs `PADS.R.hold` to a rising
  clock, holds the pad up for 1.4 s, releases, and reads `p.goGap` — with bodies in the world,
  because an empty street is not the thing he is playing.
  **WHEN HE SAYS NOTHING CHANGED AND THE MEASUREMENT SAYS IT DID, THE HARNESS IS ENTERING
  SOMEWHERE HE CANNOT.** That is the thing to check first, before the numbers.
- **THE DASH NEEDED ITS OWN SPEED CAP, BECAUSE `maxV` IS ALSO AN ACQUIRE RADIUS (m40, `dashV`).**
  *"The charge on the weapon still is not far enough. He needs to LAUNCH forward -- launch, launch.
  I want it to be a very exaggerated forward, fast motion."* Four times in one breath, so both ends
  moved: `flatNear` 3.2 -> 5.5, `flatFar` 12.2 -> **24**, `dashDur` .38 -> .30, and the launch
  speed off `dashV` **66 m/s**. Measured through the shipped `chargeRelease`: **23.47 m covered
  for a 24.00 m solve**, on the floor the whole way, and a full charge flings a warrior at 15 m/s.
  **AND IT COULD NOT SIMPLY RAISE `maxV`**, which is the obvious move and is wrong twice over:
  that number is the ceiling on an ORDINARY lunge, and it is also `reachMax` -- the radius
  `meleeGo` is allowed to ACQUIRE a target inside. At 66 every jab would lock onto a man twenty
  metres off and rocket at him. **A number meant for one thing must not be shared with another**,
  which is `chargeGoH`'s own lesson at m27, one constant over.
  **`finishReach` AND `finishRange` HAD TO MOVE WITH IT.** `finishReach` caps the GAP a LOCKED
  dash is solved for, so left at 11 a man twenty metres away would be acquired and then arrived at
  less than half way -- a lock the move cannot deliver, which is the m20 complaint exactly.
- **AND A COLLIDER SAMPLED AT A POINT ONLY KNOWS WHERE IT WAS ASKED (m40, `MOVE.sub`).** At 66 m/s
  a 60 Hz frame is over a metre and a 30 Hz one is two, which is wide enough to pass clean through
  a box -- so `integrate` splits its step by **DISTANCE, never by time**. That is what makes a slow
  phone play the same game as a fast one, and at walking pace it is one step and costs nothing.
  Rollergirl paid for this one already: at 60 Hz sub-stepping contributes almost nothing and at
  20 Hz it is the whole difference, so **a collider test at 60 Hz is a flattering test.**
- **HOW BIG AN IMPACT IS AND WHAT IT IS MADE OF ARE TWO DIFFERENT NUMBERS (m40, `WEAP.hitK`).**
  *"The particles on the plasma cannon are cool, I like them -- but the overall size, at least
  half. Not the particle size themselves, the full effect is just so big."* Exactly the right
  distinction and it is why this is not a smaller `size`: a spark's own size is how CHUNKY the
  debris reads, and the spread, the throw radius and the flash's three radii are how much SCREEN
  the event covers. `hitK` (.45) scales only the second kind, so the particles he likes are
  byte-for-byte the particles he had.
  **THE FLASH'S GROWTH IS A FOOTPRINT TERM TOO**, and it was the biggest one: `1 + u * 1.9` ends
  at 2.9x its own base, so most of what is on screen at the end of a flash is the growth and not
  the radius it started from. 1.15. **Scaling only the radii would have halved the beginning of
  the effect and left the end where it was.**
  **AND THE CLINGING SWARM IS LEFT ALONE**, because it is already sized off the BODY's own height
  and radius -- shrinking it would take it off the man it is clinging to, which is the one thing it
  exists to do. Only its rise goes through `hitK`.
- **A RANDOMLY RED ROW IS WORSE THAN A PERMANENTLY RED ONE, AND `npm run sim` HAD ONE (m40).**
  `foeRoll` gives every body its pace, nerve, react and guard out of `Math.random` -- right in the
  game, and it made the suite report a different answer every run: two rows failed one run and one
  the next, **on code that had not changed**. A result you cannot reproduce is not a measurement.
  One fixed stream now, so a red row is a fact about the code and can be chased; the variety cases
  still roll MANY bodies out of that stream, so what they measure is the spread across a roster
  rather than one lucky draw.
  **AND SEEDING IT IMMEDIATELY EXPOSED TWO INVENTED PASS MARKS IN THE SAME CASE.** "He closes to
  his reach" read the gap on ONE arbitrary frame, and at that frame he may be mid-BACK-OFF (3.5 m
  out, by design) or the run may simply have ended before he arrived; "he faces you" read the same
  frame, where he may be mid-CIRCLE and pointed along his circle, also by design. **A state machine
  is not measured on one frame** -- both are minima over the last stretch now, and the window is
  long enough that a wary `pace` is not what decides whether the suite is green. How slowly he
  closes is a stated open item, not what that case is about.
- **ONE DRAW CALL FOR EVERY PARTICLE IN THE GAME (m39, `SPK`, `spk`, `spkBurst`, `spkCling`).**
  *"It's so primitive -- when you shoot it just looks like a flash, and when it hits them
  there's barely anything. I want it to feel like it really hits them."* A sprite carries its
  own material, so sixty of them is sixty draw calls on the one part of a mobile GPU that is
  actually scarce. It is a POOL and a `Points` with per-point size, colour and alpha in
  attributes: one call for the lot, and a burst allocates nothing -- which matters, because the
  burst happens on the frame something is already being hit.
  **`gl_PointSize` IS DERIVED, NOT TUNED.** Half the framebuffer height over the tangent of half
  the vertical lens, so `aSize` is a size in WORLD METRES at any distance. A tuned constant
  changes size whenever the fov does, and this game's fov moves.
  **AND A SPARK CAN FOLLOW A BODY.** *"Maybe some little particles that go around their mesh."*
  A burst thrown in world space at a man who is being knocked backwards is left behind by him; a
  spark that carries his root and orbits it stays ON him. That is the whole difference between
  "particles happened near him" and "something is happening TO him", and it is why `follow` is a
  field on a spark rather than a second system.
  **THE FADE IS SQUARED.** A spark that dims evenly reads as fog; bright-then-gone reads as a
  spark.
- **AND HIS OWN MESH FLASHES, WHICH MEANT GIVING HIM HIS OWN MATERIALS (m39, `bodyFlash`).**
  *"Maybe their mesh kind of flashes."* The cheapest thing on screen that says a blow landed on
  HIM. **`skeletonClone` SHARES materials across every copy of a kind** -- flashing one warrior
  would have flashed all three -- so `bodySpawn` clones them per body. That is a second uniform
  set and the SAME shader, so nothing recompiles and the draw calls are unchanged; it is only
  ever worth saying no to if the count gets large.
- **AN IMPACT IS THREE THINGS, AND EACH DOES A DIFFERENT JOB (m39, `boltHit`).** A hot core
  flash that GROWS as it fades (a flash that only fades reads as a light being turned down; one
  that expands reads as something arriving), a radial burst of debris, and the clinging swarm
  plus the body flash above. All three scale off the same `chg` the ball's size and the blast
  radius come from, so a fumble is a spit and a full charge is an event.
  **AND THE BALL LEAVES A STREAK**, from the same pool: sparks dropped along its path with no
  velocity and a very short life, so it reads as a line of cooling plasma rather than a blob
  sliding across the screen.
- **THE MARK IS BACK WITHOUT THE LOCK, AT HALF THE SIZE (m39).** *"The aimer is gone for the
  blaster. I still want the aimer to be there -- it's just not the lock-on mode. Let's make it
  half the size it was."* Which is the right reading of m36: **what was annoying was the aim
  being TAKEN, not the mark being DRAWN.** `LOCK.retic` and `LOCK.on` were separated for exactly
  this. 210 -> 146 -> 74 -> **37 px**.
- **THE GUARD IS A STRAFE STANCE, AND IT BORROWS THE COMMITTED BRANCH (m39).** *"If he's
  disarmed and you hold down on the right stick he goes into strafe mode left and right --
  that's his guard. Same with the melee, honestly same with the blaster."* A stance faces
  forward and moves sideways, which is **exactly what `aiming` already does**: face where the
  lens is pointed and let `plant` go to zero so the legs carry him where the thumb says instead
  of dragging his body round. So it joins that branch rather than growing a second one, and
  `rigAnim`'s directional blend picks the strafe clip off the sign of his travel with nothing
  new written.
  **WITH NO BLOCK CLIP DRAWN, THERE IS NO UPPER POSE AT ALL** -- so `bare` plays the WHOLE
  strafe clips rather than their `__legs` halves, because a rifle pose on an unarmed man is
  worse than no pose. Name `CLIPS.block` and it becomes an override like every other.
  **AND IT CLEARS THE TRIGGER AND THE WIND-UP AS IT ARMS.** They are the same thumb pushed the
  other way and cannot both be true -- but a thumb sweeping from the top of the pad to the
  bottom would otherwise arrive still armed. `MOVE.blockSp` caps him: a guard shuffles.
- **`npm run sim`'s `run()` NEVER CALLED `stepKit` (m39).** Every case that held the RIGHT PAD
  was measuring a game with no weapon logic in it -- the guard simply never armed, on any slot,
  and the harness reported that as the feature being broken. **A harness that skips a step the
  game takes is measuring a different game**, which is this repo's oldest mistake and the ninth
  time it has been made.
  **And the guard case's own first pass mark was inverted** -- it compared a wrapped angle delta
  against pi and failed a correct answer of exactly zero. **Derive the pass mark from the rule**:
  what "strafe" MEANS is that the body does not follow the legs, so the delta must be SMALL.
- **A BODY THAT DOES NOT FIGHT IS ONE BRANCH, NOT A SECOND BRAIN (m38, `HICK`, `pacifist`,
  `foeWander`).** *"He's basically just an NPC, so he doesn't have attacks. He doesn't attack
  you -- if anything he'll run away. You shoot him, he flies through the air, lands on the
  ground, gets up and runs away."* A third kind in the same `DUMMIES` list: the bolt, the swept
  limb, `bodyFly`, `bodySep` and the player's resolver all reach him with nothing new written,
  and `foeAI` gains one line above everything that decides how to FIGHT. **`d.K` is what makes a
  third kind cost a table**, which is what m35 was for.
  **HE AMBLES ROUND WHERE HE WAS PUT**, not along a path and not at random: the ring is centred
  on his spawn, so a street left alone for ten minutes still looks like a street rather than
  four random walks that have drifted apart.
  **AND BEING HIT IS WHAT MAKES HIM LEAVE**, not proximity -- `flee0` seconds of running
  directly away, `fleeAdd` for each further blow, capped, so standing over him and punching is
  not a man who runs for a minute.
- **AN EMPTY CLIP NAME IS A HOOK, AND THE STATE STILL RUNS (m38).** *"I don't have the falling
  over or on-the-ground or getting-up animations yet, but I'll put them in."* So `downF`,
  `downB`, `upF` and `upB` are `''` in his table. `skinPlay` returns without doing anything and
  `skinWeights` takes its fallback to the idle, so **he still flies, still lands, still gets up,
  still runs away** -- and naming the clip later is one string with no branch to add. **The
  state machine and the animation are separate things, and this is what that separation buys.**
  **AND THE TABLE CHECK HAD TO LEARN THE DIFFERENCE.** `bodySpawn` reports any name that is not
  in the file, which is the T-pose guard -- an empty name is a DELIBERATE gap and reporting it
  is the chip crying wolf. `n && !d.actions[n]`.
- **THE IN-AIR POSE IS A FIELD, NOT A BRANCH ABOUT WHO IS FLYING (m38, `K.clips.air`).** *"I need
  to add for every character an in-air pose so that you could send him flying."* A body more than
  a quarter of a metre off the ground holds `clips.air` and takes its fall clip back the moment
  it lands. The hick names `jump`; a kind that names nothing keeps the behaviour it had. **This
  is the field to fill in on the warrior and the officer when he draws theirs.**
- **AND THE HEALTH BAR IS THE KIND'S (m38).** It read `FOE.bar` in four places while being built
  for three kinds, so a smaller man would have worn the warrior's gauge at the warrior's height.
  A kind with no `bar` block simply has none.
- **THE REACTION WAS NEVER THE SAME CLIP -- IT WAS THE SAME SPEED (m37).** *"There should be
  multiple animations when I hit them. The problem is they always play the same one, it's really
  redundant -- I think I put three or four in there."* `npm run sim` settled it before anything
  was changed: **24 blows used all five clips, three to eight times each.** The PICK was never
  the problem. The clips run 1.0 to 1.8 s and `hitBeat` .62 played them at 1.6x to 2.9x, which
  turns a stagger, a gut shot and a head snap into the identical quick twitch. `hitBeat` 1.0 and
  `bigBeat` 1.5 let them play near their own length.
  **THIS IS THE THIRD TIME IN THIS FILE THAT "IT ALWAYS DOES THE SAME THING" MEANT "IT IS TOO
  FAST TO TELL APART".** A measurement that says the choice is varied does not say the RESULT is
  legible, and when a report and a measurement disagree the thing in between is usually the
  rate.
- **EVERY BLOW SHOVES HIM, AND THE INTEGRATOR MOVED OUT OF THE KNOCK-DOWN (m37, `bodyFly`).**
  *"Every melee should have kickback -- knock them back a little bit, same with the gun."*
  Nothing moved a body at all unless it went down, so a landed punch was a clip and a number and
  no contact whatever. The ballistic integration lived INSIDE the `down` branch, so adding a
  shove to the hit state would have meant a second integrator to keep in step with the first --
  it is `bodyFly` now, called for every body every frame, and a blow simply sets a velocity.
  **THE DRAG IS PER STATE**: in the air it is ballistic, on his feet it is scrubbing against the
  ground, which is a much shorter half-life. And the shove goes through `resolveBoxes`, or a
  punch puts a man inside a wall.
  **AND THE GUN GETS IT FOR FREE**, because a bolt has always landed through `dummyBlow`. One
  description of what a blow does, and the weapon only decides how hard.
- **THE CHARGED SWING IS A GROUND DASH NOW -- THE THIRD SHAPE THIS MOVE HAS HAD (m37,
  `MELEE.dash`).** *"When you're holding the melee weapon, that charge -- you don't jump in the
  air any more. It's a straight-ahead attack and the distance you go depends on how far you
  charge it."* m21 solved an arc from the gap, m36 flattened it to a hop, m37 takes the vertical
  out entirely. **Nothing is deleted**: `mel.MELEE.dash = 0` walks back to the hop and
  `flatHi = 3` from there to the arc, so three behaviours sit behind two switches.
  **THE DURATION STOPS FALLING OUT OF THE ARC AND HAS TO BE TYPED**, which is the one thing a
  solved arc gave for free -- and a state whose length disagrees with the clip it plays can only
  cut that clip off, so `dashDur` IS what the clip is compressed to.
  **AND IT IS SOLVED AGAINST `goDur`, NOT `T`.** On the ground `MELEE.carry` bleeds him from full
  speed to zero across the WHOLE state, and `goDur` carries `finishTail` on the end -- so solving
  against the travel time alone overshot by exactly the tail's share: **5.80 m for a 3.95 m
  solve**, caught by the sim on the first run. **A launch solved against a different clock than
  the one that spends it lands somewhere else.**
  **AND `flatFar` IS BOUNDED BY `maxV` OVER THAT CLOCK**, which is 10.3 m -- the same trap m36
  hit from the other side, where 14 m was silently clamped and a half hold landed where a full
  one did. `p.goGap` reports what it will actually cover.
- **`FOE.fling` CAME DOWN TO .70, BECAUSE A HAMMER COULD NEVER REACH .90 (m37).** *"If you charge
  it and hit them, they go flying, and the distance depends on how far you charged."* A finisher
  is `1.0 * chargeGoK`, which floors at `finishMin` .45 -- so at .90 only a near-full BOLT could
  ever launch anybody and the hammer had no range to be graded across. .70 puts the crossing at
  about a 60% charge on either weapon and leaves .70..1.0 for the launch itself. Measured: a full
  charge flings at 7.0 m/s, a half charge at 3.2.
- **DOWN ON THE RIGHT PAD IS A GUARD (m37, `BLOCK`, `WEAP.blockArc`).** *"I want to make it so
  that down on the right stick is block. I know I don't have a block animation yet, but I'll put
  one in."* The same four gates as the trigger, mirrored -- the pad already knows how to tell a
  deliberate push from a drag, and re-deriving that would be a second answer to one question.
  **THE ARC IS TIGHTER THAN THE TRIGGER'S** (.70 against 1.05), because a downward drag is a real
  camera gesture: anything with sideways travel in it is still the camera. Straight up barely
  orbits because its X is near zero, and the same is true straight down.
  **IT CANNOT BE HELD WHILE A STRIKE IS RUNNING**, which is what stops a guard cancelling the
  recovery -- the one thing this file says must not happen.
  **AND A BLOW FROM BEHIND IS NOT BLOCKED**, whatever the thumb is doing.
  **`CLIPS.block` IS EMPTY AND THAT IS THE HOOK.** Name it and `rigAnim` blends it at full weight;
  an empty name falls straight through to the gait with no branch to add, which is how
  `GAIT.sprint` and `HANG.clip` are written one repo over. Until then **the chip says `BLOCK`**,
  because a defensive state you cannot see is one nobody uses twice.
- **THE BOLT DOES NOT CURVE EITHER (m42, `WEAP.home.on = 0`).** *"I take back what I said about
  the ball from the blaster curving to hit targets. Let's silence that."* So the blaster now has
  **no assist of any kind**: m36 took the reticle's lock off on the argument that a mark which
  moves where you are POINTING takes the aim off your thumb, and the curving ball was the
  replacement — something you WATCH rather than something that moves your hands. It was a better
  idea than the thing it replaced and it is still not wanted. **The gun goes exactly where it is
  pointed, and that is the whole feature.**
  **NOTHING IS DELETED, WHICH IS WHAT MAKES THIS A DECISION RATHER THAN A REWRITE.**
  `mel.WEAP.home.on = 1` brings the curve back with every number untouched and `mel.LOCK.on = 1`
  brings the other one back, so two rejected designs cost one character each to try again. Both
  were shipped, looked at on the phone and turned down — **which is the loop working**, not two
  wasted builds.
  **AND THE RETICLE IS UNAFFECTED**, because since m39 it only ever drew where the shot was
  already going. That is why it survived m36 and survives this: it is a POINTER, not a promise,
  and `aimTarget` is still the one answer both it and `fireBolt` read.
  **THE MELEE LUNGE IS STILL NOT THIS AND STILL STAYS.** `meleeLock` solves the launch for the
  gap so a swing thrown at a man ARRIVES — a physical assist with nothing drawn and nothing taken
  off the thumb. He has now asked to keep that half twice while turning down both of the others.
- **THE ASSIST MOVED FROM THE AIM TO THE BOLT (m36, `WEAP.home`, `LOCK.on = 0`).** *"We're
  gonna get rid of the aim assist on the blaster... instead if you shoot in the general
  direction of a player the ball ever so slightly curves to hit them. The reticle aimer thing is
  really annoying to use."* A better idea than the thing it replaces, and the reason is worth
  writing down: **a mark that moves where you are POINTING takes the aim off your thumb, so you
  stop aiming; a ball that curves is something you WATCH**, and it can only ever finish a shot
  you had already very nearly made.
  **IT IS A TURN RATE, NOT A SEEK.** `rate` radians a second is the whole of "ever so slightly"
  -- a bolt doing 44 m/s turning at 2.1 rad/s has a 21 m radius, so it closes a few degrees over
  its flight and cannot fetch a shot thrown at the sky. And it LEADS him off `d.wvx/wvz`, the
  body's own measured world velocity, because a walking man is not where he was when the ball
  left. `stepDummies` measures that rather than any state machine being asked.
  **THE LOCK TOOK THREE THINGS WITH IT** -- the mark, the camera coming round, and the left
  stick's orbit mode -- because two of them exist only to serve the mark. Nothing is deleted:
  `mel.LOCK.on = 1` restores the whole loop and `mel.LOCK.retic = 1` draws the mark without it.
  **THE MELEE LUNGE IS NOT THIS AND STAYS.** *"Take the lock off the melee charge -- it's just
  physically going to assist you."* `meleeLock` solves the launch for the gap so a swing thrown
  at a man ARRIVES. That is a physical assist with nothing drawn and nothing taken off the
  thumb, which is the half he asked to keep.
- **THE BALL IS THE CHARGE, IN ALL FOUR PLACES AT ONCE (m36).** *"Make the blast a little
  bigger, and the size should depend on how long you charge it -- a full charge should be a
  fairly hefty ball and the effect greater, it'll actually send them flying."* `chg` drives the
  picture (`ball0/ball1`), what it collides with, how wide the blast catches (`blast0/blast1`),
  and the power -- one number, so they cannot drift.
  **AND `dummyHit` NEVER DID BREAK ON THE FIRST BODY.** *"If I shoot a ball and it hits in the
  general area of a few of them, that should hit more than one."* It always looped them all; the
  RADIUS was `boltR + .45`, which is one man wide. A full charge now reaches over two and a half
  metres and a crowd goes over together. **Suspect the number before the loop.**
  **`FOE.fling` IS HOW `hard`'s UNREACHABILITY GOT ANSWERED.** m35 set `hard: 1.01` so DAMAGE is
  what puts a warrior down -- right for a fist, wrong for the biggest shot in the game. A blow
  at or over `fling` launches him whatever his health says, and the launch is graded above
  whichever threshold actually tripped.
- **AND THE MELEE SWEEP DID BREAK ON THE FIRST (m36).** *"There were three of them piled up and
  I was meleeing, but it would only ever hit one at a time."* Exactly that -- a `break`, which is
  the right shape for a bullet and the wrong one for a swing. **A mace does not stop at the first
  man.** `MELEE.hitAll`.
- **THE CHARGED SWING IS FLAT NOW, AND THE HOLD DECIDES THE DISTANCE (m36).** *"Make it so that
  jump attack doesn't go high up in the air any more -- it's just a straightforward launch, and
  how far you go depends on how long you hold the charge."* So the apex stops coming from the
  GAP and becomes one low hop (`flatHi`), and the distance comes from `chargeGoH`, the hold's own
  curve. m21's finding stands and is simply no longer wanted.
  **AND THE CEILING IS THE HOP, NOT THE NUMBER.** A .55 m apex is 0.47 s of flight, so at
  `maxV` 21 the furthest it can carry is about 9.9 m -- `flatFar` 14 was clamped there and a half
  hold landed in the same place as a full one, which is the hold buying nothing all over again.
  Both ends sit inside what the hop can deliver, and `p.goGap` reports `vx * T` rather than what
  was asked for: **a number that ignores its own clamp lies on exactly the interesting frame.**
  A man in front still shortens it, because a leap solved to land ON him is what stops the charge
  going through people. `mel.MELEE.flatHi = 3` is the A/B back to the arc.
- **RAPID FIRE IS A MODE, NOT A MODEL (m36).** *"A version of the gun that's more like a machine
  gun -- I'll probably make a different model but we can use this for now. When you hold forward
  it just shoots automatically."* Same file, same mount, same four trigger gates: `auto` spends
  the hold as ROUNDS instead of banking it as a charge, and `p.chg` is pinned at `autoChg` so the
  ball, the blast, the power and the recoil all still come off the one number they always did.
  The release fires nothing, because everything was already fired. It is a separate SLOT rather
  than a toggle because the kit is already a tap-to-cycle list and **a hidden mode is a state you
  can be in without knowing it**. Its own GLB later is one `file:` in the roster.
- **THREE MEN RUNNING ONE SCRIPT IS NOT THREE MEN (m36, `FOE.vary`, `foeRoll`, `foePlan`).**
  *"They all slowly walk towards me in the exact same walk -- there's no variation, no speed
  variation, they don't try to block at all and they only ever do one swing. Very, very
  repetitive."* Every one of those is the same fault. Each body rolls his own `pace`, `nerve`,
  `react` and `guard` once at spawn, and **none of them change what he DOES** -- only how fast,
  how close, how eager and how soon -- so the state machine stays one thing to reason about.
  **AND HE CIRCLES, COMBOS AND GIVES GROUND.** `standing_walk_left/right` were in the file and
  unused; a man who only ever walks straight at you is the whole complaint. `foePlan` is one
  place deciding between a guard, a circle, giving ground and a swing, so the mix reads as a
  sentence rather than being reconstructed from four scattered branches.
  **HE ALSO SWUNG FROM OUTSIDE HIS OWN REACH, WHICH IS WHY IT LOOKED LIKE ONE ANIMATION ON A
  LOOP.** The walk stopped at `hold` 3.4 m and the mace reaches 2.4 + your .34 = 2.74, so every
  swing at a player standing still was thrown at air a foot in front of him.
  **AND `nerve` COULD PUT HIM SOMEWHERE HE COULD NEVER ATTACK FROM.** At 1.25 `hold` became
  3.25 m against a `hitR` of 2.6, so a wary one who had closed once stood there, failed
  `foePlan`'s range test for ever and **never swung again**. `npm run sim` caught it as **0
  swings in 40 s on about one roll in four** -- which is exactly the shape of a bug that reads as
  "sometimes one of them just stands there" and would never have been found by reading. Both
  distances are clamped inside `hitR` now: **a distance he cannot attack from is not a distance
  to stand at.**
  **AND THEY DO NOT STAND INSIDE EACH OTHER (`bodySep`).** `pushBodies` was only reached from the
  walking branch, so the moment two of them stopped -- which is exactly when they are both
  standing on you -- nothing kept them apart. It runs for every body every frame now, and it is
  SYMMETRIC: each pushes out by half, so neither shoves the other across the street.
  **A HARNESS CASE THAT COUNTS ONE THING CANNOT SEE "REPETITIVE".** `npm run sim` counts distinct
  swing CLIPS and distinct STATES over a forty-second fight, because "he swings twice" passes
  happily on a man doing the identical thing twice.
- **THE STRIKE CLIPS ARE THE REAL PROBLEM AND THEY ARE BEING REDRAWN (m36).** *"The animations
  look really bad -- they're really fast and you can't even tell what he's doing. I'll probably
  just put in strike poses, so it'll be like a dash ending in a strike pose, close to those 2D
  side-scroller fighting games based on old arcade games where the poses are really
  exaggerated."* `MELEE.beat` went .44/.50/.62 -> .62/.68/.82, which is the most that can be done
  from this side: a 1.0-1.75 s clip at 3x is a blur with no pose in it, and at 2x it is a blur
  slightly longer. **A dash-and-hold pose is a different SHAPE of move, not a slower clip** --
  the travel would come first and the pose would be held at the end, which is `MELEE.carry`
  inverted. Wire it when the clips land; do not try to fake it by retuning `carry`.
- **A NEW ENEMY IS A TABLE AND A BRAIN, NOT A SECOND EVERYTHING (m35, `FOE`, `d.K`, `foeAI`).**
  *"Make him walk around, make it so I can shoot him, make him fight back."* The warrior goes
  into the SAME `DUMMIES` list the officer is in, because the bolt, the swept limb, the aim
  lock and the player's own resolver already reach everything in that list. Every body carries
  `d.K` -- its kind -- and `dummyBlow` and `stepDummies` read that instead of a global, so the
  officer is untouched and there is no second damage path, no second collider path and no
  second thing to keep in step. `bodyProto`/`bodySpawn` are shared; two builders used to hold
  twenty lines of the scale measurement by copy, which is two places for it to drift.
  **`bodyLoops` DERIVES WHICH CLIPS LOOP FROM THE TABLE** rather than listing them twice, so
  adding a swing cannot accidentally make it repeat.
  **THE BLOW LANDS PART-WAY THROUGH HIS SWING, NOT ON THE FRAME HE DECIDED TO SWING.** That is
  m20's rule pointed the other way: a swing and its consequence arriving as two events is what
  "you can't actually hit things" looks like, and it is just as true when the thing being hit
  is you. `swingAt` is where in the beat the mace arrives.
  **AND IT IS A CONE, NOT A CIRCLE** -- `dummyHit`'s own m20 fault, which was a range check with
  no direction test at all, so a punch thrown forwards hit a man standing behind. Pinned: a
  swing thrown the wrong way costs you nothing.
  **A GUARD IS WORTH SOMETHING OR IT IS AN ANIMATION.** Blocking does not stop a blow, it takes
  `blockCut` out of it -- and it plays its own react clip, so "he blocked that" and "he ate
  that" are two different pictures rather than a number nobody can see.
  **DAMAGE IS PER WEAPON (`FOE.dmg`).** *"Different weapons will do different effects to him."*
  A fist is the cheapest, the hammer costs more, the charged finisher most, and a bolt carries
  its own. **The officer has no `dmg` table and spends one hit point per blow exactly as he
  always has** -- a kind without the field keeps the old rule rather than inheriting a new one.
  **AND `hard` IS UNREACHABLE ON HIM ON PURPOSE.** For the officer a full-power blow is an
  instant knock-down; for the warrior DAMAGE is what puts him down, which is the entire point of
  having six hit points and a bar. Setting `hard: 1.01` says that in the table rather than in a
  branch.
  **A HEALTH BAR IS WHAT MAKES "A FEW HITS" LEGIBLE.** Without one a man who has taken five
  blows and a man who is ignoring you are the same picture. It faces the camera, it is HIDDEN
  while he is untouched and not hunting (an idle street is not a row of floating gauges), and it
  grows from the LEFT edge -- a bar scaled about its middle at 50% reads as a different bar
  rather than as half of this one.
  **EVERY STATE ENDS ON ITS OWN CLOCK.** An enemy you can wedge into a state he cannot leave is
  worse than one who gives up too early, and `lose > notice` so the edge of his attention cannot
  flicker.
  **AND HE WALKS ON THE PLAYER'S OWN RESOLVER**, plus `pushBodies` against the other bodies with
  himself skipped -- one description of a body taking up room, not two.
  **THE PLAYER HAS HEALTH NOW, AND NO DEATH.** *"Make him fight back"* has no consequence
  without it. There is no hit-reaction clip in the antenna alien's export, so a blow IS a
  knockback, a moment of no steering (`MOVE`'s own `wantSp = 0`) and a flash at the edge of the
  screen -- and the stun is short on purpose, because being unable to move is the least fun
  state in any game and the knockback is doing most of the work. **A dodge roll is still the one
  thing that saves you**, which is what `p.roll`'s i-frames were always for.
  **`npm run sim` DRIVES THE BRAIN, AND HIS BODY IS FABRICATED -- A STATED GAP.** The warrior GLB
  is draco and no harness here can build a skin, so what is under test is what the brain reads:
  `root.position`, `st`, `hp` and a clip table. The clip NAMES and DURATIONS come straight out of
  the file, so the beats and the scaling are the real arithmetic, and one case asserts every name
  in `FOE.clips` is in the file -- a name that is not there leaves a bone at zero total weight,
  which is the T-pose exactly. The mount, the bar and the poses are device questions.
- **AND `npm run sim`'s CHARGED-SWING CASE HAD BEEN MEASURING A RULE THE GAME NO LONGER HAD
  (m35).** It asserted the release drives him forward at over 9 m/s -- true of the fixed leap
  **m21 deliberately replaced**, whose whole point is that a constant launch can only do one
  distance. With nobody in front of him the correct answer is nearly straight up, so the case
  failed for builds while the code was right, and a suite with a permanent red row is a suite
  nobody reads. It measures the arc now: free he goes UP and reaches the apex he solved for, a
  man seven metres off turns it into a leap that LANDS ON HIM, and a half charge jumps lower.
  **Its replacement's own first pass mark was invented too** (`melV > vFree + 3`, failing a
  correct 5.26) -- **derive the pass mark from the rule, never from a number that looked right**,
  which is now the third time in this file.
- **A BOUNDING BOX IS NOT A BUILDING (m26, `solidColumns`).** *"I'm just running into invisible
  walls."* Right, and it is structural: a single AABB is solid everywhere the SHAPE is not -- a
  doorway, a setback, a tapered wall, the air over a canopy. So the collider is rasterised out
  of the mesh's own triangles: the footprint is gridded, each cell learns the lowest and highest
  triangle over it, and runs of AGREEING cells merge into boxes. Where there is no geometry
  there is no box, which is the whole fix.
  **Two things are load-bearing and Shredworld paid for both:**
    1. **A TRIANGLE'S BOUNDING BOX IS NOT ITS SHAPE.** A sloped quad running from the foot of a
       wall to the top of a canopy has a box covering the whole span, so taking the height from
       the BOX tells every cell under the canopy that the wall reaches the ground. The box picks
       the CELLS; the height over each comes from the triangle's PLANE, clamped back inside that
       triangle's own y range. A vertical face has no useful plane in y and keeps its full span.
    2. **A CELL MUST AGREE WITH THE RUN IT JOINS, not merely fail to enlarge it.** Asking whether
       a cell GROWS the run lets a short canopy cell (3.5..6.2) be swallowed by a full-height
       wall run (0..6.2) -- it grows it by nothing -- and the whole canopy then comes out as one
       box reaching the ground. The test is on BOTH ends.
  **A mesh whose columns nearly all span its full height IS its bounding box** (`BLD.full`) and
  collapses back to one, which is most plain blocks and costs nothing. **The cell GROWS to fit
  `maxCells`** rather than the mesh being skipped. `BLD.cols = 0` is the old single box.
  **And `mel.bld(h)` RE-RASTERISES**, because the columns are WORLD boxes and cannot be scaled
  in place -- leaving the old ones is a building you walk into at its previous size.
- **A MAN IS A SOLID, AND HE WAS NOT IN THE COLLIDER AT ALL (m26, `pushBodies`).** *"Can we put
  collide on the police officers, because right now I can just run through them."* `BOXES` is
  built once at load, so nothing that WALKS can ever be in it. His body is handed to the
  player's own resolver every frame instead, the way a car's is in Shredworld: one physics path,
  not two to keep in step.
  **A CIRCLE, NOT A BOX.** A man is round; an axis-aligned box the width of his shoulders reads
  wrong at the corners, and an oriented one would swing as he turns and have to be tested in its
  own frame for nothing gained.
  **AND WHO IS SOLID IS A STATE, NOT A SWITCH.** Standing or staggering he stops you, which is
  the weight a fight needs. DOWN or GETTING UP he does not -- stepping over a man on the floor
  is right and being shoved off him is not. And nobody is solid during the charged LEAP, whose
  whole arc was solved to land ON him: bouncing off would undo m21.
- **A SOUND CUT MID-WAVEFORM IS A CLICK (m26, `snd`'s `dur`).** *"There's a residual electric
  noise when you shoot somebody and it just keeps playing for the full gambit of the noise."*
  `SFX.edge` trims the SILENCE off a recording and has nothing to say about a file that is
  simply longer than the event it stands for -- `electricity_beam_01.mp3` is a BEAM, seconds of
  it, and arming the trigger is an instant. `dur` caps it, with a linear ramp over the last
  fraction, because stopping a buffer mid-waveform is a step discontinuity.
- **THE BUILDING HAD NO COLLIDER AT ALL, AND THE CHIP BLAMED THE NETWORK (m32).** *"I'm still
  just like walking through this building."* The chip in his shot read **`NO BUILDING GLB`** with
  the building plainly standing in the scene -- which is the whole diagnosis, because those two
  cannot both be true of a load that failed. It was a **temporal dead zone** in the placement
  loop: `const b0 = { o, bx, ... }` read `bx` two lines above its own `const`, so every
  placement threw a ReferenceError **after `world.add(o)` had already run**. The mesh renders,
  not one box ever reaches `BOXES`, and the throw unwound into `init()`'s catch, which reported
  it as a missing file. Shipped since m24.
  **AND THE CATCH SWALLOWED THE EXCEPTION**, which is why it cost several builds: `catch { note('NO
  BUILDING GLB') }` cannot tell "the file is not there" from "the builder threw", and those want
  completely different fixes. `side()` splits them -- a rejected fetch says `NO X GLB`, a throw
  inside the builder says `X FAILED` **and `console.error`s the real error**. A diagnostic that
  names the wrong half is worse than none: it sent me looking at `bump.mjs`'s hashes and at the
  wire.
  **NEITHER GATE CAN SEE THIS.** `check:syntax` only parses, and `check:boot` never enters
  `buildBuildings` because headless every `loadGLB` rejects -- so the one class of fault the boot
  gate exists for walked straight past it one function further in. That is the standing shape of
  a TDZ here and it is the seventh time across these repos.
- **A PICTURE AND THE THING YOU WALK INTO ARE ONE OBJECT (m24).** A building pushes its
  footprint into `BOXES` -- the same list the collider, the floor test and the camera boom all
  read -- so there is one description of the world rather than two to keep in step. `mel.bld(h)`
  re-sizes the mesh AND rewrites its box, because two things re-sized separately is a building
  you can stand inside, which is the worst kind of bug: nothing on screen disagrees with
  anything and the player simply cannot walk there.
  **Placements are yawed in QUARTER TURNS ONLY.** `resolveBoxes` here is axis-aligned, and the
  AABB of a box rotated 45 degrees is forty per cent too big along BOTH axes -- the phantom hit,
  where the collider touches you and the mesh plainly does not. An arbitrary yaw needs an
  oriented box tested in its own frame (Shredworld has one; this does not, yet).

- **SECONDARY MOTION: THE CHAINS ARE FOUND, NOT NAMED (m28, `CHAIN`, `findChains`).** A chain
  is an unbranched run of bones **that no clip meaningfully moves** — measured across every clip
  in the file. On her that separates cleanly: her body reads 8.5 to 86 degrees and every hair
  and tail bone reads **0.03**, because the export keys them at their rest value and nothing
  else. `minBones` 6 excludes the one false positive, a 3-bone thumb that happens to be inert in
  these three clips. A NAME test would have worked here and would break on the next export that
  spells it differently; **"no clip moves it" is a property of what the thing IS.**
  **AND THEIR TRACKS ARE STRIPPED — after the chains are found, because the finder needs them.**
  Keyed at rest, the mixer would write that rest pose onto every chain bone every frame and
  fight the solver for the same bones: two writers, which this file has paid for twice. It also
  takes 405 of her 579 channels out of the mixer.
  **THE REACTION TO HER MOTION IS FREE.** Particle 0 is PINNED to where the skeleton puts it and
  everything downstream arrives late, because that is what a spring does. There is no
  "react to movement" term anywhere in the solver — **the lag IS the effect.**
  **THE SPRING PULLS TOWARD THE POSE, AND THE POSE HAS TO BE RE-DERIVED.** Reading the bones'
  current world positions is springing toward the solver's OWN last output — a no-op dressed up
  as stiffness, because those bones are carrying what the solver wrote last frame rather than
  the authored rest. The home chain is walked forward from the pin using the parent's world
  rotation and each bone's HOME local, which is what it would look like with no dynamics.
  **`getWorldQuaternion`, NEVER `setFromRotationMatrix(matrixWorld)`** when converting a solved
  world direction back to a local rotation — m17's bug, and this is exactly where it would bite
  again.
  **A FIXED SUBSTEP** (`CHAIN.hz`), because Verlet under a varying dt is unstable and a 120 Hz
  phone would otherwise play different hair from a 30 Hz one — `exp(-k*dt)`'s argument, one
  system over.
  **A CONE LIMIT**, because Verlet has no notion of a joint limit and a segment that inverts
  reads as a broken bone rather than as hair.
  **AND SPHERE HULLS ON HEAD / CHEST / HIPS.** Without them the hair passes through her
  shoulders, which is the one thing that makes this read as broken rather than as hair.
  **The cost is nothing**: ~138 particles at 3 constraint passes is a few thousand flops against
  a mixer that already skins 11,000 vertices. It belongs to the ARTICULATE characters only —
  a crowd copy runs without it.
  **EVERY RATE IS PER SECOND, AND THE FIRST VERSION APPLIED THEM PER SUBSTEP (m29).** *"The tail
  is kind of glitchy, not really moving much. The hair moved a tiny bit... but when she got up
  on the cube it jiggled really nicely."* One arithmetic error described precisely: at `drag`
  .06 a substep and 90 substeps a second the velocity retained **0.94^90 = 0.4% per second** --
  dead inside a tenth of a second -- and `stiff` .16 a substep glued every particle to the pose
  in **69 ms**. Small motions were erased entirely and only a big impulse could show at all.
  Converted with `exp(-k*h)` per substep, which is **this file's own standing rule about never
  scrubbing a value with a bare per-frame factor** -- it had simply never been applied here.
  After: hair retains 25% of its velocity per second and settles toward the pose in 0.20 s at
  the root, 1.0 s at the tip.
  **AND THE CONE CLAMP DOUBLE-NEGATED ACROSS w = 0 (m29).** q and -q are the same rotation, so
  on the far side the stored AXIS is flipped too -- clamping to `-cone` about an already flipped
  axis negates twice and the joint SNAPS the wrong way. That is the "glitchy" half, and it is
  the same q/-q trap this file already has a note about one measurement over. Canonicalise all
  four components first; then the angle is always in [0, pi] and the clamp is unsigned.
  **AND IT WAS DERIVED AGAINST THE WRONG SPRING (m32).** *"Her hair is still wiggling, tail is
  still wiggling."* `2*sqrt(stiff)` treats `stiff` as a spring constant in 1/s^2, and it is a
  per-second RELAXATION RATE for a positional pull. **In Verlet a positional pull of fraction
  `a` per substep IS an acceleration of `a/h^2`**, so the natural frequency is `sqrt(a)/h`, and
  at 90 Hz that is 20.9 rad/s on a hair root rather than the 2.2 the formula assumed. Measured
  across the file: **zeta 0.12 to 0.14 on every particle** -- twelve per cent of critical, a
  spring that rings for eight cycles, which is the wiggle described precisely. m30 was the right
  idea (creamy IS critical damping, and the ratio IS the honest knob) applied to a frequency the
  solver does not have. `c*h` then cancels the h and the whole drag is `exp(-2*sqrt(a)*ratio)`.
  **THE TWO HALVES SHARE ONE EXPRESSION**, because `a` is literally the lerp fraction the spring
  applies on the same particle three lines later -- so retuning a stiffness moves the damping
  with it rather than leaving it describing a different spring, which is what typing them
  separately did once already.
  **A DAMPING RATIO IS A NUMBER YOU CAN CHECK.** Both times this was wrong the code looked
  reasonable and the only way to see it was to work out what zeta actually came to; 0.12 is not
  a judgement call about how hair should feel, it is a spring that must ring.
  **AND CRITICAL DAMPING CANNOT COVER A DISTANCE CONSTRAINT, WHICH IS WHAT WAS LEFT (m33).**
  *"Her hair is jingling around, and goes wild when she drops down the curb."* Two symptoms, one
  place: the constraint pass. `damping` is derived against the pull-to-pose rate and there is a
  SECOND restoring force in here with no rate at all -- the segment-length projection, which is
  an infinitely stiff spring. **In Verlet every metre a constraint moves a particle becomes a
  metre per step of velocity on the next one**, so the pose spring stopped overshooting at m32
  and the constraints went on feeding it. `CHAIN.snap` is how much of a correction is allowed to
  be banked as speed -- `prev` is moved with the particle by the rest. It is not damping and
  costs nothing when nothing is stretched; it is refusing to turn a position fix into energy.
  **AND THE DROP IS THE STANDARD WAY THIS SOLVER COMES APART.** Stepping off a kerb moves her
  head further in one substep than a hair segment is LONG, so the particle behind it is
  stretched past its own rest length, the constraint that pulls it back overshoots, and the
  overshoot is a bigger correction and therefore more velocity. `CHAIN.maxV` is the hard ceiling
  under it.
  **AND IT IS MEASURED RELATIVE TO THE PIN, WHICH IS THE LOAD-BEARING HALF.** An absolute speed
  cap clamps every strand the moment she RUNS -- her whole body is doing 7 m/s and so is her
  hair -- which is exactly the motion these chains exist to show. The cap is on the part of the
  velocity that is not her own travel, so only hair moving fast through HER frame is held.
  `mel.CHAIN.snap = 1` and `mel.CHAIN.maxV = 99` are the A/B back to m32.
  **CREAMY IS CRITICAL DAMPING, AND IT IS DERIVED FROM THE STIFFNESS (m30).** *"Everything is
  kind of wiggling around a lot now -- can we add damping? I had a good amount of it and it was
  making it nice and smooth and creamy."* What creamy IS, is critical damping: a spring of rate
  k stops ringing at exactly `c = 2*sqrt(k)`, and anything under that overshoots, which is the
  wiggle. Typing the two separately means they drift apart the moment either is tuned, so
  `damping` is a RATIO -- 1.0 critical, over creamy, under springy -- and the drag falls out of
  whatever stiffness that particle actually has. The tip is softer than the root, so its damping
  is softer too, by construction and with no second number.
  **AND SIDEDNESS IS THE FILE'S TO DECIDE (m29).** Forcing `FrontSide` was right on the BUILDING
  -- a closed shell has no use for its inside -- and wrong on a CHARACTER: hair cards, a skirt
  and anything with an open edge are authored to be seen from both sides, and on a mesh whose
  winding is inverted it shows you the inside, which reads as *"seeing the back of the
  normals"*. The TRANSPARENCY fix stays, because BLEND genuinely does sort against itself.
  `SHE.side` is the dial and 'auto' honours the export.
  `mel.she.spin = 2` turns her on the spot, which is the best look at what the chains are doing;
  `mel.CHAIN.on = 0` freezes the solver so the authored pose can be compared against it.

## The control map — read this before touching either pad

**LEFT PAD is the BODY. RIGHT PAD is the VERB.** That has to hold in every state or neither pad
means anything you can carry from one situation to the next.

| | left | right |
|---|---|---|
| hold | move | **hold UP**: firing position, charge, release to fire (blaster) / wind up (hammer) |
| arc row | **Clancy: ROAM / PACK**, or **REVERT** while disguised (m121) | the blaster's CHARGE / AUTO / **DNA** (m112) |
| tap | next weapon (**live while disguised again -- m122**) | jump |
| flick | dodge roll, in the flicked direction | strike, in the flicked direction |
| drag | — | orbit the camera |

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

- **No death.** The player's health runs to zero and regenerates; nothing happens at the bottom.
  That is a decision to be made rather than an oversight.
- **The warrior does not chase you far and cannot catch you.** `FOE.run` 2.6 m/s against a
  player who sprints at 7.2 -- deliberate for now, and limited by what `standing_run_forward` is
  actually walking at. A faster approach than the clip can sell is a scramble.
- **The rapid fire shares the blaster's model**, which makes the two slots identical to look at.
  Its own GLB is one `file:` in `WEAP.slots`.
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
