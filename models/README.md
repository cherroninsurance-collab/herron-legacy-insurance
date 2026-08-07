# 3D models — Omma export

Four Draco-compressed GLBs generated in Omma (500 credits). Kept here because
this container is ephemeral and they cost real money to produce.

**Not wired into any page yet.** Read the numbers before you use them.

| File | Triangles | Size | Bounds (w × h × d) |
| --- | --- | --- | --- |
| `m1.glb` | 375,000 | 1.1 MB | 0.79 × **0.11** × 1.04 — flat |
| `m2.glb` | 375,000 | 1.0 MB | 0.68 × **0.11** × 0.99 — flat |
| `m3.glb` | 375,000 | 1.3 MB | 1.16 × 1.16 × 1.11 |
| `m4.glb` | 375,000 | 1.3 MB | 0.81 × 0.81 × 0.76 |

Each carries a full PBR set — base colour, normal, and packed
metallic/roughness, all WebP. The generation quality is good.

## What blocks shipping them

1. **375,000 triangles each**, against a 5,000 budget. 1.5M total for props that
   render inside ~300px cards, where none of that detail is visible.
2. **4.7 MB of models**, on a page whose entire 3D layer is about 40 KB of code.
3. **Draco compression** means the site would have to ship a GLTFLoader plus a
   Draco decoder — roughly 200 KB more library — where today it vendors one
   three.js build and nothing else.
4. **Two are flat** (0.11 tall on a ~1.0 footprint). One is plausibly the
   document; two is not what four distinct props should look like.
5. **No semantic names.** Every node and mesh is called `material`, so which
   file is the house and which is the shield can't be read off the file.
6. **Off-centre on Z** by about -0.5 in all four — each needs re-centring
   before it will sit properly in a scene.

## What would make them usable

Re-export from Omma at a few thousand triangles and without Draco, if those
options exist. That removes the decoder dependency and takes the payload from
4.7 MB to well under 100 KB, which is the difference between an asset that can
go on a page selling insurance and one that can't.

Failing that, they can be decimated offline — but that is tooling this sandbox
does not have, and a re-export is cheaper than rebuilding the pipeline.
