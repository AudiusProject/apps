import BN from 'bn.js'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import numeral from 'numeral'

import AudiusClient from 'services/Audius'
import { Address } from 'types'

import { TICKER } from './consts'

dayjs.extend(duration)

export const formatStake = (stake: number) => {
  return formatNumber(stake)
}

// Format deployer cut
export const formatDeployerCut = (cut: number) => {
  return (cut * 100).toFixed(2)
}

// Formats a weight
export const formatWeight = (weight: number) => {
  return (weight * 100).toFixed(0)
}

// Format a number with commas
export const formatNumber = (num: number | BN) => {
  const parts = num.toString().split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.join('.')
}

export const formatAudString = (num: string) => {
  const parts = num.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.join('.')
}

/**
 * Format a number with thousands abbreviations for shotened display
 * ie. formatShortNumber(1010) => 1k
 * @param {number} num
 */
export const formatShortNumber = (num: number) => {
  return numeral(num).format('0a')
}

/**
 * Format a wallet into the shorted form for display with an optional digit after
 * the decimal place
 * @param {number} num
 */
export const formatShortNumberWithDecimal = (num: number) => {
  return numeral(num).format('0[.]0a')
}

export const formatShortWallet = (wallet: Address) => {
  return `${wallet.slice(0, 6)}...${wallet.slice(wallet.length - 5)}`
}

/**
 * Format a BN to the shortened $audio currency
 * @param {BN} amount
 */
export const formatAud = (amount: BN | null) => {
  if (!BN.isBN(amount as any)) return ''
  let aud = (amount as BN).div(new BN('1000000000000000000')).toString()
  aud = numeral(aud).format('0,0')
  return aud
}

export const formatWeiNumber = (amount: BN | null) => {
  if (!BN.isBN(amount as any)) return ''
  const aud = formatNumberCommas(AudiusClient.getAud(amount as BN))
  return aud
}

export const formatWei = (amount: BN | null) => {
  if (!BN.isBN(amount as any)) return ''
  const aud = formatNumberCommas(AudiusClient.getAud(amount as BN))
  return `${aud} ${TICKER}`
}

/**
 * Format a number to have commas
 * @param num string
 */
export const formatNumberCommas = (num: string) => {
  const parts = num.toString().split('.')
  return (
    parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') +
    (parts[1] ? '.' + parts[1] : '')
  )
}

export const leftPadZero = (number: number, desiredLength: number) => {
  return number.toString().padStart(desiredLength, '0')
}

export const formatShortAud = (amount: BN | null) => {
  if (!amount) return ''
  const aud = amount.div(new BN('1000000000000000000')).toNumber()
  if (aud >= 1000) {
    const countStr = aud.toString()
    if (countStr.length % 3 === 0) {
      return numeral(aud).format('0a').toUpperCase()
    } else if (countStr.length % 3 === 1 && countStr[2] !== '0') {
      return numeral(aud).format('0.00a').toUpperCase()
    } else if (countStr.length % 3 === 1 && countStr[1] !== '0') {
      return numeral(aud).format('0.0a').toUpperCase()
    } else if (countStr.length % 3 === 2 && countStr[2] !== '0') {
      return numeral(aud).format('0.0a').toUpperCase()
    } else {
      return numeral(aud).format('0a').toUpperCase()
    }
  } else if (!aud) {
    return '0'
  } else {
    return `${aud}`
  }
}

export const formatBytes = (bytes: number) => {
  return numeral(bytes).format('0.00 b')
}

export const getTime = (ms: number) => {
  const time = dayjs.duration(ms)
  const hours = leftPadZero(time.hours(), 2)
  const minutes = leftPadZero(time.minutes(), 2)
  const seconds = leftPadZero(time.seconds(), 2)
  return hours + ':' + minutes + ':' + seconds
}

export const getDate = (ms: number) => {
  const date = new Date(ms)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return month + '/' + day + '/' + year
}

export const getHumanReadableTime = (ms: number) => {
  const time = dayjs.duration(ms)
  const days = time.days()
  const hours = time.hours()
  const minutes = time.minutes()
  const seconds = time.seconds()
  if (days > 1) return `${days} days, ${hours} hrs`
  if (days === 1) return `${days} day, ${hours} hrs`
  if (hours > 1) return `${hours} hrs, ${minutes} min`
  if (hours === 1) return `${hours} hr, ${minutes} min`
  return `${minutes} min, ${seconds} sec`
}

const months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
]

export const getShortDate = (ms: number) => {
  const date = new Date(ms)
  const month = date.getUTCMonth()
  const day = date.getUTCDate()
  return `${months[month]} ${day}`
}

export const getShortMonth = (ms: number) => {
  const date = new Date(ms)
  const month = date.getUTCMonth()
  return months[month]
}

export const getShortMonthAndYear = (ms: number) => {
  const date = new Date(ms)
  const month = date.getUTCMonth()
  const year = date.getUTCFullYear()
  return `${months[month]} ‘${year.toString(10).slice(-2)}`
}
