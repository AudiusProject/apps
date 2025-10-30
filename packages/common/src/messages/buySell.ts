import { USDC } from '@audius/fixed-decimal'

import { formatTokenPrice } from '../api/tan-query/jupiter/utils'
import { getCurrencyDecimalPlaces } from '../utils/decimal'

export const buySellMessages = {
  title: 'BUY / SELL',
  buyAudioTitle: 'Buy $AUDIO',
  buy: 'Buy',
  sell: 'Sell',
  convert: 'Convert',
  youPay: 'You Pay',
  youPaid: 'You Paid',
  youReceive: 'You Receive',
  youReceived: 'You Received',
  amountUSDC: 'Amount (USDC)',
  amountAUDIO: 'Amount (AUDIO)',
  max: 'MAX',
  available: 'Available',
  availableToTrade: 'Available to Trade',
  availableBalanceTooltip: 'This is the amount you have available to spend',
  availableToTradeTooltip:
    'This is the amount you have available to trade in your built-in wallet.',
  addCash: 'Add Cash',
  audioTicker: '$AUDIO',
  usdcTicker: 'USDC',
  continue: 'Continue',
  confirmDetails: 'CONFIRM DETAILS',
  confirmReview:
    'Please review your transaction details. This action cannot be undone.',
  back: 'Back',
  confirm: 'Confirm',
  poweredBy: 'Powered by',
  helpCenter: 'Check out our help center for more info!',
  walletGuide: 'Wallet Guide',
  selectPair: 'Select Token Pair',
  buySuccess: 'Successfully purchased AUDIO!',
  sellSuccess: 'Successfully sold AUDIO!',
  transactionSuccess: 'Transaction successful!',
  transactionFailed: 'Transaction failed. Please try again.',
  transactionCancelled: 'Transaction cancelled',
  insufficientUSDC:
    "You don't have the available balance required to complete this purchase.",
  insufficientAUDIOForSale:
    "You don't have the available balance required to complete this sale.",
  modalSuccessTitle: 'SUCCESS!',
  transactionComplete: 'Your transaction is complete!',
  done: 'Done',
  coins: 'Coins',
  buySell: 'Buy/Sell',
  emptyAmount: 'Please enter an amount',
  insufficientBalance: (symbol: string) => `Insufficient ${symbol} balance`,
  minAmount: (min: number, symbol: string) => {
    // Handle very small numbers better - show more decimal places for small amounts
    let formattedMin: string
    if (min < 0.01) {
      // For very small amounts (like SOL), show up to 6 decimal places and remove trailing zeros
      formattedMin = min.toFixed(6).replace(/\.?0+$/, '')
    } else if (min >= 1) {
      // For whole numbers (like artist coins), show as integer
      formattedMin = min % 1 === 0 ? min.toString() : min.toFixed(2)
    } else {
      // For amounts between 0.01 and 1, show 2 decimal places
      formattedMin = min.toFixed(2)
    }
    return `Minimum amount is ${formattedMin} ${symbol}`
  },
  maxAmount: (max: number, symbol: string) => {
    const formattedMax = max >= 1000 ? max.toLocaleString() : max.toString()
    return `Maximum amount is ${formattedMax} ${symbol}`
  },
  priceEach: (price: number) => {
    const formatted = USDC(price).toLocaleString('en-US')
    return `(${formatted} ea.)`
  },
  amountInputLabel: (symbol: string) => `Amount (${symbol})`,
  tokenPrice: (price: string, decimalPlaces: number) => {
    return formatTokenPrice(price, decimalPlaces)
  },
  stackedBalance: (formattedAvailableBalance: string) =>
    `${formattedAvailableBalance}  Available`,
  tokenTicker: (symbol: string, isStablecoin: boolean) =>
    isStablecoin ? symbol : `${symbol}`,
  exchangeRate: (inputSymbol: string, outputSymbol: string, rate: number) =>
    `Rate 1 ${inputSymbol} ≈ ${rate} ${outputSymbol}`,
  exchangeRateLabel: 'Rate',
  exchangeRateValue: (
    inputSymbol: string,
    outputSymbol: string,
    rate: number
  ) => {
    const decimalPlaces = getCurrencyDecimalPlaces(rate)
    const formattedRate = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimalPlaces
    }).format(rate)
    return `1 ${inputSymbol} ≈ ${formattedRate} ${outputSymbol}`
  },
  formattedAvailableBalance: (
    formattedBalance: string,
    _symbol: string,
    isStablecoin: boolean,
    available: string
  ) => `${isStablecoin ? '$' : ''}${formattedBalance} ${available}`,
  help: 'Help',
  termsAgreement: 'By clicking continue, you agree to our',
  termsOfUse: 'Terms of Use',
  unableToFetchExchangeRate: 'Unable to fetch exchange rate. Please try again.'
}
