---
name: rensei
description: >
  rensei is a CLI + library for programmatic 3D modeling and headless rendering.
  Write JSCAD TypeScript scripts using `rensei/modeling` (flat re-exports of all
  @jscad/modeling APIs: cube, sphere, subtract, union, translate, etc.), then
  screenshot or export to STL via the rensei CLI. Designed for AI agent feedback
  loops: generate JSCAD code → screenshot from multiple angles → compare against
  reference → iterate until the model matches. ALWAYS load this skill when the
  user mentions rensei, JSCAD, CSG, parametric CAD, 3D model generation,
  STL rendering, or 3D printing model code. Also load when editing .ts/.js files
  that import from rensei/modeling or @jscad/modeling.
---

# rensei

## Install

```bash
npm install rensei
```

## Install skill for AI agents

```bash
npx -y skills add remorses/rensei
```

Every time you use rensei, you MUST run:

```bash
rensei --help # NEVER pipe to head/tail, read the full output
```

Every time you work with rensei, you MUST fetch the latest README:

```bash
curl -s https://raw.githubusercontent.com/remorses/rensei/main/README.md # NEVER pipe to head/tail
```

---

## Critical rules for printable models

## Spec-first workflow for references

If the user provides **photos, drawings, screenshots, or sketches**, do not start by writing JSCAD.

First produce a short structured spec:

1. **Overview** — what is the object, in one sentence
2. **Envelope** — overall dimensions if known
3. **Feature tree** — base shape, holes, pockets, ribs, bosses, threads, repeats
4. **Uncertainties** — what is still ambiguous

Then ask the user to confirm or correct the spec before you code.

This matters because the biggest failure mode is usually **misreading the image**, not misusing JSCAD. A corrected spec saves many more turns than a late geometry fix.

### Mapping the spec to JSCAD

When converting the confirmed spec to code, prefer the smallest JSCAD pattern that matches the intended shape:

- plate / flange / bracket base → `roundedRectangle()` or `rectangle()` + `extrudeLinear()`
- round holes → `circle()` + `extrudeLinear()` + `subtract()`
- pockets / recesses → 2D profile + `extrudeLinear()` + `subtract()`
- rotational parts → `polygon()` + `extrudeRotate()`
- repeated features → array of positions + `map()` + `union()` / `subtract()`
- mirrored features → model one side then `mirrorX()` / `mirrorY()` + `union()`

Do not try to imitate a feature CAD tree exactly. `rensei` is code-first. Use parameters, arrays, and derived dimensions instead.

### Render review protocol

After each meaningful change, render again and explicitly check:

1. **Silhouette** — does the outline match the reference view?
2. **Proportions** — width, height, thickness, taper
3. **Feature count** — all holes, ribs, slots, bosses present
4. **Polarity** — additive vs subtractive features correct
5. **Symmetry** — mirrored features actually line up
6. **Printability** — thin walls, floating details, bad orientation

If the render still looks wrong, say what you expected to see and what is actually different before changing the code again. This keeps the iteration loop grounded.

### extrudeRotate profile must not self-intersect

When building profiles for `extrudeRotate`, outer and inner funnel slopes must NOT cross each other. Antiparallel slopes that trace in opposite directions will intersect, creating disconnected bodies — the slicer flags parts as "floating cantilever" even though geometry looks solid.

**Rule**: verify segments don't intersect by parametrizing as `A + t*(B-A)` and `C + s*(D-C)`. If both `t` and `s` resolve to `[0,1]`, they cross. Parallel funnel walls (same direction vector) never cross.

**Sizing rule**: `filterOuterRadius < nozzleBaseRadius - wall`. If a feature inside a funnel is wider than the funnel's inner wall, geometry overlaps. Increase `nozzleBaseRadius`.

### Filter/internal features: connect to bed, not ceiling

A feature that only connects mid-air (e.g. a filter stub at `funnelBottom`) and extends toward the bed is a cantilever — slicer detects it as floating. Fix: route the feature all the way from `Z=0` (bed) up to the funnel floor so it's fully grounded. It appears as a small ring on the bed.

### Print orientation decision

1. Largest flat face → on the bed
2. Overhangs → face upward
3. Internal features → must build from floor up, never from ceiling down
4. Cylindrical functional parts → print axis vertical (hoop stress stays in XY = strong direction)

Spaghetti = sudden large cross-section expansion. Funnel printed narrow-end-down will fail when the wide cone starts — flip to wide-end-down.

---

## Bambu Studio P1S — exact parameter names

### Quality tab

- **Layer height** — 0.2mm default. Lower to 0.16mm for threads/fine detail. ★★★ Critical
- **Initial layer height** — leave at 0.2mm
- **Seam position** — Aligned default is fine

### Strength tab

- **Wall loops** — default 2. Use **3–4** for functional parts. ★★★ Critical
- **Sparse infill density** — default 15%. Use **25–30%** for functional/structural parts. ★★★ Critical
- **Sparse infill pattern** — Grid default. **Gyroid** = stronger. ★★ Medium
- **Top shell layers** — default 5. Fine for most prints
- **Bottom shell layers** — default 3. Increase to 4–5 for watertight bottom

### Support tab

- **Enable support** — OFF unless model truly needs it
- **Type** — `tree(auto)` ← use this. Less material, easier removal
- **Threshold angle** — default **30°** on P1S (very aggressive, generates lots of support). Raise to **45–50°** for less support on gradual overhangs. ★★★ Critical
- **On build plate only** — **Enable** to prevent supports scarring model surface. ★★ Medium

### Others tab

- **Brim type** — Auto. Set None if part has large flat base; Outer brim only for warping
- **Brim width** — 5mm default, fine
- **Spiral vase** — single-wall continuous spiral for vases. Off for functional parts
- **Fuzzy Skin** — cosmetic texture. Leave None for functional parts
