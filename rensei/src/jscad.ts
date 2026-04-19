// JSCAD script evaluation and STL serialization
//
// Evaluates a JSCAD .js/.ts script by dynamically importing it,
// calling its main() function, and optionally serializing the
// resulting geometry to binary STL format.
//
// Uses tsx/esm/api to register TypeScript support at runtime so that
// .ts JSCAD scripts can be imported even when rensei is running from
// compiled dist/ (not under tsx itself).

import path from 'node:path'
import { pathToFileURL } from 'node:url'
// @ts-expect-error — @jscad/stl-serializer is CJS with no types
import * as stlSerializer from '@jscad/stl-serializer'
import { register } from 'tsx/esm/api'

// Register tsx ESM loader once so dynamic import() can handle .ts files.
// The unregister function is stored but we never call it — we want ts
// support for the entire process lifetime.
const _unregister = register()

/**
 * Evaluate a JSCAD script and return the raw geometry objects.
 * The script must export a `main()` function that returns geom3/geom2 objects.
 */
export async function jscadToGeometries(scriptPath: string): Promise<unknown[]> {
    const absolutePath = path.resolve(scriptPath)
    const fileUrl = pathToFileURL(absolutePath).href

    const module = await import(fileUrl)

    const mainFn = module.main ?? module.default?.main
    if (typeof mainFn !== 'function') {
        throw new Error(
            `Script ${scriptPath} does not export a main() function. ` +
            `Expected: export function main() { ... } or export { main }`,
        )
    }

    const result = mainFn()

    // Flatten to array
    const geometries = Array.isArray(result) ? result.flat(Infinity) : [result]

    return geometries
}

/**
 * Convert a JSCAD script to binary STL data.
 * Evaluates the script, serializes all geom3 objects to binary STL.
 */
export async function jscadToStl(scriptPath: string): Promise<Buffer> {
    const geometries = await jscadToGeometries(scriptPath)

    if (geometries.length === 0) {
        throw new Error(`Script ${scriptPath} returned no geometry from main()`)
    }

    // stlSerializer.serialize returns an array of ArrayBuffer/string chunks
    const chunks: ArrayBuffer[] = stlSerializer.serialize(
        { binary: true },
        ...geometries,
    )

    // Concatenate all chunks into a single Buffer
    const buffers = chunks.map((chunk: ArrayBuffer | Uint8Array) => {
        if (chunk instanceof ArrayBuffer) {
            return Buffer.from(chunk)
        }
        if (ArrayBuffer.isView(chunk)) {
            return Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength)
        }
        return Buffer.from(chunk as unknown as string)
    })

    return Buffer.concat(buffers)
}
