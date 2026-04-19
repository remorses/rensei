<div align='center'>
    <br/>
    <br/>
    <h3>rensei</h3>
    <p>CLI to let agents generate 3d models from code & screenshot them. Then 3d print</p>
    <br/>
    <br/>
</div>

## Agent Skill

This package ships a skill file that teaches AI coding agents how and when to use it. Install it with:

```bash
npx -y skills add remorses/rensei
```

## Agent Workflow

rensei enables AI agents to generate 3D models via an iterative feedback loop:

1. **Analyze** user reference images (photos, sketches, descriptions)
2. **Write** a JSCAD `.ts` script using `rensei/modeling` exports
3. **Screenshot** with `rensei screenshot model.ts --view all --output ./views/`
4. **Compare** rendered views against the reference from every angle
5. **Update** the `.ts` script to fix shape/dimension differences
6. **Repeat** until model matches from all orthogonal views (front, back, left, right, top, bottom, iso)

## Example: Water Filter Funnel (from reference photos)

This model was built entirely by an AI agent using the iterative screenshot workflow above. Starting from 6 reference photos of a metal water filter part, the agent:

1. Analyzed the photos to understand the part's function (funnel redirecting water from wide opening to narrow nozzle)
2. Identified which features were functional vs manufacturing artifacts (concentric machining rings, decorative grooves — all stripped)
3. Built a simplified thin-walled conical funnel using `extrudeRotate` with a 2D profile polygon
4. Iterated through ~5 revisions comparing renders to photos from matching angles
5. Optimized for 3D printing: minimal wall thickness, no supports needed, correct orientation for pressure resistance

**Input**: 6 photos of a metal part → **Output**: print-ready STL

![Water filter funnel — top, iso, front, nozzle, bottom views](docs/water-filter-strip.png)

Source: [`examples/src/water-filter.ts`](examples/src/water-filter.ts)

## CLI Commands

```bash
# Screenshot a JSCAD script from all angles
rensei screenshot model.ts --view all --output ./views/

# Screenshot a single view
rensei screenshot model.ts --view iso --output render.png

# Screenshot with custom camera angle
rensei screenshot model.ts --azimuth 45 --elevation 30 --output render.png

# Convert JSCAD script to STL
rensei stl model.ts --output model.stl

# Screenshot an existing STL file
rensei screenshot model.stl --view front --output front.png

# Estimate filament weight (PLA, default settings)
rensei weight model.ts

# Estimate filament weight for PETG with 15% infill
rensei weight model.ts --density 1.27 --infill 15

# Estimate filament weight for ABS with 5 shells
rensei weight model.ts --density 1.05 --infill 20 --shells 5
```

Options: `--size` (default 1500), `--zoom`, `--color`, `--background`

## Filament Weight Estimation

`rensei weight <file>` computes filament weight directly from the JSCAD geometry — no slicing needed. It uses JSCAD's `measureAggregateVolume` to get the exact model volume, then splits it into shell and infill based on your print settings.

```
rensei weight model.ts
```

```
Filament weight estimate for: model.ts
─────────────────────────────────────────
  Model volume:     12.15 cm³
  Shell volume:     4.32 cm³  (3 shells × 0.4mm nozzle)
  Inner volume:     7.83 cm³  (20% infill)
  Density:          1.24 g/cm³
─────────────────────────────────────────
  ➜  Weight:        7.3 g
  ➜  Filament:      2.44 m  (1.75mm diameter)
─────────────────────────────────────────
  Bounding box:     50.0 × 50.0 × 28.0 mm
```

### Common material presets

**PLA** (most common, default settings):
```bash
rensei weight model.ts
# --density 1.24  --infill 20  --shells 3  --nozzle 0.4
```

**PETG** (slightly denser, often lower infill for flexibility):
```bash
rensei weight model.ts --density 1.27 --infill 15
```

**ABS** (lighter than PLA, needs more walls for strength):
```bash
rensei weight model.ts --density 1.05 --infill 25 --shells 4
```

**TPU** (flexible filament, low infill):
```bash
rensei weight model.ts --density 1.21 --infill 10 --shells 3
```

**ASA** (outdoor/UV-resistant):
```bash
rensei weight model.ts --density 1.07 --infill 20
```

### All options

| Flag | Default | Description |
|---|---|---|
| `--density` | `1.24` | Filament density in g/cm³ |
| `--infill` | `20` | Infill percentage 0–100 |
| `--shells` | `3` | Number of perimeter shells |
| `--nozzle` | `0.4` | Nozzle diameter in mm |
| `--layer-height` | `0.2` | Layer height in mm |

### Common filament densities

| Material | Density (g/cm³) |
|---|---|
| PLA | 1.24 |
| PETG | 1.27 |
| ABS | 1.05 |
| ASA | 1.07 |
| TPU (95A) | 1.21 |
| Nylon (PA12) | 1.01 |
| PC | 1.20 |
| PLA+ | 1.24 |

> **Note:** This is a fast estimate based on geometry volume, not actual toolpaths. For exact weight, slice in Bambu Studio / PrusaSlicer after exporting the STL with `rensei stl model.ts`.

---

## JSCAD via rensei/modeling

rensei uses JSCAD (`@jscad/modeling`) for CSG operations. The `rensei/modeling` export re-exports all JSCAD APIs as flat named exports so scripts don't need `@jscad/modeling` installed separately.

```typescript
import { cube, sphere, subtract, union, translate } from 'rensei/modeling'
```

---

## Core Concepts

JSCAD models are built by creating primitive shapes, transforming them (move/rotate/scale), and combining them with boolean operations (union/subtract/intersect). Everything is **immutable** — operations return new geometry, never mutate.

There are **3 geometry types** that flow through the entire API:

- **`Path2`** — open or closed 2D path (line segments). Created by `line()`, `arc()`.
- **`Geom2`** — closed 2D shape with area (filled polygon). Created by `circle()`, `rectangle()`, `polygon()`, etc.
- **`Geom3`** — 3D solid mesh. Created by `cube()`, `sphere()`, `cylinder()`, or by extruding 2D shapes.

The general workflow: **create primitives → transform → combine with booleans → export**.

Every JSCAD file exports a `main()` function that returns geometry or an array of geometries:

```typescript
import { cube } from 'rensei/modeling'

export function main() {
    return cube({ size: 10 })
}
```

## Setup and Imports

```typescript
import {
    // Primitives
    cube, cuboid, sphere, cylinder, cylinderElliptic, ellipsoid,
    geodesicSphere, roundedCuboid, roundedCylinder, torus, polyhedron,
    circle, ellipse, square, rectangle, roundedRectangle, polygon,
    triangle, star, line, arc,
    // Booleans
    union, subtract, intersect, scission,
    // Transforms
    translate, translateX, translateY, translateZ,
    rotate, rotateX, rotateY, rotateZ,
    scale, scaleX, scaleY, scaleZ,
    mirror, mirrorX, mirrorY, mirrorZ,
    center, centerX, centerY, centerZ, align,
    // Extrusions
    extrudeLinear, extrudeRotate, extrudeRectangular, extrudeHelical,
    extrudeFromSlices, project, slice,
    // Hulls
    hull, hullChain,
    // Expansions
    expand, offset,
    // Colors
    colorize, colorNameToRgb, hexToRgb, hslToRgb, hsvToRgb,
    // Measurements
    measureBoundingBox, measureBoundingSphere, measureCenter,
    measureCenterOfMass, measureDimensions, measureArea,
    measureVolume, measureAggregateArea, measureAggregateBoundingBox,
    measureAggregateVolume,
    // Modifiers
    generalize, snap, retessellate,
    // Text
    vectorText, vectorChar,
    // Curves
    bezier,
    // Math
    mat4, vec2, vec3,
    // Geometries
    geom2, geom3, path2,
} from 'rensei/modeling'
```

All angles in JSCAD are in **radians**. Use `Math.PI / 180 * degrees` to convert.

---

## 3D Primitives (return `Geom3`)

### cube

Equal-sided box centered at origin.

```typescript
cube()                                // 2x2x2 at origin
cube({ size: 10 })                    // 10x10x10
cube({ size: 5, center: [0, 0, 2.5] })
```

Options: `{ center?: [x,y,z], size?: number }`

### cuboid

Box with different dimensions per axis.

```typescript
cuboid({ size: [10, 20, 5] })         // 10 wide, 20 deep, 5 tall
cuboid({ size: [4, 4, 1], center: [0, 0, 0.5] })
```

Options: `{ center?: [x,y,z], size?: [x,y,z] }`

### sphere

```typescript
sphere()                              // radius 1, 32 segments
sphere({ radius: 5, segments: 64 })
sphere({ radius: 3, center: [10, 0, 0] })
```

Options: `{ center?: [x,y,z], radius?: number, segments?: number, axes?: [x,y,z] }`

### geodesicSphere

Icosahedron-based sphere with more uniform triangle distribution.

```typescript
geodesicSphere({ radius: 5, frequency: 6 })
```

Options: `{ radius?: number, frequency?: number }`

### ellipsoid

3D ellipsoid with independent radii per axis.

```typescript
ellipsoid({ radius: [5, 10, 3] })     // egg-like squashed shape
```

Options: `{ center?: [x,y,z], radius?: [rx,ry,rz], segments?: number, axes?: [x,y,z] }`

### cylinder

```typescript
cylinder({ height: 10, radius: 3 })
cylinder({ height: 20, radius: 5, segments: 6 })   // hexagonal prism
cylinder({ height: 10, radius: 3, center: [0, 0, 5] })  // bottom at z=0
```

Options: `{ center?: [x,y,z], height?: number, radius?: number, segments?: number }`

### cylinderElliptic

Cylinder with different elliptical cross-sections at top and bottom. Use for cones and tapered shapes.

```typescript
// Cone (tapers to near-point)
cylinderElliptic({ height: 10, startRadius: [5, 5], endRadius: [0.01, 0.01] })

// Truncated cone
cylinderElliptic({ height: 10, startRadius: [5, 5], endRadius: [2, 2] })

// Oval cross-section
cylinderElliptic({ height: 10, startRadius: [5, 3], endRadius: [5, 3] })

// Partial arc (pie-wedge cylinder)
cylinderElliptic({
  height: 5, startRadius: [5, 5], endRadius: [5, 5],
  startAngle: 0, endAngle: Math.PI
})
```

Options: `{ center?, height?, startRadius?: [rx,ry], endRadius?: [rx,ry], startAngle?, endAngle?, segments? }`

### roundedCuboid

Box with rounded edges and corners.

```typescript
roundedCuboid({ size: [10, 10, 5], roundRadius: 1, segments: 32 })
```

Options: `{ center?, size?: [x,y,z], roundRadius?: number, segments?: number }`

### roundedCylinder

Cylinder with rounded (hemispherical) caps.

```typescript
roundedCylinder({ height: 10, radius: 3, roundRadius: 1, segments: 32 })
```

Options: `{ center?, height?, radius?, roundRadius?, segments? }`

### torus

Donut shape. `innerRadius` = tube radius, `outerRadius` = center-to-tube-center distance.

```typescript
torus({ innerRadius: 1, outerRadius: 5 })
torus({
  innerRadius: 2, outerRadius: 8,
  innerSegments: 16, outerSegments: 64,
  startAngle: 0, outerRotation: Math.PI * 2
})
```

Options: `{ innerRadius?, outerRadius?, innerSegments?, outerSegments?, innerRotation?, outerRotation?, startAngle? }`

### polyhedron

Arbitrary 3D solid from vertices and face indices. Face vertices must be ordered consistently (default outward-facing CCW).

```typescript
// Tetrahedron
polyhedron({
  points: [[0,0,0], [10,0,0], [5,10,0], [5,5,10]],
  faces: [[0,1,2], [0,3,1], [1,3,2], [0,2,3]],
  orientation: 'outward'
})

// Colored faces
polyhedron({
  points: [[0,0,0], [10,0,0], [5,10,0], [5,5,10]],
  faces: [[0,1,2], [0,3,1], [1,3,2], [0,2,3]],
  colors: [[1,0,0], [0,1,0], [0,0,1], [1,1,0]]
})
```

Options: `{ points: Vec3[], faces: number[][], colors?: (RGB|RGBA)[], orientation?: 'outward'|'inward' }`

---

## 2D Primitives (return `Geom2`)

### circle

Filled 2D disc. Use startAngle/endAngle for pie slices.

```typescript
circle({ radius: 5 })
circle({ radius: 10, segments: 64 })
circle({ radius: 5, startAngle: 0, endAngle: Math.PI })  // half disc
```

Options: `{ center?: [x,y], radius?, startAngle?, endAngle?, segments? }`

### ellipse

2D ellipse with different radii.

```typescript
ellipse({ radius: [10, 5] })
```

Options: `{ center?: [x,y], radius?: [rx,ry], startAngle?, endAngle?, segments? }`

### square

Equal-sided 2D rectangle.

```typescript
square({ size: 10 })
```

Options: `{ center?: [x,y], size?: number }`

### rectangle

```typescript
rectangle({ size: [20, 10] })
rectangle({ size: [5, 5], center: [10, 0] })
```

Options: `{ center?: [x,y], size?: [w,h] }`

### roundedRectangle

```typescript
roundedRectangle({ size: [20, 10], roundRadius: 2, segments: 16 })
```

Options: `{ center?: [x,y], size?: [w,h], roundRadius?, segments? }`

### polygon

Arbitrary 2D polygon from points. Supports holes via nested point arrays + paths.

```typescript
// Simple polygon
polygon({ points: [[0,0], [10,0], [10,10], [5,12], [0,10]] })

// Polygon with a hole (outer CCW, inner CW via path winding)
polygon({
  points: [
    [0,0], [20,0], [20,20], [0,20],      // outer boundary (indices 0-3)
    [5,5], [15,5], [15,15], [5,15]        // inner hole (indices 4-7)
  ],
  paths: [[0,1,2,3], [7,6,5,4]]          // outer CCW, hole CW
})

// Multiple holes
polygon({
  points: [
    [0,0],[30,0],[30,30],[0,30],          // outer
    [3,3],[7,3],[7,7],[3,7],              // hole 1
    [13,13],[17,13],[17,17],[13,17]       // hole 2
  ],
  paths: [[0,1,2,3], [7,6,5,4], [11,10,9,8]]
})
```

Options: `{ points: Vec2[] | Vec2[][], paths?: number[] | number[][], orientation?: 'counterclockwise'|'clockwise' }`

### triangle

Create by specifying angle/side combinations.

```typescript
triangle({ type: 'SSS', values: [3, 4, 5] })            // right triangle
triangle({ type: 'SAS', values: [5, Math.PI / 3, 5] })   // equilateral-ish
```

Types: `'AAA'`, `'AAS'`, `'ASA'`, `'SAS'`, `'SSA'`, `'SSS'`

### star

```typescript
star({ vertices: 5, outerRadius: 10, innerRadius: 5 })
star({ vertices: 8, outerRadius: 15, innerRadius: 7, startAngle: 0 })
```

Options: `{ center?, vertices?, density?, outerRadius?, innerRadius?, startAngle? }`

---

## Path Primitives (return `Path2`)

### line

Open 2D path through given points.

```typescript
line([[0, 0], [5, 5], [10, 0]])
line([[0, 0], [0, 5], [2, 8], [5, 9]])
```

### arc

Circular arc as open 2D path.

```typescript
arc({ radius: 10, startAngle: 0, endAngle: Math.PI / 2, segments: 32 })
arc({ radius: 5, endAngle: Math.PI, makeTangent: true })
```

Options: `{ center?, radius?, startAngle?, endAngle?, segments?, makeTangent? }`

---

## Boolean Operations

All booleans work on both `Geom2` and `Geom3`. Accept variadic args or arrays.

### union — merge/add shapes

```typescript
union(cube(), sphere({ center: [1, 0, 0] }))
union([partA, partB, partC])  // array form
```

### subtract — cut/difference (MAKES HOLES)

First argument minus all subsequent. **This is the primary way to create holes.**

```typescript
import { subtract, cuboid, cylinder } from 'rensei/modeling'

// Drill a hole through a block
subtract(
  cuboid({ size: [20, 20, 5] }),
  cylinder({ height: 10, radius: 3 })
)

// Multiple holes at once
subtract(plate, hole1, hole2, hole3)
subtract(plate, ...arrayOfHoles)
```

### intersect — keep only overlap

```typescript
intersect(
  cube({ size: 10 }),
  sphere({ radius: 7 })
)
```

### scission — split disconnected pieces

Splits a geometry into separate unconnected solids. Returns `Geom3[]`.

```typescript
const pieces = scission(myComplexGeom)
```

---

## Transforms

All transforms are immutable. Accept single geometry or variadic/array. Every transform has per-axis shortcuts.

### translate

```typescript
translate([10, 0, 5], myCube)
translateX(10, myGeom)
translateY(-5, myGeom)
translateZ(20, myGeom)

// Apply to multiple geometries
translate([5, 0, 0], partA, partB, partC)
```

### rotate

Angles in **radians**. `[rx, ry, rz]` for compound rotation.

```typescript
rotate([0, 0, Math.PI / 4], myCube)           // 45 deg around Z
rotateX(Math.PI / 2, myCylinder)               // 90 deg around X
rotateY(Math.PI, myGeom)                       // 180 deg around Y
rotate([Math.PI / 6, Math.PI / 4, 0], geom)   // compound XY rotation
```

### scale

```typescript
scale([2, 1, 0.5], myCube)    // stretch X 2x, squash Z to half
scaleX(3, myGeom)
scaleY(0.5, myGeom)
```

### mirror

Reflect across a plane. Shortcuts mirror across coordinate planes.

```typescript
mirrorX(myCube)                // reflect across YZ plane (flip X)
mirrorY(myGeom)                // reflect across XZ plane (flip Y)
mirrorZ(myGeom)                // reflect across XY plane (flip Z)
mirror({ origin: [0,0,0], normal: [1,1,0] }, geom)  // custom plane
```

### center

Center geometry on specified axes.

```typescript
center({ axes: [true, true, false] }, myGeom)   // center X and Y, leave Z
centerX(myGeom)
centerY(myGeom)
centerZ(myGeom)
center({ axes: [true, true, true], relativeTo: [0, 0, 5] }, geom)
```

### align

Align geometry by min/max/center per axis.

```typescript
align({ modes: ['min', 'center', 'none'] }, myGeom)
align({ modes: ['center', 'center', 'min'], relativeTo: [0, 0, 0] }, geom)
```

Modes: `'center'`, `'min'`, `'max'`, `'none'`

---

## Extrusions (2D → 3D)

### extrudeLinear

Push a 2D shape straight up along Z axis. Optional twist.

```typescript
import { extrudeLinear, rectangle, circle, star, polygon, line } from 'rensei/modeling'

// Simple box from rectangle
extrudeLinear({ height: 10 }, rectangle({ size: [20, 10] }))

// Cylinder from circle
extrudeLinear({ height: 15 }, circle({ radius: 5 }))

// Twisted star (drill-bit shape)
extrudeLinear(
  { height: 20, twistAngle: Math.PI / 2, twistSteps: 20 },
  star({ vertices: 5, outerRadius: 5, innerRadius: 2 })
)

// Polygon with holes extruded to 3D
extrudeLinear({ height: 5 }, polygon({
  points: [[0,0],[20,0],[20,20],[0,20], [5,5],[15,5],[15,15],[5,15]],
  paths: [[0,1,2,3], [7,6,5,4]]
}))

// Can also extrude Path2 (creates a thin wall)
extrudeLinear({ height: 5 }, line([[0,0], [10,0], [10,10]]))
```

Options: `{ height?: number, twistAngle?: number, twistSteps?: number }`

### extrudeRotate

Spin a 2D shape around the Y axis (lathe operation). Creates solids of revolution.

The 2D shape must be positioned at **X > 0** (right side of Y axis). It sweeps around Y.

```typescript
import { extrudeRotate, polygon, circle, star } from 'rensei/modeling'

// Full 360-degree vase profile
extrudeRotate(
  { segments: 64 },
  polygon({ points: [[4,0],[5,0],[5,10],[4.5,12],[3,14],[3,15],[4,15]] })
)

// Torus (circle swept around Y axis)
extrudeRotate(
  { segments: 64 },
  circle({ radius: 1, center: [5, 0] })
)

// Partial revolution with cap
extrudeRotate(
  { angle: Math.PI * 0.75, segments: 32, overflow: 'cap' },
  star({ center: [3, 0] })
)
```

Options: `{ angle?: number, startAngle?: number, overflow?: 'cap', segments?: number }`

### extrudeHelical

Spiral/helix extrusion. Sweeps a 2D shape in a helix around Z axis. Perfect for springs and threads.

```typescript
import { extrudeHelical, circle } from 'rensei/modeling'

// Spring
extrudeHelical(
  { height: 20, pitch: 5, segmentsPerRotation: 32 },
  circle({ radius: 0.5, center: [3, 0] })
)

// Coil with custom angle
extrudeHelical(
  { angle: Math.PI * 4, pitch: 3, segmentsPerRotation: 32 },
  circle({ radius: 0.3, center: [5, 0] })
)
```

Options: `{ angle?, startAngle?, pitch?, height?, endOffset?, segmentsPerRotation? }`

### extrudeRectangular

Extrude a path or 2D shape outline with a rectangular cross-section (like adding a pipe/rail around a path).

```typescript
import { extrudeRectangular, line } from 'rensei/modeling'

const path = line([[0, 0], [0, 5], [2, 8], [5, 9]])
extrudeRectangular({ size: 1, height: 1 }, path)

// With rounded corners
extrudeRectangular({ size: 0.5, height: 2, corners: 'round', segments: 16 }, path)
```

Options: `{ size?, height?, corners?: 'edge'|'chamfer'|'round', segments? }`

### extrudeFromSlices

**The most powerful extrusion.** Define each cross-section slice programmatically via a callback. The callback receives `(progress, index, base)` where progress goes from 0 to 1, and must return a `slice`.

```typescript
import {
    extrudeFromSlices, slice, circle, rectangle,
    mat4, geom2
} from 'rensei/modeling'

// Square-to-circle morph
extrudeFromSlices({
  numberOfSlices: 20,
  callback: (progress, count, base) => {
    const shape = circle({ radius: 2 + 5 * progress, segments: 4 + count * count })
    let s = slice.fromSides(geom2.toSides(shape))
    s = slice.transform(
      mat4.fromTranslation(mat4.create(), [0, 0, progress * 10]),
      s
    )
    return s
  }
}, circle({ radius: 2, segments: 4 }))

// Jiggly tube with varying scale
extrudeFromSlices({
  numberOfSlices: 32,
  callback: (progress, count, base) => {
    const scaleFactor = 1 + (0.03 * Math.cos(3 * Math.PI * progress))
    const scaleMatrix = mat4.fromScaling(mat4.create(), [scaleFactor, 2 - scaleFactor, 1])
    const translateMatrix = mat4.fromTranslation(mat4.create(), [0, 0, progress * 20])
    return slice.transform(
      mat4.multiply(mat4.create(), scaleMatrix, translateMatrix),
      base
    )
  }
}, slice.fromSides(geom2.toSides(rectangle({ size: [10, 10] }))))

// Build from raw 3D points per slice (for threads, organic shapes)
extrudeFromSlices({
  numberOfSlices: 50,
  callback: (progress, index, base) => {
    const points = []
    for (let i = 0; i < 32; i++) {
      const angle = Math.PI * 2 * i / 32
      const r = 5 + Math.sin(progress * Math.PI * 4) * 2
      points.push([r * Math.cos(angle), r * Math.sin(angle), progress * 20])
    }
    return slice.fromPoints(points)
  }
}, {})
```

Options: `{ numberOfSlices?, capStart?: boolean, capEnd?: boolean, close?: boolean, callback: (progress, index, base) => Slice }`

**Slice utilities** (`slice`):

```typescript
import { slice, mat4, geom2 } from 'rensei/modeling'

slice.fromPoints(points3D)          // create slice from array of [x,y,z] points
slice.fromSides(sides)              // create slice from geom2 sides: geom2.toSides(myGeom2)
slice.transform(mat4, aSlice)       // apply 4x4 transformation matrix
slice.reverse(aSlice)               // flip winding order
slice.clone(aSlice)                 // deep copy
slice.equals(sliceA, sliceB)        // compare
```

### project

Project 3D geometry onto a 2D plane. Returns `Geom2`. Useful for creating 2D profiles from 3D shapes.

```typescript
import { project } from 'rensei/modeling'

const shadow = project({}, mySphere)    // project onto XY plane
project({ axis: [0, 1, 0], origin: [0, 0, 0] }, myGeom)  // onto XZ plane
```

Options: `{ axis?: [x,y,z], origin?: [x,y,z] }`

---

## Hull Operations

### hull

Convex hull — smallest convex shape enclosing all inputs. Like shrink-wrapping with a flat surface.

```typescript
import { hull, sphere, circle, translate, cuboid } from 'rensei/modeling'

// Smooth bridge between two spheres
hull(
  sphere({ radius: 3, center: [0, 0, 0] }),
  sphere({ radius: 2, center: [10, 0, 5] })
)

// Rounded rectangle from circles at corners
hull(
  circle({ radius: 1, center: [-5, -3] }),
  circle({ radius: 1, center: [5, -3] }),
  circle({ radius: 1, center: [5, 3] }),
  circle({ radius: 1, center: [-5, 3] })
)

// Hull of mixed 3D shapes
hull(
  translate([10, 0, 5], sphere({ radius: 2 })),
  translate([0, 10, -3], sphere({ radius: 5 })),
  cuboid({ size: [15, 17, 2], center: [5, 5, -10] })
)
```

### hullChain

Hull each consecutive pair, then union. Creates a connected chain of convex segments — perfect for smooth connections and text rendering.

```typescript
import { hullChain, sphere } from 'rensei/modeling'

// Snake-like tube through waypoints
hullChain(
  sphere({ radius: 1, center: [0, 0, 0] }),
  sphere({ radius: 1.5, center: [5, 3, 2] }),
  sphere({ radius: 1, center: [10, 0, 5] }),
  sphere({ radius: 2, center: [15, -3, 3] })
)

// Used extensively for text rendering (see Text section)
```

---

## Expansions (Grow/Shrink/Offset)

### expand

Grow or shrink geometry by a uniform distance. Works on `Path2`, `Geom2`, and `Geom3`.

- `delta > 0` → expand outward
- `delta < 0` → contract inward (**Geom2 only**)
- `corners`: `'round'`, `'chamfer'`, `'edge'`

```typescript
import { expand, cuboid, cube, rectangle, line, extrudeLinear } from 'rensei/modeling'

// Round all edges of a cuboid
expand({ delta: 1, corners: 'round', segments: 32 }, cuboid({ size: [10, 8, 4] }))

// Chamfered edges
expand({ delta: 0.5, corners: 'chamfer' }, cube({ size: 10 }))

// Shrink a 2D shape (negative delta)
expand({ delta: -2, corners: 'round', segments: 8 }, rectangle({ size: [20, 20] }))

// Turn a path into a filled shape with thickness
expand({ delta: 1.5, corners: 'round', segments: 16 }, line([[0,0], [10,5], [20,0]]))

// Turn a path into a shape, then extrude for a 3D pipe
extrudeLinear(
  { height: 5 },
  expand({ delta: 1, corners: 'round', segments: 16 }, line([[0,0], [5,5], [10,0]]))
)
```

Options: `{ delta?: number, corners?: 'round'|'chamfer'|'edge', segments?: number }`

### offset

2D only — similar to expand but returns same geometry type. Positive grows, negative shrinks.

```typescript
import { offset, circle, rectangle } from 'rensei/modeling'

offset({ delta: 2, corners: 'round', segments: 16 }, circle({ radius: 5 }))
offset({ delta: -1, corners: 'chamfer' }, rectangle({ size: [10, 10] }))
```

Options: `{ delta?, corners?: 'edge'|'chamfer'|'round', segments? }`

---

## Colors

### colorize

Apply RGBA color. Values 0 to 1. Alpha optional (defaults to 1). Returns a **new** object (immutable).

```typescript
import { colorize, cube, sphere, cylinder } from 'rensei/modeling'

colorize([1, 0, 0], cube())              // red
colorize([0, 0.5, 1, 0.7], sphere())     // semi-transparent blue
colorize([0.2, 0.8, 0.2], cylinder())    // green
```

### Color conversions

```typescript
import { colorize, colorNameToRgb, hexToRgb, hslToRgb, hsvToRgb, cube, sphere, cylinder } from 'rensei/modeling'

colorize(colorNameToRgb('steelblue'), cube())     // CSS color name
colorize(hexToRgb('#ff6600'), sphere())            // hex string
colorize(hslToRgb([0.6, 1, 0.5]), cylinder())     // HSL → RGB
colorize(hsvToRgb([0.3, 0.8, 0.9]), cube())       // HSV → RGB
```

All CSS color names are supported via `colorNameToRgb`.

### Per-part coloring

To color different parts independently, apply `colorize` to each part **separately** and return them as an **array**. Each part keeps its own color.

```typescript
import { colorize, cuboid, cylinder, translate, subtract } from 'rensei/modeling'

export function main() {
  const base = cuboid({ size: [20, 20, 5] })
  const post = translate([0, 0, 7.5], cylinder({ radius: 3, height: 10 }))
  const hole = translate([0, 0, 7.5], cylinder({ radius: 1.5, height: 11 }))
  const postWithHole = subtract(post, hole)

  return [
    colorize([0.2, 0.2, 0.8], base),         // blue base
    colorize([0.9, 0.3, 0.1], postWithHole),  // red post
  ]
}
```

**Important rules:**
- Apply colors **after** all boolean/transform operations — booleans may strip colors from inputs
- Colors are best applied as the **last step** before returning
- **STL format does not support per-part colors** — everything exports as one color. For multi-color export use 3MF, OBJ, or glTF

---

## Measurements

```typescript
import {
    cube, measureBoundingBox, measureDimensions, measureCenter,
    measureCenterOfMass, measureVolume, measureArea, measureBoundingSphere,
    measureAggregateBoundingBox, measureAggregateArea, measureAggregateVolume
} from 'rensei/modeling'

const box = cube({ size: 10 })

measureBoundingBox(box)          // [[-5,-5,-5], [5,5,5]]
measureDimensions(box)           // [10, 10, 10]
measureCenter(box)               // [0, 0, 0]
measureCenterOfMass(box)         // [0, 0, 0]
measureVolume(box)               // 1000
measureArea(box)                 // 600
measureBoundingSphere(box)       // [[cx,cy,cz], radius]

// Aggregate — across arrays of geometries
measureAggregateBoundingBox([partA, partB])
measureAggregateArea([partA, partB])
measureAggregateVolume([partA, partB])
```

---

## Modifiers

### generalize

Clean up geometry before export. Can snap, simplify, and triangulate.

```typescript
import { generalize } from 'rensei/modeling'

generalize({ snap: true, simplify: true, triangulate: true }, myGeom)
```

### snap

Snap vertices to grid to fix floating-point precision issues after complex boolean operations.

```typescript
import { snap } from 'rensei/modeling'

snap(myGeom)
```

### retessellate

Re-tessellate coplanar polygons. Useful after booleans that create co-planar faces.

```typescript
import { retessellate } from 'rensei/modeling'

retessellate(myGeom)
```

---

## Curves (Bezier)

```typescript
import { bezier } from 'rensei/modeling'

// Quadratic bezier (3 control points)
const curve2D = bezier.create([[0, 0], [5, 10], [10, 0]])

// Cubic bezier (4 control points)
const curve3D = bezier.create([[0,0,0], [3,10,0], [7,10,0], [10,0,0]])

// Higher-order (5+ control points work too)
const curve5 = bezier.create([[0,0,0], [2,5,0], [5,8,3], [8,5,0], [10,0,0]])

bezier.valueAt(0.5, curve3D)           // [x,y,z] point at t=0.5
bezier.tangentAt(0.5, curve3D)         // tangent vector at t=0.5
bezier.length(curve3D)                 // total arc length
bezier.lengths(10, curve3D)            // array of lengths at 10 intervals
bezier.arcLengthToT({}, curve3D)       // convert arc length to t parameter
```

---

## Text

JSCAD text uses vector fonts — text is rendered as line segments, not filled shapes. You need to convert the segments into filled geometry using hull operations.

```typescript
import {
    vectorText, hullChain, union, extrudeLinear,
    circle, sphere, translate
} from 'rensei/modeling'

// vectorText() returns arrays of line segment point-pairs
const segments = vectorText({ input: 'Hello', height: 10 })

// --- 2D Outline Text ---
const lineWidth = 2
const lineCorner = circle({ radius: lineWidth / 2 })
const shapes2D = segments.map(segmentPoints => {
  const corners = segmentPoints.map(pt => translate(pt, lineCorner))
  return hullChain(corners)
})
const text2D = union(shapes2D)

// --- 3D Flat Text (extruded) ---
const text3D = extrudeLinear({ height: 3 }, text2D)

// --- 3D Round Text (spherical stroke) ---
const lineCorner3D = sphere({ radius: 1, center: [0, 0, 1], segments: 16 })
const roundSegments = segments.map(segmentPoints => {
  const corners = segmentPoints.map(pt => translate(pt, lineCorner3D))
  return hullChain(corners)
})
const textRound = union(roundSegments)
```

Options for vectorText: `{ xOffset?, yOffset?, height?, lineSpacing?, letterSpacing?, align?: 'left'|'center'|'right', input?: string }`

---

## Math Utilities

Used primarily with `extrudeFromSlices` and `slice.transform`.

```typescript
import { mat4, vec3 } from 'rensei/modeling'

// Create identity matrix
mat4.create()

// Translation matrix
mat4.fromTranslation(mat4.create(), [x, y, z])

// Scaling matrix
mat4.fromScaling(mat4.create(), [sx, sy, sz])

// Rotation matrices
mat4.fromXRotation(mat4.create(), angleRadians)
mat4.fromYRotation(mat4.create(), angleRadians)
mat4.fromZRotation(mat4.create(), angleRadians)

// Multiply matrices (apply in sequence)
const combined = mat4.multiply(mat4.create(), matA, matB)

// Vec3 operations
vec3.create()                          // [0, 0, 0]
vec3.clone([1, 2, 3])
vec3.normalize(vec3.create(), [1, 2, 3])
vec3.cross(vec3.create(), vecA, vecB)
vec3.dot(vecA, vecB)

// Degrees to radians helper
const degToRad = (deg: number) => deg * Math.PI / 180
```

---

## Common Recipes

### Making Holes (subtract cylinders)

```typescript
import { cuboid, cylinder, cylinderElliptic, subtract, union } from 'rensei/modeling'

// Single hole through a plate
const plate = cuboid({ size: [30, 30, 3] })
const hole = cylinder({ height: 10, radius: 3 })
subtract(plate, hole)

// Multiple mounting holes
const mountingHoles = [[-10,-10], [10,-10], [10,10], [-10,10]].map(([x,y]) =>
  cylinder({ height: 10, radius: 2, center: [x, y, 0] })
)
subtract(plate, ...mountingHoles)

// Countersunk hole
const shaft = cylinder({ height: 20, radius: 2 })
const countersink = cylinderElliptic({
  height: 2, startRadius: [4, 4], endRadius: [2, 2], center: [0, 0, 1.5]
})
subtract(plate, union(shaft, countersink))
```

### Hollow Shell / Wall Thickness

```typescript
import { cube, cuboid, cylinder, subtract } from 'rensei/modeling'

// Hollow box (2mm wall thickness)
const outer = cube({ size: 20 })
const inner = cube({ size: 16 })    // 2mm smaller on each side
const hollowBox = subtract(outer, inner)

// Open-top container
const openBox = subtract(
  hollowBox,
  cuboid({ size: [22, 22, 5], center: [0, 0, 10] })   // cut away top
)

// Hollow cylinder (pipe)
subtract(
  cylinder({ height: 20, radius: 5 }),
  cylinder({ height: 22, radius: 4 })   // taller to fully cut through
)
```

### Rounded Edges

```typescript
import { roundedCuboid, roundedCylinder, expand, cuboid } from 'rensei/modeling'

// Built-in rounded primitives
roundedCuboid({ size: [20, 10, 5], roundRadius: 1, segments: 16 })
roundedCylinder({ height: 10, radius: 3, roundRadius: 0.5, segments: 16 })

// Or use expand on a smaller geometry for uniform rounding
expand({ delta: 1, corners: 'round', segments: 16 }, cuboid({ size: [18, 8, 3] }))

// Chamfered edges
expand({ delta: 1, corners: 'chamfer' }, cuboid({ size: [18, 8, 3] }))
```

### Screw Threads

```typescript
import { extrudeFromSlices, slice } from 'rensei/modeling'

const threads = (innerR: number, outerR: number, length: number, segments: number) => {
  const pitch = 2
  const revolutions = length / pitch
  const numSlices = 12 * revolutions

  return extrudeFromSlices({
    numberOfSlices: numSlices,
    callback: (progress, index) => {
      const points = []
      for (let i = 0; i < segments; i++) {
        const pointAngle = Math.PI * 2 * i / segments
        const threadAngle = (2 * Math.PI * revolutions * progress) % (Math.PI * 2)
        const diff = Math.abs((threadAngle - pointAngle) % (Math.PI * 2))
        const phase = (diff > Math.PI ? Math.PI * 2 - diff : diff) / Math.PI
        const r = Math.max(innerR, Math.min(outerR, innerR + (outerR - innerR) * (1.4 * phase - 0.2)))
        points.push([r * Math.cos(pointAngle), r * Math.sin(pointAngle), length * progress])
      }
      return slice.fromPoints(points)
    }
  }, {})
}

// Usage
const screwThreads = threads(4, 5.6, 32, 32)
```

### Nuts and Bolts

```typescript
import { cylinder, union, subtract, translate } from 'rensei/modeling'

// Hex head (cylinder with 6 segments = hexagon)
const hexHead = cylinder({ height: 8, radius: 10 * 1.1547, segments: 6, center: [0, 0, 4] })

// Bolt = hex head + threaded shaft
const bolt = union(
  translate([0, 0, 32], hexHead),
  threads(4, 5.6, 32, 32)
)

// Nut = hex block with threaded hole subtracted
const nut = subtract(
  cylinder({ height: 8, radius: 10 * 1.1547, segments: 6, center: [0, 0, 4] }),
  threads(4, 5.6, 8, 32)
)
```

### Extrude Along Bezier Path (Tubes)

```typescript
import {
    bezier, circle, geom2,
    extrudeFromSlices, slice, mat4
} from 'rensei/modeling'

const tubeCurve = bezier.create([[0,0,0], [5,10,5], [10,0,10], [15,5,15]])

// Create initial circular slice
const circ = circle({ radius: 1, segments: 32 })
const circPoints = geom2.toPoints(circ)
const baseSlice = slice.fromPoints(circPoints)

const tube = extrudeFromSlices({
  numberOfSlices: 60,
  capStart: true,
  capEnd: true,
  callback: (progress, count, base) => {
    const pos = bezier.valueAt(progress, tubeCurve)
    const translationMatrix = mat4.fromTranslation(mat4.create(), pos)
    return slice.transform(translationMatrix, base)
  }
}, baseSlice)
```

### Symmetry / Mirroring

```typescript
import { subtract, cuboid, cylinder, cube, sphere, union, mirrorX, mirrorY } from 'rensei/modeling'

// Build one half, mirror + union for perfect symmetry
const halfShape = subtract(
  cuboid({ size: [10, 20, 5] }),
  cylinder({ height: 10, radius: 3, center: [3, 5, 0] })
)
const fullShape = union(halfShape, mirrorX(halfShape))

// Two-axis symmetry (quarter → full)
const quarter = subtract(cube({ size: 10 }), sphere({ radius: 4, center: [3, 3, 0] }))
const half = union(quarter, mirrorX(quarter))
const full = union(half, mirrorY(half))
```

### Circular Pattern Array

```typescript
import { cylinder, subtract } from 'rensei/modeling'

const numHoles = 8
const holeRadius = 2
const patternRadius = 15

const holes = Array.from({ length: numHoles }, (_, i) => {
  const angle = (Math.PI * 2 * i) / numHoles
  return cylinder({
    height: 20,
    radius: holeRadius,
    center: [patternRadius * Math.cos(angle), patternRadius * Math.sin(angle), 0]
  })
})

const disc = cylinder({ height: 5, radius: 20, segments: 64 })
subtract(disc, ...holes)
```

### Linear Pattern Array

```typescript
import { cuboid, subtract } from 'rensei/modeling'

const slots = Array.from({ length: 5 }, (_, i) =>
  cuboid({ size: [2, 10, 10], center: [-8 + i * 4, 0, 0] })
)
subtract(cuboid({ size: [30, 15, 5] }), ...slots)
```

### Embossed / Engraved Text

```typescript
import {
    cuboid, vectorText, circle, translate,
    hullChain, union, extrudeLinear, subtract
} from 'rensei/modeling'

// Engrave text into a surface
const surface = cuboid({ size: [50, 15, 3] })
const textSegments = vectorText({ input: 'JSCAD', height: 8 })
const textShapes = textSegments.map(seg => {
  const corners = seg.map(pt => translate(pt, circle({ radius: 0.5 })))
  return hullChain(corners)
})
const text2D = union(textShapes)
const text3D = extrudeLinear({ height: 1 }, text2D)
const positioned = translate([-20, -4, 1.5], text3D)

const engraved = subtract(surface, positioned)       // cut into surface
// const embossed = union(surface, positioned)        // raise above surface
```

### Lofting Between Profiles

```typescript
import { extrudeFromSlices, slice, circle, mat4, geom2 } from 'rensei/modeling'

// Square at bottom → circle at top
extrudeFromSlices({
  numberOfSlices: 30,
  callback: (progress, count) => {
    const sides = Math.round(4 + progress * 28)     // 4 → 32 sides
    const r = 5 + progress * 3
    const shape = circle({ radius: r, segments: sides })
    let s = slice.fromSides(geom2.toSides(shape))
    return slice.transform(
      mat4.fromTranslation(mat4.create(), [0, 0, progress * 15]),
      s
    )
  }
}, circle({ radius: 5, segments: 4 }))
```

### Lathe / Vase / Wine Glass

Define a profile polygon (right-side silhouette) and revolve it:

```typescript
import { polygon, extrudeRotate } from 'rensei/modeling'

const profile = polygon({ points: [
  [0, 0], [3, 0], [3, 0.5], [0.5, 0.5],      // base
  [0.5, 5], [0.3, 5.5], [0.3, 8],             // stem
  [0.5, 8.5], [3, 10], [3.5, 12],             // bowl outer
  [3.2, 12], [2.8, 10], [0.3, 8.5], [0, 8.5]  // bowl inner wall
]})

const glass = extrudeRotate({ segments: 64 }, profile)
```

### Snap-Fit Joints

```typescript
import { union, subtract, cuboid } from 'rensei/modeling'

// Cantilever snap hook
const hook = union(
  cuboid({ size: [2, 1, 10], center: [0, 0, 5] }),
  cuboid({ size: [2, 1, 2], center: [0, 0.75, 10.5] })
)

// Matching socket
const socket = subtract(
  cuboid({ size: [4, 3, 12], center: [0, 0, 6] }),
  cuboid({ size: [2.2, 1.2, 11], center: [0, 0, 5.5] }),
  cuboid({ size: [2.2, 1.8, 2.2], center: [0, 0.3, 10.5] })
)
```

### Gear (Approximation)

```typescript
import { extrudeLinear, polygon } from 'rensei/modeling'

const gear = (teeth: number, mod: number, thickness: number) => {
  const pitchR = mod * teeth / 2
  const outerR = pitchR + mod
  const innerR = pitchR - 1.25 * mod
  const toothAngle = Math.PI * 2 / teeth
  const points = []

  for (let i = 0; i < teeth; i++) {
    const a = i * toothAngle
    points.push([innerR * Math.cos(a - toothAngle * 0.4), innerR * Math.sin(a - toothAngle * 0.4)])
    points.push([outerR * Math.cos(a - toothAngle * 0.15), outerR * Math.sin(a - toothAngle * 0.15)])
    points.push([outerR * Math.cos(a + toothAngle * 0.15), outerR * Math.sin(a + toothAngle * 0.15)])
    points.push([innerR * Math.cos(a + toothAngle * 0.4), innerR * Math.sin(a + toothAngle * 0.4)])
  }
  return extrudeLinear({ height: thickness }, polygon({ points }))
}

// 20-tooth gear, module 2, 5mm thick
const myGear = gear(20, 2, 5)
```

---

## Designing for 3D Printing

JSCAD's CSG operations **guarantee watertight meshes** — every `union`, `subtract`, `intersect` produces a valid closed solid by construction. The STL serializer also auto-applies `snap` + `triangulate` before export, removing degenerate polygons. So mesh validity is rarely an issue.

The real challenges are **physical printability**: wall thickness, overhangs, tolerances, orientation, and bed adhesion. This section covers how to design JSCAD models that actually print well.

### Wall Thickness

Every wall, shell, and feature must have minimum physical thickness or the printer can't form it.

| Technology | Minimum | Recommended |
|---|---|---|
| FDM (0.4mm nozzle) | 0.8mm (2 perimeters) | 1.2mm+ (3 perimeters) |
| Resin (SLA/MSLA) | 0.3mm | 0.5mm+ |
| SLS (nylon) | 0.7mm | 1.0mm+ |

```typescript
import { cylinder, subtract } from 'rensei/modeling'

// BAD: 0.4mm wall — too thin for FDM
const thinPipe = subtract(
  cylinder({ height: 20, radius: 5 }),
  cylinder({ height: 22, radius: 4.8 })  // 5 - 4.8 = 0.2mm wall
)

// GOOD: 1.2mm wall — solid on FDM
const thickPipe = subtract(
  cylinder({ height: 20, radius: 5 }),
  cylinder({ height: 22, radius: 3.8 })  // 5 - 3.8 = 1.2mm wall
)

// Verify wall thickness programmatically
const outerR = 5
const innerR = 3.8
const wallThickness = outerR - innerR  // 1.2mm ✓
console.log(`Wall thickness: ${wallThickness}mm`)
```

**Don't over-thickness.** Thicker isn't always better — it wastes material and print time:

| Purpose | Recommended wall |
|---|---|
| Non-structural shells (funnels, shrouds) | 1.5–2mm |
| General structural walls | 2–3mm |
| Walls for thread engraving/tapping | 2.5–3mm |
| Heavy-duty load-bearing | 3–4mm |

```typescript
// BAD: 6mm wall "just in case" — wastes 3x the material
const overbuilt = subtract(
  cylinder({ height: 20, radius: 25 }),
  cylinder({ height: 22, radius: 19 })  // 6mm wall
)

// GOOD: 2mm wall — sufficient for a water funnel
const efficient = subtract(
  cylinder({ height: 20, radius: 25 }),
  cylinder({ height: 22, radius: 23 })  // 2mm wall
)
```

For hollow boxes, remember thickness applies to **every side**:

```typescript
import { cuboid, subtract, measureDimensions } from 'rensei/modeling'

// 2mm walls on all sides of a box
const wallT = 2
const outer = [30, 20, 15]
const inner = [outer[0] - wallT * 2, outer[1] - wallT * 2, outer[2] - wallT * 2]

const hollowBox = subtract(
  cuboid({ size: outer }),
  cuboid({ size: inner })
)

// Verify with measurements
const dims = measureDimensions(hollowBox)
console.log(`Outer: ${dims}`)  // [30, 20, 15]
```

### Flat Bottom & Build Plate Contact

Models need a flat base sitting at Z=0 for proper bed adhesion. Use `align` to place the bottom on the build plate.

```typescript
import { align, translateZ, measureBoundingBox } from 'rensei/modeling'

// Place bottom of any geometry at Z=0
const onBed = align({ modes: ['center', 'center', 'min'], relativeTo: [0, 0, 0] }, myGeom)

// Or use translateZ after measuring
const bbox = measureBoundingBox(myGeom)
const onBed2 = translateZ(-bbox[0][2], myGeom)  // shift bottom to Z=0
```

Add a base flange to improve adhesion and reduce warping on large prints:

```typescript
import { cuboid, align, union } from 'rensei/modeling'

// Add a 0.4mm chamfered brim around the base
const part = cuboid({ size: [30, 20, 15] })
const partOnBed = align({ modes: ['center', 'center', 'min'] }, part)

// Thin flange extending 3mm around the base footprint
const flange = cuboid({ size: [36, 26, 0.4] })
const flangeOnBed = align({ modes: ['center', 'center', 'min'] }, flange)

const printReady = union(partOnBed, flangeOnBed)
```

### Overhangs & the 45° Rule

FDM printers can't print in mid-air. Any surface angled more than **45° from vertical** (i.e., less than 45° from horizontal) needs support material or will print poorly.

```
       ╱ 0° overhang (vertical wall) — always fine
      ╱
     ╱  45° overhang — maximum self-supporting angle
    ╱
   ╱    60° overhang — needs support
  ╱
 ╱      90° overhang (horizontal ceiling) — needs support
```

**Design self-supporting overhangs** using chamfers and tapers instead of sharp 90° ledges:

```typescript
import { cuboid, union, extrudeLinear, polygon, rotateX, translate } from 'rensei/modeling'

// BAD: 90° overhang — sharp horizontal shelf needs supports
const sharpShelf = union(
  cuboid({ size: [10, 10, 20], center: [0, 0, 10] }),   // column
  cuboid({ size: [20, 10, 3], center: [5, 0, 21.5] })   // shelf sticking out
)

// GOOD: 45° chamfer transition — self-supporting
const column = cuboid({ size: [10, 10, 20], center: [0, 0, 10] })
const shelf = cuboid({ size: [20, 10, 3], center: [5, 0, 24.5] })
// Triangular support under the shelf at 45°
const chamfer = extrudeLinear(
  { height: 10 },
  polygon({ points: [[5, 0], [5, 5], [10, 5]] })
)
const chamferBlock = rotateX(Math.PI / 2,
  translate([0, 5, 0], chamfer)
)
const selfSupporting = union(column, shelf, translate([0, 0, 18], chamferBlock))
```

**Tapered cylinders** are better than sharp overhangs:

```typescript
import { cylinder, cylinderElliptic, union } from 'rensei/modeling'

// BAD: cylinder floating above a post — 90° overhang underneath
const bad = union(
  cylinder({ height: 20, radius: 3, center: [0, 0, 10] }),
  cylinder({ height: 5, radius: 8, center: [0, 0, 22.5] })
)

// GOOD: tapered transition at 45°
const post = cylinder({ height: 20, radius: 3, center: [0, 0, 10] })
const taper = cylinderElliptic({
  height: 5, startRadius: [3, 3], endRadius: [8, 8], center: [0, 0, 22.5]
})
const cap = cylinder({ height: 5, radius: 8, center: [0, 0, 27.5] })
const good = union(post, taper, cap)
```

### Conical Overhangs Are More Forgiving

The 45° rule applies primarily to flat/rectangular overhangs. **Circular and conical surfaces** can handle steeper angles because each layer is a complete circle slightly wider than the previous — the printer lays down a full ring with only a tiny unsupported extension per layer.

```
Flat overhang at 60°:     Conical overhang at 60°:
     ┌────────┐                 /‾‾‾\
     │  FAIL  │                / OK  \
─────┘        └─────      ────/       \────

Each layer jumps            Each layer is a full
a large unsupported         circle, only ~0.5mm
distance at once            wider than the previous
```

Rules of thumb:
- **Flat overhangs**: max ~45° from vertical (the standard rule)
- **Conical/circular overhangs**: up to ~65–70° from vertical works fine
- A funnel cone printing narrow-end-down is self-supporting even at steep angles
- Each layer extends only `(radius_change / height) × layer_height` beyond the previous

```typescript
// This funnel has a 66° overhang from vertical — too steep for a flat shelf,
// but prints fine as a cone because each circular layer only extends 0.45mm
// beyond the previous (at 0.2mm layer height)
const funnel = extrudeRotate({ segments: 64 }, polygon({ points: [
  [6, 0],     // narrow end (on build plate)
  [9, 12],    // base of cone
  [30, 20],   // wide end — 24mm radius increase over 8mm height
  [28, 20],   // inner wall
  [7, 12],    // inner slope
  [4.5, 12],  // through-hole
  [4.5, 0],   // hole bottom
]}))
```

### Bridging

Horizontal spans between two supports (bridges) work up to ~10mm on FDM without supports. Beyond that, add design features:

```typescript
import { cuboid, union } from 'rensei/modeling'

// Short bridge — fine without supports (8mm span)
const supports = union(
  cuboid({ size: [5, 5, 20], center: [-6.5, 0, 10] }),
  cuboid({ size: [5, 5, 20], center: [6.5, 0, 10] })
)
const bridge = cuboid({ size: [18, 5, 2], center: [0, 0, 21] })
const shortBridge = union(supports, bridge)  // 8mm unsupported span ✓

// Long bridge — add a middle support column
const midSupport = cuboid({ size: [3, 5, 20], center: [0, 0, 10] })
const longBridge = union(supports, midSupport, bridge)
```

### Tolerances & Fit

3D printers aren't perfectly precise. Parts expand slightly (FDM) or shrink slightly (resin). Add clearance for parts that fit together.

| Fit Type | Gap per side | Use case |
|---|---|---|
| Loose / sliding | 0.3–0.5mm | Lids, sliding joints |
| Snug | 0.15–0.25mm | Snap-fit, friction fit |
| Press fit | 0.05–0.1mm | Bearings, permanent joints |
| Threaded holes | +0.2mm to nominal | Bolts, screws |

```typescript
import { cuboid, cylinder, union, subtract } from 'rensei/modeling'

// Male/female peg with clearance for sliding fit
const pegRadius = 4
const clearance = 0.3  // per side

// Male peg
const peg = union(
  cuboid({ size: [20, 20, 5] }),                                    // base plate
  cylinder({ height: 10, radius: pegRadius, center: [0, 0, 10] })  // peg
)

// Female socket (hole is larger by clearance on each side)
const socket = subtract(
  cuboid({ size: [20, 20, 15], center: [0, 0, 7.5] }),
  cylinder({ height: 12, radius: pegRadius + clearance, center: [0, 0, 10] })
)

// Rectangular slot with clearance
const slotWidth = 10
const slotDepth = 3
const tab = cuboid({ size: [slotWidth, slotDepth, 5] })
const slot = cuboid({ size: [slotWidth + clearance * 2, slotDepth + clearance * 2, 6] })
```

**Screw holes** — always print larger than nominal thread diameter:

```typescript
import { cylinder } from 'rensei/modeling'

// M3 screw hole (nominal 3mm diameter)
// Print at 3.4mm for easy threading
const m3Hole = cylinder({ height: 20, radius: (3 + 0.4) / 2 })

// M3 clearance hole (bolt passes through without threading)
const m3Clearance = cylinder({ height: 20, radius: (3.4 + 0.4) / 2 })

// Common FDM screw hole sizes
const screwHoles = {
  M2: { thread: 2.4, clearance: 2.6 },  // diameter in mm
  M3: { thread: 3.4, clearance: 3.6 },
  M4: { thread: 4.5, clearance: 4.8 },
  M5: { thread: 5.5, clearance: 5.8 },
}
```

### Print Orientation & Layer Strength

FDM prints are **weakest along the Z axis** (layer adhesion). Layers bond thermally — they're never as strong as within a single layer.

```
Layer lines →  ════════  Strong in X/Y (within layer)
               ════════
               ════════  Weak in Z (between layers)
               ════════
```

Design rules:
- **Load-bearing features** should have layers perpendicular to the load
- **Snap-fit hooks** should flex along X/Y, not peel apart layers in Z
- **Cylindrical parts under pressure** (pipes, funnels, nozzles): print with axis vertical so hoop stress (radial expansion) stays within the XY layer plane (strong direction). Printing sideways puts hoop stress across layers → delamination under pressure
- **Horizontal round holes** deform into ovals — use **teardrop** shapes for accuracy:

```typescript
import {
    circle, polygon, union, rotateX,
    extrudeLinear, cuboid, subtract, translate
} from 'rensei/modeling'

// Standard round hole — deforms when printed horizontally
const roundHole = rotateX(Math.PI / 2, cylinder({ height: 20, radius: 3 }))

// Teardrop hole — self-supporting, accurate diameter when printed horizontally
// Flat bottom + 45° pointed top replaces the unsupported upper arc
const teardropHole = (radius: number, depth: number) => {
  const bottom = circle({ radius })
  // Add a 45° diamond point at the top to avoid overhang
  const topPoint = polygon({
    points: [
      [-radius, 0],
      [0, radius],   // 45° point
      [radius, 0]
    ]
  })
  const profile = union(bottom, topPoint)
  return rotateX(Math.PI / 2, extrudeLinear({ height: depth }, profile))
}

const plate = cuboid({ size: [30, 10, 20] })
const withTeardrop = subtract(plate, translate([0, 0, 10], teardropHole(3, 12)))
```

### Print-in-Place Joints

Hinges and ball joints that print fully assembled need generous clearance so layers don't fuse together.

```typescript
import { sphere, cylinder, union, subtract } from 'rensei/modeling'

// Print-in-place ball and socket joint
const ballR = 5
const socketR = ballR + 0.4         // 0.4mm clearance all around
const socketWall = 1.5

// Ball on a stem
const ball = union(
  sphere({ radius: ballR, segments: 32 }),
  cylinder({ height: 10, radius: 2, center: [0, 0, -7.5] })
)

// Socket — sphere cutout with entry slot for print-in-place
const socketOuter = sphere({ radius: socketR + socketWall, segments: 32 })
const socketCutout = sphere({ radius: socketR, segments: 32 })
// Opening at top so the socket can be printed around the ball
const opening = cylinder({ height: 20, radius: ballR * 0.6, center: [0, 0, 5] })
const socket = subtract(socketOuter, socketCutout, opening)

// Print-in-place hinge pin
const hingePin = (pinR: number, clearance: number, length: number) => {
  const pin = cylinder({ height: length, radius: pinR, segments: 32 })
  const housing = subtract(
    cylinder({ height: length, radius: pinR + clearance + 1.5, segments: 32 }),
    cylinder({ height: length + 2, radius: pinR + clearance, segments: 32 })
  )
  return [pin, housing]  // print together
}
```

### Verifying Before Export

Use JSCAD's measurement functions to sanity-check your model before slicing.

```typescript
import {
    measureBoundingBox, measureDimensions, measureVolume,
    measureArea, generalize
} from 'rensei/modeling'

const model = myComplexAssembly()

// Check overall size — does it fit your print bed?
const bbox = measureBoundingBox(model)
const dims = measureDimensions(model)
console.log(`Size: ${dims[0].toFixed(1)} x ${dims[1].toFixed(1)} x ${dims[2].toFixed(1)} mm`)
console.log(`Bounding box: [${bbox[0].map(v => v.toFixed(1))}] to [${bbox[1].map(v => v.toFixed(1))}]`)

// Check volume — sanity check (should be > 0 for a valid solid)
const vol = measureVolume(model)
console.log(`Volume: ${vol.toFixed(1)} mm³`)
if (vol <= 0) console.warn('WARNING: Zero or negative volume — geometry may be inside-out')

// Check surface area
const area = measureArea(model)
console.log(`Surface area: ${area.toFixed(1)} mm²`)

// Check bottom is at Z=0 for bed adhesion
if (bbox[0][2] > 0.01) console.warn('WARNING: Model floating above Z=0 — use align() to place on bed')
if (bbox[0][2] < -0.01) console.warn('WARNING: Model below Z=0 — bottom will be clipped')

// Clean up geometry before export
const cleaned = generalize({ snap: true, simplify: true, triangulate: true }, model)
```

### Segment Count vs File Size

Higher `segments` values create smoother curves but larger STL files. The slicer re-slices anyway, so extremely high segments are wasted. Use the minimum that looks smooth enough.

| Shape | Segments | Use case |
|---|---|---|
| Small holes (<5mm) | 16–24 | Barely visible facets |
| Medium curves | 32 | Good default |
| Large visible arcs | 48–64 | Smooth finish |
| Decorative/cosmetic | 64–128 | Only when surface quality matters |

```typescript
import { cylinder, sphere } from 'rensei/modeling'

// Default segments (32) — good for most parts
cylinder({ height: 10, radius: 5 })

// Low segments for small hidden holes (saves file size & boolean speed)
const smallHole = cylinder({ height: 10, radius: 1.5, segments: 16 })

// High segments only for large visible curves
const smoothDome = sphere({ radius: 20, segments: 64 })
```

### Simplify for Printing — Strip Non-Functional Features

When reverse-engineering a physical part (especially machined metal), most visible features are **manufacturing artifacts**, not functional requirements. Concentric stepped rings, decorative grooves, scalloped surfaces — these exist because of how metal lathes and CNC mills work, not because the part needs them.

**Always ask: "What does this part actually DO?"** Then model only the function.

```typescript
// BAD: faithfully replicating every machining ring from the metal original
// Result: 5x the polygons, 3x the material, zero functional benefit
const overEngineered = extrudeRotate({ segments: 64 }, polygon({ points: [
  // ... 40 points tracing every decorative step and groove
]}))

// GOOD: simplified to the actual function (funnel from wide to narrow)
const functional = extrudeRotate({ segments: 64 }, polygon({ points: [
  [9, 0],     // nozzle tip
  [12, 12],   // nozzle base
  [30, 20],   // funnel outer
  [30, 28],   // mounting cylinder
  [28, 28],   // cylinder inner
  [28, 20],   // funnel inner
  [7, 12],    // nozzle inner
  [7, 0],     // through-hole
]}))
```

Key principles:
- **Thin-walled shells** instead of solid bodies — massive weight/material savings
- **Smooth cones** instead of stepped rings — fewer polygons, better print quality
- **Skip decorative grooves** — they don't improve function and may weaken the print
- **Uniform wall thickness** — simpler to print, easier to reason about strength

### Spaghetti Failures — Sudden Cross-Section Expansion

"Spaghetti" is when the printer extrudes filament into thin air and it falls instead of sticking. The most common cause is a **sudden large cross-section expansion** — a narrow base transitioning to a much wider surface with no support below it.

```
SPAGHETTI EXAMPLE — funnel printed narrow-end-down:

  Z=28 ──── nozzle tip  Ø18mm  ← prints fine
  Z=16 ──── nozzle base Ø32mm  ← prints fine
  Z=8  ──── funnel WIDE Ø60mm  ← SPAGHETTI: each layer jumps 14mm outward
                                   with nothing below to support it
  Z=0  ──── bed
```

**The 45° rule applies to the expansion rate**, not just the angle. A flat shelf at 89° will fail. A conical expansion at 66° may work fine (see *Conical Overhangs Are More Forgiving*).

**Fix strategies:**

1. **Flip the model** — print wide-end-down so the wide base has bed contact and the narrow end builds up from it
2. **Add a taper/chamfer** — replace 90° ledges with ≤45° slopes
3. **Use supports** — only as a last resort; design them out when possible

```typescript
// BAD: wide disc printed narrow-end-down → spaghetti at the funnel transition
// GOOD: flip so the wide mounting cylinder sits flat on the bed, nozzle points up
const flipped = mirrorZ(body)   // flip orientation
return align({ modes: ['center', 'center', 'min'] }, flipped)

// Or just build the profile in the correct direction from the start:
// bed (Y=0) = wide end, top (Y=max) = narrow nozzle
```

### Choosing Print Orientation

Orientation is the single most impactful decision for printability. Ask these questions in order:

**1. What's the largest flat surface?** → Put it on the bed. Large flat bottom = best adhesion, no warping.

**2. Where are the overhangs?** → Overhangs should face upward (away from the bed), never downward into thin air.

**3. What are the load directions?** → FDM is weakest in Z (between layers). Orient so forces act within XY layers, not across them.

**4. Are there internal features?** → Every internal feature must build upward from the bed, not hang from the ceiling.

```
ORIENTATION DECISION TREE:

  Does it have a large flat face?
  ├─ YES → Put that face on the bed (ideal)
  └─ NO  → Find the face with best area coverage

  Are there steep overhangs (>45°)?
  ├─ NO  → Current orientation is probably fine
  └─ YES → Can you flip/rotate to eliminate them?
           ├─ YES → Do it (flip the model)
           └─ NO  → You'll need supports

  Are there internal features (filter stubs, bosses, ribs)?
  ├─ Connect to BED or build from floor up → printable ✓
  └─ Hang from ceiling or start mid-air → cantilever, needs supports or redesign

  Will it be under load?
  └─ Orient so load is parallel to layer lines, not peeling layers apart
```

**For cylindrical parts** (funnels, pipes, nozzles): always print with the cylinder axis **vertical** (along Z). This puts hoop stress within the strong XY plane. Printing sideways puts hoop stress across layers → delamination under pressure.

### extrudeRotate Profile Polygon — Avoid Self-Intersection

`extrudeRotate` revolves a 2D cross-section profile around the Y axis. If the profile polygon **self-intersects**, it creates two disconnected bodies instead of one — the slicer will flag parts as floating even though the JSCAD geometry looks correct.

**The most common cause**: outer and inner funnel slopes traced in antiparallel directions so they cross each other.

```
WRONG — outer and inner slopes cross (antiparallel):
  outer: (30,8) → (12,16)   ↘  direction: (-18, +8)
  inner: (11.5,16) → (28,8)  ↗  direction: (+16.5, -8)
  These lines INTERSECT at ~(20, 12) → two disconnected bodies!

RIGHT — outer and inner slopes are parallel (same direction):
  outer: (30,8) → (16,16)   direction: (-14, +8)
  inner: (14,16) → (28,8)   direction: (+14, -8) ← ANTIPARALLEL but...
  Check: t+s equations give 8/7 ≠ 1 → NO intersection ✓
```

To verify: parametrize both segments as `A + t*(B-A)` and `C + s*(D-C)`, set equal, solve for `t` and `s`. If both are in `[0,1]` they intersect. If the system has no solution or requires `t` or `s` outside `[0,1]`, they don't.

**Also watch for overlapping horizontal segments** at the same Y level. If two floor segments at the same height share an X range, the polygon is degenerate. Keep floor segments at the same Y in non-overlapping X ranges.

**Sizing rule**: if a feature (like a filter cylinder) sits inside a funnel, it must fit inside the funnel inner wall:
```
filterOuterRadius < nozzleBaseRadius - wall
```
If not, increase `nozzleBaseRadius` until it fits, or reduce the feature size.

### Bambu Studio P1S — Parameter Reference

These are the exact parameter names as they appear in **Bambu Studio → Process** (enable **Advanced** toggle to see all of them). Parameters are grouped by impact level.

#### Quality tab

| Parameter | Default | Impact | What to change |
|---|---|---|---|
| **Layer height** | 0.2mm | ★★★ Critical | Lower (0.16mm) for smoother curves/threads; keep 0.2mm for speed |
| **Initial layer height** | 0.2mm | ★★ Medium | Leave at 0.2mm; thicker initial layer helps adhesion |
| **Seam position** | Aligned | ★ Minor | `Aligned` = seam in one spot; `Nearest` = less visible but scattered |
| **Only one wall on top surfaces** | Top surfaces | ★ Minor | Leave default |
| **Only one wall on first layer** | Off | ★ Minor | Leave off |

#### Strength tab — Walls

| Parameter | Default | Impact | What to change |
|---|---|---|---|
| **Wall loops** | 2 | ★★★ Critical | Increase to **3–4** for functional parts, threading surfaces |
| **Embedding the wall into the infill** | Off | ★ Minor | Leave off |

#### Strength tab — Top/bottom shells

| Parameter | Default | Impact | What to change |
|---|---|---|---|
| **Top shell layers** | 5 | ★★ Medium | 5 is good; reduce to 3 for faster non-visible tops |
| **Top shell thickness** | 1mm | ★★ Medium | Tied to layer height × top shell layers |
| **Bottom shell layers** | 3 | ★★ Medium | Increase to 4–5 if bottom needs to be watertight |
| **Top surface pattern** | Monotonic | ★ Minor | Monotonic = smooth; leave default |
| **Bottom surface pattern** | Monotonic | ★ Minor | Leave default |
| **Internal solid infill pattern** | Rectilinear | ★ Minor | Leave default |

#### Strength tab — Sparse infill

| Parameter | Default | Impact | What to change |
|---|---|---|---|
| **Sparse infill density** | 15% | ★★★ Critical | 15% = lightweight; 25–30% for functional/structural parts; 40%+ for maximum strength |
| **Sparse infill pattern** | Grid | ★★ Medium | **Gyroid** = stronger + better filament/strength ratio; Grid = faster |
| **Fill multiline** | 1 | ★ Minor | Leave default |

#### Support tab

| Parameter | Default | Impact | What to change |
|---|---|---|---|
| **Enable support** | Off | ★★★ Critical | Only enable if model truly needs it — always try to orient without |
| **Type** | tree(auto) | ★★★ Critical | `tree(auto)` = less material, easier to remove; use for most prints |
| **Threshold angle** | 30° | ★★★ Critical | **30° is very aggressive** (generates lots of support). Raise to **45–50°** for less support on gradual overhangs. The P1S default is 30° |
| **On build plate only** | Off | ★★ Medium | **Enable** — prevents supports from touching model surfaces and scarring them |

#### Others tab — Bed adhesion

| Parameter | Default | Impact | What to change |
|---|---|---|---|
| **Brim type** | Auto | ★★ Medium | `Auto` adds brim when needed. Set `None` if part has good bed contact; `Outer brim only` for large flat parts that warp |
| **Brim width** | 5mm | ★ Minor | Leave at 5mm |
| **Skirt loops** | 0 | ★ Minor | Add 1–2 skirt loops to prime the nozzle before the print starts |

#### Others tab — Special mode

| Parameter | Default | Impact | What to change |
|---|---|---|---|
| **Spiral vase** | Off | ★★ Medium | Single continuous spiral wall — for vases/cups with no top. Ignores infill/shells |
| **Fuzzy Skin** | None | ★ Minor | Adds textured surface — cosmetic only, leave off for functional parts |
| **Print sequence** | By layer | ★ Minor | Leave default unless printing multiple objects |

---

### What to Actually Change vs Leave Alone

**Change these first — biggest impact on print success:**

```
Layer height        → 0.2mm default is fine; 0.16mm for threads/fine detail
Wall loops          → bump to 3 (default 2 is borderline for functional parts)
Sparse infill density → 15% default OK for decorative; 25% for functional
Threshold angle     → raise from 30° to 45° (default 30° generates too much support)
Enable support      → OFF unless you verified the model actually needs it
On build plate only → ON if you must use supports
```

**Leave these alone unless you have a specific problem:**

```
Seam position       → Aligned is fine
Top/bottom shells   → defaults are good
Infill pattern      → Grid works; switch to Gyroid only if you need more strength
Brim type           → Auto handles itself
Sparse infill pattern → Grid default is fine for most prints
Initial layer height → don't change
```

**The "floating cantilever" warning** in Bambu Studio means a feature is geometrically connected to the rest of the model but builds mid-air in the chosen orientation. This is different from a slicer overhang — it's a structural topology issue. Fix by:
- Flipping the model (most common fix)
- Connecting the feature to the bed via the model geometry
- Checking for self-intersecting profile polygons in `extrudeRotate` models (they produce disconnected bodies that look connected in 3D preview but aren't)

**How Bambu Studio auto-detects support regions:**
1. It analyzes each layer and finds surfaces with no layer below them
2. Any surface exceeding the **Threshold angle** gets flagged (P1S default is 30° — very aggressive)
3. Support structures of the chosen **Type** are generated below flagged regions

**When supports are unavoidable vs when to redesign:**

```
USE SUPPORTS when:
  - The overhang is a small feature (<10mm) that can't be redesigned
  - The part is complex and redesigning takes longer than removing supports

REDESIGN INSTEAD when:
  - A simple flip/rotate eliminates the overhang
  - The overhang is large (>20mm) → supports leave bad surface finish
  - The part is functional/sealing (supports leave rough surfaces that leak or bind)
  - Internal supports are impossible to remove
```

### Internal Features Must Print Bottom-Up

Even if your model is geometrically one solid piece, the slicer builds it layer-by-layer from Z=0 upward. Any feature inside a cavity that starts mid-air will be flagged as a "floating cantilever."

```
WRONG — filter stub hangs from ceiling:     RIGHT — filter stub builds from floor:

  ┌──────────────┐  bed                      nozzle tip (top)
  │   ┌──┐       │  ← stub starts here,        │  │
  │   │  │       │     nothing below it       ┌─┘  └─┐  ← stub builds upward
  │   └──┘       │                            │      │     from solid floor ✅
  │       funnel │                         ───┘      └───
  └──────┬───────┘                         ═══════════════  bed
         │ nozzle
```

Rules:
- At every Z layer, every feature must have solid material or bridgeable gap below it
- When choosing print orientation, trace the build path of **every internal feature** bottom-up
- If an internal boss or tube would start mid-air, flip the model or redesign the connection
- A feature connected to the ceiling but not the floor is structurally sound but **unprintable without supports**

### Pre-Export Checklist

| Check | How to verify | Fix |
|---|---|---|
| Wall thickness ≥ 0.8mm | Compute outer - inner dimensions | Increase inner offset |
| Walls not too thick | Check no wall exceeds 4mm without reason | Reduce to 2–3mm for most features |
| Flat bottom at Z=0 | `measureBoundingBox()[0][2] === 0` | `align({ modes: ['center','center','min'] })` |
| No floating parts | Ensure all parts are `union()`'d | `union(partA, partB, ...)` |
| No internal cantilevers | Every internal feature builds from floor up | Flip orientation or redesign |
| No self-intersecting profile | Check `extrudeRotate` slopes are non-crossing | Verify parametric intersection test |
| Feature sizing consistent | `filterRadius < nozzleInner - wall` | Increase nozzle radius or shrink feature |
| Spaghetti risk checked | No sudden large cross-section expansion | Flip model or add taper |
| Volume > 0 | `measureVolume(model) > 0` | Check boolean order, normals |
| Fits print bed | `measureDimensions()` < bed size | `scale()` down |
| Reasonable file size | `segments` not excessive | Use 32 default, 16 for small features |
| Clean mesh | Apply `generalize()` before export | `generalize({ snap: true, triangulate: true })` |
| Oriented for strength | Load perpendicular to layer lines | Rotate model or redesign |
| Pressure parts vertical | Hoop stress within XY plane | Print cylindrical axis along Z |
| Only functional features | No decorative machining artifacts | Simplify to thin-walled shells |

---

## Quick Decision Table

| Goal | Method |
|---|---|
| Make a hole | `subtract(solid, cylinder)` |
| Combine parts | `union(a, b, c)` |
| Keep only overlap | `intersect(a, b)` |
| Round edges | `roundedCuboid` or `expand({ corners: 'round' })` |
| Hollow out | `subtract(outer, smaller_inner)` |
| 2D → 3D straight | `extrudeLinear({ height }, geom2D)` |
| 2D → 3D with twist | `extrudeLinear({ height, twistAngle, twistSteps })` |
| Lathe / revolve | `extrudeRotate({ segments }, profile2D)` |
| Spiral / helix | `extrudeHelical({ height, pitch })` |
| Morph between shapes | `extrudeFromSlices({ callback })` |
| Connect shapes smoothly | `hull(a, b)` or `hullChain(a, b, c)` |
| Create 3D text | `vectorText` → `hullChain` → `extrudeLinear` |
| Pattern array (circular) | loop with trig → `translate` → `union`/`subtract` |
| Pattern array (linear) | loop → `translate` → `union`/`subtract` |
| Mirror symmetry | `mirrorX/Y/Z` + `union` |
| Grow/shrink shape | `expand({ delta })` |
| Measure size | `measureBoundingBox`, `measureDimensions` |
| Spring/thread | `extrudeFromSlices` with angle-based radius |
| Cone | `cylinderElliptic({ startRadius: [r,r], endRadius: [0.01, 0.01] })` |
| Pipe | `subtract(cylinder(r_outer), cylinder(r_inner))` |
| Hexagonal prism | `cylinder({ segments: 6 })` |
