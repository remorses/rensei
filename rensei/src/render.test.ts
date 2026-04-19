import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { PNG } from 'pngjs'
import { renderStl, renderAllViews, PRESET_VIEWS, type PresetView } from './render.ts'

const STL_FIXTURE = path.resolve(import.meta.dirname, '../../obj_1_Holder_4cm.stl')
const OUTPUT_DIR = path.resolve(import.meta.dirname, '../../test-output')

beforeAll(() => {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
})

describe('renderStl', () => {
    it('renders an STL to a valid PNG buffer', async () => {
        const pngBuffer = await renderStl({
            stlPath: STL_FIXTURE,
            width: 512,
            height: 512,
        })

        expect(pngBuffer).toBeInstanceOf(Buffer)
        expect(pngBuffer.length).toBeGreaterThan(1000)

        // Verify it's a valid PNG (starts with PNG magic bytes)
        expect(pngBuffer[0]).toBe(0x89)
        expect(pngBuffer[1]).toBe(0x50) // P
        expect(pngBuffer[2]).toBe(0x4e) // N
        expect(pngBuffer[3]).toBe(0x47) // G

        // Decode and check dimensions
        const png = PNG.sync.read(pngBuffer)
        expect(png.width).toBe(512)
        expect(png.height).toBe(512)

        // Save for visual inspection
        fs.writeFileSync(path.join(OUTPUT_DIR, 'basic-render.png'), pngBuffer)
    }, 30_000)

    it('renders with custom azimuth and elevation', async () => {
        const pngBuffer = await renderStl({
            stlPath: STL_FIXTURE,
            width: 512,
            height: 512,
            azimuth: 120,
            elevation: 20,
        })

        expect(pngBuffer).toBeInstanceOf(Buffer)
        expect(pngBuffer.length).toBeGreaterThan(1000)

        fs.writeFileSync(path.join(OUTPUT_DIR, 'custom-angle.png'), pngBuffer)
    }, 30_000)

    it('renders at 1500px square (production size)', async () => {
        const pngBuffer = await renderStl({
            stlPath: STL_FIXTURE,
            width: 1500,
            height: 1500,
        })

        const png = PNG.sync.read(pngBuffer)
        expect(png.width).toBe(1500)
        expect(png.height).toBe(1500)

        fs.writeFileSync(path.join(OUTPUT_DIR, 'full-size.png'), pngBuffer)
    }, 60_000)

    it('object stays inside the frame (edge pixels are background)', async () => {
        const pngBuffer = await renderStl({
            stlPath: STL_FIXTURE,
            width: 512,
            height: 512,
            backgroundColor: '#1a1a2e',
        })

        const png = PNG.sync.read(pngBuffer)
        const bgColor = { r: 0x1a, g: 0x1a, b: 0x2e }

        // Check corner pixels — they should all be background color
        const corners = [
            { x: 0, y: 0 },
            { x: 511, y: 0 },
            { x: 0, y: 511 },
            { x: 511, y: 511 },
        ]

        for (const corner of corners) {
            const idx = (corner.y * png.width + corner.x) * 4
            const r = png.data[idx]!
            const g = png.data[idx + 1]!
            const b = png.data[idx + 2]!

            // Allow some tolerance for anti-aliasing
            expect(Math.abs(r - bgColor.r)).toBeLessThan(10)
            expect(Math.abs(g - bgColor.g)).toBeLessThan(10)
            expect(Math.abs(b - bgColor.b)).toBeLessThan(10)
        }
    }, 30_000)
})

describe('renderAllViews', () => {
    it('renders all 7 preset views', async () => {
        const results = await renderAllViews({
            stlPath: STL_FIXTURE,
            width: 512,
            height: 512,
        })

        const expectedViews = Object.keys(PRESET_VIEWS) as PresetView[]
        expect(results.size).toBe(expectedViews.length)

        for (const viewName of expectedViews) {
            const pngBuffer = results.get(viewName)
            expect(pngBuffer).toBeDefined()
            expect(pngBuffer!.length).toBeGreaterThan(1000)

            // Save each for visual inspection
            fs.writeFileSync(path.join(OUTPUT_DIR, `${viewName}.png`), pngBuffer!)
        }
    }, 120_000)
})
