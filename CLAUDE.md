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
  the left."* .30 / .12 / 1.25 -- about 17 deg to acquire, 7 once the shot is loaded. The
  subtlety is the cone; the DELIVERY still has to be total, or it is the bullet above again.
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

## The control map — read this before touching either pad

**LEFT PAD is the BODY. RIGHT PAD is the VERB.** That has to hold in every state or neither pad
means anything you can carry from one situation to the next.

| | left | right |
|---|---|---|
| hold | move | **hold UP**: firing position, charge, release to fire (blaster) / wind up (hammer) |
| tap | next weapon | jump |
| flick | dodge roll, in the flicked direction | strike, in the flicked direction |
| drag | — | orbit the camera |

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

- No enemies, no hit detection, no damage — the melee chain plays and connects with nothing.
- **No sprint control**: walk/run/sprint is a pure speed blend off the left stick's magnitude,
  which is what the four clips support. A dedicated sprint gesture is a slot, not a clip.
- `weapon_root_left` is unused. Dual wield is a weapon file exported onto it and one roster line.
- No audio at all.
- The world is a white floor and ten boxes. It is a test site, not a level.
- `MOVE.hardLand` (8.0 m/s) picks `landing_hard` over `landing_soft` by IMPACT SPEED, not by how
  long he was in the air — a long float onto a box top is a soft landing and a short drop off a
  ledge at pace is not. The number is a guess and wants a look on the phone.
