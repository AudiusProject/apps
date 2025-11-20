export const coinDetailsMessages = {
  metaTags: {
    getTitle: (coinName?: string, ticker?: string) =>
      coinName && ticker ? `${coinName} ($${ticker})` : (coinName ?? ''),
    getDescription: (coinName?: string, ticker?: string, handle?: string) =>
      coinName && ticker && handle
        ? `${coinName} ($${ticker}) is an artist coin created by @${handle} on Audius`
        : undefined
  },
  balance: {
    becomeAMember: 'Become a Member',
    hintDescription: (title: string) =>
      `Buy ${title} to gain access to exclusive members-only perks!`
  },
  coinInfo: {
    loading: 'Loading...',
    createdBy: 'Created By',
    description1: (title: string) =>
      `${title} is a community token on the Audius platform. You can use ${title} for tipping artists, participating in community activities, and engaging with the decentralized music ecosystem.`,
    description2: (title: string) =>
      `Holding ${title} gives you access to exclusive features and helps support your favorite artists on Audius.`,
    learnMore: 'Learn More',
    viewLeaderboard: 'View Leaderboard',
    title: 'Bronze +',
    profileFlair: 'Profile Flair',
    customDiscordRole: 'Custom Discord Role',
    messageBlasts: 'Message Blasts',
    openDiscord: 'Open The Discord',
    refreshDiscordRole: 'Refresh Discord Role',
    browseRewards: 'Browse Rewards',
    rewardTiers: 'Reward Tiers',
    discordDisabledTooltip: (coinTicker: string = '') =>
      `Buy $${coinTicker} to access the members only Discord`
  },
  coinInsights: {
    title: 'Insights',
    pricePerCoin: 'Price',
    holdersOnAudius: 'Holders on Audius',
    uniqueHolders: 'Unique Holders',
    totalVolume: 'Volume (All-Time)',
    marketCap: 'Market Cap',
    unableToLoad: 'Unable to load insights',
    graduated: 'Graduated',
    preGraduation:
      'Until graduation, the price of this coin is tied to the controlled distribution of supply.',
    postGraduation:
      'This coin has graduated. The price is determined by the open market.',
    edit: 'Edit Details'
  },
  coinLeaderboard: {
    title: 'Members Leaderboard',
    leaderboard: 'Leaderboard'
  },
  externalWallets: {
    noBalanceTitle: 'Link External Wallet',
    hasBalanceTitle: 'Balance Breakdown',
    description:
      'Link an external wallet to take advantage of in-app features, and take full control of your assets.',
    loadingText: 'Loading...',
    buttonText: 'Add External Wallet',
    copied: 'Copied To Clipboard!',
    copy: 'Copy Wallet Address',
    remove: 'Remove Wallet',
    options: 'Options',
    newWalletConnected: 'New Wallet Successfully Connected!',
    error: 'Something went wrong. Please try again.',
    walletAlreadyAdded: 'No new wallets selected to connect.',
    builtIn: 'Built-In Wallet',
    toasts: {
      walletRemoved: 'Wallet removed successfully!',
      error: 'Error removing wallet'
    }
  },
  overflowMenu: {
    copyCoinAddress: 'Copy Coin Address',
    copyLink: 'Copy Link',
    editCoin: 'Edit Coin',
    rewardsPool: 'Rewards Pool',
    unclaimedEarnings: 'Unclaimed Earnings',
    artistEarnings: 'Artist Earnings',
    vestingSchedule: 'Unlock Schedule',
    vestingScheduleValue: '5 years (post-graduation)',
    locked: 'Locked',
    unlocked: 'Unlocked',
    availableToClaim: 'Available to claim',
    $audio: '$AUDIO',
    claim: 'Claim',
    openBirdeye: 'Open Birdeye',
    details: 'Details',
    copiedToClipboard: 'Copied Coin Address To Clipboard!',
    copiedLinkToClipboard: 'Copied Link To Clipboard!',
    shareToX: 'Share to X',
    shareToXArtistCopy: (coinTicker: string, coinAddress: string) =>
      `My artist coin $${coinTicker} is live on @Audius. Be the first to buy and unlock my exclusive fan club!\n\n${coinAddress}\n`,
    shareToXUserCopy: (
      coinTicker: string,
      artistHandle: string,
      coinAddress: string
    ) =>
      `Check out @${artistHandle}'s artist coin $${coinTicker} on @Audius!\n\n${coinAddress}\n`,
    tooltips: {
      rewardsPool:
        'Artists can use this balance to incentivize challenges and reward loyal fans.',
      vestingSchedule:
        "Once an Artist Coin graduates into the open market, the artist's reserved Coins are unlocked daily over a 5-year period. Artists can claim their unlocked Coins every day, or let them accumulate over time.",
      artistEarnings:
        'The total revenue this artist has earned from the trading fees on their Artist Coin.',
      unclaimedEarnings:
        'The amount of trading fees you are currently able to claim.',
      locked:
        'The amount of your reserved Artist Coins that are still locked and not yet available to claim.',
      unlocked:
        'The total amount of your reserved Artist Coins that have unlocked since graduation.',
      availableToClaim:
        'The amount of unlocked Artist Coins you can claim right now. This increases daily over the 5-year vesting period.'
    }
  },
  artistCoinDetails: {
    title: 'Artist Coin Details',
    details: 'Details',
    coinAddress: 'Coin Address',
    onChainDescription: 'On-Chain Description',
    totalSupply: 'Total Supply',
    marketCap: 'Market Cap',
    price: 'Current Price',
    liquidity: 'Liquidity',
    circulatingSupply: 'Circulating Supply',
    close: 'Close',
    copied: 'Copied to clipboard!',
    tooltips: {
      coinAddress:
        'A unique address that identifies this Artist Coin on the Solana blockchain to prevent imposters.',
      onChainDescription:
        'A simple description of this Artist Coin on the Solana blockchain to prevent imposters.',
      totalSupply:
        'The total number of this Artist Coin that will ever exist. This amount is fixed and never changes.',
      marketCap:
        'The current total value of this Artist Coin, calculated by multiplying the current price by the total supply.',
      price: 'The current price of a single Artist Coin in USD.',
      liquidity:
        'The amount of funds available for trading this Artist Coin, which affects how easily it can be bought and sold.'
    }
  },
  editCoinDetails: {
    pageTitle: 'Edit Coin Page',
    tokenDetails: 'Token Details',
    description: 'Description',
    socialLinks: 'Social Links',
    socialLink: 'Link',
    addAnotherLink: 'Add another link',
    saveChanges: 'Save Changes',
    optional: '(Optional)',
    descriptionPlaceholder:
      'Tell fans what makes your artist coin special — think early listens, exclusive drops, or fun perks for your biggest supporters.',
    pasteLink: 'Paste a link',
    bannerChange: 'Change Banner',
    bannerErrors: {
      invalidFileType: 'Please select a JPEG, PNG, or WebP image file',
      fileTooLarge: 'File size must be less than 15MB',
      processingError: 'Unable to process this file. Please try another image.'
    }
  },
  claimVestedCoinsModal: {
    title: 'Claim',
    rewardsPoolAllocation: 'Rewards Pool Allocation',
    rewardsPoolDescription:
      'Allocate a portion of your unlocked coins towards the community rewards pool.',
    claimable: 'Unlocked Coins',
    yourShare: 'Your Share',
    rewardsPool: 'Rewards Pool',
    claim: 'Claim',
    tooltips: {
      rewardsPoolAllocation:
        'Choose what percentage of your unlocked coins you want to allocate to the community rewards pool. The remaining percentage will be claimed directly to your built-in wallet.',
      claimable:
        'The total amount of your reserved Artist Coins that have unlocked and are available to claim now.',
      yourShare:
        'The amount of unlocked coins that will be claimed directly to your built-in wallet based on your allocation percentage.',
      rewardsPool:
        'The amount of unlocked coins that will be allocated to the community rewards pool based on your allocation percentage. These coins can be used to reward your community members.'
    }
  },
  toasts: {
    feesClaimed: 'Fees claimed successfully!',
    feesClaimFailed: 'Unable to claim fees. Please try again.',
    vestedCoinsClaimed: 'Vested coins claimed successfully!',
    vestedCoinsClaimFailed: 'Unable to claim vested coins. Please try again.',
    incorrectWalletLinked:
      'Incorrect wallet linked. Use the same wallet used to launch the coin.'
  }
}
