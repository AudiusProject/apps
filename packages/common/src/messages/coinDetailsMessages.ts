export const coinDetailsMessages = {
  metaTags: {
    getTitle: (coinName?: string, ticker?: string) =>
      coinName && ticker ? `${coinName} ($${ticker})` : (coinName ?? ''),
    getDescription: (coinName?: string, ticker?: string, handle?: string) =>
      coinName && ticker && handle
        ? `${coinName} ($${ticker}) is @${handle}'s fan club on Audius — hold it for perks, exclusives, and community access.`
        : undefined
  },
  balance: {
    becomeAMember: 'Become a member',
    hintDescription: (title: string) =>
      `Buy ${title} to join the fan club and unlock members-only perks.`
  },
  coinInfo: {
    loading: 'Loading...',
    createdBy: 'Created By',
    description1: (title: string) =>
      `${title} is a fan club token on Audius. Use it to support the artist, unlock exclusive content, and take part in the community.`,
    description2: (title: string) =>
      `Holding ${title} gives you fan club access and helps support your favorite artists on Audius.`,
    fanClubDetailsTitle: 'Fan Club Details',
    learnMore: 'Learn More',
    viewLeaderboard: 'View Leaderboard',
    title: 'Bronze +',
    profileFlair: 'Profile Flair',
    customDiscordRole: 'Custom Discord Role',
    messageBlasts: 'Message Blasts',
    openDiscord: 'Open The Discord',
    refreshDiscordRole: 'Refresh Discord Role',
    browseRewards: 'Browse Rewards',
    uploadExclusiveTrack: 'Upload Exclusive Track',
    rewardTiers: 'Reward Tiers',
    discordDisabledTooltip: (coinTicker: string = '') =>
      `Buy $${coinTicker} to access the members-only Discord`
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
    editCoin: 'Edit Fan Club',
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
      `My fan club $${coinTicker} is live on @Audius. Join to unlock exclusives and perks for members.\n\n${coinAddress}\n`,
    shareToXUserCopy: (
      coinTicker: string,
      artistHandle: string,
      coinAddress: string
    ) =>
      `Check out @${artistHandle}'s fan club $${coinTicker} on @Audius!\n\n${coinAddress}\n`,
    tooltips: {
      rewardsPool:
        'Artists can use this balance to incentivize challenges and reward loyal fans.',
      vestingSchedule:
        "Once a fan club token graduates into the open market, the artist's reserved tokens are unlocked daily over a 5-year period. Artists can claim unlocked tokens every day or let them accumulate.",
      artistEarnings:
        'The total revenue this artist has earned from trading fees on their fan club token.',
      unclaimedEarnings:
        'The amount of trading fees you are currently able to claim.',
      locked:
        'The amount of your reserved fan club tokens that are still locked and not yet available to claim.',
      unlocked:
        'The total amount of your reserved fan club tokens that have unlocked since graduation.',
      availableToClaim:
        'The amount of unlocked fan club tokens you can claim right now. This increases daily over the 5-year vesting period.'
    }
  },
  artistCoinDetails: {
    title: 'Fan Club Details',
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
        'A unique address that identifies this fan club token on the Solana blockchain to prevent imposters.',
      onChainDescription:
        'A simple description of this fan club token on the Solana blockchain to prevent imposters.',
      totalSupply:
        'The total number of this fan club token that will ever exist. This amount is fixed and never changes.',
      marketCap:
        'The current total value of this fan club token, calculated by multiplying the current price by the total supply.',
      price: 'The current price of a single fan club token in USD.',
      liquidity:
        'The amount of funds available for trading this fan club token, which affects how easily it can be bought and sold.'
    }
  },
  editCoinDetails: {
    pageTitle: 'Edit Fan Club Page',
    tokenDetails: 'Token Details',
    description: 'Description',
    socialLinks: 'Social Links',
    socialLink: 'Link',
    addAnotherLink: 'Add another link',
    saveChanges: 'Save Changes',
    optional: '(Optional)',
    descriptionPlaceholder:
      'Tell fans what makes your fan club special — early listens, exclusive drops, merch, or perks for members.',
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
        'The total amount of your reserved fan club tokens that have unlocked and are available to claim now.',
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
