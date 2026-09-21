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

**Do NOT run, unless he asks for it by name:**

```sh
npm run sim        # drives the shipped stepPlayer over the real collider
npm run glsl       # does the shader splice still land
npm run clips      # what is actually in each animation
npm run gait       # the measured reference speed of every locomotion clip
npm run rig        # height, facing, and whether the weapon mounts still agree
npm run icons      # rebuild the home-screen icon set from one square artwork
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
| tap | next weapon | jump |
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
- No audio at all.
- The world is a white floor and ten boxes. It is a test site, not a level.
- `MOVE.hardLand` (8.0 m/s) picks `landing_hard` over `landing_soft` by IMPACT SPEED, not by how
  long he was in the air — a long float onto a box top is a soft landing and a short drop off a
  ledge at pace is not. The number is a guess and wants a look on the phone.
