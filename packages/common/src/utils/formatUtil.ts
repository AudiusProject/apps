import numeral from 'numeral'

import dayjs from './dayjs'

export const formatBytes = (bytes: number) => {
  return numeral(bytes).format('0.00 b')
}

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

export const encodeUrlName = (name: string) => {
  return encodeURIComponent(formatUrlName(name))
}

export const formatShareText = (title: string, creator: string) => {
  return `${title} by ${creator} on Audius`
}

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

export const formatNumberCommas = (num: number | string) => {
  const parts = num.toString().split('.')
  return (
    parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') +
    (parts[1] ? '.' + parts[1] : '')
  )
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

export const formatCapitalizeString = (word: string) => {
  const lowerCase = word.toLowerCase()
  const firstChar = word.charAt(0).toUpperCase()
  return firstChar + lowerCase.slice(1)
}

export const formatMessageDate = (date: string) => {
  const d = dayjs(date)
  const today = dayjs()
  if (d.isBefore(today, 'week')) return d.format('M/D/YY h:mm A')
  if (d.isBefore(today, 'day')) return d.format('dddd h:mm A')
  return d.format('h:mm A')
}

export const formatReleaseDate = ({
  date,
  withHour
}: {
  date: string
  withHour?: boolean
}) => {
  const releaseDate = dayjs(date)
  const now = dayjs()

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

export const getHash = (str: string) =>
  Math.abs(
    str.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0)
      return a & a
    }, 0)
  ).toString(36)

export const formatTicker = (ticker?: string) =>
  ticker?.trim().toUpperCase() ?? ''

export const formatTickerForUrl = (ticker: string) => {
  const formattedTicker = formatTicker(ticker)
  return formattedTicker.startsWith('$')
    ? formattedTicker.slice(1)
    : formattedTicker
}
