import { getTokenDecimalPlaces } from './decimal'

/**
 * Converts a provided URL params object to a query string
 */
export const paramsToQueryString = (params: {
  [key: string]: string | string[]
}) => {
  if (!params) return ''
  return Object.entries(params)
    .filter((p) => p[1] !== undefined && p[1] !== null)
    .map((p) => {
      if (Array.isArray(p[1])) {
        // Otherwise, join in the form of
        // ?key=val1&key=val2&key=val3...
        return p[1].map((val) => `${p[0]}=${encodeURIComponent(val)}`).join('&')
      }
      return `${p[0]}=${encodeURIComponent(p[1]!)}`
    })
    .join('&')
}

/**
 * Track permalinks have the following format: '/<handle>/<track-slug>'
 */
export const parseTrackRouteFromPermalink = (permalink: string) => {
  const [, handle, slug] = permalink.split('/')
  return { slug, trackId: null, handle }
}

/**
 * Playlist permalinks have the following format: '/<handle>/playlist/<playlist-slug-with-id-at-the-end>'
 *
 * @param permalink
 * @returns playlist id
 */
export const parsePlaylistIdFromPermalink = (permalink: string) => {
  const playlistNameWithId = permalink?.split('/').slice(-1)[0] ?? ''
  return parseInt(playlistNameWithId.split('-').slice(-1)[0])
}

/** Takes a list of comma-separated strings, splits and parses them into numbers */
export const parseIntList = (str: string) => {
  return str.split(',').map((s) => Number.parseInt(s))
}

/** Attempts to parse a potentially empty string to a base 10 number. Returns `null` on failure. */
export const attemptStringToNumber = (value?: string | null) => {
  if (value == null) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

/**
 * Sanitizes numeric input by removing non-numeric characters except decimal points
 * and handling multiple decimal points by keeping only the first one
 */
export const sanitizeNumericInput = (input: string): string => {
  // Remove any non-numeric characters except decimal point
  const cleaned = input.replace(/[^0-9.]/g, '')

  // Handle multiple decimal points - keep only the first one
  const parts = cleaned.split('.')
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('')
  }

  return cleaned
}

/**
 * Formats a numeric input string with smart decimal precision based on value magnitude
 */
export const formatTokenInputWithSmartDecimals = (value: string): string => {
  if (!value || value === '' || value === '.') {
    return value
  }

  try {
    const numericValue = parseFloat(value)
    if (isNaN(numericValue) || numericValue <= 0) {
      return value
    }

    const maxDecimals = getTokenDecimalPlaces(numericValue)

    const parts = value.split('.')

    if (parts.length === 2 && parts[1].length > maxDecimals) {
      return `${parts[0]}.${parts[1].substring(0, maxDecimals)}`
    }

    return value
  } catch {
    return value
  }
}
