export type BadgeTier = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum'

export type AudioTiers = Exclude<BadgeTier, 'none'>

export const features = [
  'balance',
  'hqStreaming',
  'unlimitedUploads',
  'uploadOnMobile',
  'offlineListening',
  'gatedContent',
  'directMessaging',
  'messageBlasts',
  'flairBadges',
  'customDiscordRole',
  'customThemes'
] as const

export type FeatureKey = (typeof features)[number]

export const featureMessages: Record<FeatureKey, string> = {
  balance: '$AUDIO Balance',
  hqStreaming: 'HQ Streaming',
  unlimitedUploads: 'Unlimited Uploads',
  uploadOnMobile: 'Upload on Mobile',
  offlineListening: 'Offline Listening',
  gatedContent: 'Gated Content',
  directMessaging: 'Direct Messaging',
  messageBlasts: 'Message Blasts',
  flairBadges: 'Flair Badges',
  customDiscordRole: 'Custom Discord Role',
  customThemes: 'App Themes'
}

export const tierFeatureMap: Record<BadgeTier, Record<FeatureKey, boolean>> = {
  none: {
    balance: true,
    hqStreaming: true,
    unlimitedUploads: true,
    uploadOnMobile: true,
    offlineListening: true,
    gatedContent: true,
    directMessaging: true,
    messageBlasts: false,
    flairBadges: false,
    customDiscordRole: false,
    customThemes: false
  },
  bronze: {
    balance: true,
    hqStreaming: true,
    unlimitedUploads: true,
    uploadOnMobile: true,
    offlineListening: true,
    gatedContent: true,
    directMessaging: true,
    messageBlasts: true,
    flairBadges: true,
    customDiscordRole: true,
    customThemes: false
  },
  silver: {
    balance: true,
    hqStreaming: true,
    unlimitedUploads: true,
    uploadOnMobile: true,
    offlineListening: true,
    gatedContent: true,
    directMessaging: true,
    messageBlasts: true,
    flairBadges: true,
    customDiscordRole: true,
    customThemes: false
  },
  gold: {
    balance: true,
    hqStreaming: true,
    unlimitedUploads: true,
    uploadOnMobile: true,
    offlineListening: true,
    gatedContent: true,
    directMessaging: true,
    messageBlasts: true,
    flairBadges: true,
    customDiscordRole: true,
    customThemes: true
  },
  platinum: {
    balance: true,
    hqStreaming: true,
    unlimitedUploads: true,
    uploadOnMobile: true,
    offlineListening: true,
    gatedContent: true,
    directMessaging: true,
    messageBlasts: true,
    flairBadges: true,
    customDiscordRole: true,
    customThemes: true
  }
}
