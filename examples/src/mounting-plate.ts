// Mounting plate example — feature-tree workflow adapted to JSCAD booleans.
//
// This is the code-first equivalent of a small CAD feature tree:
// 1. Base plate
// 2. Center pocket
// 3. Four corner through-holes
// 4. Four standoffs around the pocket
//
// The goal is not to mirror a feature CAD API one-to-one. In JSCAD the clean
// workflow is: name the dimensions, derive repeated positions, then express the
// part as a few additive and subtractive solids.

// TODO: rensei/modeling has a CJS interop bug — import * as modeling
// doesn't resolve @jscad/modeling properties. Using direct import for now,
// matching the working pattern in water-filter.ts.
import jscad from '@jscad/modeling'

const { circle, cylinder, roundedRectangle } = jscad.primitives
const { extrudeLinear } = jscad.extrusions
const { measureDimensions } = jscad.measurements
const { subtract, union } = jscad.booleans
const { align, translate } = jscad.transforms

export function main() {
    // Confirmed spec
    const plateWidth = 80
    const plateDepth = 50
    const plateHeight = 6
    const cornerRadius = 6

    const holeDiameter = 4
    const holeInset = 8

    const pocketWidth = 48
    const pocketDepth = 22
    const pocketCornerRadius = 4
    const pocketDepthCut = 2

    const standoffDiameter = 10
    const standoffHoleDiameter = 3
    const standoffHeight = 8
    const standoffOffsetX = 22
    const standoffOffsetY = 12

    const holeRadius = holeDiameter / 2
    const standoffRadius = standoffDiameter / 2
    const standoffHoleRadius = standoffHoleDiameter / 2

    const base2d = roundedRectangle({
        size: [plateWidth, plateDepth],
        roundRadius: cornerRadius,
        segments: 48,
    })
    const base = extrudeLinear({ height: plateHeight }, base2d)

    const pocket2d = roundedRectangle({
        size: [pocketWidth, pocketDepth],
        roundRadius: pocketCornerRadius,
        segments: 48,
    })
    const pocketCut = translate(
        [0, 0, plateHeight - pocketDepthCut],
        extrudeLinear({ height: pocketDepthCut + 0.1 }, pocket2d),
    )

    const cornerHolePositions = [
        [plateWidth / 2 - holeInset, plateDepth / 2 - holeInset],
        [-(plateWidth / 2 - holeInset), plateDepth / 2 - holeInset],
        [plateWidth / 2 - holeInset, -(plateDepth / 2 - holeInset)],
        [-(plateWidth / 2 - holeInset), -(plateDepth / 2 - holeInset)],
    ] as const

    const cornerHoles = cornerHolePositions.map(([x, y]) =>
        translate(
            [x, y, -0.05],
            extrudeLinear({ height: plateHeight + 0.1 }, circle({ radius: holeRadius, segments: 48 })),
        ),
    )

    const standoffPositions = [
        [standoffOffsetX, standoffOffsetY],
        [-standoffOffsetX, standoffOffsetY],
        [standoffOffsetX, -standoffOffsetY],
        [-standoffOffsetX, -standoffOffsetY],
    ] as const

    const standoffs = standoffPositions.map(([x, y]) => {
        const outer = translate(
            [x, y, plateHeight + standoffHeight / 2],
            cylinder({ height: standoffHeight, radius: standoffRadius, segments: 48 }),
        )
        const inner = translate(
            [x, y, plateHeight + standoffHeight / 2],
            cylinder({ height: standoffHeight + 0.1, radius: standoffHoleRadius, segments: 48 }),
        )
        return subtract(outer, inner)
    })

    const body = union(
        subtract(base, pocketCut, ...cornerHoles),
        ...standoffs,
    )

    const [width, depth, height] = measureDimensions(body)

    // Sanity check encoded in code comments for future edits:
    // - width should stay plateWidth
    // - depth should stay plateDepth
    // - total height should be plateHeight + standoffHeight
    // If renders look right but these dimensions drift, a translate/extrude
    // likely moved in the wrong Z direction.
    if (
        Math.abs(width - plateWidth) > 0.001 ||
        Math.abs(depth - plateDepth) > 0.001 ||
        Math.abs(height - (plateHeight + standoffHeight)) > 0.001
    ) {
        throw new Error('Mounting plate dimensions drifted from the intended envelope')
    }

    return align(
        { modes: ['center', 'center', 'min'], relativeTo: [0, 0, 0] },
        body,
    )
}
