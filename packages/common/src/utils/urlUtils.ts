const AUDIUS_PRESS_LINK = 'https://brand.audius.co'
const AUDIUS_MERCH_LINK = 'https://merch.audius.co/'
const AUDIUS_REMIX_CONTESTS_LINK = 'https://remix.audius.co/'
const AUDIUS_BLOG_LINK = 'https://blog.audius.co/'

export const externalAudiusLinks = [
  AUDIUS_PRESS_LINK,
  AUDIUS_MERCH_LINK,
  AUDIUS_REMIX_CONTESTS_LINK,
  AUDIUS_BLOG_LINK,
  'https://help.audius.co'
]
const audiusUrlRegex =
  // eslint-disable-next-line no-useless-escape
  /^(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?(audius\.co)(\/.+)?/gim

export const isAudiusUrl = (url: string) => new RegExp(audiusUrlRegex).test(url)
export const isInternalAudiusUrl = (url: string) =>
  url.startsWith('/') ||
  (isAudiusUrl(url) &&
    !externalAudiusLinks.some((externalLink) => externalLink.includes(url)))
export const isExternalAudiusUrl = (url: string) =>
  new RegExp(audiusUrlRegex).test(url)
export const getPathFromAudiusUrl = (url: string) =>
  url.startsWith('/')
    ? url
    : (new RegExp(audiusUrlRegex).exec(url)?.[2] ?? null)

const collectionUrlRegex =
  // eslint-disable-next-line no-useless-escape
  /^(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?(audius\.co)(\/[\S]+\/(?:playlist|album)\/[\S]+)$/gim

export const isCollectionUrl = (url: string) =>
  new RegExp(collectionUrlRegex).test(url)
export const getPathFromPlaylistUrl = (url: string) => {
  const results = new RegExp(collectionUrlRegex).exec(url)
  if (!results) return null
  return results[2]
}

const trackUrlRegex =
  // eslint-disable-next-line no-useless-escape
  /^(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?(audius\.co)(\/[\S]+\/[\S]+)$/gim

export const isTrackUrl = (url: string) => new RegExp(trackUrlRegex).test(url)
export const getPathFromTrackUrl = (url: string) => {
  const results = new RegExp(trackUrlRegex).exec(url)
  if (!results) return null
  return results[2]
}
