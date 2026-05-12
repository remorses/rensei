// Core STL rendering logic
// Loads an STL file, sets up a Three.js scene with proper lighting,
// positions camera based on azimuth/elevation, and renders either a
// single PNG or a square grid of multiple preset views.
//
// Key design constraint: Dawn WebGPU device can only be used by one renderer
// at a time. After renderer.dispose(), the device is gone. So for multi-view
// rendering we reuse the same renderer/scene and just reposition the camera.

import './context.ts'

import fs from 'node:fs'
import * as THREE from 'three'
import { PNG } from 'pngjs'
import { WebGPURenderer } from 'three/webgpu'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'
import { createOffscreenCanvas } from './context.ts'

/** Predefined camera views for standard orthogonal directions */
export const PRESET_VIEWS = {
    front: { azimuth: 0, elevation: 0 },
    back: { azimuth: 180, elevation: 0 },
    left: { azimuth: -90, elevation: 0 },
    right: { azimuth: 90, elevation: 0 },
    top: { azimuth: 0, elevation: 89.9 },
    bottom: { azimuth: 0, elevation: -89.9 },
    iso: { azimuth: 45, elevation: 35 },
} as const

export type PresetView = keyof typeof PRESET_VIEWS

export function computeSquareGridSize(itemCount: number): number {
    return Math.max(1, Math.ceil(Math.sqrt(itemCount)))
}

export interface RenderOptions {
    /** Path to the STL file (provide stlPath or stlData, not both) */
    stlPath?: string
    /** Raw STL binary data — used when piping from jscadToStl() to avoid temp files */
    stlData?: Buffer
    /** Image width in pixels (default: 1500) */
    width?: number
    /** Image height in pixels (default: 1500) */
    height?: number
    /** Camera azimuth in degrees — rotation around vertical axis. 0 = front (default: 45) */
    azimuth?: number
    /** Camera elevation in degrees — rotation above/below horizon. 0 = eye level (default: 35) */
    elevation?: number
    /** Zoom multiplier. 1 = auto-fit object in ~80% of frame (default: 1) */
    zoom?: number
    /** Model color as hex string (default: '#8B9DAF') */
    modelColor?: string
    /** Background color as hex string (default: '#1a1a2e') */
    backgroundColor?: string
}

const DEG_TO_RAD = Math.PI / 180

function loadAndCenterStl(stlPath?: string, stlData?: Buffer) {
    let arrayBuffer: ArrayBuffer
    if (stlData) {
        arrayBuffer = stlData.buffer.slice(stlData.byteOffset, stlData.byteOffset + stlData.byteLength) as ArrayBuffer
    } else if (stlPath) {
        const fileBuffer = fs.readFileSync(stlPath)
        arrayBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength)
    } else {
        throw new Error('Either stlPath or stlData must be provided')
    }
    const loader = new STLLoader()
    const geometry = loader.parse(arrayBuffer)

    geometry.computeBoundingBox()
    const center = new THREE.Vector3()
    geometry.boundingBox!.getCenter(center)
    geometry.translate(-center.x, -center.y, -center.z)

    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()

    return geometry
}

function createScene(
    geometry: THREE.BufferGeometry,
    modelColor: string,
    backgroundColor: string,
) {
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(backgroundColor)

    const material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(modelColor),
        metalness: 0.15,
        roughness: 0.6,
        clearcoat: 0.1,
        clearcoatRoughness: 0.4,
        side: THREE.DoubleSide,
    })

    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    // 3-point lighting for clear shape visibility
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8)
    keyLight.position.set(1, 1.5, 2).normalize()
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0xb4c6e0, 0.8)
    fillLight.position.set(-1, 0.5, -1).normalize()
    scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.6)
    rimLight.position.set(0, -0.5, -2).normalize()
    scene.add(rimLight)

    const ambientLight = new THREE.AmbientLight(0x404050, 0.5)
    scene.add(ambientLight)

    return { scene, material }
}

function positionCamera(
    camera: THREE.PerspectiveCamera,
    boundingSphereRadius: number,
    azimuth: number,
    elevation: number,
    zoom: number,
    fov: number,
) {
    const distance = (boundingSphereRadius / Math.tan((fov / 2) * DEG_TO_RAD)) * 1.3 / zoom
    const azimuthRad = azimuth * DEG_TO_RAD
    const elevationRad = elevation * DEG_TO_RAD

    camera.position.set(
        distance * Math.cos(elevationRad) * Math.sin(azimuthRad),
        distance * Math.sin(elevationRad),
        distance * Math.cos(elevationRad) * Math.cos(azimuthRad),
    )
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
}

async function createRenderer(width: number, height: number) {
    const { canvas, context } = createOffscreenCanvas(width, height)
    const renderer = new WebGPURenderer({
        canvas: canvas as unknown as HTMLCanvasElement,
        antialias: true,
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(1)
    await renderer.init()
    return { renderer, context }
}

async function renderPresetViews(
    geometry: THREE.BufferGeometry,
    options: Pick<RenderOptions, 'width' | 'height' | 'zoom' | 'modelColor' | 'backgroundColor'>,
    views: readonly PresetView[],
): Promise<Map<PresetView, Buffer>> {
    const modelColor = options.modelColor ?? '#8B9DAF'
    const backgroundColor = options.backgroundColor ?? '#1a1a2e'
    const width = Number(options.width ?? 1500)
    const height = Number(options.height ?? 1500)
    const zoom = Number(options.zoom ?? 1)

    const { scene, material } = createScene(geometry, modelColor, backgroundColor)
    const fov = 40
    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.01, 10000)
    const { renderer, context } = await createRenderer(width, height)
    const results = new Map<PresetView, Buffer>()

    try {
        for (const view of views) {
            const angles = PRESET_VIEWS[view]
            positionCamera(
                camera,
                geometry.boundingSphere!.radius,
                angles.azimuth,
                angles.elevation,
                zoom,
                fov,
            )

            await renderer.clear()
            await renderer.render(scene, camera)

            const pngBuffer = await context.copyToPNGBuffer(context.currentTexture!, 0, 0, width, height)
            results.set(view, pngBuffer)
        }

        return results
    } finally {
        try {
            material.dispose()
        } catch {}
        renderer.dispose()
    }
}

function composeGridPng(
    buffers: readonly Buffer[],
    width: number,
    height: number,
    backgroundColor: string,
): Buffer {
    const gridSize = computeSquareGridSize(buffers.length)
    const tileWidth = Math.floor(width / gridSize)
    const tileHeight = Math.floor(height / gridSize)
    const png = new PNG({ width, height, colorType: 6 })
    png.data.fill(255)

    const background = new THREE.Color(backgroundColor)
    const backgroundR = Math.round(background.r * 255)
    const backgroundG = Math.round(background.g * 255)
    const backgroundB = Math.round(background.b * 255)

    for (let index = 0; index < png.data.length; index += 4) {
        png.data[index] = backgroundR
        png.data[index + 1] = backgroundG
        png.data[index + 2] = backgroundB
        png.data[index + 3] = 255
    }

    for (const [index, buffer] of buffers.entries()) {
        const tile = PNG.sync.read(buffer)
        const column = index % gridSize
        const row = Math.floor(index / gridSize)
        PNG.bitblt(tile, png, 0, 0, tile.width, tile.height, column * tileWidth, row * tileHeight)
    }

    return PNG.sync.write(png)
}

/**
 * Render an STL file to a PNG buffer from a given camera angle.
 */
export async function renderStl(options: RenderOptions): Promise<Buffer> {
    const {
        stlPath,
        stlData,
        azimuth = 45,
        elevation = 35,
        modelColor = '#8B9DAF',
        backgroundColor = '#1a1a2e',
    } = options
    // Ensure numeric values — CLI args may arrive as strings
    const width = Number(options.width ?? 1500)
    const height = Number(options.height ?? 1500)
    const zoom = Number(options.zoom ?? 1)

    const geometry = loadAndCenterStl(stlPath, stlData)
    const { scene, material } = createScene(geometry, modelColor, backgroundColor)

    const fov = 40
    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.01, 10000)
    positionCamera(camera, geometry.boundingSphere!.radius, azimuth, elevation, zoom, fov)

    const { renderer, context } = await createRenderer(width, height)

    await renderer.clear()
    await renderer.render(scene, camera)

    const pngBuffer = await context.copyToPNGBuffer(
        context.currentTexture!,
        0, 0, width, height,
    )

    try { material.dispose() } catch {}
    geometry.dispose()
    renderer.dispose()

    return pngBuffer
}

/**
 * Render all preset views of an STL file, returning a map of view name → PNG buffer.
 * Uses a single renderer/device to avoid Dawn WebGPU device recreation issues.
 */
export async function renderAllViews(
    options: Omit<RenderOptions, 'azimuth' | 'elevation'>,
): Promise<Map<PresetView, Buffer>> {
    const geometry = loadAndCenterStl(options.stlPath, options.stlData)

    try {
        return await renderPresetViews(geometry, options, Object.keys(PRESET_VIEWS) as PresetView[])
    } finally {
        geometry.dispose()
    }
}

export async function renderViewGrid(
    options: Omit<RenderOptions, 'azimuth' | 'elevation'> & { views: readonly PresetView[] },
): Promise<Buffer> {
    const backgroundColor = options.backgroundColor ?? '#1a1a2e'
    const width = Number(options.width ?? 1500)
    const height = Number(options.height ?? 1500)
    const gridSize = computeSquareGridSize(options.views.length)
    const tileWidth = Math.max(1, Math.floor(width / gridSize))
    const tileHeight = Math.max(1, Math.floor(height / gridSize))
    const geometry = loadAndCenterStl(options.stlPath, options.stlData)

    try {
        const renderedViews = await renderPresetViews(
            geometry,
            {
                ...options,
                width: tileWidth,
                height: tileHeight,
            },
            options.views,
        )

        return composeGridPng(Array.from(renderedViews.values()), width, height, backgroundColor)
    } finally {
        geometry.dispose()
    }
}
