import numeral from 'numeral'

import dayjs from './dayjs'

/**
 * Formats a number of bytes into a nice looking string.
 * ie.
 * 1024 => 1.02 KB
 * 3072 => 3.07 KB
 */
export const formatBytes = (bytes: number) => {
  return numeral(bytes).format('0.00 b')
}

/**
 * Formats a URL name for routing.
 *  Removes reserved URL characters
 *  Replaces white space with -
 *  Lower cases
 */
export const formatUrlName = (name: string) => {
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

/**
 * Formats a message for sharing
 */
export const formatShareText = (title: string, creator: string) => {
  return `${title} by ${creator} on Audius`
}

/**
 * Reduces multiple sequential newlines (> newlineCount) into max `\n\n` and
 * trims both leading and trailing newlines
 */
export const squashNewLines = (
  str: string | null | undefined,
  newlineMax: number = 2
) => {
  return str
    ? str
        .replace(
          new RegExp(
            `\\n\\s*(\\n\\s*){${Math.max(newlineMax - 2, 1)}}\\n`,
            'g'
          ),
          '\n'.repeat(newlineMax)
        )
        .trim()
    : str
}

/** Trims a string to alphanumeric values only */
export const trimToAlphaNumeric = (string: string) => {
  if (!string) return string
  return string.replace(/[#|\W]+/g, '')
}

export const pluralize = (
  message: string,
  count: number | null,
  suffix = 's',
  pluralizeAnyway = false
) => `${message}${(count ?? 0) !== 1 || pluralizeAnyway ? suffix : ''}`

/**
 * Format a number to have commas
 */
export const formatNumberCommas = (num: number | string) => {
  const parts = num.toString().split('.')
  return (
    parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') +
    (parts[1] ? '.' + parts[1] : '')
  )
}

export const trimRightZeros = (number: string) => {
  return number.replace(/(\d)0+$/gm, '$1')
}

export const checkOnlyNumeric = (number: string) => {
  const reg = /^\d+$/
  return reg.test(number)
}

export const checkOnlyWeiFloat = (number: string) => {
  const reg = /^[+-]?\d+(\.\d+)?$/
  const isFloat = reg.test(number)
  if (!isFloat) return false
  const nums = number.split('.')
  if (nums.length !== 2) return false
  if (!checkOnlyNumeric(nums[0]) || !checkOnlyNumeric(nums[1])) return false
  if (nums[1].length > 18) return false
  return true
}

export const checkWeiNumber = (number: string) => {
  return checkOnlyNumeric(number) || checkOnlyWeiFloat(number)
}

/** Capitalizes the given input string */
export const formatCapitalizeString = (word: string) => {
  const lowerCase = word.toLowerCase()
  const firstChar = word.charAt(0).toUpperCase()
  return firstChar + lowerCase.slice(1)
}

/**
 * Formats a given date string into a human-readable format based on its proximity to the current date.
 *
 * - If the date is before the current week, it returns the date formatted as "M/D/YY h:mm A".
 * - If the date is before today but within the current week, it returns the date formatted as "dddd h:mm A".
 * - If the date is today, it returns the time formatted as "h:mm A".
 */
export const formatMessageDate = (date: string) => {
  const d = dayjs(date)
  const today = dayjs()
  if (d.isBefore(today, 'week')) return d.format('M/D/YY h:mm A')
  if (d.isBefore(today, 'day')) return d.format('dddd h:mm A')
  return d.format('h:mm A')
}

/*
 * Formats a given date string into a human-readable format based on its proximity to the current date.
 *
 * - If the release date is within the next week, it returns the day of the week.
 * - If the release date is further out, it returns the full date formatted as "M/D/YY".
 * - If the `withHour` flag is set to true, it also includes the time formatted as "h:mm A".
 */
export const formatReleaseDate = ({
  date,
  withHour
}: {
  date: string
  withHour?: boolean
}) => {
  const releaseDate = dayjs(date)
  const now = dayjs()

  // Can't use daysDifference === 0 because anything under 24 hours counts
  const isToday = releaseDate.isSame(now, 'day')
  const daysDifference = releaseDate.diff(now, 'days')

  if (daysDifference >= 0 && daysDifference < 7) {
    return (
      `${isToday ? 'Today' : releaseDate.format('dddd')}` +
      (withHour ? ` @ ${releaseDate.format('h A')}` : '')
    )
  } else {
    return (
      `${releaseDate.format('M/D/YY')}` +
      (withHour ? ` @ ${releaseDate.format('h A')}` : '')
    )
  }
}

/**
 * Generate a short base36 hash for a given string.
 * Used to generate short hashes for for queries and urls.
 */
export const getHash = (str: string) =>
  Math.abs(
    str.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0)
      return a & a
    }, 0)
  ).toString(36)

/**
 * Formats a number to be a double digit
 */
export const formatDoubleDigit = (value: number) =>
  value.toString().padStart(2, '0')

/**
 * Formats a ticker to be uppercase and trimmed
 */
export const formatTicker = (ticker?: string) =>
  ticker?.trim().toUpperCase() ?? ''

/**
 * Formats a ticker to be url friendly
 */
export const formatTickerForUrl = (ticker: string) => {
  const formattedTicker = formatTicker(ticker)
  return formattedTicker.startsWith('$')
    ? formattedTicker.slice(1)
    : formattedTicker
}
