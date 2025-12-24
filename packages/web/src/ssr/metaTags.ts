/**
 * SSR Meta Tags Utilities
 * Duplicated logic from general-admission for SSR meta tag generation
 */

// Image URLs
export const DEFAULT_IMAGE_URL =
  'https://download.audius.co/static-resources/preview-image.jpg'
export const AUDIO_REWARDS_IMAGE_URL =
  'https://download.audius.co/static-resources/audio-rewards.png'
export const SIGNUP_REF_IMAGE_URL =
  'https://download.audius.co/static-resources/signup_referral.png'

// Explore page image URLs
const TOP_PLAYLISTS_URL =
  'https://download.audius.co/static-resources/top-playlists.png'
const UNDERGROUND_TRENDING_URL =
  'https://download.audius.co/static-resources/underground-trending.png'

// Regex to detect Twitter/Discord bots that can embed players
const CAN_EMBED_USER_AGENT_REGEX = /(twitter|discord)/i

export type PlayableType = 'track' | 'playlist' | 'album'

export interface ExploreInfo {
  title: string
  description: string
  image: string
}

// Get base public URL based on environment
const getPublicUrl = (): string => {
  const env = process.env.VITE_ENVIRONMENT || 'development'
  switch (env) {
    case 'production':
      return 'https://audius.co'
    case 'staging':
      return 'https://staging.audius.co'
    default:
      return 'http://localhost:3000'
  }
}

/**
 * Generate embed player URL for Twitter/Discord
 */
export const getEmbedUrl = (type: PlayableType, hashId: string): string => {
  const publicUrl = getPublicUrl()
  return `${publicUrl}/embed/${type}/${hashId}?flavor=card&twitter=true`
}

/**
 * Check if User-Agent can show embed player (Twitter/Discord bots)
 */
export const canEmbed = (userAgent: string): boolean => {
  return CAN_EMBED_USER_AGENT_REGEX.test(userAgent)
}

/**
 * Generate deep link URL for mobile apps
 */
export const getAppUrl = (path: string): string => {
  return `audius:/${path}`
}

/**
 * Generate web URL for the page
 */
export const getWebUrl = (path: string): string => {
  const publicUrl = getPublicUrl()
  return `${publicUrl}${path}`
}

/**
 * Explore type to metadata mapping
 */
export const exploreMap: Record<string, ExploreInfo> = {
  'trending-playlists': {
    title: 'Trending Playlists',
    description: 'The trending playlists on Audius right now',
    image: TOP_PLAYLISTS_URL
  },
  underground: {
    title: 'Underground Trending',
    description:
      'Some of the best up-and-coming music on Audius all in one place',
    image: UNDERGROUND_TRENDING_URL
  }
}

/**
 * Get explore info for a given type
 */
export const getExploreInfo = (type?: string): ExploreInfo => {
  if (!type || !exploreMap[type]) {
    return {
      title: 'Explore',
      description: `Content curated for you based on your likes, reposts, and follows. Refreshes often so if you like a track, favorite it.`,
      image: DEFAULT_IMAGE_URL
    }
  }
  return exploreMap[type]
}

/**
 * Default meta tag context
 */
export const getDefaultContext = () => ({
  title: 'Audius',
  description:
    'Audius is a music streaming and sharing platform that puts power back into the hands of content creators',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

/**
 * Upload page meta tag context
 */
export const getUploadContext = () => ({
  title: 'Upload',
  description: 'Upload your tracks to Audius',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

/**
 * $AUDIO token page meta tag context
 */
export const getAudioContext = () => ({
  title: '$AUDIO & Rewards',
  description: 'Earn $AUDIO tokens while using the app!',
  image: AUDIO_REWARDS_IMAGE_URL,
  thumbnail: false
})

/**
 * Rewards page meta tag context
 */
export const getRewardsContext = () => ({
  title: '$AUDIO & Rewards',
  description: 'Earn $AUDIO tokens while using the app!',
  image: AUDIO_REWARDS_IMAGE_URL,
  thumbnail: false
})

/**
 * Signup page meta tag context
 */
export const getSignupContext = () => ({
  title: 'Signup',
  description: 'Sign up for Audius',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

/**
 * Signup referral page meta tag context
 */
export const getSignupRefContext = (handle?: string) => ({
  title: handle
    ? `Invite to join Audius from @${handle}!`
    : 'Invite to join Audius',
  description: 'Sign up for Audius to earn $AUDIO tokens while using the app!',
  image: SIGNUP_REF_IMAGE_URL,
  thumbnail: false
})

/**
 * Download app page meta tag context
 */
export const getDownloadAppContext = () => ({
  title: 'Download',
  description: 'Artists Deserve More.',
  image: DEFAULT_IMAGE_URL,
  thumbnail: false
})

/**
 * Trending page meta tag context
 */
export const getTrendingContext = () => ({
  title: 'Trending',
  description: 'Listen to trending tracks on Audius',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

/**
 * Feed page meta tag context
 */
export const getFeedContext = () => ({
  title: 'Feed',
  description: 'Your personalized feed on Audius',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

/**
 * Library page meta tag context
 */
export const getLibraryContext = () => ({
  title: 'Library',
  description: 'Your music library on Audius',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

/**
 * History page meta tag context
 */
export const getHistoryContext = () => ({
  title: 'History',
  description: 'Your listening history on Audius',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

/**
 * Dashboard page meta tag context
 */
export const getDashboardContext = () => ({
  title: 'Dashboard',
  description: 'Your artist dashboard on Audius',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

/**
 * Settings page meta tag context
 */
export const getSettingsContext = () => ({
  title: 'Settings',
  description: 'Manage your Audius account settings',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

/**
 * Notifications page meta tag context
 */
export const getNotificationsContext = () => ({
  title: 'Notifications',
  description: 'Your notifications on Audius',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

/**
 * Messages page meta tag context
 */
export const getMessagesContext = () => ({
  title: 'Messages',
  description: 'Your messages on Audius',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

/**
 * Search page meta tag context
 */
export const getSearchContext = () => ({
  title: 'Search',
  description: 'Search for tracks, artists, and playlists on Audius',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})
