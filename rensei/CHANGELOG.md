# Changelog

## 0.2.1

1. **Fixed `npx rensei` for TypeScript JSCAD scripts** — the published package now includes the runtime `tsx` dependency required by `rensei stl`, `rensei screenshot`, and `rensei weight` when they import `.ts` model files from npm installs.

## 0.2.0

1. **New `rensei weight` command** — estimate filament usage directly from a JSCAD script before slicing:

   ```bash
   # PLA defaults
   rensei weight model.ts

   # PETG with lighter infill
   rensei weight model.ts --density 1.27 --infill 15

   # Stronger walls for a functional part
   rensei weight model.ts --shells 5 --nozzle 0.4
   ```

   The command prints model volume, shell volume, infill volume, total filament weight, estimated filament length, and the bounding box in one pass.

2. **The published npm package now includes the README and agent skill** — install `rensei` and keep the usage guide plus `skills/rensei/SKILL.md` in the package tarball instead of only in the GitHub repo.

## 0.1.0

1. **New `rensei stl` command** — convert JSCAD TypeScript/JavaScript scripts directly to STL:

   ```bash
   rensei stl model.ts --output model.stl
   ```

   The script must export a `main()` function that returns JSCAD geometry. TypeScript is supported natively via `tsx`.

2. **`rensei/modeling` export** — flat re-exports of all `@jscad/modeling` APIs:

   ```ts
   import { cube, sphere, subtract, union, translate, colorize } from 'rensei/modeling'
   ```

   Includes all 83+ JSCAD APIs (primitives, booleans, transforms, extrusions, hulls, measurements, colors, text, curves, math). No need to install `@jscad/modeling` separately.

3. **`rensei screenshot` now accepts JSCAD scripts** — render `.ts`/`.js` scripts directly to PNG without intermediate STL export:

   ```bash
   # Render a JSCAD script from all angles
   rensei screenshot model.ts --view all --output ./views/

   # Render a single custom view
   rensei screenshot model.ts --azimuth 45 --elevation 30 --output render.png
   ```

4. **Programmatic API** — evaluate JSCAD scripts from Node.js:

   ```ts
   import { jscadToStl, jscadToGeometries } from 'rensei'

   // Get binary STL buffer
   const stl = await jscadToStl('model.ts')

   // Get raw geometries for further processing
   const geometries = await jscadToGeometries('model.ts')
   ```

5. **Renamed package from `stl-screenshot` to `rensei`** — the CLI binary is now `rensei` instead of `stl-screenshot`
