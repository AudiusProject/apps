/* globals Jimp, ExifParser */

export default () => {
  // eslint-disable-next-line
  const exifParser = '/scripts/exif-parser-0.1.12-min.js'
  // eslint-disable-next-line
  importWorkerScript(exifParser)

  function exifRotate(img, exif) {
    if (exif && exif.tags && exif.tags.Orientation) {
      switch (exif.tags.Orientation) {
        case 1: // Horizontal (normal)
          break
        case 2: // Mirror horizontal
          img.mirror(true, false)
          break
        case 3: // Rotate 180
          img.rotate(180, false)
          break
        case 4: // Mirror vertical
          img.mirror(false, true)
          break
        case 5: // Mirror horizontal and rotate 270 CW
          img.rotate(-90, false).mirror(true, false)
          break
        case 6: // Rotate 90 CW
          img.rotate(-90, false)
          break
        case 7: // Mirror horizontal and rotate 90 CW
          img.rotate(90, false).mirror(true, false)
          break
        case 8: // Rotate 270 CW
          img.rotate(-270, false)
          break
        default:
          break
      }
    }

    return img
  }

  const resizeImage = ({ imageUrl, maxWidth, square }) => {
    const CRAZY_HEIGHT = 6000
    // eslint-disable-next-line
    fetch(imageUrl).then((res) => {
      res.arrayBuffer().then((buffer) => {
        let exif
        try {
          exif = ExifParser.create(buffer).parse()
        } catch (error) {
          exif = null
        }
        Jimp.read(buffer)
          .then((img) => {
            img = exifRotate(img, exif)
            img.background(0xffffffff)
            const width = img.bitmap.width
            const height = img.bitmap.height

            if (square) {
              if (width > maxWidth && height > maxWidth) {
                width > height
                  ? img.resize(Jimp.AUTO, maxWidth)
                  : img.resize(maxWidth, Jimp.AUTO)
              }
              const min = Math.min(img.bitmap.width, img.bitmap.height)
              img.cover(min, min)
            } else {
              if (width > maxWidth) {
                img.resize(maxWidth, Jimp.AUTO)
              }
              img.cover(
                img.bitmap.width,
                Math.min(img.bitmap.height, CRAZY_HEIGHT)
              )
            }

            img.quality(90)

            const mimeType = 'image/jpeg'
            img.getBufferAsync(mimeType).then((buffer) => {
              // eslint-disable-next-line
              let convertedBlob = new self.Blob([buffer], { type: mimeType })
              // eslint-disable-next-line
              postMessage(convertedBlob)
            })
          })
          .catch((err) => {
            console.error(imageUrl, err)
            // eslint-disable-next-line
            postMessage(false)
          })
      })
    })
  }
  // eslint-disable-next-line
  self.addEventListener('message', (e) => {
    if (!e) return
    resizeImage(JSON.parse(e.data))
  })
}
