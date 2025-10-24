import type {
  CoinInfo,
  SuccessDisplayData,
  CoinPair
} from '@audius/common/store'

export type BuySellScreenParams = {
  initialTab?: 'buy' | 'sell' | 'convert'
  coinTicker?: string
}

export type ConfirmSwapScreenParams = {
  confirmationData: {
    payTokenInfo: CoinInfo
    receiveTokenInfo: CoinInfo
    payAmount: number
    receiveAmount: number
    pricePerBaseToken: number
    baseTokenSymbol: string
    exchangeRate?: number | null
  }
  activeTab: 'buy' | 'sell' | 'convert'
  selectedPair: CoinPair
}

export type TransactionResultScreenParams = {
  result: {
    status: 'success' | 'error'
    data?: SuccessDisplayData
    error?: { message?: string }
  }
}

// This will be extended with the main app navigation types when integrated
export type BuySellStackParamList = {
  BuySellMain: BuySellScreenParams
  ConfirmSwapScreen: ConfirmSwapScreenParams
  TransactionResultScreen: TransactionResultScreenParams
}
