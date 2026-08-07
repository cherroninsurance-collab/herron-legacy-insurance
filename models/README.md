# 3D models — Omma export

Four Draco-compressed GLBs generated in Omma (500 credits). Kept here because
this container is ephemeral and they cost real money to produce.

**Not wired into any page yet.** Read the numbers before you use them.

## What they are

Confirmed against the Omma project source and a render of all four. Names and
labels come from the project, not from the files — every node and mesh inside
the GLBs is called `material`, so the files themselves say nothing.

| File | Model | Triangles | Size | Placed size (w × h × d) |
| --- | --- | --- | --- | --- |
| `m1.glb` | flat plate — `shield` / `document` | 375,000 | 1.1 MB | 0.79 × 1.04 × 0.11 |
| `m2.glb` | flat plate — the other of the two | 375,000 | 1.0 MB | 0.68 × 0.99 × 0.11 |
| `m3.glb` | `umbrella` | 375,000 | 1.3 MB | 1.16 × 1.11 × 1.16 |
| `m4.glb` | `house` | 375,000 | 1.3 MB | 0.81 × 0.76 × 0.81 |

m1 and m2 are the shield and the policy document; which is which can't be told
from the geometry alone (both are thin upright plates of near-identical
proportion) and needs a look at the base-colour texture to settle. Nothing
depends on it until they're wired up.

Colours are on brand as generated — navy and cream, with a cyan window accent
on the house. Each carries a full PBR set (base colour, normal, packed
metallic/roughness, all WebP). The generation quality is good.

## Read the node transform, not the raw bounds

**Every node carries `rotation = [0.7071, 0, 0, 0.7071]` — a +90° turn about X**,
the standard Z-up → Y-up conversion. Raw accessor bounds are therefore in the
source's Z-up frame and must not be read as the placed size: raw Z is height,
raw Y is depth.

Two earlier claims in this file came from ignoring that and have been removed:

- *"two are flat"* — m1 and m2 are thin, but they stand **upright**, ~1.0 tall.
  That is exactly the right shape for a shield and a sheet of paper. Nothing is
  lying on the floor.
- *"off-centre on Z by -0.5"* — the opposite. Once placed, all four are centred
  on X and Z and sit precisely on Y = 0. They are already grounded and need no
  re-centring.

## What actually blocks shipping them

1. **375,000 triangles each**, against a 5,000 budget. 1.5M total for props that
   render inside ~300px cards, where none of that detail is visible.
2. **4.7 MB of models**, on a page whose entire 3D layer is about 40 KB of code.
3. **Draco compression** means the site would have to ship a GLTFLoader plus a
   Draco decoder — roughly 200 KB more library — where today it vendors one
   three.js build and nothing else. Omma's own page loads that decoder from
   gstatic.com; a third-party CDN in the critical path is not something this
   site does.
4. **Omma hosts them, we don't.** The generated project references
   `https://omma.build/api/m/<uuid>.glb` rather than bundling the files. These
   local copies are the only ones under our control.

## What would make them usable

Re-export at a few thousand triangles and without Draco, if those options
exist. That removes the decoder dependency and takes the payload from 4.7 MB to
well under 100 KB — the difference between an asset that can go on a page
selling insurance and one that can't.

Failing that, they can be decimated offline, but that is tooling this sandbox
does not have, and a re-export is cheaper than rebuilding the pipeline.

Omma's own loader normalises on the way in — scales to a target height and sits
the model on y = 0. Worth copying if these ever mount: it makes four models of
different natural size frame identically.
