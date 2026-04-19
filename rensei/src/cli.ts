#!/usr/bin/env node

import { goke } from 'goke'
import { z } from 'zod'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const packageJson = require('../package.json') as { version: string }

const VALID_VIEWS = ['front', 'back', 'left', 'right', 'top', 'bottom', 'iso', 'all'] as const

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
    .command('screenshot <file>', 'Render an STL or JSCAD JS/TS file to PNG screenshots')
    .option(
        '--output <path>',
        z.string().default('output.png').describe('Output file path (or directory when --view all)'),
    )
    .option(
        '--view [view]',
        z
            .enum(VALID_VIEWS)
            .default('iso')
            .describe('Preset view: front, back, left, right, top, bottom, iso, all'),
    )
    .option('--azimuth [degrees]', z.number().describe('Camera azimuth in degrees (overrides --view)'))
    .option('--elevation [degrees]', z.number().describe('Camera elevation in degrees (overrides --view)'))
    .option('--zoom [factor]', z.number().default(1).describe('Zoom multiplier (1 = auto-fit)'))
    .option('--size [px]', z.number().default(1500).describe('Image width and height in pixels'))
    .option('--color [hex]', z.string().default('#8B9DAF').describe('Model color as hex'))
    .option('--background [hex]', z.string().default('#1a1a2e').describe('Background color as hex'))
    .action(async (file, options, { console, fs }) => {
        const { renderStl, renderAllViews, PRESET_VIEWS } = await import('./render.ts')
        type PresetView = keyof typeof PRESET_VIEWS

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

        if (options.view === 'all') {
            const outDir = options.output.replace(/\.png$/i, '')
            await fs.mkdir(outDir, { recursive: true })

            console.log(`Rendering all views of ${file} to ${outDir}/`)
            const results = await renderAllViews(baseOptions)

            for (const [name, pngBuffer] of results) {
                const filePath = `${outDir}/${name}.png`
                await fs.writeFile(filePath, pngBuffer)
                console.log(`  ✓ ${name}.png`)
            }

            console.log(`Done — ${results.size} images saved`)
        } else {
            let azimuth: number
            let elevation: number

            if (options.azimuth !== undefined || options.elevation !== undefined) {
                azimuth = options.azimuth ?? 0
                elevation = options.elevation ?? 0
            } else {
                const preset = PRESET_VIEWS[options.view as PresetView]
                azimuth = preset.azimuth
                elevation = preset.elevation
            }

            console.log(
                `Rendering ${file} — view: ${options.view}, azimuth: ${azimuth}°, elevation: ${elevation}°`,
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
cli.parse()

// Dawn WebGPU keeps background threads alive — force exit after CLI completes
setTimeout(() => process.exit(0), 500)
