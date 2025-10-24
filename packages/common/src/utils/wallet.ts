import { AmountObject } from '~/store/ui'

export const WALLET_COUNT_LIMIT = 5

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
