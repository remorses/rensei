# Changelog

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
