/* globals Jimp */

export const DEFAULT_DOMINANT_COLOR = 'rgb(126,27,204)'

export default () => {
  const SAMPLE_RATE = 20
  const REQUEST_TIMEOUT = 1500

  // Based off this site: https://app.contrast-finder.org/result.html?foreground=%23FFFFFF&background=%23cdc8c8&ratio=4.5&isBackgroundTested=true&algo=Rgb
  // the brightest color we want to support, given white text, is
  // #CDC8C8, which works out to a luminance of 201.
  const LUMINANCE_THRESHOLD = 201

  const clampedRGBColor = (rgbString /* string of 'r,g,b' */) => {
    const [r, g, b] = rgbString.split(',').map((x) => parseInt(x, 10))
    // Luminance in [0, 255]
    // https://stackoverflow.com/questions/596216/formula-to-determine-brightness-of-rgb-color
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b

    if (luminance < LUMINANCE_THRESHOLD) {
      return [r, g, b]
    }

    const scaleFactor = LUMINANCE_THRESHOLD / luminance
    return [r, g, b].map((x) => x * scaleFactor)
  }

  const formatRGB = (r, g, b) => `rgb(${r},${g},${b})`

  let didFulfill = false

  /**
   * Returns the dominant RGB color of an image.
   * @param {string} key identifies this computation
   * @param {string} imageUrl url of the image to use
   */
  const dominantRgb = ({ key, imageUrl, attempt = 0 }) => {
    if (attempt > 2) {
      console.info('Failed all attempts, returning default')
      postMessage({ key, result: 'rgb(126,27,204)' })
      return
    }

    if (didFulfill) {
      return
    }

    const processImage = () => {
      return Jimp.read({ url: imageUrl }).then((img) => {
        img.posterize(15)
        const imageData = img.bitmap
        const pixels = imageData.data
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

        let result
        Object.keys(counts).reduce((acc, i) => {
          if (counts[i] > acc) {
            result = i
            return counts[i]
          }
          return undefined
        }, 0)

        result = clampedRGBColor(result)
        result = formatRGB(...result)

        // eslint-disable-next-line
        didFulfill = true
        postMessage({ key, result })
      })
    }

    const timeouter = () =>
      new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new Error('Timeout'))
        }, REQUEST_TIMEOUT)
      })

    Promise.race([processImage(), timeouter()]).catch((err) => {
      console.warn(`Failed attempt ${attempt} with err ${err.message}`)
      dominantRgb({ key, imageUrl, attempt: attempt + 1 })
    })
  }

  // eslint-disable-next-line
  self.addEventListener('message', (e) => {
    if (!e) return
    dominantRgb(JSON.parse(e.data))
  })
}
