// Ergonomic re-exports of @jscad/modeling
//
// Instead of:
//   import jscad from '@jscad/modeling'
//   const { cube, sphere } = jscad.primitives
//   const { subtract } = jscad.booleans
//
// Users can do:
//   import { cube, sphere, subtract, translate, colorize } from 'rensei/modeling'
//
// This also means scripts work without installing @jscad/modeling separately.
// All exports are fully typed — types come from @jscad/modeling's own .d.ts files.

import * as modeling from '@jscad/modeling'

// Re-export full namespaces for advanced use
export const colors = modeling.colors
export const curves = modeling.curves
export const geometries = modeling.geometries
export const maths = modeling.maths
export const measurements = modeling.measurements
export const primitives = modeling.primitives
export const text = modeling.text
export const utils = modeling.utils
export const booleans = modeling.booleans
export const expansions = modeling.expansions
export const extrusions = modeling.extrusions
export const hulls = modeling.hulls
export const modifiers = modeling.modifiers
export const transforms = modeling.transforms

// --- Flat named exports for ergonomic imports ---

// Primitives
export const arc = modeling.primitives.arc
export const circle = modeling.primitives.circle
export const cube = modeling.primitives.cube
export const cuboid = modeling.primitives.cuboid
export const cylinder = modeling.primitives.cylinder
export const cylinderElliptic = modeling.primitives.cylinderElliptic
export const ellipse = modeling.primitives.ellipse
export const ellipsoid = modeling.primitives.ellipsoid
export const geodesicSphere = modeling.primitives.geodesicSphere
export const line = modeling.primitives.line
export const polygon = modeling.primitives.polygon
export const polyhedron = modeling.primitives.polyhedron
export const rectangle = modeling.primitives.rectangle
export const roundedCuboid = modeling.primitives.roundedCuboid
export const roundedCylinder = modeling.primitives.roundedCylinder
export const roundedRectangle = modeling.primitives.roundedRectangle
export const sphere = modeling.primitives.sphere
export const square = modeling.primitives.square
export const star = modeling.primitives.star
export const torus = modeling.primitives.torus
export const triangle = modeling.primitives.triangle

// Booleans
export const union = modeling.booleans.union
export const subtract = modeling.booleans.subtract
export const intersect = modeling.booleans.intersect
export const scission = modeling.booleans.scission

// Transforms
export const align = modeling.transforms.align
export const center = modeling.transforms.center
export const centerX = modeling.transforms.centerX
export const centerY = modeling.transforms.centerY
export const centerZ = modeling.transforms.centerZ
export const mirror = modeling.transforms.mirror
export const mirrorX = modeling.transforms.mirrorX
export const mirrorY = modeling.transforms.mirrorY
export const mirrorZ = modeling.transforms.mirrorZ
export const rotate = modeling.transforms.rotate
export const rotateX = modeling.transforms.rotateX
export const rotateY = modeling.transforms.rotateY
export const rotateZ = modeling.transforms.rotateZ
export const scale = modeling.transforms.scale
export const scaleX = modeling.transforms.scaleX
export const scaleY = modeling.transforms.scaleY
export const scaleZ = modeling.transforms.scaleZ
export const transform = modeling.transforms.transform
export const translate = modeling.transforms.translate
export const translateX = modeling.transforms.translateX
export const translateY = modeling.transforms.translateY
export const translateZ = modeling.transforms.translateZ

// Extrusions
export const extrudeFromSlices = modeling.extrusions.extrudeFromSlices
export const extrudeLinear = modeling.extrusions.extrudeLinear
export const extrudeRectangular = modeling.extrusions.extrudeRectangular
export const extrudeRotate = modeling.extrusions.extrudeRotate
export const extrudeHelical = modeling.extrusions.extrudeHelical
export const project = modeling.extrusions.project
export const slice = modeling.extrusions.slice

// Hulls
export const hull = modeling.hulls.hull
export const hullChain = modeling.hulls.hullChain

// Expansions
export const expand = modeling.expansions.expand
export const offset = modeling.expansions.offset

// Colors
export const colorize = modeling.colors.colorize
export const colorNameToRgb = modeling.colors.colorNameToRgb
export const hexToRgb = modeling.colors.hexToRgb
export const hslToRgb = modeling.colors.hslToRgb
export const hsvToRgb = modeling.colors.hsvToRgb
export const rgbToHex = modeling.colors.rgbToHex
export const rgbToHsl = modeling.colors.rgbToHsl
export const rgbToHsv = modeling.colors.rgbToHsv

// Measurements
export const measureArea = modeling.measurements.measureArea
export const measureBoundingBox = modeling.measurements.measureBoundingBox
export const measureBoundingSphere = modeling.measurements.measureBoundingSphere
export const measureCenter = modeling.measurements.measureCenter
export const measureCenterOfMass = modeling.measurements.measureCenterOfMass
export const measureDimensions = modeling.measurements.measureDimensions
export const measureEpsilon = modeling.measurements.measureEpsilon
export const measureVolume = modeling.measurements.measureVolume
export const measureAggregateArea = modeling.measurements.measureAggregateArea
export const measureAggregateBoundingBox = modeling.measurements.measureAggregateBoundingBox
export const measureAggregateVolume = modeling.measurements.measureAggregateVolume

// Modifiers
export const generalize = modeling.modifiers.generalize
export const snap = modeling.modifiers.snap
export const retessellate = modeling.modifiers.retessellate

// Text
export const vectorChar = modeling.text.vectorChar
export const vectorText = modeling.text.vectorText

// Curves
export const bezier = modeling.curves.bezier

// Math
export const mat4 = modeling.maths.mat4
export const vec2 = modeling.maths.vec2
export const vec3 = modeling.maths.vec3
export const vec4 = modeling.maths.vec4

// Geometries (low-level)
export const geom2 = modeling.geometries.geom2
export const geom3 = modeling.geometries.geom3
export const path2 = modeling.geometries.path2
export const poly2 = modeling.geometries.poly2
export const poly3 = modeling.geometries.poly3

// Utils
export const degToRad = modeling.utils.degToRad
export const radToDeg = modeling.utils.radToDeg
