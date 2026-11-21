const fallback = 'https://creatornode.audius.co/content'

const preloadImageFn = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const timeout = setTimeout(() => {
      reject(new Error(`Image load timeout: ${url}`))
    }, 5000)

    img.onload = () => {
      clearTimeout(timeout)
      resolve()
    }
    img.onerror = () => {
      clearTimeout(timeout)
      reject(new Error(`Failed to load image: ${url}`))
    }
    img.src = url
  })
}

const fetchWithFallback = async (url, mirrors = []) => {
  const mirrorList = [...mirrors]
  let currentUrl = url

  while (mirrorList.length > 0) {
    try {
      await preloadImageFn(currentUrl)
      return currentUrl
    } catch {
      const nextMirror = mirrorList.shift()
      if (!nextMirror) throw new Error('No mirror found')

      const nextUrl = new URL(currentUrl)
      nextUrl.hostname = new URL(nextMirror).hostname
      currentUrl = nextUrl.toString()
    }
  }
  try {
    await preloadImageFn(currentUrl)
    return currentUrl
  } catch {
    throw new Error(`Failed to fetch image from all mirrors ${url}`)
  }
}

export const getArtworkUrl = async (
  collectionOrTrack,
  useDefaultArtworkIfMissing
) => {
  let artworkUrl
  let mirrors = []

  if (collectionOrTrack?.artwork) {
    artworkUrl = collectionOrTrack?.artwork._480x480
    mirrors = collectionOrTrack?.artwork?.mirrors ?? []
  } else {
    artworkUrl = `${fallback}/${collectionOrTrack?.coverArtSizes}/480x480.jpg`
  }
  if (!artworkUrl) {
    if (useDefaultArtworkIfMissing) {
      return 'https://download.audius.co/static-resources/preview-image.jpg'
    }
    return null
  }

  if (mirrors.length > 0) {
    try {
      return await fetchWithFallback(artworkUrl, mirrors)
    } catch {
      return artworkUrl
    }
  }

  try {
    await preloadImageFn(artworkUrl)
    return artworkUrl
  } catch {
    return artworkUrl
  }
}
