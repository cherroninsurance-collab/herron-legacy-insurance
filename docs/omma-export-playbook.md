# Getting more code out of your Omma account

## The honest shape of it

Omma's platform — the generator, its parallel agents, the models behind the
prompt box — isn't in an export and can't be extracted from one. What an export
contains is **one project's worth of generated source**. There is no single
archive of "all of Omma's code" to hand over; there is a supply line, and it
works one project at a time.

That is less limiting than it sounds. The first zip was 1,937 lines and produced
everything now running on the site. Each new project is another sample of the
same generator on a different brief — and the more different the brief, the less
it overlaps with what we already have.

Worth knowing before you spend prompts: **the techniques aren't secret.** Omma
writes Three.js, React Three Fiber, GLSL and Tailwind — all public, all
documented. What it sells is speed and taste in applying them. The goal when
farming exports is not to find hidden APIs; it's to make it show us
*applications* we haven't built yet.

## How to run it

1. New project in Omma, **one** prompt from below.
2. Attach the file first where a prompt is marked 📎 — those exercise the
   ingestion path, and without the file you get a generic result.
3. Let it build, then **Export / Download** the project.
4. Drop the zip into the chat.

**Send two or three at a time.** Most of the value is in the diff between
exports: when the same technique appears twice with different parameters, that
tells us what's structural and what was a one-off choice.

---

# The prompts

Organised against the five capability areas, so every one is covered. Each names
an *effect class* rather than content — that is what makes the generator produce
a technique instead of another landing page.

## 1. Parallel multi-agent / multi-frame

> Build three frames side by side on one canvas for the same product launch — a
> desktop landing page, a tablet dashboard, and a mobile checkout flow — sharing
> one design system and one 3D hero object framed differently in each.

> Generate a page where the imagery, the 3D model and the copy are all produced
> for the same brief: a hero object, a matching background texture, and section
> headings written to fit it.

## 2. WebGL / WebGPU physics

### Fluid and particulate
> A hero with a real-time fluid surface — water with responsive ripples that
> spread from wherever the cursor touches it, with refraction through the
> surface and caustics on the floor beneath.

> A landing page with a volumetric weather layer: streaking rain in the
> foreground, drifting dust motes in the mid-ground, and depth fog, each on its
> own parallax plane.

> A hero with a GPU particle system where positions are simulated in a shader
> and stored in a texture, and the particles reassemble into a logo shape on
> scroll.

### Rigid-body
> A page with a physics playground in the hero — objects with real mass and
> gravity that collide with each other and with the walls of their container,
> which the visitor can throw with the cursor.

> A keyboard-controlled mini-game embedded in a landing page, with collision
> boundaries, momentum and gravity, and a score that drives page state.

### Materials
> A dark landing page for a private bank where the hero is a solid glass ingot
> with chromatic dispersion — light splitting into colour fringes through it —
> on a reflective floor with a real environment map.

> A product page where the hero is brushed metal with anisotropic highlights and
> a clearcoat, lit by a studio HDRI, whose material properties change on scroll.

> A hero object covered in dense strand-based fur or hair that moves with
> physics as the object rotates.

## 3. Context ingestion — these need a file or URL 📎

> 📎 **Paste your site URL.** Import this website, keep its layout and copy
> exactly, and add a 3D hero, scroll-driven parallax between sections, and
> cursor-reactive product cards.

> 📎 **Attach a CSV.** Turn this data into an interactive 3D visualisation — an
> extruded bar field on a plane with a ribbon line chart above it — that
> rebuilds when the filters change.

> 📎 **Attach a CSV or JSON.** Generate a 3D scatter plot from this file that I
> can orbit, with tooltips anchored to points in 3D space.

> 📎 **Attach a GLB or GLTF.** Build a product configurator around this model:
> orbit controls, hotspots on the model that open spec panels, and swappable
> materials.

> 📎 **Attach a document.** Turn this into a scroll-driven explainer where each
> section has its own 3D diagram illustrating the point being made.

## 4. Interactive state machines

> A multi-step intake form with live validation, a progress indicator, and a 3D
> object that changes state as each step is completed.

> An onboarding flow with four steps, each advancing a 3D scene through a
> timeline, with the answers held in state and summarised at the end.

> A quiz wizard where the 3D scene responds to each answer and the result screen
> is generated from the accumulated state.

> A page where a 3D scene reacts to audio — objects scaling, colours and
> lighting shifting with the frequency bands of a track or the microphone.

> A product page where the camera follows a fixed path around the object as you
> scroll, with the object tracking the cursor with a look-at constraint, and
> defined stops at each section.

## 5. Post-processing

> A hero scene with selective bloom on only the emissive parts, plus depth of
> field so the background blurs, and subtle chromatic aberration at the edges.

---

## What happens to each import

The filter every export is held to, so you know what comes back:

- **Contained beats ambient.** Anything drifting loose over the page gets cut.
  That rule came from your own reaction to the orbiting rings and the mote
  field, and it has held up since.
- **One renderer.** This page already spends WebGL contexts on the emblem, the
  diamond field and the glass panes. Nothing new gets its own.
- **Bright.** Exports come back dark; they always do. Retheming is most of the
  work and it is not optional.
- **Nothing near the numbers.** No effect goes anywhere that could make an
  estimate look more precise than the model behind it is.
- **Nothing that only works on a fast machine.** Every scene needs a real
  fallback, and the heavy ones stay off touch devices.

Realistically, a good fraction of what comes back won't earn a place on an
insurance site — a physics playground and a hair simulation are not selling
mortgage protection. They still go in the effects library as templates, which is
the point of keeping them.

## The other lever: Spline proper

Omma is Spline's natural-language builder. The other half is the Spline editor,
where you model a scene by hand and export a `.splinecode` played by their
runtime.

Different trade, worth being clear-eyed about: visual modelling and no code to
maintain, but the scene is a binary you can't restyle in code — every change goes
back through the editor — it's typically hundreds of KB to several MB, and the
player comes off a third-party CDN in your critical path.

Fair for one modelled hero centrepiece. Not fair for small explanatory devices,
which is why nothing on the site uses it today. Both embed shapes are in the
effects library if you want to try it.
