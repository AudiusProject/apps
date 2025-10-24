export const visibilityMessages = {
  title: 'Track Privacy',
  description:
    'Adjust your track’s visibility or schedule it for later release.',
  public: 'Public',
  publicDescription: 'Available to everyone on Audius.',
  hidden: 'Hidden',
  hiddenDescription: 'Only you and those with a direct link will have access.',
  scheduledRelease: 'Scheduled Release',
  scheduledReleaseDescription:
    'Prepare your release ahead of time, then choose when it becomes public.',
  dateLabel: 'Release Date',
  timeLabel: 'Time',
  futureReleaseHint: (timezone: string) =>
    `This will be released at the selected date/time in your local timezone (${timezone}).`
}

export const priceAndAudienceMessages = {
  title: 'Price & Audience',
  freePremiumDescription: 'Control who can access your track.',
  specialAccessDescription:
    "Customize your music's audience and create gated experiences for your fans.",
  free: 'Free for Everyone',
  premium: 'Premium',
  specialAccess: 'Special Access',
  coinGated: 'Coin Gated',
  hidden: 'Hidden',
  followersOnly: 'Followers Only',
  supportersOnly: 'Supporters Only',
  markedAsRemix:
    'This track is marked as a remix. To enable additional availability options, unmark within Remix Settings.',
  done: 'Done',
  publishDisabled:
    'Publishing is disabled for empty albums and albums containing hidden tracks.',
  fromFreeHint: (
    contentType: 'album' | 'track',
    gatedType: 'gated' | 'premium'
  ) => `You can't make a free ${contentType} ${gatedType}.`,
  freeRadio: {
    title: 'Free for Everyone',
    description: (contentType: 'album' | 'track') =>
      `Everyone can stream your ${contentType} for free.`
  },
  premiumRadio: {
    title: 'Premium',
    description: (contentType: 'album' | 'track') =>
      `Only those who purchase can stream your ${contentType}.`,
    waitlist:
      'Start selling your music on Audius today! Limited access beta now available.',
    join: 'Join the Waitlist',
    comingSoon: 'Coming Soon'
  },
  specialAccessRadio: {
    title: 'Special Access',
    description: 'Anyone who meets your selected criteria can stream.',
    followersOnly: 'Followers Only',
    supportersOnly: 'Supporters Only'
  },
  tokenGatedRadio: {
    title: 'Coin Gated',
    yourCoin: 'your coin',
    noCoins: 'No coins found. Launch a coin to enable this option.',
    description: (coinTicker: string) =>
      `Anyone holding $${coinTicker} can stream.`
  }
}

export const advancedTrackMessages = {
  title: 'Advanced',
  description: 'Share metadata to help manage your music.',
  isAiGenerated: 'AI-Generated',
  bpm: {
    header: 'Tempo',
    label: 'BPM',
    validError: 'Must be a valid decimal number'
  },
  musicalKey: 'Key',
  aiGenerated: {
    header: 'AI Generated',
    description: 'Mark this track as AI generated',
    tooltip:
      'If your AI-generated track was trained on an existing Audius artist, you can give them credit here. Only users who have opted-in will appear in this list.',
    placeholder: 'Search for Users',
    requiredError: 'Valid user must be selected.'
  },
  apiAllowed: {
    header: 'Disallow Streaming via the API',
    description:
      'Exclude from third-party apps or services, which utilize the Audius API.'
  },
  disableComments: {
    header: 'Disable Comments',
    description: 'Prevent anyone from commenting on your track.',
    value: 'Comments Disabled'
  },
  isrcTooltip: `ISRC is used to identify individual sound recordings and music videos. ISWC is used to identify the underlying musical composition – the music and lyrics`,
  isrc: {
    header: 'ISRC',
    placeholder: 'CC-XXX-YY-NNNNN',
    validError: 'Must be valid ISRC format.'
  },
  iswc: {
    header: 'ISWC',
    placeholder: 'T-345246800-1',
    validError: 'Must be valid ISWC format.'
  },
  licenseType: 'License Type',
  allowAttribution: {
    header: 'Allow Attribution?',
    options: {
      false: 'No Attribution',
      true: 'Allow Attribution'
    }
  },
  commercialUse: {
    header: 'Commercial Use?',
    options: {
      false: 'Non-Commercial Use',
      true: 'Commercial Use'
    }
  },
  derivativeWorks: {
    header: 'Derivative Works?',
    options: {
      false: 'Not-Allowed',
      true: 'Share-Alike',
      null: 'Allowed'
    }
  },
  noLicense: 'All Rights Reserved',
  releaseDate: 'Release Date',
  coverAttribution: {
    toggle: {
      header: 'This Song is a Cover',
      description: 'This track was written by another artist.'
    },
    attribution: {
      header: 'Cover Attribution',
      description:
        'If your song is a cover, please provide the original title and creator’s name.',
      originalSongTitle: 'Original Song Title',
      originalSongArtist: 'Original Artist'
    },
    selectedValue: 'Cover'
  }
}

export const stemsAndDownloadsMessages = {
  title: 'Stems & Downloads',
  description: 'Provide additional files available for download.',
  values: {
    allowDownload: 'Full Track Available',
    followerGated: 'Followers Only'
  },
  price: (price: number) =>
    price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export const advancedAlbumMessages = {
  title: 'Advanced',
  description:
    'Provide detailed metadata to help identify and manage your music.',
  upcValue: 'UPC',
  upcTitle: 'UPC (Universal Product Code)',
  upcDescription:
    'A Universal Product Code (UPC) is a unique barcode that identifies music releases. EAN-13 compatible.',
  upcInputLabel: 'UPC',
  upcInputError: 'Invalid UPC',
  releaseDate: {
    title: 'Release Date',
    label: 'Release date'
  }
}

export const remixSettingsMessages = {
  title: 'Remix Settings',
  description: 'Identify your track as a remix and adjust the settings.',
  remixesHidden: 'Remixes Hidden',
  remixOf: 'Remix of',
  hideRemixField: {
    header: 'Hide Remixes of This Track',
    description: "Stop other artists' remixes from showing on your track page."
  },
  remixOfField: {
    header: 'Identify as Remix',
    description:
      'Link your remix to the original for visibility and artist credit.',
    linkLabel: 'Link to original track'
  }
}
