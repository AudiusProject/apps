import fs from 'fs'
import path from 'path'

import {
  compositeImage,
  createImage,
  decodeImage,
  encodeJpegBase64,
  resizeImage
} from './rgbaImage'

const asset = (name: string) =>
  new Uint8Array(
    fs.readFileSync(path.resolve(__dirname, '../../assets/images', name))
  )

describe('rgbaImage', () => {
  it('decodes JPEG and PNG', () => {
    const jpeg = decodeImage(asset('weeklyRotation.jpg'))
    expect([jpeg.width, jpeg.height]).toEqual([1000, 1000])
    expect(jpeg.data.length).toBe(1000 * 1000 * 4)
    expect(jpeg.data[3]).toBe(255)

    const png = decodeImage(asset('robotFace.png'))
    expect([png.width, png.height]).toEqual([256, 256])
  })

  it('rejects unknown formats', () => {
    expect(() => decodeImage(new Uint8Array([1, 2, 3, 4]))).toThrow()
  })

  it('resizes, composites and encodes a collage', () => {
    const image = decodeImage(asset('weeklyRotation.jpg'))
    const canvas = createImage(1000, 1000)
    compositeImage(canvas, resizeImage(image, 500, 500), 500, 0)
    expect(Array.from(canvas.data.subarray(0, 4))).toEqual([0, 0, 0, 0])
    expect(canvas.data[500 * 4 + 3]).toBe(255)

    const roundTrip = decodeImage(
      new Uint8Array(Buffer.from(encodeJpegBase64(canvas, 100), 'base64'))
    )
    expect([roundTrip.width, roundTrip.height]).toEqual([1000, 1000])
  })
})
