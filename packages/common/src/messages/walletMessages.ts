export const walletMessages = {
  // CashWallet messages
  cashBalance: 'Cash Balance',
  withdraw: 'Withdraw',
  addCash: 'Add Cash',
  usdcTransfer: 'USDC Transfer',
  poweredBy: 'Powered by',
  cashBalanceTooltip:
    'Your cash balance is stored as USDC in your built-in wallet',
  max: 'MAX',
  dollarSign: '$',
  minus: '-',

  payoutWallet: 'Payout Wallet',
  transactionHistory: 'Transaction History',
  cashTransferDescription:
    'Transfer your cash balance to your bank account or debit card. $5 minimum.',
  back: 'Back',
  tryAgain: 'Try Again?',
  error: 'An error occured.',
  close: 'Close',

  // Withdraw USDC messages
  withdrawCash: 'Withdraw Cash',
  continue: 'Continue',
  amountToWithdraw: 'Amount to Withdraw',
  howMuch: 'How much do you want to withdraw?',
  amountToWithdrawLabel: 'Amount (USDC)',
  bankAccount: 'Bank Account',
  crypto: 'Crypto',

  destination: 'Destination Address',
  destinationDescription: 'Solana USDC wallet address to receive funds.',
  destinationRequired: 'Destination address is required',
  transferDescription:
    'Transfer your cash balance to your bank account or debit card. $5 minimum.',
  transferMethod: 'Transfer Method',
  reviewDetails: 'Review Details Carefully',
  disclaimer:
    'By proceeding, you accept full responsibility for any errors, including the risk of irreversible loss of funds. Transfers are final and cannot be reversed.',
  iHaveReviewed:
    'I have reviewed the information and understand that transfers are final.',
  sent: 'Sent',
  sendTokensAmount: 'Amount',
  sendTokensAmountToSend: 'Amount to Send',
  sendTokensDestinationAddress: 'Destination Address',
  sendTokensWalletAddress: 'Wallet Address',
  sendTokensAmountRequired: 'Amount is required',
  sendTokensAmountInsufficient: 'Insufficient balance',
  sendTokensInvalidAddress: 'A valid wallet address is required',
  sendTokensInvalidAmount: 'Invalid amount',
  sendTokensDisclaimer:
    'By proceeding, you accept full responsibility for any errors, including the risk of irreversible loss of funds. Transfers are final and cannot be reversed.',
  sendTokensTransactionInProgress: 'Transaction in Progress',

  // PrepareTransfer messages
  holdOn: 'Hold on!',
  preparingTransfer:
    "We're getting your transfer ready. This could take a few moments. Please don't leave this page.",

  // TransferInProgress messages
  transferInProgress: 'Transfer in Progress',
  thisMayTakeAMoment: 'This may take a moment.',

  // TransferSuccessful messages
  amountWithdrawn: 'Amount Withdrawn',
  viewOnExplorer: 'View on Solana Block Explorer',
  transactionComplete: 'Your transaction is complete!',
  done: 'Done',
  confirm: 'Confirm',

  // Error messages
  errors: {
    insufficientBalance: 'Insufficient cash balance',
    insufficientBalanceDetails:
      'Your cash balance is insufficient to complete this transaction.',
    amountTooLow: 'Amount must be greater than zero.',
    invalidAddress: 'A valid Solana USDC wallet address is required',
    minCashTransfer: 'A minimum of $5 is required for cash withdrawals.',
    pleaseConfirm:
      'Please confirm you have reviewed this transaction and accept responsibility for errors.',
    youMustConfirm:
      'You must confirm that you’ve reviewed and understand before continuing.',
    unableToLoadBalance: 'Unable to load balance information'
  },

  buySell: 'Buy/Sell',
  buy: 'Buy',
  send: 'Send',
  receive: 'Receive',
  buySellNotSupported: 'This is not supported in your region',
  buySellNotSupportedManagerMode: 'This is not supported as a manager',

  // ReceiveTokensModal messages
  receiveTokensTitle: 'receive',
  receiveTokensExplainer: 'Send tokens to your built in Audius wallet.',
  receiveTokensDisclaimer: 'Use caution to avoid errors and lost funds.',
  receiveTokensLearnMore: 'Learn More',
  receiveTokensCopy: 'Copy Wallet Address',
  receiveTokensClose: 'Close',
  receiveTokensCopied: 'Copied to Clipboard!',
  receiveTokensLoadingTitle: 'Hold on',
  receiveTokensLoadingSubtitle: 'Setting up your wallet',
  becomeMemberTitle: 'Become a member',
  becomeMemberBody: (coinTicker: string) =>
    `Buy $${coinTicker} to gain access to exclusive members-only perks!`,

  // Linked Wallets messages
  linkedWallets: {
    titleHasWallets: 'Linked Wallets ',
    titleNoWallets: 'Link External Wallet',
    count: (count: number) => `(${count}/5)`,
    addWallet: 'Add Linked Wallet',
    copied: 'Copied To Clipboard!',
    copy: 'Copy Address',
    remove: 'Remove Wallet',
    options: 'Options',
    newWalletConnected: 'New Wallet Successfully Connected!',
    error: 'Something went wrong. Please try again.',
    walletAlreadyAdded: 'No new wallets selected to connect.',
    linkedWallet: (index: number) => `Linked Wallet ${index + 1}`,
    wallet: (index: number) => `Wallet ${index + 1}`,
    linkWallet:
      'Link an external wallet to take advantage of in-app features, and take full control of your assets.',
    toasts: {
      walletRemoved: 'Wallet removed successfully!',
      error: 'Error removing wallet'
    }
  },

  // Artist Coins messages
  artistCoins: {
    title: 'Discover Artist Coins',
    searchPlaceholder: 'Search Artist Coins',
    noCoins: 'No results found',
    noCoinsDescription: 'No Artist Coins were found matching your search.',
    sortTitle: 'SORT',
    sortAscending: 'Ascending',
    sortDescending: 'Descending',
    sortPrice: 'Price',
    sortMarketCap: 'Market Cap',
    sortVolume: 'Volume',
    sortLaunchDate: 'Launch Date',
    sortHolders: 'Holders'
  },

  // Balance History messages
  balanceHistory: {
    loading: 'Loading balance history...',
    error: 'Unable to load balance history'
  }
}
