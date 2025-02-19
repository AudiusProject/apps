import BN from 'bn.js'

import {
  BNAudio,
  BNUSDC,
  BNWei,
  StringAudio,
  StringUSDC,
  StringWei
} from '~/models/Wallet'
import { AmountObject } from '~/store/ui'
import {
  WEI_DIVISOR,
  trimRightZeros,
  formatNumberCommas,
  formatWeiToAudioString,
  parseWeiNumber,
  convertFloatToWei
} from '~/utils/formatUtil'
import { Nullable } from '~/utils/typeUtils'
import type { FixedDecimal } from '@audius/fixed-decimal'

/** AUDIO utils */
const WEI_DECIMALS = 18 // 18 decimals on ETH AUDIO
const SPL_DECIMALS = 8 // 8 decimals on SPL AUDIO

/** @deprecated Don't use BN in new code if possible. Use BigInt. */
export const zeroBNWei = new BN(0) as BNWei

/**
 * @deprecated Use `AUDIO().trunc().toFixed()` from {@link FixedDecimal} instead.
 */
export const weiToAudioString = (bnWei: BNWei): StringAudio => {
  const stringAudio = formatWeiToAudioString(bnWei) as StringAudio
  return stringAudio
}

/**
 * @deprecated Don't use BN to represent whole AUDIO. Use `AUDIO().trunc().toFixed()` from {@link FixedDecimal} instead.
 */
export const weiToAudio = (bnWei: BNWei): BNAudio => {
  const stringAudio = formatWeiToAudioString(bnWei) as StringAudio
  return stringAudioToBN(stringAudio)
}

/**
 * @deprecated Use `AUDIO().value` from {@link FixedDecimal} instead.
 */
export const audioToWei = (stringAudio: StringAudio): BNWei => {
  const wei = parseWeiNumber(stringAudio) as BNWei
  return wei
}

/**
 * @deprecated Use `AUDIO()` from {@link FixedDecimal} instead.
 */
export const stringWeiToBN = (stringWei: StringWei): BNWei => {
  return new BN(stringWei) as BNWei
}

/**
 * @deprecated Use `USDC()` from {@link FixedDecimal} instead.
 */
export const stringUSDCToBN = (stringUSDC: StringUSDC): BNUSDC => {
  return new BN(stringUSDC) as BNUSDC
}

/**
 * @deprecated Don't use BN to represent whole AUDIO. Use `AUDIO().toString()` from {@link FixedDecimal} instead.
 */
export const stringAudioToBN = (stringAudio: StringAudio): BNAudio => {
  return new BN(stringAudio) as BNAudio
}

/**
 * @deprecated Don't use BN to represent whole AUDIO. Use `AUDIO().toString()` from {@link FixedDecimal} instead.
 */
export const stringWeiToAudioBN = (stringWei: StringWei): BNAudio => {
  const bnWei = stringWeiToBN(stringWei)
  const stringAudio = weiToAudioString(bnWei)
  return new BN(stringAudio) as BNAudio
}

/**
 * @deprecated Use `AUDIO(wei).value.toString()` from {@link FixedDecimal} instead.
 */
export const weiToString = (wei: BNWei): StringWei => {
  return wei.toString() as StringWei
}

/**
 * @deprecated Use `AUDIO(stringAudio).value.toString()` from {@link FixedDecimal} instead.
 */
export const stringAudioToStringWei = (stringAudio: StringAudio): StringWei => {
  return weiToString(audioToWei(stringAudio))
}

/**
 * @deprecated Use `AUDIO()` from {@link FixedDecimal} instead.
 */
export const parseAudioInputToWei = (audio: StringAudio): Nullable<BNWei> => {
  if (!audio.length) return null
  // First try converting from float, in case audio has decimal value
  const floatWei = convertFloatToWei(audio) as Nullable<BNWei>
  if (floatWei) return floatWei
  // Safe to assume no decimals
  try {
    return audioToWei(audio)
  } catch {
    return null
  }
}

/**
 * @deprecated Use `AUDIO().toLocaleString()` from {@link FixedDecimal} instead.
 *
 * Format wei BN to the full $AUDIO currency with decimals
 * @param amount The wei amount
 * @param shouldTruncate truncate decimals at truncation length
 * @param significantDigits if truncation set to true, how many significant digits to include
 * @returns $AUDIO The $AUDIO amount with decimals
 */
export const formatWei = (
  amount: BNWei,
  shouldTruncate = false,
  significantDigits = 4
): StringAudio => {
  const aud = amount.div(WEI_DIVISOR)
  const wei = amount.sub(aud.mul(WEI_DIVISOR))
  if (wei.isZero()) {
    return formatNumberCommas(aud.toString()) as StringAudio
  }
  const decimals = wei.toString().padStart(18, '0')

  let trimmed = `${aud}.${trimRightZeros(decimals)}`
  if (shouldTruncate) {
    const splitTrimmed = trimmed.split('.')
    const [before] = splitTrimmed
    let [, after] = splitTrimmed
    // If we have only zeros, just lose the decimal
    after = after.substr(0, significantDigits)
    if (parseInt(after) === 0) {
      trimmed = before
    } else {
      trimmed = `${before}.${after}`
    }
  }
  return formatNumberCommas(trimmed) as StringAudio
}

export const convertBigIntToAmountObject = (
  amount: bigint,
  decimals: number
): AmountObject => {
  const divisor = BigInt(10 ** decimals)
  const quotient = amount / divisor
  const remainder = amount % divisor
  const uiAmountString =
    remainder > 0
      ? `${quotient.toString()}.${remainder.toString().padStart(decimals, '0')}`
      : quotient.toString()
  return {
    amount: Number(amount),
    amountString: amount.toString(),
    uiAmount: Number(amount) / 10 ** decimals,
    uiAmountString
  }
}

/**
 * @deprecated Use `AUDIO(wAUDIO(amount))` from {@link FixedDecimal} instead.
 */
export const convertWAudioToWei = (amount: BN) => {
  const decimals = WEI_DECIMALS - SPL_DECIMALS
  return amount.mul(new BN('1'.padEnd(decimals + 1, '0'))) as BNWei
}

/**
 * @deprecated Use `wAUDIO(AUDIO(amount))` from {@link FixedDecimal} instead.
 */
export const convertWeiToWAudio = (amount: BN) => {
  const decimals = WEI_DECIMALS - SPL_DECIMALS
  return amount.div(new BN('1'.padEnd(decimals + 1, '0')))
}

/** USDC Utils */
/**
 * @deprecated Use `USDC()` from {@link FixedDecimal} instead.
 */
export const BN_USDC_WEI = new BN('1000000')
/**
 * @deprecated Use `USDC()` from {@link FixedDecimal} instead.
 */
export const BN_USDC_CENT_WEI = new BN('10000')
const BN_USDC_WEI_ROUNDING_FRACTION = new BN('9999')

/**
 * @deprecated Use `USDC(value).ceil(2)` from {@link FixedDecimal} instead
 *
 * Round a USDC value as a BN up to the nearest cent and return as a BN
 */
export const ceilingBNUSDCToNearestCent = (value: BNUSDC): BNUSDC => {
  return value
    .add(BN_USDC_WEI_ROUNDING_FRACTION)
    .div(BN_USDC_CENT_WEI)
    .mul(BN_USDC_CENT_WEI) as BNUSDC
}

/**
 * @deprecated Use `USDC(value).floor(2)` from {@link FixedDecimal} instead.
 *
 * Round a USDC value as a BN down to the nearest cent and return as a BN
 */
export const floorBNUSDCToNearestCent = (value: BNUSDC): BNUSDC => {
  return value.div(BN_USDC_CENT_WEI).mul(BN_USDC_CENT_WEI) as BNUSDC
}

/**
 * @deprecated Use `USDC().toLocaleString()` from {@link FixedDecimal} instead.
 *
 * Formats a USDC wei string (full precision) to a fixed string suitable for display as a dollar amount.
 * Note: will lose precision by rounding _up_ to nearest cent and will drop negative signs
 */
export const formatUSDCWeiToUSDString = (
  amount: StringUSDC | BN,
  precision = 2
) => {
  const amountBN = BN.isBN(amount) ? amount : new BN(amount)
  // remove negative sign if present.
  const amountPos = amountBN.abs()
  // Since we only need two digits of precision, we will multiply up by 1000
  // with BN, divide by $1 Wei, ceiling up to the nearest cent,
  //  and then convert to JS number and divide back down before formatting to
  // two decimal places.
  const cents = formatUSDCWeiToCeilingDollarNumber(new BN(amountPos) as BNUSDC)
  return formatNumberCommas(cents.toFixed(precision))
}

/**
 * @deprecated Use `Number(USDC(usdc).ceil(2).toString())` from {@link FixedDecimal} instead.
 *
 * Formats a USDC BN (full precision) to a number of dollars.
 * Note: will lose precision by rounding _up_ to nearest cent.
 */
export const formatUSDCWeiToCeilingDollarNumber = (amount: BNUSDC) => {
  return (
    ceilingBNUSDCToNearestCent(amount).div(BN_USDC_CENT_WEI).toNumber() / 100
  )
}

/**
 * @deprecated Use `Number(USDC(usdc).ceil(2).toString()) * 100` from {@link FixedDecimal} instead.
 *
 * Formats a USDC BN (full precision) to a number of cents.
 * Note: will lose precision by rounding _up_ to nearest cent.
 */
export const formatUSDCWeiToCeilingCentsNumber = (amount: BNUSDC) => {
  return ceilingBNUSDCToNearestCent(amount).div(BN_USDC_CENT_WEI).toNumber()
}

/**
 * @deprecated Use `Number(USDC(usdc).floor(2).toString()` from {@link FixedDecimal} instead.
 *
 * Formats a USDC BN (full precision) to a number of dollars.
 * Note: will lose precision by rounding _down_ to nearest cent.
 */
export const formatUSDCWeiToFloorDollarNumber = (amount: BNUSDC) => {
  return floorBNUSDCToNearestCent(amount).div(BN_USDC_CENT_WEI).toNumber() / 100
}

/**
 * @deprecated Use `Number(USDC(usdc).floor(2).toString()) * 100` from {@link FixedDecimal} instead.
 *
 * Formats a USDC BN (full precision) to a number of cents.
 * Note: will lose precision by rounding _down_ to nearest cent.
 */
export const formatUSDCWeiToFloorCentsNumber = (amount: BNUSDC) => {
  return floorBNUSDCToNearestCent(amount).div(BN_USDC_CENT_WEI).toNumber()
}

/** General Wallet Utils */
export const shortenSPLAddress = (addr: string, numChars = 4) => {
  return `${addr.substring(0, numChars)}...${addr.substr(
    addr.length - numChars - 1
  )}`
}

export const shortenEthAddress = (addr: string, numChars = 4) => {
  return `0x${addr.substring(2, numChars)}...${addr.substr(
    addr.length - numChars - 1
  )}`
}
