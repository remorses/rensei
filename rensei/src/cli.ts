#!/usr/bin/env node

import { goke } from 'goke'
import { z } from 'zod'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const packageJson = require('../package.json') as { version: string }

const VALID_VIEWS = ['front', 'back', 'left', 'right', 'top', 'bottom', 'iso', 'all'] as const

const cli = goke('rensei')

cli
    .command('<stl>', 'Render an STL file to PNG screenshots from configurable camera angles')
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
    .action(async (stl, options, { console, fs, process }) => {
        // Dynamic import so context.ts polyfills load only when rendering
        const { renderStl, renderAllViews, PRESET_VIEWS } = await import('./render.ts')
        type PresetView = keyof typeof PRESET_VIEWS

        const baseOptions = {
            stlPath: stl,
            width: options.size,
            height: options.size,
            zoom: options.zoom,
            modelColor: options.color,
            backgroundColor: options.background,
        }

        if (options.view === 'all') {
            // Render all views to a directory
            const outDir = options.output.replace(/\.png$/i, '')
            await fs.mkdir(outDir, { recursive: true })

            console.log(`Rendering all views of ${stl} to ${outDir}/`)
            const results = await renderAllViews(baseOptions)

            for (const [name, pngBuffer] of results) {
                const filePath = `${outDir}/${name}.png`
                await fs.writeFile(filePath, pngBuffer)
                console.log(`  ✓ ${name}.png`)
            }

            console.log(`Done — ${results.size} images saved`)
        } else {
            // Single view render
            let azimuth: number
            let elevation: number

            if (options.azimuth !== undefined || options.elevation !== undefined) {
                // Manual angle overrides
                azimuth = options.azimuth ?? 0
                elevation = options.elevation ?? 0
            } else {
                // Use preset view
                const preset = PRESET_VIEWS[options.view as PresetView]
                azimuth = preset.azimuth
                elevation = preset.elevation
            }

            console.log(
                `Rendering ${stl} — view: ${options.view}, azimuth: ${azimuth}°, elevation: ${elevation}°`,
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

cli.help()
cli.version(packageJson.version)
cli.parse()

// Dawn WebGPU keeps background threads alive — force exit after CLI completes
setTimeout(() => process.exit(0), 500)
