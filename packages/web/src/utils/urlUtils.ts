const audiusUrlRegex =
  // eslint-disable-next-line no-useless-escape
  /^(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?(audius\.co)(\/.+)?/gim

export const isAudiusUrl = (url: string) => new RegExp(audiusUrlRegex).test(url)
export const getPathFromAudiusUrl = (url: string) =>
  new RegExp(audiusUrlRegex).exec(url)?.[2] ?? null

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

export const encodeUrlName = (name: string) => {
  return encodeURIComponent(formatUrlName(name))
}
