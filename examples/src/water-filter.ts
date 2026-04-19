// Water filter funnel — simplified thin-walled for 3D printing
// Conical funnel with mounting cylinder at wide end (threads to be engraved),
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
//   Y=28  ─── 7 ═══ 9 ─────────────────  nozzle tip
//             │     │
//   Y=16  ─── 7─9.5─11.5─14 ════════ 16  funnel floor + nozzle base
//                   │   │         ╲
//                   │   │          ╲ funnel
//   Y=8   ──────────│───│───────── 28 ══ 30  cylinder top
//                   │   │           │    │
//   Y=0   ── 9.5 ══ 11.5 ─────── 28 ════ 30  bed (filter ring + cylinder ring)

// TODO: rensei/modeling has a CJS interop bug — import * as modeling
// doesn't resolve @jscad/modeling properties. Using direct import for now.
import jscad from '@jscad/modeling'
const { polygon } = jscad.primitives
const { align } = jscad.transforms
const extrudeRotate = jscad.extrusions.extrudeRotate

export function main() {
    const wall = 2

    // Nozzle (narrow end — points UP when printing)
    const nozzleTipRadius = 9
    const nozzleBaseRadius = 16  // must be ≥ filterOuterRadius + wall = 13.5 → use 16
    const nozzleLength = 12
    const holeRadius = 7

    // Mounting cylinder: 56mm inner ⌀, thin wall (sits flat on bed)
    const cylinderInnerRadius = 28
    const cylinderWall = 2
    const cylinderOuterRadius = cylinderInnerRadius + cylinderWall // 30mm
    const cylinderHeight = 8

    // Filter attachment cylinder: 23mm outer ⌀, routes from BED to funnel floor
    // This grounds it — no floating, no cantilever
    const filterOuterRadius = 11.5  // 23mm / 2
    const filterInnerRadius = filterOuterRadius - wall  // 9.5mm

    // Heights (Y=0 = bed, Y increases toward nozzle tip)
    const bedY = 0
    const funnelTop = cylinderHeight               // Y=8: funnel-cylinder junction
    const funnelBottom = funnelTop + 8             // Y=16: funnel narrow end / nozzle base
    const nozzleTop = funnelBottom + nozzleLength  // Y=28: nozzle tip
    const funnelInnerBottom = nozzleBaseRadius - wall  // 14mm: funnel inner at funnelBottom

    // Profile polygon — traced counterclockwise, NO self-intersections.
    // Outer and inner funnel slopes are PARALLEL (same direction vector),
    // verified: (30,8)→(16,16) and (14,16)→(28,8) have t+s=8/7 ≠ 1, never cross.
    const pts: [number, number][] = []

    // === OUTER SURFACE (bed → nozzle tip) ===
    pts.push([cylinderOuterRadius, bedY])       // cylinder outer at bed
    pts.push([cylinderOuterRadius, funnelTop])  // cylinder outer top
    pts.push([nozzleBaseRadius, funnelBottom])  // funnel narrows to nozzle base
    pts.push([nozzleTipRadius, nozzleTop])      // nozzle tip outer

    // === NOZZLE TIP (top flat ring) ===
    pts.push([holeRadius, nozzleTop])

    // === INNER SURFACE (nozzle tip → funnel floor) ===
    pts.push([holeRadius, funnelBottom])        // hole down to funnel floor

    // === FUNNEL FLOOR → FILTER (going right/outward at Y=funnelBottom) ===
    // Floor from hole to filter inner top — X range: 7 to 9.5 (no overlap with
    // the other floor segment 11.5→14 which is separate)
    pts.push([filterInnerRadius, funnelBottom]) // floor: hole → filter inner top

    // === FILTER — routes DOWN to bed, then back UP (grounded, no float) ===
    pts.push([filterInnerRadius, bedY])         // filter inner wall down to bed
    pts.push([filterOuterRadius, bedY])         // bed floor: filter inner → outer
    pts.push([filterOuterRadius, funnelBottom]) // filter outer wall up to funnel floor

    // === FUNNEL FLOOR → FUNNEL INNER (X range: 11.5 to 14, no overlap above) ===
    pts.push([funnelInnerBottom, funnelBottom]) // floor: filter outer → funnel inner

    // === FUNNEL INNER → CYLINDER INNER (parallel to outer, no crossing) ===
    pts.push([cylinderInnerRadius, funnelTop])  // funnel inner up to cylinder
    pts.push([cylinderInnerRadius, bedY])       // cylinder inner down to bed

    // Close: [28,0]→[30,0] is implicit (back to first point)

    const body = extrudeRotate({ segments: 64 }, polygon({ points: pts }))

    return align(
        { modes: ['center', 'center', 'min'], relativeTo: [0, 0, 0] },
        body,
    )
}
