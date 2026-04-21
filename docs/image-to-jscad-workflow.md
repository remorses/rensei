---
title: Image-to-JSCAD workflow
description: A spec-first workflow for turning photos, drawings, and sketches into JSCAD models with rensei.
---

# Image-to-JSCAD workflow

`rensei` works best when the agent treats **image understanding** and **model construction** as two separate steps.

If the user provides a photo, drawing, or sketch, do **not** jump straight into JSCAD code. First write down what the part is, what the main features are, what dimensions are known, and what is still ambiguous. A good text spec saves more time than a clever modeling trick.

## Why split the workflow

For most failed CAD generations, the real problem is not `extrudeLinear()` or `subtract()`. The real problem is that the agent misread the reference.

Common mistakes:

- treating a **boss** as a **pocket**
- simplifying a derived outline into a plain rectangle
- missing repeated features like `4x` holes or ribs
- guessing dimensions that were visible in the reference
- modeling decorative artifacts that should be ignored for printing

The fix is simple: **describe first, build second**.

## Phase 1. Decompose the reference

Before writing JSCAD, produce a short structured spec.

Use this shape:

```md
## Overview
One sentence. What is this object?

## Envelope
Overall size if known. Example: 80 × 50 × 6 mm.

## Feature tree
F1. Base plate
- type: additive
- shape: rounded rectangle
- size: 80 × 50 × 6 mm

F2. Corner holes
- type: subtractive
- shape: 4 through holes
- size: Ø4 mm
- position: 6 mm from each edge

F3. Center pocket
- type: subtractive
- shape: rounded rectangle
- size: 48 × 22 × 2 mm

## Uncertainties
- pocket depth unclear from photo
- edge radii only estimated from silhouette
```

Good specs are short but concrete. If the user can correct the spec quickly, the build phase usually becomes straightforward.

## Phase 2. Map the spec to JSCAD operations

After the spec is stable, map each feature to a JSCAD primitive or transform.

Typical mapping:

- **plate / block** → `cuboid()` or `roundedRectangle()` + `extrudeLinear()`
- **round hole** → `circle()` + `extrudeLinear()` + `subtract()`
- **boss / standoff** → `cylinder()` + `union()`
- **pocket** → 2D profile + `extrudeLinear()` + `subtract()`
- **lathed part** → `polygon()` + `extrudeRotate()`
- **ribs / repeated tabs** → build one feature, then `translate()` / array map / `union()`
- **mirrored symmetry** → model one side, then `mirrorX()` / `mirrorY()` + `union()`

The goal is not to mimic a CAD feature tree one-to-one. The goal is to pick the smallest JSCAD expression that preserves the intended geometry.

## Phase 3. Verify every iteration

After each meaningful change, render again and compare against the reference.

Checklist:

1. **Silhouette**. Does the outline match from the current view?
2. **Proportions**. Are width, height, and thickness relationships right?
3. **Feature count**. Are all holes, ribs, slots, bosses present?
4. **Polarity**. Is something added that should be removed, or vice versa?
5. **Symmetry**. Are mirrored features actually mirrored?
6. **Printability**. Did this change create thin walls, floating regions, or bad orientation?

If the render is ambiguous, compare the reference and model in the same named view before changing the code again.

## A good rensei loop

```bash
# 1. write the model
rensei screenshot model.ts --view all --output views.png

# 2. inspect all orthographic views

# 3. change the code
rensei screenshot model.ts --view all --output views.png

# 4. repeat until the spec and renders agree
```

This is intentionally simple. `rensei` is strongest when the model stays as readable code and the feedback loop stays visual.

## JSCAD-specific advice

- Prefer **named dimensions** at the top of the file. This makes iteration cheap.
- Build from a **clean envelope** first, then add or subtract details.
- For repeated features, encode the pattern as data and map over it.
- When possible, derive secondary dimensions from primary ones instead of hard-coding both.
- If a shape is hard to understand in 3D, model its **2D profile first**.
- When using `extrudeRotate()`, double-check that the profile polygon does not self-intersect.

## When to ask for clarification

Ask before building when any of these are true:

- one dimension controls many downstream features
- polarity is ambiguous from the image
- the backside is not visible and changes function
- the object may be decorative in the photo but functional in print

In those cases, a 10-second question is better than five modeling revisions.

## Example files

- `examples/src/water-filter.ts` shows a rotational profile workflow with printability constraints.
- `examples/src/mounting-plate.ts` shows a feature-tree-style workflow adapted to JSCAD booleans and repeated hole patterns.
