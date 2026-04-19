import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import { PNG } from 'pngjs'
import { jscadToGeometries, jscadToStl } from './jscad.ts'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const OUTPUT_DIR = path.resolve(__dirname, '../../test-output')

// Write a temp JSCAD fixture that uses @jscad/modeling directly (CJS compatible)
const FIXTURE_DIR = path.resolve(OUTPUT_DIR, 'fixtures')
const FIXTURE_PATH = path.resolve(FIXTURE_DIR, 'test-model.mjs')

beforeAll(() => {
    fs.mkdirSync(FIXTURE_DIR, { recursive: true })
    // Write a simple JSCAD script as fixture
    // Uses createRequire to import CJS @jscad/modeling from ESM
    fs.writeFileSync(
        FIXTURE_PATH,
        `
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const jscad = require('@jscad/modeling')
const { cube, sphere, cylinder } = jscad.primitives
const { subtract, union } = jscad.booleans
const { translate } = jscad.transforms

export function main() {
    const base = cube({ size: 10 })
    const hole = cylinder({ height: 15, radius: 3 })
    const knob = translate([0, 0, 6], sphere({ radius: 2 }))
    return union(subtract(base, hole), knob)
}
`,
    )
})

describe('jscadToGeometries', () => {
    it('evaluates a JSCAD script and returns geometry objects', async () => {
        const geometries = await jscadToGeometries(FIXTURE_PATH)

        expect(geometries).toBeInstanceOf(Array)
        expect(geometries.length).toBeGreaterThan(0)

        // Each geometry should have polygons and transforms (geom3 structure)
        const geom = geometries[0] as Record<string, unknown>
        expect(geom).toHaveProperty('polygons')
        expect(geom).toHaveProperty('transforms')
    }, 30_000)

    it('throws for scripts without main()', async () => {
        const noMainPath = path.resolve(FIXTURE_DIR, 'no-main.mjs')
        fs.writeFileSync(noMainPath, 'export const foo = 42\n')

        await expect(jscadToGeometries(noMainPath)).rejects.toThrow('does not export a main()')
    }, 10_000)

    it('evaluates a .ts JSCAD script via tsx runtime registration', async () => {
        const tsFixturePath = path.resolve(FIXTURE_DIR, 'test-model.ts')
        fs.writeFileSync(
            tsFixturePath,
            `
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const jscad = require('@jscad/modeling')
const { cube } = jscad.primitives as { cube: (opts?: { size?: number }) => unknown }

export function main(): unknown {
    return cube({ size: 8 })
}
`,
        )

        const geometries = await jscadToGeometries(tsFixturePath)
        expect(geometries.length).toBe(1)
        const geom = geometries[0] as Record<string, unknown>
        expect(geom).toHaveProperty('polygons')
    }, 30_000)
})

describe('jscadToStl', () => {
    it('converts a JSCAD script to valid binary STL', async () => {
        const stlBuffer = await jscadToStl(FIXTURE_PATH)

        expect(stlBuffer).toBeInstanceOf(Buffer)
        expect(stlBuffer.length).toBeGreaterThan(100)

        // Binary STL starts with 80-byte header then uint32 triangle count
        const triangleCount = stlBuffer.readUInt32LE(80)
        expect(triangleCount).toBeGreaterThan(0)

        // Expected size: 80 (header) + 4 (count) + triangleCount * 50 (per triangle)
        const expectedSize = 80 + 4 + triangleCount * 50
        expect(stlBuffer.length).toBe(expectedSize)

        // Save for inspection
        const outPath = path.join(OUTPUT_DIR, 'jscad-output.stl')
        fs.writeFileSync(outPath, stlBuffer)
    }, 30_000)
})

describe('jscad → screenshot pipeline', () => {
    it('renders a JSCAD script directly to PNG via STL intermediate', async () => {
        const stlBuffer = await jscadToStl(FIXTURE_PATH)

        // Dynamic import render to trigger WebGPU polyfills
        const { renderStl } = await import('./render.ts')

        const pngBuffer = await renderStl({
            stlData: stlBuffer,
            width: 512,
            height: 512,
        })

        expect(pngBuffer).toBeInstanceOf(Buffer)
        const png = PNG.sync.read(pngBuffer)
        expect(png.width).toBe(512)
        expect(png.height).toBe(512)

        fs.writeFileSync(path.join(OUTPUT_DIR, 'jscad-screenshot.png'), pngBuffer)
    }, 60_000)
})
