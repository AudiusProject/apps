/**
 * Builds a full URL list from an Audius API artwork/profilePicture object.
 * Primary URL first, then each mirror host with the same path.
 */
export function getImageUrls(
  artworkObj: Record<string, any> | null | undefined,
  size = '_480x480'
): string[] {
  if (!artworkObj) return []
  const primary: string | undefined = artworkObj[size] || artworkObj['_150x150']
  if (!primary) return []
  const mirrors: string[] = Array.isArray(artworkObj.mirrors)
    ? artworkObj.mirrors
    : []
  if (!mirrors.length) return [primary]
  let path: string
  try {
    path = new URL(primary).pathname
  } catch {
    return [primary]
  }
  return [primary, ...mirrors.map((root) => root.replace(/\/$/, '') + path)]
}
