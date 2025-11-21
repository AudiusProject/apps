import { BuyUSDCErrorCode } from '../buy-usdc'

export enum PurchaseableContentType {
  TRACK = 'track',
  ALBUM = 'album'
}

export enum PurchaseContentStage {
  IDLE = 'IDLE',
  START = 'START',
  BUY_USDC = 'BUY_USDC',
  CONFIRM_GUEST = 'CONFRM_GUEST',
  PURCHASING = 'PURCHASING',
  CONFIRMING_PURCHASE = 'CONFIRMING_PURCHASE',
  CANCELED = 'CANCELED',
  FINISH = 'FINISH'
}

export enum PurchaseContentPage {
  PURCHASE = 'purchase',
  GUEST_CHECKOUT = 'guest-checkout',
  TRANSFER = 'crypto-transfer'
}

export enum PurchaseErrorCode {
  Canceled = 'Canceled',
  InsufficientBalance = 'InsufficientBalance',
  InsufficientExternalTokenBalance = 'InsufficientExternalTokenBalance',
  NoQuote = 'NoQuote',
  SwapFailed = 'SwapFailed',
  Unknown = 'Unknown'
}

export type PurchaseContentErrorCode = BuyUSDCErrorCode | PurchaseErrorCode

export class PurchaseContentError extends Error {
  constructor(
    public code: PurchaseContentErrorCode,
    message: string
  ) {
    super(message)
  }
}
