export type PurchaseInfo = {
  desiredAmount: number
}

export enum BuyUSDCStage {
  START = 'START',
  PURCHASING = 'PURCHASING',
  CONFIRMING_PURCHASE = 'CONFIRMING_PURCHASE',
  CANCELED = 'CANCELED',
  FINISH = 'FINISH'
}

export enum BuyUSDCErrorCode {
  MinAmountNotMet = 'MinAmountNotMet',
  MaxAmountExceeded = 'MaxAmountExceeded',
  OnrampError = 'OnrampError',
  CountryNotSupported = 'CountryNotSupported'
}

export class BuyUSDCError extends Error {
  constructor(
    public code: BuyUSDCErrorCode,
    message: string
  ) {
    super(message)
  }
}
