# Toon city with kit buildings: handoff

These files are in `3_LEVELS/toon_city/exports/toon_city_kit/`. They replace the files in `exports/toon_city/` if you switch over. The old set still works, so you can compare the two. Keep using `weirdkit_tint.js` from the old folder; it hasn't changed. Run `npm run ktx` after copying.

| File | Size | What it is |
|---|---|---|
| `toon_city_visual.glb` | 7.2 MB, Draco | The city: streets, props, trees, signs, the 11 hero buildings, and all kit-building pipes (`kit_###_pipes`, world space). |
| `toon_city_kit_buildings.glb` | 9.9 MB, no Draco (custom attributes) | The 60 kit buildings `kit_000` to `kit_059`. Each is a root empty with its pieces, doors, glass, AC units, ivy, dressing and markers underneath. |
| `toon_city_kit_pieces.glb` | 5.7 MB, no Draco | The piece library for all 7 styles, including the chunked `wallB_*` walls. Use these for swap-on-damage. |
| `toon_city_collision.glb` | 4.4 MB | The whole city's collision. The old building hulls are gone and the kit colliders are in, with the same prefixes as before. |

The kit buildings sit on exactly the lots the old buildings used. Each one faces its street, snapped to the 3 m grid and rotated with the lot. Ground props next to the buildings were kept: planters, dumpsters, crates and boxes. The wall AC units, shop signs and rooftop billboards from the old buildings were removed. The kit buildings bring their own AC units and signs.

The old OBB file (`toon_city_obb.json`) is out of date for buildings. Use the collision GLB for the kit buildings; its colliders are real rotated boxes.

## Intact vs. breakable walls (important, and new)

- To keep the draw and vertex budget sane, walls in the city use the cheap intact pieces (`wall_window`, `wall_solid` and so on). They have simple geometry and static `bld_` colliders in the collision GLB.
- Each wall has extras `breakable_as`, for example `"wallB_window"`, plus `style`. That names its chunked twin in `toon_city_kit_pieces.glb`. The twin has the same size, the same openings, the same pivot, and the same `chunks` table and `_CHUNK` vertex attribute as described in BUILDING_KIT_NOTES.md.
- On the first hit on a wall:
  1. Hide it.
  2. Spawn the matching `wallB_*` piece of the same style with the same world transform.
  3. Delete that wall's static colliders. Every kit collider has `piece_id` in its extras, the same as the wall's `piece_id`.
  4. Build chunk colliders from the twin's `chunks` table.
  5. From then on, break chunks as before.
- Ivy leaves, awnings, signs and AC units store the host wall's `piece_id` plus a chunk id. Chunk ids are identical between a wall and its twin, so hiding things when a chunk breaks works the same way.

## Everything else

The rest is unchanged from BUILDING_KIT_NOTES.md:
- doors, glass, shutters and hatch lids with hinge extras
- ladders with `climb_` volumes
- stairs as `ramp_`
- `deck_` floors and roofs
- markers: rooms/fire, door in/out, repair, ladder ends, truck, hose and police, prefixed with the building name

Building roots also carry `replaces` (the old building's name), `style`, `seed`, `cells` and `heights`.

## Performance: please watch this

- There are 60 buildings and about 9,600 nodes in the kit GLB. Most of them are pieces that share meshes, plus marker empties.
- Rendered one mesh per piece, this is thousands of draw calls, which is far too many for the phone.
- Suggested approach:
  1. At load, merge each building's static pieces by material (BufferGeometryUtils.mergeGeometries). Keep a per-vertex wall index so one wall can be cut out when it gets swapped for its chunked twin.
  2. Or use InstancedMesh per (piece mesh, style).
  3. Skip interior meshes (floors, stairs, interior faces) for buildings the player isn't near, or near-cull them.
- Marker empties need no draw calls, but don't add them to the scene graph as Object3Ds if you don't need to. Read their positions into a table instead.
- The collision GLB has about 7,700 small objects. Merging static boxes per building on load will help. Keep the wall boxes separate by `piece_id`, because walls need to be removable.
