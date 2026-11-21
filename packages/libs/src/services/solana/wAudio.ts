import BN from 'bn.js'

const MIN_WAUDIO_AMOUNT = new BN('10000000000')

export const wAudioFromWeiAudio = (amount: BN) => {
  if (amount.lt(MIN_WAUDIO_AMOUNT)) {
    throw new Error(
      `${amount.toString()} is below minimum bounds ${MIN_WAUDIO_AMOUNT.toString()}`
    )
  }
  // @ts-expect-error divmod not in types for some reason
  const { div, mod } = amount.divmod(MIN_WAUDIO_AMOUNT)
  if (!mod.isZero()) {
    throw new Error(
      `${amount.toString()} is too precise for conversion to wAudio. Remainder: ${mod.toString()}`
    )
  }
  return div
}
