const audiusUrlRegex =
  // eslint-disable-next-line no-useless-escape
  /^(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?(audius\.co)(\/.+)?/gim

export const isAudiusUrl = (url: string) => new RegExp(audiusUrlRegex).test(url)
export const getPathFromAudiusUrl = (url: string) =>
  new RegExp(audiusUrlRegex).exec(url)?.[2] ?? null

/**
 * Formats a URL name for routing.
 *  Removes reserved URL characters
 *  Replaces white space with -
 *  Lower cases
 */
const formatUrlName = (name: string) => {
  if (!name) return ''
  return (
    name
      .replace(/!|%|#|\$|&|'|\(|\)|&|\*|\+|,|\/|:|;|=|\?|@|\[|\]/g, '')
      .replace(/\s+/g, '-')
      // Reduce repeated `-` to a single `-`
      .replace(/-+/g, '-')
      .toLowerCase()
  )
}

/**
 * Encodes a formatted URL name for routing.
 * Using window.location will automatically decode
 * the encoded component, so using the above formatUrlName(string) can
 * be used to compare results with the window.location directly.
 */
export const encodeUrlName = (name: string) => {
  return encodeURIComponent(formatUrlName(name))
}
