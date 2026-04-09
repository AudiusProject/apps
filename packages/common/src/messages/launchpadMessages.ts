export const launchpadMessages = {
  toast: {
    coinCreated: 'Coin created! Transaction confirmed.'
  },
  modal: {
    congratsTitle: '🎉 CONGRATS!',
    congratsDescription:
      'Your Fan Club on Audius is now live, powered by your new fan club. Time to share the good news with your fans.',
    purchaseSummaryTitle: 'PURCHASE SUMMARY',
    addressTitle: 'COIN ADDRESS',
    shareToX: 'Share to X',
    visitFanClub: 'Visit Fan Club',
    uploadCoinGatedTrack: 'Upload Exclusive Track'
  },
  page: {
    title: 'Create Fan Club',
    walletAdded: 'Wallet connected successfully'
  },
  splash: {
    whyTitle: 'Why Create a Fan Club?',
    whyDescription:
      'Create new ways to earn, reward your fans, and grow your community – all powered by your fan club.',
    getPaidTitle: 'Get Paid',
    getPaidDescription: 'Earn fees whenever fans buy or sell your coin.',
    rewardFansTitle: 'Reward Fans',
    rewardFansDescription: 'Give holders exclusive content, music, or perks.',
    growCommunityTitle: 'Grow Community',
    growCommunityDescription: 'Strengthen bonds with your biggest supporters.',
    readyTitle: 'Ready to launch?',
    readyDescription:
      'Connect your wallet to launch a Fan Club powered by your fan club.',
    readyDescription2:
      'It only takes a few steps to set things up and share it with your fans.',
    getStarted: 'Get Started!',
    verifiedOnlyTooltip:
      'Verified users only. Request verification in settings.'
  },
  walletSetup: {
    title: 'How to Get Ready',
    subtitle: 'Go through this checklist to prepare for launch.',
    installWallet:
      'Install your wallet (Phantom, etc.) on this browser & device.',
    haveSol: 'Have a little $SOL (~0.015) ready to cover setup costs.',
    addAudioPrefix: 'Add or ',
    addAudioSend: 'send',
    addAudioSuffix:
      ' $AUDIO to your external wallet if you plan to buy your coin early.',
    newToWallets: 'New to wallets?',
    learnMore: 'Learn more'
  },
  setup: {
    stepInfo: (totalSteps: number) => `STEP 1 of ${totalSteps}`,
    title: 'Set Up Your Coin',
    description:
      'This is your one and only coin. Its name, symbol, and image are permanent once launched, so choose carefully.',
    confirmationLead: 'I understand these details are permanent and ',
    confirmationStrong: 'cannot be changed later',
    confirmationPeriod: '.'
  },
  review: {
    stepInfo: (totalSteps: number) => `STEP 2 of ${totalSteps}`,
    title: 'Review Your Coin',
    description:
      'Make sure everything looks correct before creating your coin.',
    initialPrice: 'INITIAL PRICE',
    coinDetails: 'Coin Details',
    yourOwnership: 'Your Ownership',
    totalSupply: 'Total Supply',
    initialMarketCap: 'Initial Market Cap',
    graduationMarketCap: 'Graduation Market Cap',
    allocation: 'Allocation',
    vesting: 'Unlocking',
    tradingFees: 'Trading Fees',
    back: 'Back',
    hintMessage:
      "Remember! This is your one and only coin and its details can't be changed later.",
    tooltips: {
      totalSupply:
        'The total number of your fan clubs that will ever exist. This amount is fixed and never changes.',
      initialMarketCap:
        'The starting value of your fan club at launch, based on the initial price and supply. These values are the same for all fan clubs.',
      graduationMarketCap:
        'The market cap your fan club will reach when it graduates into the open market.',
      allocation:
        "The percentage of your total fan club supply reserved for you as the creator. You'll receive this gradually through unlocking.",
      vesting:
        "Once your fan club graduates into the open market, your reserved coins are unlocked daily over a 5-year period. You can claim your unlocked coins every day, or let them accumulate as long as you'd like.",
      tradingFees:
        'You earn half of all trading fees for all trades of your fan club. Trading fees are 1%.'
    }
  },
  buy: {
    stepInfo: (totalSteps: number) => `STEP 3 of ${totalSteps}`,
    title: 'Claim Your Share First',
    optional: 'optional',
    description:
      'Before your fan club goes live, do you want to buy some at the lowest price?',
    youPay: 'You Pay',
    youReceive: 'You Receive',
    valueInUSDC: 'Value',
    hintMessage:
      "Buying shares now makes sure you can get in at the lowest price before others beat you to it. You'll still receive your vested coins over time after your coin reaches its graduation market cap (1M $AUDIO).",
    back: 'Back',
    errors: {
      quoteError: 'Failed to get a quote. Please try again.',
      valueTooHigh: 'Value is too high. Please enter a lower value.',
      insufficientBalance: 'Insufficient $AUDIO balance.',
      transactionFailed: 'Transaction failed. Please try again.'
    },
    launchFanClub: 'Launch Fan Club',
    max: 'MAX',
    audioBalance: (balance: string) => `${balance} $AUDIO`,
    buyAudio: 'Buy $AUDIO',
    audioInputLabel: 'AUDIO',
    radios: {
      no: 'No, thanks.',
      yes: 'Yes, I want to buy my fan club.'
    }
  },
  submitModal: {
    awaitingConfirmation: 'Awaiting Confirmation',
    launchingDescription: (numTxs: number) =>
      `You have ${numTxs} transaction${numTxs > 1 ? 's' : ''} to sign. Please don't close this page.`,
    couldTakeAMoment: 'This could take a moment.',
    submitTitle: 'Create Fan Club',
    insufficientBalanceTitle: 'Check your wallet balance',
    insufficientBalanceDescription:
      "You'll need to add funds to your wallet before you can continue.",
    solAmount: '0.03 SOL',
    solDescription: ' — required to create your fan club',
    audioDescription:
      '• Extra $AUDIO if you want to make an initial buy of your fan club (optional).',
    hintText:
      'Add SOL to your connected wallet, or send $AUDIO from your Audius wallet',
    learnHowToFund: 'Learn how to fund your wallet',
    sendAudio: 'Send $AUDIO',
    addressTitle: 'Token Address',
    errors: {
      notInAudiusBody:
        "It's live on the blockchain but not showing in Audius yet. Use the address below to view it and check back later once it's connected.",
      yourFanClubIsLive: 'YOUR FAN CLUB IS LIVE! 🎉',
      unknownErrorDescription: (coinLaunched: boolean) =>
        `Something unexpected went wrong ${coinLaunched ? 'but your fan club is live on the blockchain' : ''}`,
      unknownErrorTitle: 'Something went wrong'
    }
  }
}
