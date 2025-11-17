/**
 * Errors here are complicated & a sensitive area for users, so we want to log lots of info
 */
export type LaunchCoinErrorMetadata = {
  userId: number
  lastStep: string
  relayResponseReceived: boolean
  poolCreateConfirmed: boolean
  sdkCoinAdded: boolean
  firstBuyConfirmed: boolean
  requestedFirstBuy: boolean
  createPoolTx: string
  firstBuyTx: string | undefined
  initialBuyAmountAudio: string | undefined
  coinMetadata: {
    mint: string
    imageUri: string
    name: string
    symbol: string
    description: string
    walletAddress: string
  }
}

export type LaunchCoinResponse = {
  isError: boolean
  errorMetadata: LaunchCoinErrorMetadata
  newMint: string
  logoUri: string
}

export type LaunchpadFormValues = {
  coinName: string
  coinSymbol: string
  coinImage: File | null
  payAmount: string
  receiveAmount: string
  usdcValue: string
  wantsToBuy: 'yes' | 'no'
  setupConfirmation: boolean
  termsAgreed: boolean
}
