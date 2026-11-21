/* globals Jimp */

export default () => {
  const gifPreview = ({ key, imageUrl }) => {
    Jimp.read({
      url: imageUrl
    })
      .then((img) => {
        // eslint-disable-next-line
        const mimeType = 'image/jpeg'
        img.getBufferAsync(mimeType).then((buffer) => {
          // eslint-disable-next-line
          let convertedBlob = new self.Blob([buffer], { type: mimeType })
          // eslint-disable-next-line
          postMessage({ key, result: convertedBlob })
        })
      })
      .catch((err) => {
        console.error(imageUrl, err)
        // eslint-disable-next-line
        postMessage({ key, result: new Blob() })
      })
  }

  // eslint-disable-next-line
  self.addEventListener('message', (e) => {
    if (!e) return
    gifPreview(JSON.parse(e.data))
  })
}
