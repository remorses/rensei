#!/usr/bin/env node

import { goke } from 'goke'
import { z } from 'zod'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const packageJson = require('../package.json') as { version: string }

const PRESET_VIEW_NAMES = ['front', 'back', 'left', 'right', 'top', 'bottom', 'iso'] as const
const VALID_VIEWS = [...PRESET_VIEW_NAMES, 'all'] as const
type PresetView = (typeof PRESET_VIEW_NAMES)[number]

function resolveRequestedViews(requestedViews: readonly (typeof VALID_VIEWS)[number][]): PresetView[] {
    if (requestedViews.includes('all')) {
        if (requestedViews.length > 1) {
            throw new Error('Cannot combine --view all with other --view values')
        }

        return [...PRESET_VIEW_NAMES]
    }

    return requestedViews.filter((view): view is PresetView => view !== 'all')
}

const cli = goke('rensei')

/**
 * Detect whether a file is a JSCAD script (.js/.ts) or an STL file.
 * For JSCAD scripts, evaluate and convert to STL data first.
 */
async function resolveStlData(filePath: string): Promise<{ stlPath?: string; stlData?: Buffer }> {
    const ext = path.extname(filePath).toLowerCase()
    if (ext === '.stl') {
        return { stlPath: filePath }
    }
    if (ext === '.js' || ext === '.ts' || ext === '.mjs' || ext === '.mts') {
        const { jscadToStl } = await import('./jscad.ts')
        const stlData = await jscadToStl(filePath)
        return { stlData }
    }
    throw new Error(`Unsupported file type: ${ext}. Expected .stl, .js, or .ts`)
}

// --- screenshot command ---
cli
    .command('screenshot <file>', 'Render an STL or JSCAD JS/TS file to a PNG image; multiple views are composed into one grid')
    .option(
        '--output <path>',
        z.string().default('output.png').describe('Output PNG file path'),
    )
    .option(
        '--view <view>',
        z
            .array(z.enum(VALID_VIEWS))
            .default(['iso'])
            .describe('Preset view (repeatable): front, back, left, right, top, bottom, iso, all'),
    )
    .option('--azimuth [degrees]', z.number().describe('Camera azimuth in degrees (overrides --view)'))
    .option('--elevation [degrees]', z.number().describe('Camera elevation in degrees (overrides --view)'))
    .option('--zoom [factor]', z.number().default(1).describe('Zoom multiplier (1 = auto-fit)'))
    .option('--size [px]', z.number().default(1500).describe('Image width and height in pixels'))
    .option('--color [hex]', z.string().default('#8B9DAF').describe('Model color as hex'))
    .option('--background [hex]', z.string().default('#1a1a2e').describe('Background color as hex'))
    .action(async (file, options, { console, fs }) => {
        const { renderStl, renderViewGrid, PRESET_VIEWS } = await import('./render.ts')

        const { stlPath, stlData } = await resolveStlData(file)

        const baseOptions = {
            stlPath,
            stlData,
            width: options.size,
            height: options.size,
            zoom: options.zoom,
            modelColor: options.color,
            backgroundColor: options.background,
        }

        const requestedViews = resolveRequestedViews(options.view)

        if (requestedViews.length > 1) {
            if (options.azimuth !== undefined || options.elevation !== undefined) {
                throw new Error('Custom --azimuth/--elevation cannot be combined with multiple --view flags')
            }

            console.log(`Rendering ${requestedViews.length} views of ${file} into ${options.output}`)
            const pngBuffer = await renderViewGrid({
                ...baseOptions,
                views: requestedViews,
            })

            await fs.writeFile(options.output, pngBuffer)
            console.log(`Saved ${options.output} (${(pngBuffer.length / 1024).toFixed(0)} KB)`)
        } else {
            let azimuth: number
            let elevation: number
            const view = requestedViews[0] ?? 'iso'

            if (options.azimuth !== undefined || options.elevation !== undefined) {
                azimuth = options.azimuth ?? 0
                elevation = options.elevation ?? 0
            } else {
                const preset = PRESET_VIEWS[view]
                azimuth = preset.azimuth
                elevation = preset.elevation
            }

            console.log(
                `Rendering ${file} — view: ${view}, azimuth: ${azimuth}°, elevation: ${elevation}°`,
            )

            const pngBuffer = await renderStl({
                ...baseOptions,
                azimuth,
                elevation,
            })

            await fs.writeFile(options.output, pngBuffer)
            console.log(`Saved ${options.output} (${(pngBuffer.length / 1024).toFixed(0)} KB)`)
        }
    })

// --- weight command ---
cli
    .command('weight <file>', 'Estimate filament weight for a JSCAD or STL file')
    .option(
        '--density [g/cm3]',
        z.number().default(1.24).describe('Filament density in g/cm³ (default: 1.24 for PLA)'),
    )
    .option(
        '--infill [percent]',
        z.number().min(0).max(100).default(20).describe('Infill percentage 0–100 (default: 20)'),
    )
    .option(
        '--shells [count]',
        z.number().int().min(1).default(3).describe('Number of perimeter shells (default: 3)'),
    )
    .option(
        '--layer-height [mm]',
        z.number().default(0.2).describe('Layer height in mm (default: 0.2)'),
    )
    .option(
        '--nozzle [mm]',
        z.number().default(0.4).describe('Nozzle diameter in mm (default: 0.4)'),
    )
    .action(async (file, options, { console }) => {
        const { jscadToGeometries } = await import('./jscad.ts')
        // @jscad/modeling is CJS — real API lives on .default in ESM context
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const jscadModule = (await import('@jscad/modeling')) as any
        const jscad = jscadModule.default as typeof import('@jscad/modeling')
        const { measureAggregateVolume, measureAggregateBoundingBox } = jscad.measurements

        let geometries: unknown[]

        const ext = path.extname(file).toLowerCase()
        if (ext === '.stl') {
            // For STL files use node-stl-like volume approach via measurements on parsed geometry
            // We re-use jscadToGeometries only for JSCAD scripts; for STL we read volume differently
            throw new Error(
                'STL input not yet supported for weight estimation. Pass a .js/.ts JSCAD script instead.',
            )
        } else {
            geometries = await jscadToGeometries(file)
        }

        const totalVolume = measureAggregateVolume(
            ...(geometries as Parameters<typeof measureAggregateVolume>),
        )

        // Convert volume from mm³ (JSCAD default units) to cm³
        const volumeCm3 = totalVolume / 1000

        // Shell volume: outer perimeter walls
        // Shell thickness = shells × nozzle diameter (in mm), convert to cm
        // We approximate shell as a fraction of total volume based on typical thin-wall ratio
        // A simpler and more standard approach: treat shells as % of volume
        // shell_wall_fraction ≈ (shells * nozzle_mm) / average_feature_size
        // For general estimation we use the standard formula:
        //   weight = volume_cm3 * density * (shell_ratio + infill_ratio * (1 - shell_ratio))
        // where shell_ratio is estimated from bounding box surface area
        const bbox = measureAggregateBoundingBox(
            ...(geometries as Parameters<typeof measureAggregateBoundingBox>),
        )
        const [[x1, y1, z1], [x2, y2, z2]] = bbox
        const sizeX = Math.abs(x2 - x1)
        const sizeY = Math.abs(y2 - y1)
        const sizeZ = Math.abs(z2 - z1)

        // Surface area of bounding box as a proxy for outer surface
        const surfaceAreaMm2 =
            2 * (sizeX * sizeY + sizeY * sizeZ + sizeX * sizeZ)

        // Shell volume in mm³: surface area × shell thickness
        const shellThicknessMm = options.shells * options['nozzle']
        const shellVolumeMm3 = Math.min(surfaceAreaMm2 * shellThicknessMm, totalVolume)
        const shellVolumeCm3 = shellVolumeMm3 / 1000

        // Inner infill volume
        const innerVolumeCm3 = Math.max(0, volumeCm3 - shellVolumeCm3)
        const infillFraction = options.infill / 100

        const weightGrams =
            shellVolumeCm3 * options.density +
            innerVolumeCm3 * options.density * infillFraction

        // Filament length estimate (1.75mm diameter filament)
        const filamentDiameterMm = 1.75
        const filamentRadiusCm = filamentDiameterMm / 2 / 10
        const filamentLengthCm = weightGrams / options.density / (Math.PI * filamentRadiusCm ** 2)
        const filamentLengthM = filamentLengthCm / 100

        console.log(`\nFilament weight estimate for: ${file}`)
        console.log(`─────────────────────────────────────────`)
        console.log(`  Model volume:     ${volumeCm3.toFixed(2)} cm³`)
        console.log(`  Shell volume:     ${shellVolumeCm3.toFixed(2)} cm³  (${options.shells} shells × ${options['nozzle']}mm nozzle)`)
        console.log(`  Inner volume:     ${innerVolumeCm3.toFixed(2)} cm³  (${options.infill}% infill)`)
        console.log(`  Density:          ${options.density} g/cm³`)
        console.log(`─────────────────────────────────────────`)
        console.log(`  ➜  Weight:        ${weightGrams.toFixed(1)} g`)
        console.log(`  ➜  Filament:      ${filamentLengthM.toFixed(2)} m  (1.75mm diameter)`)
        console.log(`─────────────────────────────────────────`)
        console.log(`  Bounding box:     ${sizeX.toFixed(1)} × ${sizeY.toFixed(1)} × ${sizeZ.toFixed(1)} mm\n`)
    })

// --- stl command ---
cli
    .command('stl <file>', 'Convert a JSCAD JS/TS file to binary STL')
    .option(
        '--output <path>',
        z.string().describe('Output STL file path (default: same name with .stl extension)'),
    )
    .action(async (file, options, { console, fs }) => {
        const { jscadToStl } = await import('./jscad.ts')

        const ext = path.extname(file).toLowerCase()
        if (ext === '.stl') {
            throw new Error('Input is already an STL file. Use "rensei screenshot" to render it.')
        }

        const output = options.output || file.replace(/\.(js|ts|mjs|mts)$/i, '.stl')

        console.log(`Converting ${file} to STL...`)
        const stlBuffer = await jscadToStl(file)
        await fs.writeFile(output, stlBuffer)
        console.log(`Saved ${output} (${(stlBuffer.length / 1024).toFixed(0)} KB)`)
    })

cli.help()
cli.version(packageJson.version)
cli.parse(process.argv, { run: false })
await cli.runMatchedCommand()

// Dawn WebGPU keeps background threads alive — force exit after CLI completes
setTimeout(() => process.exit(0), 500)
