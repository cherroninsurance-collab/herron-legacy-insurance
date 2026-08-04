# Getting more code out of your Omma account

## The honest shape of it

Omma's platform — the generator, the agents, the models behind the prompt box —
isn't in an export and can't be extracted from one. What an export contains is
**one project's worth of generated source**. So there is no single archive of
"all of Omma's code" to hand over; there is a supply line, and it works one
project at a time.

That is less limiting than it sounds. The zip you gave me was 1,937 lines and it
produced everything now running on the site. Each new project is another sample
of the same generator working on a different brief — and the more different the
brief, the less it overlaps with what we already have.

Also worth knowing before you spend prompts: **the techniques aren't secret.**
Omma writes Three.js, GLSL and CSS — all public, all documented. What it sells
is speed and taste in applying them. So the goal when farming exports is not to
find hidden APIs; it's to make it show you *applications* we haven't built yet.

## How to run it

1. New project in Omma, one prompt from the list below.
2. Let it build, then **Export / Download** the project.
3. Drop the zip into the chat here.

I'll read it, pull out anything new, retheme it bright, and add it to
`docs/effects-library.html` with its code and reasoning — same as this round.

**Send two or three at once.** Most of the value is in the diff between exports:
when the same technique shows up twice with different parameters, that tells us
what's structural and what was a one-off choice.

## Prompts worth spending

Written to push the generator somewhere our current library doesn't reach. Each
one names the *effect class*, not the content — that's what makes it produce a
technique rather than a landing page.

### Materials and light
> A dark landing page for a private bank where the hero object is a solid glass
> ingot with chromatic dispersion — light splitting into colour fringes through
> it — sitting on a reflective floor with a real environment map.

> A product page where the hero is brushed metal with anisotropic highlights and
> a clearcoat, lit by a studio HDRI, and the material properties change as the
> visitor scrolls.

### Volume and quantity
> A page with a field of ten thousand small objects drawn as a single instanced
> mesh, arranged on a grid, rippling in a wave that follows the cursor.

> A hero with a GPU particle system where the particles are simulated in a
> shader — positions stored in a texture — and they reassemble into a logo shape
> on scroll.

### Type
> A landing page where the headline is 3D extruded text that the camera flies
> through, and body text reveals with a per-character mask tied to scroll.

> A page where the headline is filled with a live animated gradient that reacts
> to cursor position, and letters distort like heat haze on hover.

### Structure and transitions
> A one-page site where each section pins while its 3D scene plays through a
> timeline, then releases — a scrollytelling structure with four chapters.

> A portfolio where clicking a card transitions the whole page into the detail
> view with a shared-element animation, and the 3D background morphs between
> states.

### Data
> A financial dashboard where the charts are 3D — extruded bars on a plane, a
> ribbon line chart with depth — that rebuild when the filters change.

> A page that loads a CSV and generates a 3D scatter plot you can orbit, with
> hover tooltips anchored to points in 3D space.

### Post-processing
> A dark hero scene with selective bloom on only the emissive parts, plus subtle
> depth of field so the background objects blur.

## What I'll do with each one

Same filter as this round, so you know what to expect back:

- **Contained beats ambient.** Anything drifting loose over the page gets cut —
  that rule came from your own reaction to the orbit and the mote field, and it
  has held up.
- **One renderer.** This page already spends WebGL contexts on the emblem, the
  diamond field and the glass panes. Nothing new gets its own.
- **Bright.** Exports will come back dark; they always do. Retheming is most of
  the work and it is not optional.
- **Nothing near the numbers.** No effect goes anywhere that could make an
  estimate look more precise than the model behind it is.

## The other lever: Spline proper

Omma is Spline's natural-language builder. The other half of that ecosystem is
the Spline editor, where you model a scene by hand and export a `.splinecode`
file played by their runtime.

Different trade, and worth being clear-eyed about it: you get visual modelling
and no code to maintain, but the scene is a binary you can't restyle in code —
every change goes back through the editor — it's typically hundreds of KB to
several MB, and the player comes off a third-party CDN in your critical path.

Fair for one modelled hero centrepiece. Not fair for small explanatory devices,
which is why nothing on the site uses it today. Both embed shapes are in the
effects library if you want to try it.
