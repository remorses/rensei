// WebGPU polyfill layer for headless Node.js rendering with Three.js
// Adapted from https://github.com/remorses/raylib-zig-dof/tree/main/three-webgpu-node
//
// This module sets up global polyfills so Three.js WebGPURenderer works in Node.js:
// - navigator.gpu via dawn-gpu/node-webgpu
// - Fake canvas/context that renders to GPU textures
// - requestAnimationFrame/cancelAnimationFrame stubs
// - ImageBitmap stub
//
// IMPORTANT: This module must be imported before any Three.js imports.
// It mutates globalThis to inject browser-like globals.

import { create, globals as webgpuGlobals } from 'webgpu'
import { PNG } from 'pngjs'

/** Minimal ImageBitmap polyfill for Node.js */
export class ImageBitmapNode {
    width: number
    height: number
    data: Uint8ClampedArray

    constructor(width: number, height: number, data: Uint8ClampedArray) {
        this.width = width
        this.height = height
        this.data = data
    }
}

// Must come after ImageBitmapNode class definition (classes aren't hoisted)
const navigator = {
    gpu: create([]),
}

// Assign globals individually — navigator is a getter-only property on globalThis
// so Object.assign throws. Use defineProperty for navigator.
const globalPolyfills: Record<string, unknown> = {
    ...webgpuGlobals,
    self: globalThis,
    ImageBitmap: ImageBitmapNode,
    requestAnimationFrame: (callback: FrameRequestCallback) => {
        return setImmediate(() => callback(performance.now()))
    },
    cancelAnimationFrame: (handle: unknown) => {
        return clearImmediate(handle as NodeJS.Immediate)
    },
}

for (const [key, value] of Object.entries(globalPolyfills)) {
    Object.defineProperty(globalThis, key, {
        value,
        writable: true,
        configurable: true,
    })
}

Object.defineProperty(globalThis, 'navigator', {
    value: navigator,
    writable: true,
    configurable: true,
})

/**
 * Fake WebGPU canvas context that renders to offscreen textures.
 * Three.js calls canvas.getContext('webgpu') and we return this.
 */
export class OffscreenGPUContext {
    device?: GPUDevice
    width: number
    height: number
    currentTexture: GPUTexture | null = null

    constructor({ width, height }: { width: number; height: number }) {
        this.width = width
        this.height = height
    }

    async configure(arg: GPUCanvasConfiguration) {
        if (arg?.device) {
            this.device = arg.device
        }
    }

    getCurrentTexture() {
        if (!this.device) {
            throw new Error('Device not configured — call configure() first')
        }

        // Destroy previous texture before creating a new one
        if (this.currentTexture) {
            try { this.currentTexture.destroy() } catch {}
            this.currentTexture = null
        }

        const size = [this.width, this.height]
        const format = navigator.gpu.getPreferredCanvasFormat()
        this.currentTexture = this.device.createTexture({
            size,
            format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
            dimension: '2d',
        })

        return this.currentTexture
    }

    /**
     * Copy the current render texture to a PNG buffer.
     * WebGPU renders in BGRA8, so we swap channels for PNG (RGBA).
     */
    async copyToPNGBuffer(
        texture: GPUTexture,
        x: number,
        y: number,
        width: number,
        height: number,
    ): Promise<Buffer> {
        if (!this.device) {
            throw new Error('Device not configured')
        }

        const rawPixels = await this.copyTextureToBuffer(texture, x, y, width, height, 0)

        const png = new PNG({
            width: width,
            height: height,
            filterType: -1,
        })

        // WebGPU requires buffer rows to be 256-byte aligned
        const bytesPerRow = Math.ceil((width * 4) / 256) * 256
        const dstBytesPerRow = width * 4

        for (let row = 0; row < height; row++) {
            const dst = width * row * 4
            const src = row * bytesPerRow
            const srcData = rawPixels.slice(src, src + dstBytesPerRow)
            // Swap BGRA → RGBA
            for (let i = 0; i < dstBytesPerRow; i += 4) {
                const b = srcData[i]!
                const r = srcData[i + 2]!
                srcData[i] = r
                srcData[i + 2] = b
            }
            png.data.set(srcData, dst)
        }

        return PNG.sync.write(png, { colorType: 6 })
    }

    private async copyTextureToBuffer(
        texture: GPUTexture,
        x: number,
        y: number,
        width: number,
        height: number,
        faceIndex: number,
    ): Promise<Uint8Array> {
        if (!this.device) {
            throw new Error('Device not configured')
        }

        const bytesPerTexel = 4
        let bytesPerRow = width * bytesPerTexel
        bytesPerRow = Math.ceil(bytesPerRow / 256) * 256

        const readBuffer = this.device.createBuffer({
            size: bytesPerRow * height,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        })

        const encoder = this.device.createCommandEncoder()

        encoder.copyTextureToBuffer(
            {
                texture: texture,
                origin: { x, y, z: faceIndex },
            },
            {
                buffer: readBuffer,
                bytesPerRow: bytesPerRow,
            },
            {
                width: width,
                height: height,
                depthOrArrayLayers: 1,
            },
        )

        this.device.queue.submit([encoder.finish()])

        await readBuffer.mapAsync(GPUMapMode.READ)
        const buffer = readBuffer.getMappedRange()

        return new Uint8Array(buffer)
    }
}

/**
 * Create a fake canvas object compatible with Three.js WebGPURenderer.
 */
export function createOffscreenCanvas(width: number | string, height: number | string) {
    // Ensure dimensions are actual numbers — CLI args may arrive as strings
    const w = Number(width)
    const h = Number(height)
    const context = new OffscreenGPUContext({ width: w, height: h })

    const canvas = {
        width: w,
        height: h,
        getContext() {
            return context
        },
        addEventListener() {},
        removeEventListener() {},
        cancelAnimationFrame() {},
        style: {} as Record<string, unknown>,
    }

    return { canvas, context }
}
