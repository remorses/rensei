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
