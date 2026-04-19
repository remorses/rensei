# Project Memory

## extrudeRotate profile polygon must not self-intersect

When building complex profiles for `extrudeRotate`, the outer and inner funnel slopes must be **parallel** (same direction vector), not antiparallel. If an outer slope goes inward-up and the inner slope goes outward-down, they mathematically cross — `extrudeRotate` produces two disconnected bodies and the slicer flags parts as floating. Verify by checking if segments share a solution: parallel slopes produce equations with no solution (no intersection).

## Filter stub must connect to bed, not to funnel floor mid-air

A filter cylinder that only connects at `funnelBottom` (mid-height) and hangs toward the bed is a cantilever — Bambu detects it as floating. Fix: route the filter all the way from Z=0 (bed) up to `funnelBottom`, so it prints from the bed upward. The filter appears as a small ring at the bed level, fully grounded.

## filterOuterRadius must be smaller than nozzleBaseRadius - wall

If `filterOuterRadius >= nozzleBaseRadius - wall`, the filter is wider than the funnel inner wall at the junction, causing geometry overlap and incorrect mesh. Always ensure: `nozzleBaseRadius >= filterOuterRadius + wall + tolerance`.

## rensei/modeling CJS interop bug

`import * as modeling from '@jscad/modeling'` fails at runtime when rensei dist is loaded — the namespace import doesn't resolve `@jscad/modeling` properties (they come back as undefined). Use `import jscad from '@jscad/modeling'` (default import) and destructure from `jscad.primitives`, `jscad.transforms`, etc.

## Scripts outside rensei/ need @jscad/modeling as explicit dep

The rensei CLI doesn't inject its own module resolution when evaluating scripts. Scripts in `examples/` or any other package must have `@jscad/modeling` as an explicit dependency in their own `package.json`, even though rensei already bundles it internally.
