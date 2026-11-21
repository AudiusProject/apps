import type { Color } from '@audius/common/models'

import { readImage } from './image/rgbaImage'

const DEFAULT_RGB = '#7e1bcc'
const SAMPLE_RATE = 20
const NUM_DOMINANT_COLORS = 3
const LUMINANCE_THRESHOLD = 201

const clampedRGBColor = (rgbString: string) => {
  const rgb = rgbString.split(',').map((x) => parseInt(x, 10))
  const r = rgb[0]
  const g = rgb[1]
  const b = rgb[2]

  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b

  if (luminance < LUMINANCE_THRESHOLD) {
    return [r, g, b]
  }

  const scaleFactor = LUMINANCE_THRESHOLD / luminance
  return [r, g, b].map((x) => x * scaleFactor)
}

const calculateEuclideanDistance = (c1: Color, c2: Color) => {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
      Math.pow(c1.g - c2.g, 2) +
      Math.pow(c1.b - c2.b, 2)
  )
}

const findIndexOfMaxEuclideanDistance = (
  existing: Color[],
  selectFrom: Color[]
) => {
  if (existing.length === 0 || selectFrom.length === 0) {
    throw new Error('Invalid number of colors to pick from')
  }

  let maxDistance = Number.NEGATIVE_INFINITY
  let indexOfMaxDistance = -1
  for (let i = 0; i < selectFrom.length; i++) {
    let curDistance = 0
    for (let j = 0; j < existing.length; j++) {
      curDistance += calculateEuclideanDistance(existing[j], selectFrom[i])
    }
    if (curDistance > maxDistance) {
      indexOfMaxDistance = i
      maxDistance = curDistance
    }
  }
  return indexOfMaxDistance
}

const calculateVibrancy = (color: Color) => {
  const max = Math.max(color.r, color.g, color.b)
  const min = Math.min(color.r, color.g, color.b)
  return ((max + min) * (max - min)) / max
}

export const pickTwoMostDominantAndVibrant = (colors) => {
  const vibrantColors = colors.filter((c) => {
    return calculateVibrancy(c) >= 50.0
  })
  if (vibrantColors.length < 2) {
    return [...colors]
      .sort((a, b) => {
        return calculateVibrancy(b) - calculateVibrancy(a)
      })
      .slice(0, 2)
  }
  return vibrantColors
}

const posterize = (pixels: Uint8Array, n: number) => {
  for (let i = 0; i < pixels.length; i += 4) {
    for (let c = i; c < i + 3; c++) {
      pixels[c] = (Math.floor((pixels[c] / 255) * (n - 1)) / (n - 1)) * 255
    }
  }
}

const findDominantColors = (selectFrom: Color[]) => {
  const domColors = [selectFrom.shift() as Color]

  while (domColors.length < NUM_DOMINANT_COLORS && selectFrom.length > 0) {
    const indexOfNextDomColor = findIndexOfMaxEuclideanDistance(
      domColors,
      selectFrom
    )
    domColors.push(selectFrom[indexOfNextDomColor])
    selectFrom.splice(indexOfNextDomColor, 1)
  }
  return domColors
}

export const getDominantRgb = async (imageUrl: string) => {
  try {
    const imageData = await readImage(imageUrl)
    const pixels = imageData.data
    posterize(pixels, 15)
    const pixelCount = imageData.width * imageData.height

    const counts = {}

    for (let i = 0; i < pixelCount; i += SAMPLE_RATE) {
      const offset = i * 4

      const r = pixels[offset]
      const g = pixels[offset + 1]
      const b = pixels[offset + 2]
      const rgb = `${r},${g},${b}`
      if (rgb in counts) {
        counts[rgb] += 1
      } else {
        counts[rgb] = 1
      }
    }

    const sortedResult = Object.keys(counts)
      .sort((a, b_1) => {
        return counts[b_1] - counts[a]
      })
      .map((c) => ({
        r: clampedRGBColor(c)[0],
        g: clampedRGBColor(c)[1],
        b: clampedRGBColor(c)[2]
      }))

    let result: Color[]
    if (sortedResult.length <= NUM_DOMINANT_COLORS) {
      result = sortedResult
    } else {
      result = findDominantColors(sortedResult)
    }
    return result
  } catch (err) {
    console.error(imageUrl, err)
    return DEFAULT_RGB
  }
}
