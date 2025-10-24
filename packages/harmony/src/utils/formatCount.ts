import numeral from 'numeral'

/**
 * Formats a count into a more readable string representation.
 * For counts over 1000, it converts the number into a format with a suffix (K for thousands, M for millions, etc.)
 * For example:
 * - 375 => "375"
 * - 4,210 => "4.21K"
 * - 443,123 => "443K"
 * - 4,001,000 => "4M"
 * If the count is 0, it returns "0".
 * This function is pulled over from the common package because we don't use the common package in Harmony.
 */
export const formatCount = (count: number, decimals: number = 0) => {
  if (count >= 1000) {
    const countStr = count.toString()
    if (countStr.length % 3 === 0) {
      return numeral(count).format('0a').toUpperCase()
    } else if (countStr.length % 3 === 1 && countStr[2] !== '0') {
      return numeral(count).format('0.00a').toUpperCase()
    } else if (countStr.length % 3 === 1 && countStr[1] !== '0') {
      return numeral(count).format('0.0a').toUpperCase()
    } else if (countStr.length % 3 === 2 && countStr[2] !== '0') {
      return numeral(count).format('0.0a').toUpperCase()
    } else {
      return numeral(count).format('0a').toUpperCase()
    }
  } else if (!count) {
    return '0'
  } else {
    return `${count.toFixed(decimals)}`
  }
}
