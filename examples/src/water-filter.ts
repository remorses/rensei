// Water filter funnel — simplified thin-walled for 3D printing
// Conical funnel with mounting cylinder at wide end (modeled inner threads),
// internal filter attachment cylinder, and nozzle at narrow end.
//
// Print orientation: mounting cylinder DOWN (flat on bed), nozzle UP.
//
// CRITICAL LESSON — profile polygon must NOT self-intersect:
// The outer funnel slope and inner funnel slope must be PARALLEL (same direction),
// not antiparallel. If they trace in opposite directions they will cross and
// extrudeRotate produces two disconnected bodies — slicer sees nozzle as floating.
//
// CRITICAL LESSON — filter vs nozzle wall sizing:
// filterOuterRadius MUST be < nozzleBaseRadius - wall, otherwise the filter
// is wider than the funnel inner at the junction and causes geometry overlap.
// With filterOuterRadius=11.5mm, nozzleBaseRadius must be ≥ 14mm (using 16mm).
//
// FILTER PLACEMENT: filter rises from BED (Z=0) up to the funnel floor (Z=16).
// This grounds the filter to the print bed — zero cantilever, zero floating.
// The filter prints as two concentric rings at Z=0 connected through the funnel walls.
//
// Cross-section profile (right half, X=radius, Y=height from bed):
//
//   Y=30  ─── 7 ═══ 9 ─────────────────  nozzle tip
//             │     │
//   Y=18  ─── 7─9.5─11.5─16 ════════ 18  funnel floor + nozzle base
//                   │   │         ╲
//                   │   │          ╲ funnel
//   Y=10  ──────────│───│───────── 28 ══ 30  cylinder top + inner thread end
//                   │   │           │    │
//   Y=0   ── 9.5 ══ 11.5 ─────── 28 ════ 30  bed (filter ring + cylinder ring)

// TODO: rensei/modeling has a CJS interop bug — import * as modeling
// doesn't resolve @jscad/modeling properties. Using direct import for now.
import jscad from '@jscad/modeling'
const { polygon } = jscad.primitives
const { align, translate } = jscad.transforms
const extrudeRotate = jscad.extrusions.extrudeRotate
const extrudeHelical = jscad.extrusions.extrudeHelical

export function main() {
    const wall = 2

    // Nozzle (narrow end — points UP when printing)
    // Slightly larger and smoother to reduce flow restriction.
    const nozzleTipRadius = 11
    const nozzleBaseRadius = 18
    const nozzleLength = 12
    const holeRadius = 8.5

    // Mounting cylinder: 56mm inner ⌀, thin wall (sits flat on bed)
    const cylinderInnerRadius = 28
    const cylinderWall = 2
    const cylinderOuterRadius = cylinderInnerRadius + cylinderWall // 30mm
    const cylinderHeight = 10

    // Filter attachment cylinder: 24mm INNER ⌀, 2mm wall
    // Only a short lip should be visible inside the bowl.
    const filterInnerRadius = 12  // 24mm / 2
    const filterOuterRadius = filterInnerRadius + wall  // 14mm outer radius

    // Heights (Y=0 = bed, Y increases toward nozzle tip)
    const bedY = 0
    const funnelTop = cylinderHeight               // Y=10: funnel-cylinder junction
    const funnelBottom = funnelTop + 8             // Y=18: funnel narrow end / nozzle base
    const nozzleTop = funnelBottom + nozzleLength  // Y=30: nozzle tip
    const funnelInnerBottom = nozzleBaseRadius - wall
    const filterTop = funnelBottom + 2             // only 2mm visible above bowl floor

    // Internal mounting threads. These are temporary dimensions until the
    // mating part is measured: three 1.5mm-wide, 1mm-deep helical starts inside the
    // larger cylinder, almost at the opening for earlier engagement.
    const threadStarts = 3
    const threadDepth = 1
    const threadWallOverlap = 0.2
    const threadProfileHeight = 1.5
    const threadTotalHeight = 4.5
    const threadStartY = bedY + 1
    const threadHeight = threadTotalHeight - threadProfileHeight
    const threadTurns = 1.25

    // Profile polygon — traced counterclockwise, NO self-intersections.
    // Outer and inner funnel slopes are parallel in cross-section and never cross.
    const pts: [number, number][] = []

    // === OUTER SURFACE (bed → nozzle tip) ===
    pts.push([cylinderOuterRadius, bedY])       // cylinder outer at bed
    pts.push([cylinderOuterRadius, funnelTop])  // cylinder outer top
    pts.push([nozzleBaseRadius, funnelBottom])  // funnel narrows to nozzle base
    pts.push([nozzleTipRadius, nozzleTop])      // nozzle tip outer

    // === NOZZLE TIP (top flat ring) ===
    pts.push([holeRadius, nozzleTop])

    // === INNER SURFACE (nozzle tip → filter lip) ===
    // Smooth tapered throat instead of a flat obstructing floor.
    pts.push([holeRadius, funnelBottom])
    pts.push([filterInnerRadius, filterTop])

    // === FILTER — grounded to bed, but only a short lip is visible ===
    pts.push([filterInnerRadius, bedY])         // filter inner wall down to bed
    pts.push([filterOuterRadius, bedY])         // bed floor: filter inner → outer
    pts.push([filterOuterRadius, filterTop])    // filter outer wall up to short lip

    // Smooth outer shoulder from lip back into funnel cone.
    pts.push([funnelInnerBottom, funnelBottom])

    // === FUNNEL INNER → CYLINDER INNER (parallel to outer, no crossing) ===
    pts.push([cylinderInnerRadius, funnelTop])  // funnel inner up to cylinder
    pts.push([cylinderInnerRadius, bedY])       // cylinder inner down to bed

    // Close: [28,0]→[30,0] is implicit (back to first point)

    const body = extrudeRotate({ segments: 96 }, polygon({ points: pts }))
    const threadProfile = polygon({
        points: [
            [cylinderInnerRadius + threadWallOverlap, -threadProfileHeight / 2],
            [cylinderInnerRadius - threadDepth, 0],
            [cylinderInnerRadius + threadWallOverlap, threadProfileHeight / 2],
        ],
    })
    const threads = Array.from({ length: threadStarts }, (_, index) => translate(
        [0, 0, threadStartY],
        extrudeHelical(
            {
                angle: Math.PI * 2 * threadTurns,
                height: threadHeight,
                startAngle: Math.PI * 2 * index / threadStarts,
                segmentsPerRotation: 96,
            },
            threadProfile,
        ),
    ))

    return align(
        // Keep threads as overlapping geometry. Boolean union can collapse this
        // revolved shell when helical ribs overlap the inner wall.
        { modes: ['center', 'center', 'min'], relativeTo: [0, 0, 0], grouped: true },
        body,
        ...threads,
    )
}
