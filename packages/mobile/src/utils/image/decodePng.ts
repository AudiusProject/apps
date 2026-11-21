import { inflate } from 'pako'

import type { RgbaImage } from './rgbaImage'

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

export const isPng = (bytes: Uint8Array) =>
  bytes.length > SIGNATURE.length && SIGNATURE.every((b, i) => bytes[i] === b)

const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }

const paeth = (a: number, b: number, c: number) => {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  return pb <= pc ? b : c
}

export const decodePng = (bytes: Uint8Array): RgbaImage => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  let palette: Uint8Array | null = null
  let transparency: Uint8Array | null = null
  const idat: Uint8Array[] = []

  let offset = SIGNATURE.length
  while (offset + 8 <= bytes.length) {
    const length = view.getUint32(offset)
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8))
    const start = offset + 8
    const chunk = bytes.subarray(start, start + length)
    offset = start + length + 4
    if (type === 'IHDR') {
      width = view.getUint32(start)
      height = view.getUint32(start + 4)
      bitDepth = chunk[8]
      colorType = chunk[9]
      if (chunk[12] !== 0) throw new Error('Interlaced PNGs are not supported')
    } else if (type === 'PLTE') {
      palette = chunk
    } else if (type === 'tRNS') {
      transparency = chunk
    } else if (type === 'IDAT') {
      idat.push(chunk)
    } else if (type === 'IEND') {
      break
    }
  }

  const channels = CHANNELS[colorType]
  if (!width || !height || !channels) throw new Error('Invalid PNG')

  const compressed = new Uint8Array(idat.reduce((n, c) => n + c.length, 0))
  idat.reduce((pos, c) => {
    compressed.set(c, pos)
    return pos + c.length
  }, 0)
  const raw = inflate(compressed)

  const bitsPerPixel = channels * bitDepth
  const bpp = Math.max(1, bitsPerPixel >> 3)
  const stride = (width * bitsPerPixel + 7) >> 3
  const pixels = new Uint8Array(stride * height)
  let prev = new Uint8Array(stride)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    const cur = pixels.subarray(y * stride, (y + 1) * stride)
    for (let i = 0; i < stride; i++) {
      const left = i >= bpp ? cur[i - bpp] : 0
      const up = prev[i]
      const upLeft = i >= bpp ? prev[i - bpp] : 0
      let value = line[i]
      if (filter === 1) value += left
      else if (filter === 2) value += up
      else if (filter === 3) value += (left + up) >> 1
      else if (filter === 4) value += paeth(left, up, upLeft)
      cur[i] = value
    }
    prev = cur
  }

  const maxSample = (1 << bitDepth) - 1
  const sample = (y: number, index: number, scale: boolean) => {
    const row = y * stride
    if (bitDepth === 16) return pixels[row + index * 2]
    if (bitDepth === 8) return pixels[row + index]
    const bit = index * bitDepth
    const value =
      (pixels[row + (bit >> 3)] >> (8 - bitDepth - (bit & 7))) & maxSample
    return scale ? Math.round((value * 255) / maxSample) : value
  }

  const data = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4
      const s = x * channels
      if (colorType === 3) {
        const index = sample(y, s, false)
        data[o] = palette?.[index * 3] ?? 0
        data[o + 1] = palette?.[index * 3 + 1] ?? 0
        data[o + 2] = palette?.[index * 3 + 2] ?? 0
        data[o + 3] = transparency?.[index] ?? 255
      } else if (colorType === 0 || colorType === 4) {
        const gray = sample(y, s, true)
        data[o] = data[o + 1] = data[o + 2] = gray
        data[o + 3] = colorType === 4 ? sample(y, s + 1, true) : 255
      } else {
        data[o] = sample(y, s, true)
        data[o + 1] = sample(y, s + 1, true)
        data[o + 2] = sample(y, s + 2, true)
        data[o + 3] = colorType === 6 ? sample(y, s + 3, true) : 255
      }
    }
  }
  return { width, height, data }
}
