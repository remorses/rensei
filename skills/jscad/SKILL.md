---
name: jscad
description: >
  JSCAD (OpenJSCAD) 3D modeling with @jscad/modeling. Constructive Solid Geometry (CSG) in JavaScript.
  Covers all primitives (cube, sphere, cylinder, polygon, etc.), boolean operations (union, subtract,
  intersect), transforms (translate, rotate, scale, mirror), extrusions (linear, rotate, helical,
  fromSlices), hulls, expansions, colors, measurements, bezier curves, and text. ALWAYS load this
  skill when generating JSCAD code, creating 3D models programmatically, or working with @jscad/modeling.
  Also load when the user mentions CSG, OpenSCAD, parametric CAD, or 3D printing model generation.
---

# JSCAD Modeling API

Package: `@jscad/modeling` — Solid Modelling Library for 2D and 3D Geometries using Constructive Solid Geometry (CSG).

Source: https://github.com/jscad/OpenJSCAD.org

## Core Concepts

JSCAD models are built by creating primitive shapes, transforming them (move/rotate/scale), and combining them with boolean operations (union/subtract/intersect). Everything is **immutable** — operations return new geometry, never mutate.

There are **3 geometry types** that flow through the entire API:

- **`Path2`** — open or closed 2D path (line segments). Created by `line()`, `arc()`.
- **`Geom2`** — closed 2D shape with area (filled polygon). Created by `circle()`, `rectangle()`, `polygon()`, etc.
- **`Geom3`** — 3D solid mesh. Created by `cube()`, `sphere()`, `cylinder()`, or by extruding 2D shapes.

The general workflow: **create primitives → transform → combine with booleans → export**.

Every JSCAD file exports a `main()` function that returns geometry or an array of geometries:

```js
const jscad = require('@jscad/modeling')
const { cube } = jscad.primitives

const main = () => {
  return cube({ size: 10 })
}

module.exports = { main }
```

## Setup and Imports

```js
const jscad = require('@jscad/modeling')

// All available top-level namespaces:
const { cube, cuboid, sphere, cylinder, cylinderElliptic, ellipsoid,
        geodesicSphere, roundedCuboid, roundedCylinder, torus, polyhedron,
        circle, ellipse, square, rectangle, roundedRectangle, polygon,
        triangle, star, line, arc } = jscad.primitives

const { union, subtract, intersect, scission } = jscad.booleans
const { translate, translateX, translateY, translateZ,
        rotate, rotateX, rotateY, rotateZ,
        scale, scaleX, scaleY, scaleZ,
        mirror, mirrorX, mirrorY, mirrorZ,
        center, centerX, centerY, centerZ, align } = jscad.transforms
const { extrudeLinear, extrudeRotate, extrudeRectangular, extrudeHelical,
        extrudeFromSlices, project, slice } = jscad.extrusions
const { hull, hullChain } = jscad.hulls
const { expand, offset } = jscad.expansions
const { colorize, colorNameToRgb, hexToRgb, hslToRgb, hsvToRgb } = jscad.colors
const { measureBoundingBox, measureBoundingSphere, measureCenter,
        measureCenterOfMass, measureDimensions, measureArea,
        measureVolume, measureAggregateArea, measureAggregateBoundingBox,
        measureAggregateVolume } = jscad.measurements
const { generalize, snap, retessellate } = jscad.modifiers
const { vectorText, vectorChar } = jscad.text
const { bezier } = jscad.curves
const { mat4, vec2, vec3 } = jscad.maths
const { geom2, geom3, path2 } = jscad.geometries
```

All angles in JSCAD are in **radians**. Use `Math.PI / 180 * degrees` to convert.

---

## 3D Primitives (return `Geom3`)

### cube

Equal-sided box centered at origin.

```js
cube()                                // 2x2x2 at origin
cube({ size: 10 })                    // 10x10x10
cube({ size: 5, center: [0, 0, 2.5] })
```

Options: `{ center?: [x,y,z], size?: number }`

### cuboid

Box with different dimensions per axis.

```js
cuboid({ size: [10, 20, 5] })         // 10 wide, 20 deep, 5 tall
cuboid({ size: [4, 4, 1], center: [0, 0, 0.5] })
```

Options: `{ center?: [x,y,z], size?: [x,y,z] }`

### sphere

```js
sphere()                              // radius 1, 32 segments
sphere({ radius: 5, segments: 64 })
sphere({ radius: 3, center: [10, 0, 0] })
```

Options: `{ center?: [x,y,z], radius?: number, segments?: number, axes?: [x,y,z] }`

### geodesicSphere

Icosahedron-based sphere with more uniform triangle distribution.

```js
geodesicSphere({ radius: 5, frequency: 6 })
```

Options: `{ radius?: number, frequency?: number }`

### ellipsoid

3D ellipsoid with independent radii per axis.

```js
ellipsoid({ radius: [5, 10, 3] })     // egg-like squashed shape
```

Options: `{ center?: [x,y,z], radius?: [rx,ry,rz], segments?: number, axes?: [x,y,z] }`

### cylinder

```js
cylinder({ height: 10, radius: 3 })
cylinder({ height: 20, radius: 5, segments: 6 })   // hexagonal prism
cylinder({ height: 10, radius: 3, center: [0, 0, 5] })  // bottom at z=0
```

Options: `{ center?: [x,y,z], height?: number, radius?: number, segments?: number }`

### cylinderElliptic

Cylinder with different elliptical cross-sections at top and bottom. Use for cones and tapered shapes.

```js
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

```js
roundedCuboid({ size: [10, 10, 5], roundRadius: 1, segments: 32 })
```

Options: `{ center?, size?: [x,y,z], roundRadius?: number, segments?: number }`

### roundedCylinder

Cylinder with rounded (hemispherical) caps.

```js
roundedCylinder({ height: 10, radius: 3, roundRadius: 1, segments: 32 })
```

Options: `{ center?, height?, radius?, roundRadius?, segments? }`

### torus

Donut shape. `innerRadius` = tube radius, `outerRadius` = center-to-tube-center distance.

```js
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

```js
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

```js
circle({ radius: 5 })
circle({ radius: 10, segments: 64 })
circle({ radius: 5, startAngle: 0, endAngle: Math.PI })  // half disc
```

Options: `{ center?: [x,y], radius?, startAngle?, endAngle?, segments? }`

### ellipse

2D ellipse with different radii.

```js
ellipse({ radius: [10, 5] })
```

Options: `{ center?: [x,y], radius?: [rx,ry], startAngle?, endAngle?, segments? }`

### square

Equal-sided 2D rectangle.

```js
square({ size: 10 })
```

Options: `{ center?: [x,y], size?: number }`

### rectangle

```js
rectangle({ size: [20, 10] })
rectangle({ size: [5, 5], center: [10, 0] })
```

Options: `{ center?: [x,y], size?: [w,h] }`

### roundedRectangle

```js
roundedRectangle({ size: [20, 10], roundRadius: 2, segments: 16 })
```

Options: `{ center?: [x,y], size?: [w,h], roundRadius?, segments? }`

### polygon

Arbitrary 2D polygon from points. Supports holes via nested point arrays + paths.

```js
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

```js
triangle({ type: 'SSS', values: [3, 4, 5] })            // right triangle
triangle({ type: 'SAS', values: [5, Math.PI / 3, 5] })   // equilateral-ish
```

Types: `'AAA'`, `'AAS'`, `'ASA'`, `'SAS'`, `'SSA'`, `'SSS'`

### star

```js
star({ vertices: 5, outerRadius: 10, innerRadius: 5 })
star({ vertices: 8, outerRadius: 15, innerRadius: 7, startAngle: 0 })
```

Options: `{ center?, vertices?, density?, outerRadius?, innerRadius?, startAngle? }`

---

## Path Primitives (return `Path2`)

### line

Open 2D path through given points.

```js
line([[0, 0], [5, 5], [10, 0]])
line([[0, 0], [0, 5], [2, 8], [5, 9]])
```

### arc

Circular arc as open 2D path.

```js
arc({ radius: 10, startAngle: 0, endAngle: Math.PI / 2, segments: 32 })
arc({ radius: 5, endAngle: Math.PI, makeTangent: true })
```

Options: `{ center?, radius?, startAngle?, endAngle?, segments?, makeTangent? }`

---

## Boolean Operations

All booleans work on both `Geom2` and `Geom3`. Accept variadic args or arrays.

### union — merge/add shapes

```js
union(cube(), sphere({ center: [1, 0, 0] }))
union([partA, partB, partC])  // array form
```

### subtract — cut/difference (MAKES HOLES)

First argument minus all subsequent. **This is the primary way to create holes.**

```js
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

```js
intersect(
  cube({ size: 10 }),
  sphere({ radius: 7 })
)
```

### scission — split disconnected pieces

Splits a geometry into separate unconnected solids. Returns `Geom3[]`.

```js
const pieces = scission(myComplexGeom)
```

---

## Transforms

All transforms are immutable. Accept single geometry or variadic/array. Every transform has per-axis shortcuts.

### translate

```js
translate([10, 0, 5], myCube)
translateX(10, myGeom)
translateY(-5, myGeom)
translateZ(20, myGeom)

// Apply to multiple geometries
translate([5, 0, 0], partA, partB, partC)
```

### rotate

Angles in **radians**. `[rx, ry, rz]` for compound rotation.

```js
rotate([0, 0, Math.PI / 4], myCube)           // 45 deg around Z
rotateX(Math.PI / 2, myCylinder)               // 90 deg around X
rotateY(Math.PI, myGeom)                       // 180 deg around Y
rotate([Math.PI / 6, Math.PI / 4, 0], geom)   // compound XY rotation
```

### scale

```js
scale([2, 1, 0.5], myCube)    // stretch X 2x, squash Z to half
scaleX(3, myGeom)
scaleY(0.5, myGeom)
```

### mirror

Reflect across a plane. Shortcuts mirror across coordinate planes.

```js
mirrorX(myCube)                // reflect across YZ plane (flip X)
mirrorY(myGeom)                // reflect across XZ plane (flip Y)
mirrorZ(myGeom)                // reflect across XY plane (flip Z)
mirror({ origin: [0,0,0], normal: [1,1,0] }, geom)  // custom plane
```

### center

Center geometry on specified axes.

```js
center({ axes: [true, true, false] }, myGeom)   // center X and Y, leave Z
centerX(myGeom)
centerY(myGeom)
centerZ(myGeom)
center({ axes: [true, true, true], relativeTo: [0, 0, 5] }, geom)
```

### align

Align geometry by min/max/center per axis.

```js
align({ modes: ['min', 'center', 'none'] }, myGeom)
align({ modes: ['center', 'center', 'min'], relativeTo: [0, 0, 0] }, geom)
```

Modes: `'center'`, `'min'`, `'max'`, `'none'`

---

## Extrusions (2D → 3D)

### extrudeLinear

Push a 2D shape straight up along Z axis. Optional twist.

```js
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

```js
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

```js
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

```js
const path = line([[0, 0], [0, 5], [2, 8], [5, 9]])
extrudeRectangular({ size: 1, height: 1 }, path)

// With rounded corners
extrudeRectangular({ size: 0.5, height: 2, corners: 'round', segments: 16 }, path)
```

Options: `{ size?, height?, corners?: 'edge'|'chamfer'|'round', segments? }`

### extrudeFromSlices

**The most powerful extrusion.** Define each cross-section slice programmatically via a callback. The callback receives `(progress, index, base)` where progress goes from 0 to 1, and must return a `slice`.

```js
const { extrudeFromSlices, slice } = jscad.extrusions
const { mat4 } = jscad.maths
const { geom2 } = jscad.geometries

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

**Slice utilities** (`jscad.extrusions.slice`):

```js
slice.fromPoints(points3D)          // create slice from array of [x,y,z] points
slice.fromSides(sides)              // create slice from geom2 sides: geom2.toSides(myGeom2)
slice.transform(mat4, aSlice)       // apply 4x4 transformation matrix
slice.reverse(aSlice)               // flip winding order
slice.clone(aSlice)                 // deep copy
slice.equals(sliceA, sliceB)        // compare
```

### project

Project 3D geometry onto a 2D plane. Returns `Geom2`. Useful for creating 2D profiles from 3D shapes.

```js
const shadow = project({}, mySphere)    // project onto XY plane
project({ axis: [0, 1, 0], origin: [0, 0, 0] }, myGeom)  // onto XZ plane
```

Options: `{ axis?: [x,y,z], origin?: [x,y,z] }`

---

## Hull Operations

### hull

Convex hull — smallest convex shape enclosing all inputs. Like shrink-wrapping with a flat surface.

```js
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

```js
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

```js
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

```js
offset({ delta: 2, corners: 'round', segments: 16 }, circle({ radius: 5 }))
offset({ delta: -1, corners: 'chamfer' }, rectangle({ size: [10, 10] }))
```

Options: `{ delta?, corners?: 'edge'|'chamfer'|'round', segments? }`

---

## Colors

### colorize

Apply RGBA color. Values 0 to 1. Alpha optional (defaults to 1). Returns a **new** object (immutable).

```js
colorize([1, 0, 0], cube())              // red
colorize([0, 0.5, 1, 0.7], sphere())     // semi-transparent blue
colorize([0.2, 0.8, 0.2], cylinder())    // green
```

### Color conversions

```js
colorize(colorNameToRgb('steelblue'), cube())     // CSS color name
colorize(hexToRgb('#ff6600'), sphere())            // hex string
colorize(hslToRgb([0.6, 1, 0.5]), cylinder())     // HSL → RGB
colorize(hsvToRgb([0.3, 0.8, 0.9]), cube())       // HSV → RGB
```

All CSS color names are supported via `colorNameToRgb`.

### Per-part coloring

To color different parts independently, apply `colorize` to each part **separately** and return them as an **array**. Each part keeps its own color.

```js
const main = () => {
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

```js
const box = cube({ size: 10 })

measureBoundingBox(box)          // [[-5,-5,-5], [5,5,5]]
measureDimensions(box)           // [10, 10, 10]
measureCenter(box)               // [0, 0, 0]
measureCenterOfMass(box)         // [0, 0, 0]
measureVolume(box)               // 1000
measureArea(box)                 // 600
measureBoundingSphere(box)       // [[cx,cy,cz], radius]
measureEpsilon(box)              // floating point tolerance

// Aggregate — across arrays of geometries
measureAggregateBoundingBox([partA, partB])
measureAggregateArea([partA, partB])
measureAggregateVolume([partA, partB])
```

---

## Modifiers

### generalize

Clean up geometry before export. Can snap, simplify, and triangulate.

```js
generalize({ snap: true, simplify: true, triangulate: true }, myGeom)
```

### snap

Snap vertices to grid to fix floating-point precision issues after complex boolean operations.

```js
snap(myGeom)
```

### retessellate

Re-tessellate coplanar polygons. Useful after booleans that create co-planar faces.

```js
retessellate(myGeom)
```

---

## Curves (Bezier)

```js
const { bezier } = jscad.curves

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

```js
const { vectorText } = jscad.text
const { hullChain } = jscad.hulls
const { union } = jscad.booleans
const { extrudeLinear } = jscad.extrusions
const { circle, sphere } = jscad.primitives
const { translate } = jscad.transforms

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

```js
const { mat4, vec2, vec3 } = jscad.maths

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
const degToRad = (deg) => deg * Math.PI / 180
```

---

## Common Recipes

### Making Holes (subtract cylinders)

```js
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

```js
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

```js
// Built-in rounded primitives
roundedCuboid({ size: [20, 10, 5], roundRadius: 1, segments: 16 })
roundedCylinder({ height: 10, radius: 3, roundRadius: 0.5, segments: 16 })

// Or use expand on a smaller geometry for uniform rounding
expand({ delta: 1, corners: 'round', segments: 16 }, cuboid({ size: [18, 8, 3] }))

// Chamfered edges
expand({ delta: 1, corners: 'chamfer' }, cuboid({ size: [18, 8, 3] }))
```

### Screw Threads

```js
const threads = (innerR, outerR, length, segments) => {
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

```js
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

```js
const { bezier } = jscad.curves

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

```js
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

```js
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

```js
const slots = Array.from({ length: 5 }, (_, i) =>
  cuboid({ size: [2, 10, 10], center: [-8 + i * 4, 0, 0] })
)
subtract(cuboid({ size: [30, 15, 5] }), ...slots)
```

### Embossed / Engraved Text

```js
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

```js
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

```js
const profile = polygon({ points: [
  [0, 0], [3, 0], [3, 0.5], [0.5, 0.5],      // base
  [0.5, 5], [0.3, 5.5], [0.3, 8],             // stem
  [0.5, 8.5], [3, 10], [3.5, 12],             // bowl outer
  [3.2, 12], [2.8, 10], [0.3, 8.5], [0, 8.5]  // bowl inner wall
]})

const glass = extrudeRotate({ segments: 64 }, profile)
```

### Snap-Fit Joints

```js
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

```js
const gear = (teeth, mod, thickness) => {
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

```js
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

For hollow boxes, remember thickness applies to **every side**:

```js
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

```js
// Place bottom of any geometry at Z=0
const onBed = align({ modes: ['center', 'center', 'min'], relativeTo: [0, 0, 0] }, myGeom)

// Or use translateZ after measuring
const bbox = measureBoundingBox(myGeom)
const onBed2 = translateZ(-bbox[0][2], myGeom)  // shift bottom to Z=0
```

Add a base flange to improve adhesion and reduce warping on large prints:

```js
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

```js
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

```js
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

### Bridging

Horizontal spans between two supports (bridges) work up to ~10mm on FDM without supports. Beyond that, add design features:

```js
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

```js
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

```js
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
- **Horizontal round holes** deform into ovals — use **teardrop** shapes for accuracy:

```js
// Standard round hole — deforms when printed horizontally
const roundHole = rotateX(Math.PI / 2, cylinder({ height: 20, radius: 3 }))

// Teardrop hole — self-supporting, accurate diameter when printed horizontally
// Flat bottom + 45° pointed top replaces the unsupported upper arc
const teardropHole = (radius, depth) => {
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

```js
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
const hingePin = (pinR, clearance, length) => {
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

```js
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

```js
// Default segments (32) — good for most parts
cylinder({ height: 10, radius: 5 })

// Low segments for small hidden holes (saves file size & boolean speed)
const smallHole = cylinder({ height: 10, radius: 1.5, segments: 16 })

// High segments only for large visible curves
const smoothDome = sphere({ radius: 20, segments: 64 })
```

### Pre-Export Checklist

| Check | How to verify | Fix |
|---|---|---|
| Wall thickness ≥ 0.8mm | Compute outer - inner dimensions | Increase inner offset |
| Flat bottom at Z=0 | `measureBoundingBox()[0][2] === 0` | `align({ modes: ['center','center','min'] })` |
| No floating parts | Ensure all parts are `union()`'d | `union(partA, partB, ...)` |
| Volume > 0 | `measureVolume(model) > 0` | Check boolean order, normals |
| Fits print bed | `measureDimensions()` < bed size | `scale()` down |
| Reasonable file size | `segments` not excessive | Use 32 default, 16 for small features |
| Clean mesh | Apply `generalize()` before export | `generalize({ snap: true, triangulate: true })` |
| Oriented for strength | Load perpendicular to layer lines | Rotate model or redesign |

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
