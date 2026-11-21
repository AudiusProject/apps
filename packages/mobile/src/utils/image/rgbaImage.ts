import { decode as decodeJpeg, encode as encodeJpeg } from 'jpeg-js'

import { decodePng, isPng } from './decodePng'

export type RgbaImage = {
  width: number
  height: number
  data: Uint8Array
}

const isJpeg = (bytes: Uint8Array) =>
  bytes.length > 2 && bytes[0] === 0xff && bytes[1] === 0xd8

export const createImage = (width: number, height: number): RgbaImage => ({
  width,
  height,
  data: new Uint8Array(width * height * 4)
})

export const decodeImage = (bytes: Uint8Array): RgbaImage => {
  if (isJpeg(bytes)) {
    const { width, height, data } = decodeJpeg(bytes, {
      useTArray: true,
      formatAsRGBA: true
    })
    return { width, height, data }
  }
  if (isPng(bytes)) {
    return decodePng(bytes)
  }
  throw new Error('Unsupported image format')
}

export const readImage = async (url: string): Promise<RgbaImage> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`)
  }
  return decodeImage(new Uint8Array(await response.arrayBuffer()))
}

export const encodeJpegBase64 = (image: RgbaImage, quality: number) => {
  const { data } = encodeJpeg(
    { width: image.width, height: image.height, data: image.data },
    quality
  )
  return Buffer.from(data).toString('base64')
}

export const resizeImage = (
  image: RgbaImage,
  width: number,
  height: number
): RgbaImage => {
  const out = createImage(width, height)
  const scaleX = image.width / width
  const scaleY = image.height / height
  const src = image.data
  const dst = out.data

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4
      if (scaleX > 1 || scaleY > 1) {
        const x0 = x * scaleX
        const x1 = Math.min(x0 + scaleX, image.width)
        const y0 = y * scaleY
        const y1 = Math.min(y0 + scaleY, image.height)
        let r = 0
        let g = 0
        let b = 0
        let a = 0
        let total = 0
        for (let sy = Math.floor(y0); sy < y1; sy++) {
          const wy = Math.min(sy + 1, y1) - Math.max(sy, y0)
          for (let sx = Math.floor(x0); sx < x1; sx++) {
            const w = wy * (Math.min(sx + 1, x1) - Math.max(sx, x0))
            const i = (sy * image.width + sx) * 4
            r += src[i] * w
            g += src[i + 1] * w
            b += src[i + 2] * w
            a += src[i + 3] * w
            total += w
          }
        }
        dst[o] = Math.round(r / total)
        dst[o + 1] = Math.round(g / total)
        dst[o + 2] = Math.round(b / total)
        dst[o + 3] = Math.round(a / total)
      } else {
        const fx = Math.max(0, (x + 0.5) * scaleX - 0.5)
        const fy = Math.max(0, (y + 0.5) * scaleY - 0.5)
        const sx0 = Math.floor(fx)
        const sy0 = Math.floor(fy)
        const sx1 = Math.min(sx0 + 1, image.width - 1)
        const sy1 = Math.min(sy0 + 1, image.height - 1)
        const dx = fx - sx0
        const dy = fy - sy0
        const i00 = (sy0 * image.width + sx0) * 4
        const i10 = (sy0 * image.width + sx1) * 4
        const i01 = (sy1 * image.width + sx0) * 4
        const i11 = (sy1 * image.width + sx1) * 4
        for (let c = 0; c < 4; c++) {
          const top = src[i00 + c] * (1 - dx) + src[i10 + c] * dx
          const bottom = src[i01 + c] * (1 - dx) + src[i11 + c] * dx
          dst[o + c] = Math.round(top * (1 - dy) + bottom * dy)
        }
      }
    }
  }
  return out
}

export const compositeImage = (
  dst: RgbaImage,
  src: RgbaImage,
  x: number,
  y: number
) => {
  for (let sy = 0; sy < src.height; sy++) {
    const dy = sy + y
    if (dy < 0 || dy >= dst.height) continue
    for (let sx = 0; sx < src.width; sx++) {
      const dx = sx + x
      if (dx < 0 || dx >= dst.width) continue
      const si = (sy * src.width + sx) * 4
      const di = (dy * dst.width + dx) * 4
      const sa = src.data[si + 3] / 255
      const da = dst.data[di + 3] / 255
      const a = sa + da - sa * da
      if (a === 0) {
        dst.data[di] = 0
        dst.data[di + 1] = 0
        dst.data[di + 2] = 0
        dst.data[di + 3] = 0
        continue
      }
      for (let c = 0; c < 3; c++) {
        dst.data[di + c] =
          (src.data[si + c] * sa + dst.data[di + c] * da * (1 - sa)) / a
      }
      dst.data[di + 3] = a * 255
    }
  }
}
