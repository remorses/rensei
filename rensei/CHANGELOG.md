# Changelog

## 0.3.0

1. **`--view` flag is now repeatable** — compose multiple preset views into a single PNG grid:

   ```bash
   # Front and top views side by side
   rensei screenshot model.ts --view front --view top --output combined.png

   # Any combination of presets
   rensei screenshot model.ts --view front --view left --view top --output ortho.png
   ```

   The grid size adapts automatically: 2 views → 2×1, 3–4 views → 2×2, 5–9 views → 3×3.

2. **`--view all` now outputs a single grid image** — previously it wrote separate PNG files to a directory. Now it composes all 8 preset views into one image:

   ```bash
   # Before (0.2.x): wrote ./views/front.png, ./views/back.png, etc.
   # After (0.3.0): writes one grid PNG
   rensei screenshot model.ts --view all --output views.png
   ```

3. **New `renderViewGrid` API** — render selected views into a single grid programmatically:

   ```ts
   import { renderViewGrid } from 'rensei'

   const png = await renderViewGrid({
     stlPath: 'model.stl',
     views: ['front', 'top', 'iso'],
     width: 1200,
     height: 1200,
   })
   ```

4. **New `computeSquareGridSize` export** — compute the smallest square grid that fits N items:

   ```ts
   import { computeSquareGridSize } from 'rensei'
   computeSquareGridSize(5) // → 3 (3×3 grid with 4 empty cells)
   ```

5. **Published package includes docs/** — the image-to-JSCAD workflow guide (`docs/image-to-jscad-workflow.md`) is now in the npm tarball alongside the README and skill file.

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
   # Render a JSCAD script from all angles into one grid image
   rensei screenshot model.ts --view all --output views.png

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
